# 🧪 Testing Guide: AI Check Configuration

## 🎯 Quick Start

**Server Status:** ✅ Running at http://localhost:3000

**Test URL:** http://localhost:3000/cau-hinh/ai-check

---

## 📋 Test Scenarios

### 1. ✅ Initial Load Test
**Steps:**
1. Navigate to http://localhost:3000/cau-hinh/ai-check
2. Wait for loading spinner to disappear

**Expected Results:**
- ✅ Page loads without errors
- ✅ Two tabs visible: "🚫 Từ Cấm AI" and "📝 Mở Bài Sáo Rỗng"
- ✅ "Từ Cấm AI" tab shows 37 items
- ✅ "Mở Bài Sáo Rỗng" tab shows 7 items
- ✅ Stats display correctly at bottom

---

### 2. ✅ Add New Item Test

#### Tab: Từ Cấm AI
**Steps:**
1. Click on "Từ Cấm AI" tab
2. Type "test word" in input field
3. Click "➕ Thêm" button OR press Enter

**Expected Results:**
- ✅ Item appears in list immediately
- ✅ "Đang lưu..." indicator shows briefly
- ✅ Input field clears
- ✅ Item count increases by 1
- ✅ Stats update automatically

#### Tab: Mở Bài Sáo Rỗng
**Steps:**
1. Click on "Mở Bài Sáo Rỗng" tab
2. Type "test opening" in input field
3. Click "➕ Thêm" button OR press Enter

**Expected Results:**
- ✅ Same as above

---

### 3. ✅ Edit Item Test

**Steps:**
1. Find any item in the list
2. Click the "✏️" (edit) icon
3. Modify the text
4. Click "✓ Lưu" OR press Enter

**Expected Results:**
- ✅ Item switches to edit mode (input field)
- ✅ Input field is focused
- ✅ Changes save immediately
- ✅ Item returns to view mode
- ✅ "Đang lưu..." indicator shows

**Cancel Test:**
1. Click edit icon
2. Modify text
3. Click "✕ Hủy" OR press Escape

**Expected Results:**
- ✅ Changes are discarded
- ✅ Original text remains
- ✅ No save indicator

---

### 4. ✅ Delete Item Test

**Steps:**
1. Find any item in the list
2. Click the "🗑️" (delete) icon

**Expected Results:**
- ✅ Item disappears immediately
- ✅ "Đang lưu..." indicator shows
- ✅ Item count decreases by 1
- ✅ Stats update automatically

---

### 5. ✅ Bulk Delete Test

**Steps:**
1. Click "🗑️ Xóa tất cả" button (top right of list)
2. Confirm in dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ All items disappear
- ✅ "Chưa có mục nào" message shows
- ✅ Stats show 0 items

**Cancel Test:**
1. Click "🗑️ Xóa tất cả"
2. Cancel in dialog

**Expected Results:**
- ✅ No items deleted
- ✅ List remains unchanged

---

### 6. ✅ Tab Switch Test

**Steps:**
1. Add item in "Từ Cấm AI" tab
2. Switch to "Mở Bài Sáo Rỗng" tab
3. Add item in "Mở Bài Sáo Rỗng" tab
4. Switch back to "Từ Cấm AI" tab

**Expected Results:**
- ✅ Each tab maintains its own data
- ✅ Items don't mix between tabs
- ✅ Stats update per tab
- ✅ No data loss on tab switch

---

### 7. ✅ Empty State Test

**Steps:**
1. Delete all items (bulk delete)
2. Observe empty state

**Expected Results:**
- ✅ "Chưa có mục nào" message displays
- ✅ "Thêm mục đầu tiên ở trên" hint shows
- ✅ Stats show 0 values
- ✅ Add new item still works

---

### 8. ✅ Validation Test

**Steps:**
1. Try to add empty item (just spaces)
2. Click "➕ Thêm"

