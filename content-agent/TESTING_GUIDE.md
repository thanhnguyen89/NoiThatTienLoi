# Testing Guide - Database Integration

## Prerequisites

1. **Database Running:** PostgreSQL on localhost:5432
2. **Database Created:** `content_agent` database exists
3. **Prisma Migrated:** Run `npx prisma db push` in `web/` directory
4. **Dev Server Running:** `npm run dev` in `web/` directory
5. **User Account:** Login with admin/admin123

## Test Scenarios

### Scenario 1: Create New Article (Full Flow)

#### Step 1: Login
1. Navigate to `http://localhost:3000/login`
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. ✅ Should redirect to homepage

#### Step 2: Start Pipeline (Create Article)
1. Navigate to `http://localhost:3000/viet-bai-thong-minh`
2. Fill in form:
   - Từ khóa: `giường ngủ gỗ sồi`
   - Ngôn ngữ: Vietnamese
   - Loại bài: Product
   - Độ dài: 1200 từ
3. Click "Bắt đầu"
4. Wait for outline generation (~30 seconds)

**Expected Results:**
- ✅ Outline appears with 6 suggested titles
- ✅ Sections list displayed
- ✅ Check database:
  ```sql
  SELECT id, runId, keyword, title, status, createdAt 
  FROM "Article" 
  ORDER BY createdAt DESC LIMIT 1;
  ```
- ✅ Should see new record with status='DRAFT'

#### Step 3: Select Title & Generate Content
1. Select a title from suggestions
2. Review/edit sections if needed
3. Click "Tiếp tục" to step 3
4. Click "Viết bài" button
5. Wait for streaming content generation (~60 seconds)

**Expected Results:**
- ✅ Content streams in real-time
- ✅ SEO Specialist and Editor QC steps complete
- ✅ Final score displayed
- ✅ Check database:
  ```sql
  SELECT id, status, wordCount, humanness_score, 
         LENGTH(htmlContent) as content_length
  FROM "Article" 
  WHERE keyword = 'giường ngủ gỗ sồi';
  ```
- ✅ Status should be 'WRITTEN'
- ✅ htmlContent should have content (length > 1000)
- ✅ wordCount should be ~1200
- ✅ humanness_score should be 60-100

#### Step 4: Edit & Save
1. Should auto-redirect to step 4 editor
2. Content should load in editor
3. Make some edits (change a word, add a sentence)
4. Press `Ctrl+S` or click Save button

**Expected Results:**
- ✅ "Đã lưu" message appears
- ✅ Check database:
  ```sql
  SELECT COUNT(*) as version_count
  FROM "ArticleVersion"
  WHERE articleId = (
    SELECT id FROM "Article" 
    WHERE keyword = 'giường ngủ gỗ sồi'
  );
  ```
- ✅ Should have 1 version created
- ✅ Article updatedAt timestamp should be recent

#### Step 5: Publish to WordPress
1. Click "Publish" button
2. Wait for WordPress API call (~5 seconds)

**Expected Results:**
- ✅ Success message with WordPress URL
- ✅ Check database:
  ```sql
  SELECT status, wordpressPostId, wordpressUrl, publishedAt
  FROM "Article"
  WHERE keyword = 'giường ngủ gỗ sồi';
  ```
- ✅ Status should be 'PUBLISHED'
- ✅ wordpressPostId should have value
- ✅ wordpressUrl should have URL
- ✅ publishedAt should be current timestamp

#### Step 6: View in Dashboard
1. Navigate to `http://localhost:3000/dashboard/articles`
2. Find the article in the list

**Expected Results:**
- ✅ Article appears in table
- ✅ Keyword displayed with red tag
- ✅ Word count shown
- ✅ Created date shown
- ✅ Delete and Boost buttons visible

---

### Scenario 2: Edit Existing Article

#### Test: Load Article from Database
1. Navigate to `http://localhost:3000/viet-bai-thong-minh`
2. Create a new article (follow Scenario 1 steps 1-3)
3. After content generation, note the runId from localStorage:
   ```javascript
   localStorage.getItem('pipeline_runId')
   ```
