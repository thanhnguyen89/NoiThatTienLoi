# AI Models Management - Quản Lý Model AI

## Tổng Quan

Hệ thống quản lý AI Models cho phép:
- Cấu hình nhiều AI models (Gemini, ChatGPT, Grok, Claude)
- Lưu API key và Base URL vào database
- Chọn model mặc định để viết bài
- Các màn hình viết bài tự động load model từ DB

## Database Schema

```prisma
model AIModel {
  id          String   @id @default(uuid())
  name        String   // "Gemini 2.0 Flash", "ChatGPT 4o"
  provider    String   // "gemini", "openai", "anthropic", "grok"
  modelId     String   // "gemini-2.0-flash", "gpt-4o"
  apiKey      String?  // API key (optional)
  baseUrl     String?  // Base URL (optional, cho proxy)
  icon        String?  // Icon emoji
  description String?  // Mô tả
  isActive    Boolean  // Đang sử dụng
  isDefault   Boolean  // Model mặc định
  createdAt   DateTime
  updatedAt   DateTime
}
```

## API Endpoints

### GET `/api/ai-models`
Lấy danh sách AI models

**Query params:**
- `activeOnly=true` - Chỉ lấy models đang active

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Gemini 2.0 Flash",
      "provider": "gemini",
      "modelId": "gemini-2.0-flash",
      "apiKey": "sk-...",
      "baseUrl": "https://...",
      "icon": "⚡",
      "description": "Google - Mô hình nhanh",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/ai-models`
Tạo hoặc cập nhật AI model

**Body:**
```json
{
  "id": "uuid",  // Optional, nếu có = update
  "name": "Gemini 2.0 Flash",
  "provider": "gemini",
  "modelId": "gemini-2.0-flash",
  "apiKey": "sk-...",
  "baseUrl": "https://...",
  "icon": "⚡",
  "description": "Mô tả",
  "isActive": true,
  "isDefault": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* model object */ }
}
```

### DELETE `/api/ai-models?id=uuid`
Xóa AI model

**Note:** Không thể xóa model mặc định

## UI - Màn Hình Quản Lý

**URL:** `/cau-hinh/ai-models`

### Tính năng:
1. **Hiển thị danh sách models** dạng card grid
2. **Thêm model mới** - Click "Thêm Model"
3. **Chỉnh sửa model** - Click "Sửa" trên card
4. **Xóa model** - Click "Xóa" (không xóa được model mặc định)
5. **Bật/tắt model** - Toggle "Đang dùng"
6. **Đặt làm mặc định** - Click "Đặt mặc định"

### Card hiển thị:
- Icon + Tên model
- Provider
- Model ID
- API Key (ẩn: ••••••••)
- Base URL
- Badge "Mặc định" nếu là default
- Trạng thái Active/Inactive

## Cách Hoạt Động

### 1. Load Model từ Database

File: `web/app/api/pipeline/_gemini.ts`

```typescript
async function getModelConfig() {
  // Load default model từ DB
  const defaultModel = await prisma.aIModel.findFirst({
    where: {
      isDefault: true,
      isActive: true,
    },
  });

  if (defaultModel) {
    return {
      modelId: defaultModel.modelId,
      apiKey: defaultModel.apiKey || process.env.GEMINI_API_KEY,
      baseUrl: defaultModel.baseUrl || process.env.GEMINI_BASE_URL,
    };
  }

  // Fallback to env variables
  return {
    modelId: process.env.GEMINI_MODEL,
    apiKey: process.env.GEMINI_API_KEY,
    baseUrl: process.env.GEMINI_BASE_URL,
  };
}
```

### 2. Cache Model Config

- Cache trong memory 5 phút
- Tránh query DB liên tục
- Auto refresh khi hết TTL

### 3. Fallback Strategy

1. **Database** - Load model mặc định từ DB
2. **Environment Variables** - Nếu DB không có hoặc lỗi
3. **Hardcoded Default** - Nếu cả 2 đều fail

## Seed Data

File: `web/prisma/seed-ai-models.ts`

Chạy seed:
```bash
cd web
npx tsx prisma/seed-ai-models.ts
```

Models được seed:
1. **Gemini 2.0 Flash** (default, active)
2. **ChatGPT 4o** (inactive)
3. **Grok** (inactive)
4. **Claude 3.5 Sonnet** (inactive)

## Cấu Hình Model Mới

### Ví dụ: Thêm ChatGPT 4o

1. Vào `/cau-hinh/ai-models`
2. Click "Thêm Model"
3. Điền thông tin:
   - **Tên**: ChatGPT 4o
   - **Provider**: openai
   - **Model ID**: gpt-4o
   - **API Key**: sk-proj-...
   - **Base URL**: https://api.openai.com/v1
   - **Icon**: 🤖
   - **Description**: OpenAI GPT-4o
4. Check "Kích hoạt"
5. Check "Đặt làm mặc định" (nếu muốn dùng làm default)
6. Click "Lưu"

## Priority Order

Khi load model, hệ thống ưu tiên:

1. **Model Override** - Nếu code truyền `modelOverride` parameter
2. **Database Default** - Model có `isDefault=true` và `isActive=true`
3. **Environment Variable** - `GEMINI_MODEL` trong `.env.local`
4. **Hardcoded Fallback** - `DevGOVietnam-Frontier`

## Security Notes

⚠️ **API Keys trong Database:**
- API keys được lưu plain text trong DB
- Nên encrypt API keys trước khi lưu (TODO)
- Hoặc chỉ lưu reference, API key thực vẫn ở env

⚠️ **Access Control:**
- Chỉ admin mới được xem/sửa AI models
- API routes đã có `requireAuth()`

## Testing

### Test API:
```bash
# Get models
curl http://localhost:3000/api/ai-models

# Create model
curl -X POST http://localhost:3000/api/ai-models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Model",
    "provider": "gemini",
    "modelId": "test-model",
    "isActive": true
  }'
```

### Test UI:
1. Vào http://localhost:3000/cau-hinh/ai-models
2. Kiểm tra hiển thị danh sách
3. Thử thêm/sửa/xóa model
4. Thử toggle active/default

## Files Changed

### Database:
- `web/prisma/schema.prisma` - Added AIModel model
- `web/prisma/seed-ai-models.ts` - Seed script

### API:
- `web/app/api/ai-models/route.ts` - CRUD API
- `web/app/api/pipeline/_gemini.ts` - Load model from DB

### UI:
- `web/app/cau-hinh/ai-models/page.tsx` - Management page
- `web/components/Sidebar.tsx` - Added menu item

### Documentation:
- `AI_MODELS_MANAGEMENT.md` - This file

## Next Steps

### TODO:
1. ✅ Basic CRUD operations
2. ✅ UI management page
3. ✅ Load model from DB
4. ⏳ Encrypt API keys
5. ⏳ Model usage statistics
6. ⏳ Model performance tracking
7. ⏳ A/B testing between models
8. ⏳ Cost tracking per model

## Troubleshooting

### Model không load từ DB?
- Check database connection
- Check có model nào `isDefault=true` và `isActive=true` không
- Check cache (restart server để clear cache)

### API key không hoạt động?
- Verify API key trong database
- Check baseUrl có đúng không
- Test API key trực tiếp với provider

### Không thể xóa model?
- Model mặc định không thể xóa
- Phải set model khác làm default trước

## Support

Nếu có vấn đề, check:
1. Database logs: `npx prisma studio`
2. Server logs: Console output
3. Browser console: Network tab