**Expected Results:**
- ✅ Button is disabled
- ✅ Nothing happens
- ✅ No error message

---

### 9. ✅ Stats Accuracy Test

**Steps:**
1. Note current stats
2. Add 3 items with different lengths:
   - "short" (5 chars)
   - "medium length" (13 chars)
   - "this is a very long item" (24 chars)
3. Check stats

**Expected Results:**
- ✅ "Tổng số mục" increases by 3
- ✅ "Độ dài trung bình" = (5+13+24)/3 = 14
- ✅ "Mục dài nhất" = 24

---

### 10. ✅ AI Check Integration Test

**Steps:**
1. Add a new forbidden word: "test123"
2. Go to "Viết Bài Thông Minh" (step 4)
3. Write content containing "test123"
4. Click "🔍 Kiểm tra giọng AI"

**Expected Results:**
- ✅ AI Check loads config from database
- ✅ "test123" is flagged as forbidden word
- ✅ Console shows: "Loaded config: X forbidden words, Y cliche openings"

---

### 11. ✅ Persistence Test

**Steps:**
1. Add several items
2. Refresh the page (F5)
3. Check if items are still there

**Expected Results:**
- ✅ All items persist after refresh
- ✅ No data loss
- ✅ Stats remain accurate

---

### 12. ✅ Authentication Test

**Steps:**
1. Logout (if logged in)
2. Try to access http://localhost:3000/cau-hinh/ai-check

**Expected Results:**
- ✅ Redirected to login page
- ✅ Cannot access config page without auth

---

## 🐛 Common Issues & Solutions

### Issue: Page shows "Unauthorized"
**Solution:** Make sure you're logged in with admin credentials

### Issue: Items don't save
**Solution:** 
1. Check browser console for errors
2. Verify database connection in `.env.local`
3. Check server logs

### Issue: Stats show NaN or incorrect values
**Solution:**
1. Refresh the page
2. Check if items array is empty
3. Verify calculation logic

### Issue: "Đang lưu..." never disappears
**Solution:**
1. Check network tab for failed requests
2. Verify API endpoint is responding
3. Check server logs for errors

---

## 🔍 Browser Console Checks

Open browser console (F12) and look for:

### ✅ Success Messages:
```
Config saved successfully
```

### ✅ Server Logs:
```
[ai-check] Loaded config: 37 forbidden words, 7 cliche openings
[ai-config] Updated FORBIDDEN_WORDS: 38 items
```

### ❌ Error Messages:
```
Failed to load config: [error details]
Failed to save config: [error details]
```

---

## 📊 Database Verification

### Check data in database:
```sql
-- View all configs
SELECT * FROM ai_configs;

-- Count items per type
SELECT type, array_length(items, 1) as count 
FROM ai_configs 
WHERE is_active = true;

-- View specific config
SELECT * FROM ai_configs WHERE type = 'FORBIDDEN_WORDS';
```

---

## ✅ Test Completion Checklist

- [ ] Initial load works
- [ ] Can add items to both tabs
- [ ] Can edit items
- [ ] Can delete individual items
- [ ] Can bulk delete all items
- [ ] Tab switching works correctly
- [ ] Empty state displays properly
- [ ] Validation prevents empty items
- [ ] Stats calculate correctly
- [ ] AI Check loads config from DB
- [ ] Data persists after refresh
- [ ] Authentication required

---

## 🎉 Success Criteria

**All tests pass if:**
1. ✅ No console errors
2. ✅ All CRUD operations work
3. ✅ Data persists in database
4. ✅ AI Check uses database config
5. ✅ UI is responsive and smooth
6. ✅ Stats are accurate
7. ✅ Authentication works

---

## 📞 Support

If any test fails:
1. Check browser console (F12)
2. Check server logs in terminal
3. Verify database connection
4. Check `.env.local` configuration
5. Restart dev server if needed

---

**Happy Testing! 🚀**