4. Close browser tab
5. Open new tab, navigate directly to step 4:
   ```
   http://localhost:3000/viet-bai-thong-minh/step4
   ```

**Expected Results:**
- ✅ Article loads from database (not localStorage)
- ✅ Content appears in editor
- ✅ Title, meta description, keywords all loaded
- ✅ Check browser console for log:
  ```
  [save] Article updated: id=X, version=true
  ```

#### Test: Version History
1. Load article in step 4
2. Make edit #1: Change title
3. Save (Ctrl+S)
4. Make edit #2: Change first paragraph
5. Save (Ctrl+S)
6. Make edit #3: Add a new section
7. Save (Ctrl+S)

**Expected Results:**
- ✅ Check database:
  ```sql
  SELECT id, title, wordCount, createdAt
  FROM "ArticleVersion"
  WHERE articleId = X
  ORDER BY createdAt DESC;
  ```
- ✅ Should have 3 versions
- ✅ Each version has different title/content
- ✅ Timestamps are sequential

---

### Scenario 3: Dashboard Operations

#### Test: List Articles
1. Navigate to `http://localhost:3000/dashboard/articles`

**Expected Results:**
- ✅ All articles displayed in table
- ✅ Pagination works (if > 10 articles)
- ✅ Sorting by date works
- ✅ Each row shows: checkbox, keyword, image placeholder, dates, actions

#### Test: Search
1. In dashboard, use search box
2. Type partial keyword: `giường`

**Expected Results:**
- ✅ Only articles with "giường" in keyword/title shown
- ✅ Search is case-insensitive
- ✅ Results update in real-time

#### Test: Filter by Status
1. Click status filter dropdown
2. Select "PUBLISHED"

**Expected Results:**
- ✅ Only published articles shown
- ✅ Count updates
- ✅ Can clear filter

#### Test: Boost Article
1. Find an article
2. Click "Boost" button

**Expected Results:**
- ✅ Button changes to "Unboost"
- ✅ Check database:
  ```sql
  SELECT boosted FROM "Article" WHERE id = X;
  ```
- ✅ boosted should be true
- ✅ Article moves to top of list (if sorted by boost)

#### Test: Delete Article (Soft Delete)
1. Find an article
2. Click "Delete" button
3. Confirm deletion

**Expected Results:**
- ✅ Article disappears from list
- ✅ Check database:
  ```sql
  SELECT deletedAt FROM "Article" WHERE id = X;
  ```
- ✅ deletedAt should have timestamp (not null)
- ✅ Article still exists in database (soft delete)

#### Test: Bulk Delete
1. Check checkboxes for 3 articles
2. Click "Delete Selected" button
3. Confirm

**Expected Results:**
- ✅ All 3 articles disappear
- ✅ Check database:
  ```sql
  SELECT COUNT(*) FROM "Article" 
  WHERE deletedAt IS NOT NULL;
  ```
- ✅ Count increased by 3

---

### Scenario 4: Error Handling

#### Test: Unauthorized Access
1. Logout (or open incognito window)
2. Try to access:
   ```
   http://localhost:3000/api/articles/by-runid/test-123
   ```

**Expected Results:**
- ✅ Returns 401 Unauthorized
- ✅ JSON response: `{"success": false, "error": "Unauthorized"}`

#### Test: Article Not Found
1. Login as admin
2. Try to access non-existent article:
   ```
   http://localhost:3000/api/articles/by-runid/nonexistent-999
   ```

**Expected Results:**
- ✅ Returns 404 Not Found
- ✅ JSON response: `{"success": false, "error": "Article not found"}`

#### Test: Edit Another User's Article
1. Create second user in database:
   ```sql
   INSERT INTO "AdminUser" (username, password, email, role)
   VALUES ('user2', '$2b$10$...', 'user2@test.com', 'EDITOR');
   ```
2. Login as user2
3. Try to save article created by admin:
   ```
   POST /api/articles/1/save
   ```

**Expected Results:**
- ✅ Returns 403 Forbidden
- ✅ JSON response: `{"success": false, "error": "Forbidden"}`

#### Test: Database Connection Error
1. Stop PostgreSQL service
2. Try to create new article

