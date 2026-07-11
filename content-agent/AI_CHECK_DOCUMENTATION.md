# 🔍 Tài Liệu Kiểm Tra Giọng AI (AI Detection)

## Tổng Quan

Hệ thống **AI Check** phân tích bài viết để phát hiện "giọng AI" mà Google có thể nhận diện, dựa trên các chỉ số **perplexity** và **burstiness**.

## Vị Trí Trong Ứng Dụng

### Bước 4 - Editor (Step 4)
- **Tab "AI"** trong sidebar bên phải
- Nằm cạnh tab "SEO" và "HÌNH ẢNH"
- Component: `AICheckPanel`

```
┌─────────────────────────────────────┐
│ Editor                              │
│ [Nội dung bài viết]                 │
└─────────────────────────────────────┘
                                    ┌───┐
                                    │SEO│
                                    │AI │ ← Tab này
                                    │IMG│
                                    └───┘
```

## Cách Hoạt Động

### 1. Quy Trình Phân Tích

```
HTML Content
    ↓
[Bước 1] Tách câu (extractSentences)
    ↓
[Bước 2] Rule-based Check (nhanh, không cần AI)
    ├─ Forbidden words
    ├─ Uniform sentences
    ├─ Passive voice
    ├─ Cliché openings
    └─ No specific data
    ↓
[Bước 3] Gemini AI Analysis (phân tích từng câu)
    ├─ Perplexity check
    ├─ Burstiness check
    └─ Risk level: SAFE/WARNING/DANGER
    ↓
[Bước 4] Tính AI Score (0-100)
    ↓
[Kết quả] AICheckResult
```

### 2. Rule-Based Check (Không Cần AI)

#### A. Forbidden Words (Từ Cấm)
Danh sách từ AI thường dùng:

**Transition Words:**
- `tuy nhiên`, `bên cạnh đó`, `nhìn chung`
- `thực tế cho thấy`, `đặc biệt là`, `chính vì vậy`
- `như vậy`, `tóm lại`, `nói tóm lại`

**Tính Từ Chung Chung:**
- `quan trọng`, `hiệu quả`, `đáng kể`
- `toàn diện`, `tối ưu hóa`, `đặc biệt quan trọng`
- `vô cùng`, `cực kỳ`, `tuyệt vời`

**Cliché Phrases:**
- `trong cuộc sống hiện đại`, `ngày nay`, `hiện nay`
- `bạn có biết rằng`, `trong xã hội ngày nay`
- `trong bài viết này`, `trên đây là`
- `hy vọng bài viết`, `thông tin hữu ích`

**Marketing Hype:**
- `siêu phẩm`, `số 1`, `đẳng cấp`, `hoàn hảo`
- `đa dạng và phong phú`

#### B. Cliché Openings (Mở Bài Sáo Rỗng)
```javascript
[
  'X là',
  'được biết đến',
  'từ lâu đã',
  'không ai có thể phủ nhận',
  'chắc hẳn bạn',
  'bạn đang tìm kiếm',
  'đây là lý do',
]
```

#### C. Uniform Sentences (Câu Đều Nhau)
- **Phát hiện:** >60% câu có 14-22 từ
- **Vấn đề:** AI thường viết câu đều nhau về độ dài
- **Giải pháp:** Pha trộn câu ngắn (5-8 từ) và câu dài (25-30 từ)

#### D. Passive Voice (Câu Bị Động)
- **Pattern:** `được/bị + động từ`
- **Ví dụ:** "Sản phẩm được làm từ gỗ sồi"
- **Nên:** "Minh Quân làm sản phẩm từ gỗ sồi"

#### E. No Specific Data (Thiếu Số Liệu)
- **Phát hiện:** Không có số, đơn vị (mm, kg, %, ngày...)
- **Vấn đề:** AI thường viết chung chung, không có số liệu cụ thể
- **Giải pháp:** Thêm thông số kỹ thuật, giá, thời gian giao hàng

### 3. Gemini AI Analysis

