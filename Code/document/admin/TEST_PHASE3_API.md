# 🧪 Test Phase 3 - Backend API

## Test Cases

### 1. Test GET All News
```bash
curl http://localhost:3000/admin/api/news
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": X,
      "totalPages": Y
    }
  }
}
```

### 2. Test POST Create News với 28 fields mới
```bash
curl -X POST http://localhost:3000/admin/api/news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test News với 28 fields mới",
    "summary": "Test summary",
    "content": "Test content",
    "authorId": "user-123",
    "authorEmail": "author@example.com",
    "authorAvatar": "/images/avatar.jpg",
    "tags": "[\"tag1\", \"tag2\"]",
    "categoryName": "Technology",
    "categorySlug": "technology",
    "readingTime": 5,
    "featuredImage": "/images/featured.jpg",
    "featuredImageAlt": "Featured image alt text",
    "featuredImageCaption": "Featured image caption",
    "galleryImages": "[\"img1.jpg\", \"img2.jpg\"]",
    "videoUrl": "https://youtube.com/watch?v=xxx",
    "videoThumbnail": "/images/video-thumb.jpg",
    "audioUrl": "https://soundcloud.com/track",
    "relatedNewsIds": "[\"news-1\", \"news-2\"]",
    "externalUrl": "https://example.com",
    "isExternalLink": false,
    "openInNewTab": false,
    "isFeatured": true,
    "isBreakingNews": false,
    "isPinned": true,
    "expiryDate": "2026-12-31T23:59:59Z",
    "scheduledPublishDate": "2026-05-01T00:00:00Z",
    "revisionNumber": 1,
    "contentFormat": "markdown",
    "customCss": ".custom { color: red; }",
    "customJs": "console.log(\"custom\");",
    "jsonData": "{\"key\": \"value\"}"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "news-xxx",
    "title": "Test News với 28 fields mới",
    "authorId": "user-123",
    "authorEmail": "author@example.com",
    "readingTime": 5,
    "isFeatured": true,
    "isPinned": true,
    ...
  }
}
```

### 3. Test GET News by ID
```bash
curl http://localhost:3000/admin/api/news/NEWS_ID
```

**Expected:** Trả về news với đầy đủ 28 fields mới

### 4. Test PUT Update News
```bash
curl -X PUT http://localhost:3000/admin/api/news/NEWS_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Updated title",
    "readingTime": 10,
    "isFeatured": false,
    "revisionNumber": 2
  }'
```

**Expected:** News được cập nhật với fields mới

## Validation Tests

### Test 1: Invalid Email
```json
{
  "authorEmail": "invalid-email"
}
```
**Expected:** Validation error

### Test 2: Negative Reading Time
```json
{
  "readingTime": -5
}
```
**Expected:** Validation error (min 0)

### Test 3: Too Long Category Name
```json
{
  "categoryName": "a".repeat(256)
}
```
**Expected:** Validation error (max 255)

### Test 4: Invalid Content Format
```json
{
  "contentFormat": "a".repeat(51)
}
```
**Expected:** Validation error (max 50)

## BigInt/Date Conversion Tests

### Test BigInt Fields
```json
{
  "readingTime": 999999,
  "revisionNumber": 100
}
```
**Expected:** Được convert sang BigInt trong database

### Test Date Fields
```json
{
  "expiryDate": "2026-12-31T23:59:59Z",
  "scheduledPublishDate": "2026-05-01T00:00:00Z"
}
```
**Expected:** Được convert sang DateTime trong database

## JSON Fields Tests

### Test Tags Array
```json
{
  "tags": "[\"javascript\", \"typescript\", \"react\"]"
}
```
**Expected:** Lưu dưới dạng string, parse khi cần

### Test Gallery Images
```json
{
  "galleryImages": "[\"img1.jpg\", \"img2.jpg\", \"img3.jpg\"]"
}
```
**Expected:** Lưu dưới dạng string

### Test Related News IDs
```json
{
  "relatedNewsIds": "[\"news-1\", \"news-2\", \"news-3\"]"
}
```
**Expected:** Lưu dưới dạng string

### Test JSON Data
```json
{
  "jsonData": "{\"customField1\": \"value1\", \"customField2\": 123}"
}
```
**Expected:** Lưu dưới dạng string

## ✅ Test Checklist

- [ ] GET all news trả về 28 fields mới
- [ ] POST create news với 28 fields thành công
- [ ] GET news by ID trả về đầy đủ fields
- [ ] PUT update news với 28 fields thành công
- [ ] Validation errors hoạt động đúng
- [ ] BigInt conversion hoạt động (readingTime, revisionNumber)
- [ ] Date conversion hoạt động (expiryDate, scheduledPublishDate)
- [ ] JSON fields lưu đúng format
- [ ] Boolean fields có default values
- [ ] Type safety không có lỗi TypeScript

## 🚀 Chạy Tests

1. Start dev server:
```bash
cd NoiThatTienLoi/Code
npm run dev
```

2. Chạy từng test case ở trên
3. Verify responses match expected results
4. Check database để confirm data được lưu đúng

## 📝 Notes

- Cần có valid JWT token để test POST/PUT/DELETE
- Có thể dùng Postman hoặc Thunder Client để test dễ hơn
- Check Prisma Studio để verify data trong database
- Monitor console logs để debug nếu có lỗi