**Expected Results:**
- ✅ Error message displayed to user
- ✅ Server logs show database error
- ✅ Application doesn't crash
- ✅ User can retry after DB is back

---

### Scenario 5: Backward Compatibility

#### Test: localStorage Fallback
1. Create article data in localStorage manually:
   ```javascript
   localStorage.setItem('pipeline_result', JSON.stringify({
     html: '<article><h1>Test</h1><p>Content</p></article>',
     title: 'Test Article',
     wordCount: 100,
     humanness_score: 75,
     decision: 'PUBLISH',
     metaDescription: 'Test meta',
     scoreBreakdown: {
       language_natural: 20,
       structure: 20,
       eeat_signals: 18,
       engagement: 17
     }
   }));
   localStorage.setItem('pipeline_step1', JSON.stringify({
     keyword: 'test keyword'
   }));
   ```
2. Navigate to step 4

**Expected Results:**
- ✅ Article loads from localStorage
- ✅ Content displays in editor
- ✅ No database errors
- ✅ Can still save (will create new Article record)

---

## Database Verification Queries

### Check Article Count by Status
```sql
SELECT status, COUNT(*) as count
FROM "Article"
WHERE deletedAt IS NULL
GROUP BY status;
```

### Check Recent Articles
```sql
SELECT id, keyword, title, status, wordCount, 
       humanness_score, createdAt
FROM "Article"
WHERE deletedAt IS NULL
ORDER BY createdAt DESC
LIMIT 10;
```

### Check Version History
```sql
SELECT a.keyword, a.title as current_title,
       COUNT(v.id) as version_count,
       MAX(v.createdAt) as last_version
FROM "Article" a
LEFT JOIN "ArticleVersion" v ON v.articleId = a.id
WHERE a.deletedAt IS NULL
GROUP BY a.id, a.keyword, a.title
HAVING COUNT(v.id) > 0;
```

### Check Published Articles
```sql
SELECT keyword, title, wordpressPostId, wordpressUrl, publishedAt
FROM "Article"
WHERE status = 'PUBLISHED'
  AND deletedAt IS NULL
ORDER BY publishedAt DESC;
```

### Check Boosted Articles
```sql
SELECT keyword, title, boosted, createdAt
FROM "Article"
WHERE boosted = true
  AND deletedAt IS NULL
ORDER BY createdAt DESC;
```

---

## Performance Tests

### Test: Large Article (5000 words)
1. Create article with targetLength = 5000
2. Measure time for each step
3. Check database write performance

**Expected:**
- ✅ Write completes in < 90 seconds
- ✅ Database save < 500ms
- ✅ No memory leaks

### Test: Multiple Concurrent Users
1. Open 3 browser windows
2. Login as different users (create test users)
3. Each creates article simultaneously

**Expected:**
- ✅ No database conflicts
- ✅ Each user sees only their articles
- ✅ No race conditions

### Test: Version History Limit
1. Create article
2. Save 50 times (create 50 versions)
3. Check database size

**Expected:**
- ✅ All versions saved
- ✅ Query performance acceptable
- ✅ Consider implementing version limit (e.g., keep last 20)

---

## Troubleshooting

### Issue: "Unauthorized" error
**Solution:** Make sure you're logged in. Check cookie in browser DevTools.

### Issue: Article not loading in step 4
**Solution:** 
1. Check runId in localStorage
2. Verify article exists in database
3. Check browser console for errors

### Issue: Save button doesn't work
**Solution:**
1. Check network tab for API call
2. Verify articleId is set
3. Check server logs for errors

### Issue: Versions not created
**Solution:**
1. Verify `createVersion: true` in save request
2. Check database foreign key constraints
3. Verify article exists before creating version

---

## Success Criteria

All tests pass when:
- ✅ Articles persist to database
- ✅ Versions track changes correctly
- ✅ Dashboard displays all articles
- ✅ WordPress publish updates database
- ✅ Authentication/authorization works
- ✅ Error handling is graceful
- ✅ Backward compatibility maintained
- ✅ No data loss
- ✅ Performance acceptable

---

**Last Updated:** May 9, 2026  
**Status:** Ready for Testing