#### Prompt Gửi Đến Gemini
```
Bạn là chuyên gia phân tích nội dung AI cho thị trường Việt Nam.

Google phát hiện AI qua:
- Perplexity thấp: câu quá mượt, dễ đoán, không có bất ngờ
- Burstiness thấp: câu đều nhau về độ dài và cấu trúc
- Transition words máy móc: "tuy nhiên", "bên cạnh đó"
- Câu định nghĩa cứng: "X là...", "X được hiểu là..."
- Thiếu số liệu, ví dụ cụ thể, quan điểm cá nhân
- Kết câu quá tròn trịa, đúng format

Phân tích từng câu và trả về JSON:
[
  {
    "risk": "SAFE" | "WARNING" | "DANGER",
    "reasons": ["lý do"],
    "suggestion": "gợi ý viết lại"
  }
]
```

#### Risk Levels
- **SAFE (🟢):** Câu tự nhiên, không có dấu hiệu AI
- **WARNING (🟡):** Câu có một số dấu hiệu AI, nên cải thiện
- **DANGER (🔴):** Câu giọng AI rõ rệt, cần viết lại ngay

### 4. Tính AI Score (0-100)

```javascript
score = 0

// Từ sentence risk
score += (dangerCount / total) * 40    // max 40 điểm
score += (warningCount / total) * 20   // max 20 điểm

// Từ issues
score += forbiddenWords.length * 3     // max 15 điểm
score += uniformSentences ? 10 : 0     // 10 điểm
score += noSpecificData ? 8 : 0        // 8 điểm
score += passiveVoice * 1.5            // max 7 điểm

return Math.min(100, score)
```

#### Risk Level Mapping
- **0-34:** LOW (Nguy cơ thấp) 🟢
- **35-59:** MEDIUM (Nguy cơ trung bình) 🟡
- **60-100:** HIGH (Nguy cơ cao) 🔴

## Giao Diện Người Dùng

### 1. Trạng Thái Ban Đầu (Chưa Check)

```
┌─────────────────────────────────────┐
│            🔍                       │
│                                     │
│      Kiểm tra giọng AI              │
│                                     │
│  Phân tích từng câu — xác định      │
│  đoạn nào Google có thể nhận        │
│  diện là nội dung AI.               │
│                                     │
│  Google dùng perplexity và          │
│  burstiness để detect AI.           │
│                                     │
│  [🔍 Phân tích bài viết]            │
└─────────────────────────────────────┘
```

### 2. Đang Phân Tích (Loading)

```
┌─────────────────────────────────────┐
│            ⏳                       │
│                                     │
│  Đang phân tích từng câu...         │
│  Khoảng 15–30 giây                  │
└─────────────────────────────────────┘
```

### 3. Kết Quả (Result)

#### A. Score Card
```
┌─────────────────────────────────────┐
│  ┌───┐                              │
│  │ 67│  Nguy cơ Cao                 │
│  │/100│  AI Probability             │
│  └───┘                              │
│                                     │
│  Bài viết có nguy cơ cao bị Google │
│  nhận diện là AI (67/100). Có 8    │
│  câu giọng máy rõ rệt, 12 câu cần  │
│  chú ý. Cần viết lại nhiều phần    │
│  trước khi đăng.                    │
│                                     │
│  🔴 8 câu giọng AI rõ               │
│  🟡 12 câu cần chú ý                │
│  🟢 15 câu tự nhiên                 │
│                                     │
│  [🔄 Phân tích lại]                 │
└─────────────────────────────────────┘
```

#### B. Issues Summary
```
┌─────────────────────────────────────┐
│ ⚠️ Vấn đề phát hiện                 │
│                                     │
│ Từ cấm AI:                          │
│ [tuy nhiên] [bên cạnh đó] [quan trọng]
│                                     │
│ Câu đều nhau:                       │
│ Nên pha câu ngắn (5–8 từ) và       │
│ câu dài (25–30 từ).                │
│                                     │
│ Thiếu số liệu:                      │
│ Không có mm, kg, %, ngày giao...   │
└─────────────────────────────────────┘
```

