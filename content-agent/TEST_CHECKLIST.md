# ✅ Test Checklist - Website Configuration

## 🚀 Quick Start

1. Start dev server: `npm run dev`
2. Navigate to: `/cau-hinh-website`
3. Follow checklist below

## 📋 Testing Steps

### 1. Initial Load
- [ ] Page loads without errors
- [ ] Platform summary shows 5 platforms
- [ ] "Chưa có website nào" message displays (if empty)
- [ ] "Thêm website đầu tiên" button works

### 2. Add WordPress Website (Hasaki Example)
- [ ] Click "Thêm website"
- [ ] Modal opens
- [ ] Select WordPress platform
- [ ] Fill in:
  ```
  Tên: Hasaki Vietnam
  URL: https://www.hasaki.vn
  Platform: WordPress
  ```
- [ ] Click "Tự điền" for API URL
- [ ] Verify API URL: `https://www.hasaki.vn/wp-json/wp/v2`
- [ ] Expand "Thông tin doanh nghiệp"
- [ ] Fill in:
  ```
  Tên công ty: HASAKI VIỆT NAM
  Số chi nhánh: 323
  Hotline: 1800 6324
  Hotline khiếu nại: 1800 6310
  Link chi nhánh: https://hotro.hasaki.vn/he-thong-cua-hang.html
  Thông tin hỗ trợ: Nhấn Phím 1 cho Mỹ phẩm, Phím 2 cho Clinic
  ```
- [ ] Fill in auth:
  ```
  Username: admin
  App Password: (test password)
  ```
- [ ] Click "Kiểm tra kết nối" (optional)
- [ ] Check "Kích hoạt"
- [ ] Check "Đặt làm mặc định"
- [ ] Click "Thêm website"
- [ ] Toast shows "Đã thêm website"
- [ ] Modal closes
- [ ] Website card appears

### 3. Verify Website Card Display
- [ ] Platform icon shows (🌐)
- [ ] Name displays: "Hasaki Vietnam"
- [ ] Tags show: [Mặc định] [WordPress] [Nháp (draft)]
- [ ] URL is clickable
- [ ] Company info displays:
  - [ ] 🏢 HASAKI VIỆT NAM
  - [ ] 📍 323 chi nhánh
  - [ ] 📞 1800 6324
  - [ ] ⚠️ 1800 6310
- [ ] Branch list link shows
- [ ] Technical info shows:
  - [ ] API URL (truncated)
  - [ ] Tài khoản: admin
  - [ ] 🔑 Có mật khẩu
- [ ] Support info box shows
- [ ] [Sửa] button visible
- [ ] [Xóa] button visible

### 4. Platform Summary Update
- [ ] WordPress card shows "1 kết nối"
- [ ] Border turns green
- [ ] Other platforms show "Chưa có"

### 5. Add Shopify Website
- [ ] Click "Thêm website"
- [ ] Select Shopify platform (🛍️)
- [ ] Fill in:
  ```
  Tên: My Shopify Store
  URL: https://mystore.myshopify.com
  ```
- [ ] Click "Tự điền" for API URL
- [ ] Verify API URL contains "admin/api"
- [ ] Fill in API auth:
  ```
  API Key: test-key
  API Secret: test-secret
  ```
- [ ] Note: Username/Password fields hidden
- [ ] Save
- [ ] Verify Shopify card appears
- [ ] Platform summary shows "1 kết nối" for Shopify

### 6. Add Custom API Website
- [ ] Click "Thêm website"
- [ ] Select Custom API (⚙️)
- [ ] Fill basic info
- [ ] Note: Both auth methods visible (flexible)
- [ ] Can fill username+password OR apiKey+secret
- [ ] Save
- [ ] Verify card appears

### 7. Add Static Site
- [ ] Click "Thêm website"
- [ ] Select Static Site (📄)
- [ ] Fill basic info
- [ ] Note: No auth fields required
- [ ] Save
- [ ] Verify card appears

### 8. Edit Website
- [ ] Click [Sửa] on Hasaki card
- [ ] Modal opens with pre-filled data
- [ ] Company info section collapsed by default
- [ ] Expand company info
- [ ] Verify all fields populated
- [ ] Password field shows "••••••••"
- [ ] Change name to "Hasaki Vietnam - Updated"
- [ ] Don't change password
- [ ] Save
- [ ] Verify name updated
- [ ] Password not changed (still has 🔑)

### 9. Update Password
- [ ] Edit Hasaki website
- [ ] Enter new password in App Password field
- [ ] Save
- [ ] Verify still shows 🔑 (password exists)

