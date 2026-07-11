# FIX-ENCODING-MOJIBAKE.md
## Fix UTF-8 Mojibake — 6 generate pages

> Phát hiện ngày 2026-05-28 · 1 loại lỗi · 6 file bị ảnh hưởng
> Ưu tiên: P1 CRITICAL — toàn bộ UI text tiếng Việt hiển thị garbled

---

## DANH SÁCH FILE BỊ ẢNH HƯỞNG

```
web/app/viet-tinh-gon/generate/page.tsx
web/app/viet-danh-gia-san-pham/generate/page.tsx
web/app/viet-toplist/generate/page.tsx
web/app/viet-tin-tuc/generate/page.tsx
web/app/viet-theo-nguon/generate/page.tsx
web/app/viet-theo-dan-bai/generate/page.tsx
```

---

## TRIỆU CHỨNG

Toàn bộ string tiếng Việt trong UI bị hiển thị garbled:

| Hiển thị sai (mojibake) | Phải là |
|------------------------|---------|
| `RÃºt gá»n` | `Rút gọn` |
| `Tá»± nhiÃªn hÆ¡n` | `Tự nhiên hơn` |
| `Cáº§n cáº£i thiá»‡n` | `Cần cải thiện` |
| `Ä'Äƒng bÃ i` | `đăng bài` |
| `Äang lÆ°u...` | `Đang lưu...` |
| `KhÃ´ng tÃ¬m tháº¥y` | `Không tìm thấy` |

---

## NGUYÊN NHÂN

File UTF-8 đúng → mở bằng editor hiểu là Latin-1 → save lại → UTF-8 bytes bị double-encode.

Ví dụ: `ú` (UTF-8: `C3 BA`) → bị đọc thành 2 Latin-1 chars `Ã` + `º` → save lại thành `C3 83` `C2 BA` → khi browser đọc lại thấy `Ãº`.

---

## FIX — Chạy Node.js script một lần

Tạo file `scripts/fix-encoding.mjs` với nội dung sau:

```javascript
// scripts/fix-encoding.mjs
import { readFileSync, writeFileSync } from 'fs';

const FILES = [
  'web/app/viet-tinh-gon/generate/page.tsx',
  'web/app/viet-danh-gia-san-pham/generate/page.tsx',
  'web/app/viet-toplist/generate/page.tsx',
  'web/app/viet-tin-tuc/generate/page.tsx',
  'web/app/viet-theo-nguon/generate/page.tsx',
  'web/app/viet-theo-dan-bai/generate/page.tsx',
];

for (const filePath of FILES) {
  try {
    // Đọc raw bytes
    const raw = readFileSync(filePath);

    // Interpret bytes như Latin-1, rồi decode đúng
    const latin1 = raw.toString('latin1');
    const fixed = Buffer.from(latin1, 'latin1').toString('utf8');

    // Sanity check: nếu kết quả vẫn còn nhiều 'Ã' thì báo lỗi
    const badCount = (fixed.match(/Ã/g) || []).length;
    if (badCount > 10) {
      console.error(`[SKIP] ${filePath} — vẫn còn ${badCount} ký tự Ã, có thể encoding khác`);
      continue;
    }

    writeFileSync(filePath, fixed, 'utf8');
    console.log(`[OK] ${filePath}`);
  } catch (err) {
    console.error(`[ERR] ${filePath}:`, err.message);
  }
}
```

**Chạy từ root của project:**

```bash
node scripts/fix-encoding.mjs
```

---

## KIỂM TRA SAU KHI CHẠY

**1. Kiểm tra file trong VS Code:**

Mở bất kỳ file nào trong danh sách trên — text tiếng Việt phải đọc được bình thường (không còn `Ã`, `á»`, `Æ°`).

**2. TypeScript check:**

```bash
npx tsc --noEmit
```

**3. Chạy dev server, mở các trang:**

Vào `http://localhost:3000/viet-tinh-gon/generate` (hoặc trang khác trong danh sách) — labels, buttons, tab names phải hiển thị tiếng Việt đúng.

---

## NẾU SCRIPT KHÔNG WORK

Nếu `badCount` vẫn > 10 sau khi chạy, file có thể bị encode theo cách khác. Thử thay bằng:

```javascript
// Alternative: dùng TextDecoder/TextEncoder
const raw = readFileSync(filePath);
const wrongText = new TextDecoder('windows-1252').decode(raw);
const fixedBytes = new TextEncoder().encode(wrongText);
writeFileSync(filePath, fixedBytes);
```

Hoặc mở file trong VS Code:
1. Click vào encoding ở góc dưới phải (thường hiện `UTF-8`)
2. Chọn **"Reopen with Encoding"** → thử `Western (Windows 1252)` hoặc `Latin-1`
3. Nếu text đọc được đúng → **"Save with Encoding"** → chọn `UTF-8`

---

## GHI CHÚ

- Chỉ 6 file generate pages bị ảnh hưởng — các file còn lại trong project không bị
- Các file mới tạo sau này (VBT step2-4, TTK generate) đều UTF-8 đúng
- Sau khi fix, không cần thay đổi logic code gì thêm — chỉ là encoding

---

## CHECKLIST

- [ ] Chạy `scripts/fix-encoding.mjs` — tất cả 6 file báo `[OK]`
- [ ] Mở từng file trong VS Code, xác nhận text tiếng Việt đọc được
- [ ] `npx tsc --noEmit` pass
- [ ] Dev server: UI `viet-tinh-gon/generate` và `viet-danh-gia-san-pham/generate` hiển thị đúng ký tự