#### C. Filter Tabs
```
┌─────────────────────────────────────┐
│ [Tất cả (35)] [🔴 8] [🟡 12] [🟢 15]│
└─────────────────────────────────────┘
```

#### D. Sentence List

**DANGER (🔴):**
```
┌─────────────────────────────────────┐
│ 🔴 Giường ngủ gỗ sồi là sản phẩm   │
│    nội thất quan trọng trong phòng  │
│    ngủ hiện đại.              [🔧 Sửa]│
│                                     │
│ ▼ Lý do:                            │
│   • Dùng từ cấm "quan trọng"        │
│   • Mở bài cliché "X là..."         │
│   • Câu định nghĩa máy móc          │
│                                     │
│ 💡 Gợi ý viết lại:                  │
│ Giường gỗ sồi 1m6 của Minh Quân     │
│ chịu tải 250kg, giao trong 3 ngày.  │
│                                     │
│ [✏️ Chỉnh & Áp dụng]                │
└─────────────────────────────────────┘
```

**WARNING (🟡):**
```
┌─────────────────────────────────────┐
│ 🟡 Sản phẩm được làm từ gỗ sồi tự  │
│    nhiên, đảm bảo độ bền cao.  [🔧 Sửa]│
│                                     │
│ ▼ Lý do:                            │
│   • Câu bị động "được làm"          │
│   • Thiếu số liệu cụ thể            │
│                                     │
│ 💡 Gợi ý viết lại:                  │
│ Minh Quân làm từ gỗ sồi Nga, độ    │
│ ẩm 8-12%, chịu mối mọt 15 năm.     │
└─────────────────────────────────────┘
```

**SAFE (🟢):**
```
┌─────────────────────────────────────┐
│ 🟢 Giá 4.5 triệu, giao trong ngày  │
│    tại TPHCM.                       │
└─────────────────────────────────────┘
```

### 4. Chế Độ Chỉnh Sửa (Editing Mode)

```
┌─────────────────────────────────────┐
│ ✏️ Chỉnh sửa trước khi áp dụng:     │
│                                     │
│ Gốc: Giường ngủ gỗ sồi là sản phẩm │
│ nội thất quan trọng...              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Giường gỗ sồi 1m6 của Minh Quân │ │
│ │ chịu tải 250kg, giao trong 3    │ │
│ │ ngày tại TPHCM.                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [✅ Áp dụng vào bài]  [Hủy]         │
└─────────────────────────────────────┘
```

### 5. Sau Khi Áp Dụng

```
┌─────────────────────────────────────┐
│ 🔴 Giường ngủ gỗ sồi là sản phẩm   │
│    nội thất quan trọng...           │
│                          [✓ Đã sửa] │
└─────────────────────────────────────┘
```

## API Endpoint

### POST `/api/pipeline/ai-check`

**Request:**
```json
{
  "html": "<article><h1>Tiêu đề</h1><p>Nội dung...</p></article>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "aiScore": 67,
    "riskLevel": "HIGH",
    "sentences": [
      {
        "text": "Giường ngủ gỗ sồi là sản phẩm nội thất quan trọng...",
        "risk": "DANGER",
        "reasons": [
          "Dùng từ cấm 'quan trọng'",
          "Mở bài cliché 'X là...'",
          "Câu định nghĩa máy móc"
        ],
        "suggestion": "Giường gỗ sồi 1m6 của Minh Quân chịu tải 250kg..."
      }
    ],
    "flaggedPhrases": [
      "quan trọng",
      "tuy nhiên",
      "bên cạnh đó"
    ],
    "issues": {
      "forbiddenWords": ["quan trọng", "tuy nhiên"],
      "uniformSentences": true,
      "noSpecificData": true,
      "passiveVoice": 5,
      "clicheOpenings": ["X là", "được biết đến"]
    },
    "summary": "Bài viết có nguy cơ cao bị Google nhận diện là AI..."
  }
}
```

## Cách Sử Dụng

### 1. Từ Step 4 Editor