### 10. Test Connection (WordPress)
- [ ] Edit WordPress website
- [ ] Click "Kiểm tra kết nối"
- [ ] Loading spinner shows
- [ ] Result message appears (success or error)
- [ ] If success: Shows "✓ Kết nối thành công — [site name]"
- [ ] If error: Shows error message

### 11. Toggle Default
- [ ] Edit non-default website
- [ ] Check "Đặt làm mặc định"
- [ ] Save
- [ ] Verify [Mặc định] tag moves to new website
- [ ] Previous default loses [Mặc định] tag

### 12. Toggle Active
- [ ] Edit website
- [ ] Uncheck "Kích hoạt"
- [ ] Save
- [ ] Verify [Tắt] tag appears
- [ ] Border color changes to gray

### 13. Delete Website
- [ ] Click [Xóa] on a website
- [ ] Confirm dialog appears
- [ ] Click OK
- [ ] Toast shows "Đã xóa"
- [ ] Card disappears
- [ ] Platform summary updates

### 14. Empty State
- [ ] Delete all websites
- [ ] Verify "Chưa có website nào" message
- [ ] Platform summary shows all "Chưa có"

### 15. Form Validation
- [ ] Click "Thêm website"
- [ ] Leave name empty
- [ ] Try to save
- [ ] Verify error toast: "Vui lòng điền tên, URL và API URL"
- [ ] Fill name only
- [ ] Try to save
- [ ] Verify same error
- [ ] Fill all required fields
- [ ] Save succeeds

### 16. Modal Interactions
- [ ] Open modal
- [ ] Click X button → Modal closes
- [ ] Open modal
- [ ] Click "Hủy" → Modal closes
- [ ] Open modal
- [ ] Click outside modal → Modal stays open (expected)
- [ ] Press ESC → Modal closes (if implemented)

### 17. Collapsible Section
- [ ] Open add/edit modal
- [ ] Company info section collapsed by default
- [ ] Click header → Section expands
- [ ] Click header again → Section collapses
- [ ] Arrow icon changes (▶ ↔ ▼)

### 18. Auto-fill API URL
- [ ] Open modal
- [ ] Select WordPress
- [ ] Enter URL: `https://example.com`
- [ ] Click "Tự điền"
- [ ] Verify API URL: `https://example.com/wp-json/wp/v2`
- [ ] Change to Shopify
- [ ] Click "Tự điền"
- [ ] Verify API URL contains `/admin/api/`
- [ ] Change to Custom
- [ ] Click "Tự điền"
- [ ] Verify API URL: `https://example.com/api`

### 19. Responsive Design
- [ ] Resize browser to mobile width
- [ ] Platform selection grid adjusts
- [ ] Website cards stack properly
- [ ] Modal is scrollable
- [ ] Buttons remain accessible

### 20. Toast Notifications
- [ ] Add website → Green toast "Đã thêm website"
- [ ] Update website → Green toast "Đã cập nhật website"
- [ ] Delete website → Green toast "Đã xóa"
- [ ] Validation error → Red toast with error message
- [ ] Toast auto-dismisses after 3 seconds

## 🐛 Known Issues to Check

- [ ] Multiple toasts don't stack (only shows one)
- [ ] No pagination (test with 20+ websites)
- [ ] No search/filter
- [ ] Test connection doesn't cache results
- [ ] Modal doesn't trap focus

## 📊 Performance Checks

- [ ] Page loads in < 2 seconds
- [ ] Modal opens instantly
- [ ] Form inputs responsive
- [ ] No console errors
- [ ] No console warnings
- [ ] No TypeScript errors

## 🔐 Security Checks

- [ ] Passwords show as ••••••••
- [ ] API keys show as ••••••••
- [ ] API secrets show as ••••••••
- [ ] Sensitive data not in network response
- [ ] hasPassword/hasApiKey flags work correctly

## 📱 Browser Compatibility

Test in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## ✅ Final Verification

- [ ] All features work as expected
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] UI looks good
- [ ] Responsive design works
- [ ] Data persists after refresh
- [ ] Can add multiple platforms
- [ ] Can edit and delete
- [ ] Toast notifications work
- [ ] Form validation works

---

## 🎯 Test Results

**Date**: ___________  
**Tester**: ___________  
**Browser**: ___________  
**Status**: ⬜ Pass / ⬜ Fail  

**Notes**:
```
(Add any issues or observations here)
```

---

**Total Tests**: 100+  
**Estimated Time**: 30-45 minutes