1. Viết xong bài → Click tab **"AI"** ở sidebar phải
2. Click **"🔍 Phân tích bài viết"**
3. Đợi 15-30 giây
4. Xem kết quả:
   - **AI Score:** Điểm nguy cơ (0-100)
   - **Risk Level:** LOW/MEDIUM/HIGH
   - **Sentences:** Danh sách câu với risk level

### 2. Sửa Câu Có Vấn Đề

**Cách 1: Sửa Thủ Công**
1. Click vào câu có 🔴 hoặc 🟡
2. Đọc lý do và gợi ý
3. Tự viết lại trong editor chính

**Cách 2: Áp Dụng Gợi Ý**
1. Click **"🔧 Sửa"** trên câu
2. Chỉnh sửa gợi ý nếu cần
3. Click **"✅ Áp dụng vào bài"**
4. Câu gốc sẽ được thay thế trong editor

### 3. Phân Tích Lại

Sau khi sửa nhiều câu:
1. Click **"🔄 Phân tích lại"**
2. Xem AI Score mới
3. Tiếp tục sửa nếu cần

## Các Chỉ Số Quan Trọng

### 1. Perplexity (Độ Bất Ngờ)
- **Thấp:** Câu dễ đoán, mượt mà → AI
- **Cao:** Câu có yếu tố bất ngờ → Human

**Ví dụ:**
```
❌ Thấp (AI): "Giường ngủ là sản phẩm quan trọng trong phòng ngủ."
✅ Cao (Human): "Giường 1m6 này chịu được 250kg — anh 90kg + chị 60kg + 2 đứa nhỏ vẫn ok."
```

### 2. Burstiness (Độ Biến Động)
- **Thấp:** Câu đều nhau → AI
- **Cao:** Câu ngắn dài xen kẽ → Human

**Ví dụ:**
```
❌ Thấp (AI):
"Giường ngủ gỗ sồi là sản phẩm nội thất cao cấp. (10 từ)
Sản phẩm được làm từ gỗ sồi tự nhiên. (9 từ)
Độ bền của sản phẩm rất cao và lâu dài. (10 từ)"

✅ Cao (Human):
"Giường gỗ sồi. (3 từ)
Minh Quân làm từ gỗ Nga, độ ẩm 8-12%, chịu mối mọt 15 năm. (14 từ)
Giá 4.5 triệu. (3 từ)
Giao trong ngày tại TPHCM, 3 ngày toàn quốc. (9 từ)"
```

## Best Practices

### ✅ Nên Làm

1. **Thêm Số Liệu Cụ Thể:**
   - Kích thước: 1m6 x 2m, dày 1.4mm
   - Trọng lượng: 45kg, chịu tải 250kg
   - Giá: 4.5 triệu, giảm 20%
   - Thời gian: giao trong 3 ngày

2. **Pha Trộn Độ Dài Câu:**
   - Câu ngắn: 3-8 từ
   - Câu trung: 10-15 từ
   - Câu dài: 20-30 từ

3. **Dùng Câu Chủ Động:**
   - ❌ "Sản phẩm được làm từ gỗ sồi"
   - ✅ "Minh Quân làm từ gỗ sồi Nga"

4. **Thêm Quan Điểm Cá Nhân:**
   - "Theo kinh nghiệm 10 năm của Minh Quân..."
   - "Khách hàng thường hỏi..."
   - "Anh em xưởng hay gọi là..."

5. **Dùng Ngôn Ngữ Thực Tế:**
   - ❌ "Sản phẩm có chất lượng tuyệt vời"
   - ✅ "Giường này chịu được 250kg — test thực tế"

### ❌ Tránh Làm

1. **Từ Cấm AI:**
   - Tuy nhiên, bên cạnh đó, nhìn chung
   - Quan trọng, hiệu quả, toàn diện
   - Vô cùng, cực kỳ, tuyệt vời

2. **Mở Bài Cliché:**
   - "X là..."
   - "Được biết đến..."
   - "Chắc hẳn bạn..."

3. **Câu Định Nghĩa:**
   - "Giường ngủ là nơi để nghỉ ngơi..."
   - "Gỗ sồi được hiểu là..."

4. **Kết Bài Máy Móc:**
   - "Trên đây là..."
   - "Hy vọng bài viết..."
   - "Thông tin hữu ích..."

## Ví Dụ Thực Tế

### Trước Khi Sửa (AI Score: 72/100 - HIGH)

```
Giường ngủ gỗ sồi là sản phẩm nội thất quan trọng trong phòng ngủ hiện đại. 
Sản phẩm được làm từ gỗ sồi tự nhiên, đảm bảo độ bền cao và thẩm mỹ. 
Tuy nhiên, để chọn được giường phù hợp, bạn cần xem xét nhiều yếu tố. 
Bên cạnh đó, giá cả cũng là vấn đề quan trọng cần cân nhắc.
```

**Vấn đề:**
- 🔴 Từ cấm: "quan trọng" (2 lần), "tuy nhiên", "bên cạnh đó"
- 🔴 Mở bài cliché: "X là..."
- 🟡 Câu bị động: "được làm"
- 🟡 Câu đều nhau: 12-14 từ/câu
- 🟡 Thiếu số liệu cụ thể

### Sau Khi Sửa (AI Score: 28/100 - LOW)

```
Giường gỗ sồi 1m6.
Minh Quân làm từ gỗ Nga, độ ẩm 8-12%, chịu mối mọt 15 năm.
Giá 4.5 triệu — giảm 20% tuần này.
Giao trong ngày tại TPHCM, 3 ngày toàn quốc.
Khách hàng hay hỏi: "Chịu được bao nhiêu kg?" — Test thực tế 250kg ok.
```

**Cải thiện:**
- ✅ Không có từ cấm
- ✅ Câu ngắn dài xen kẽ (3-14 từ)
- ✅ Câu chủ động
- ✅ Có số liệu cụ thể (1m6, 8-12%, 15 năm, 4.5 triệu, 250kg)
- ✅ Có quan điểm thực tế ("Khách hàng hay hỏi...")

## Performance

### Thời Gian Xử Lý
- **Rule-based check:** < 100ms
- **Gemini AI analysis:** 15-30 giây (tùy số câu)
- **Tổng:** ~20-35 giây cho bài 1200 từ

### Giới Hạn
- **Số câu phân tích:** Tối đa 30 câu/lần
- **Retry:** 3 lần nếu Gemini lỗi
- **Timeout:** 60 giây

## Troubleshooting

### Lỗi Thường Gặp

**1. "Không kết nối được server"**
- Kiểm tra server đang chạy
- Kiểm tra network connection

**2. "Lỗi phân tích"**
- Gemini API quota hết
- Nội dung quá dài (>30 câu)
- Retry sau vài phút

**3. "Áp dụng không hoạt động"**
- Cần mở từ editor bài viết
- `onApplyFix` callback phải được truyền vào

## Tương Lai (Future Enhancements)

### Có Thể Thêm

1. **Batch Analysis:**
   - Phân tích nhiều bài cùng lúc
   - Export báo cáo PDF

2. **Custom Rules:**
   - User tự thêm từ cấm
   - Tùy chỉnh threshold

3. **History:**
   - Lưu lịch sử phân tích
   - So sánh trước/sau

4. **Auto-Fix:**
   - Tự động sửa tất cả câu DANGER
   - One-click humanize

5. **Integration:**
   - Tích hợp với Grammarly
   - Tích hợp với Copyscape

## Kết Luận

Tính năng **AI Check** giúp:
- ✅ Phát hiện giọng AI trong bài viết
- ✅ Đưa ra gợi ý cụ thể để sửa
- ✅ Áp dụng thẳng vào editor
- ✅ Giảm nguy cơ bị Google phạt

**Mục tiêu:** AI Score < 35 (LOW) trước khi publish.

---

**Ngày cập nhật:** 9 tháng 5, 2026  
**Trạng thái:** ✅ Đang hoạt động  
**API:** `/api/pipeline/ai-check`
