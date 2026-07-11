# AI-HUMANNESS-RULES.md
## Rule hệ thống Kiểm tra & Humanize AI — Rút từ JustDone + Sidekicker

> **Nguồn phân tích:** justdone.com/vi/ai-detector · justdone.com/vi/ai-humanizer
> · sidekicker.ai/vi/ai-detector · sidekicker.ai/vi/ai-humanizer
>
> **Áp dụng vào:** `/viet-bai-thong-minh/step4` — Tab AI → AICheckPanel
> **Ngày:** 2026-05-29

---

## PHẦN 1 — PHÂN TÍCH CHI TIẾT 2 PLATFORM

### 1.1 JustDone — Triết lý & cơ chế

**Triết lý cốt lõi:** "Viết thông minh hơn. Không chỉ an toàn hơn."
→ Không phải chỉ detect AI để tránh bị bắt — mà để bài thực sự TỐT HƠN.

**3 tầng detection (theo thứ tự xử lý):**

```
Tầng 1: PHÂN TÍCH TÍN HIỆU (Signal Analysis)
├── Từ được chọn theo quy luật (predictable word choice)
├── Nhịp điệu câu văn nhất quán (consistent sentence rhythm)
├── Sự lặp lại về cấu trúc (structural repetition)
└── Phát hiện cả sau khi qua paraphrase/grammar tool

Tầng 2: XÁC THỰC NGỮ CẢNH (Context Validation)
├── Kiểm tra tính nhất quán ngữ nghĩa xuyên suốt tài liệu
├── Giảm false positive cho văn học thuật / chuyên nghiệp
├── Giảm false positive cho người không phải native speaker
└── Hiệu chỉnh theo loại nội dung (academic vs casual)

Tầng 3: BÁO CÁO TIN CẬY (Confidence Report)
├── Điểm số tổng (Overall score /100)
├── Highlight từng câu cụ thể gây cảnh báo
├── Lý do cụ thể tại sao câu đó bị flag
└── Hướng dẫn: cái gì cần sửa, cái gì không cần
```

**Accuracy claims (JustDone tự công bố):**
- 80% accuracy tổng thể
- 98% với văn bản học thuật/khoa học
- 10.3% false positive rate

**Humanizer workflow (JustDone):**
1. Phát hiện cụm từ cứng nhắc / lặp lại → hiển thị rõ
2. Viết lại câu bị flag → giữ nguyên ý nghĩa gốc
3. Điều chỉnh tone theo yêu cầu (professional ↔ casual) real-time
4. Không phải chỉ paraphrase — thay đổi nhịp điệu + lựa chọn từ + luồng câu

---

### 1.2 Sidekicker — Triết lý & cơ chế

**Triết lý cốt lõi:** "Giữ nguyên yếu tố con người. Không AI ẩn giấu."
→ Focus B2B: báo cáo, đề xuất, nội dung client-facing — phải CHUYÊN NGHIỆP + BRAND VOICE.

**Điểm khác biệt so với JustDone:**

| Dimension | JustDone | Sidekicker |
|---|---|---|
| Target | Học sinh / content creator | Đội ngũ doanh nghiệp / B2B |
| Focus | Score + sentence flag | Giọng điệu nhất quán + brand voice |
| Upload | Paste text | Paste + upload document |
| Extra check | Fact checker | Tone consistency across doc |
| Humanize goal | Pass AI detector | Phản ánh đúng brand voice |
| Vietnamese | Explicitly optimized | Không nêu |

**3 tính năng Humanizer (Sidekicker):**
1. Tự động điều chỉnh: ngôn ngữ + giọng điệu + nhịp điệu — cùng lúc, không tách riêng
2. Mỗi lần chỉnh phải tự nhiên VÀ phù hợp thương hiệu
3. Không chỉ làm khác → làm THỰC SỰ TỰ NHIÊN như con người viết

**Sidekicker detector — 3 output:**
1. Xác định phần do AI tạo ra (trong tài liệu lớn)
2. Tóm tắt chi tiết mỗi lần scan
3. Actionable guidance để fix

---

## PHẦN 2 — RULE HỆ THỐNG ĐẦY ĐỦ

### NHÓM A — DETECTION RULES (Cái gì cần phát hiện)

#### A1. Signal Rules — 5 tín hiệu AI bắt buộc scan

```typescript
const AI_SIGNALS = {
  // A1.1 — Từ cấm (đã có trong CLAUDE.md, map trực tiếp)
  bannedWords: {
    group1_ai_transitions: [
      'quan trọng', 'hiệu quả', 'tuy nhiên', 'bên cạnh đó', 'đáng kể',
      'không thể phủ nhận', 'toàn diện', 'tối ưu hóa', 'đặc biệt quan trọng',
      'nhìn chung', 'thực tế cho thấy', 'đặc biệt là', 'chính vì vậy',
      'Như vậy', 'Tóm lại', 'Nói tóm lại', 'Như đã đề cập'
    ],
    group2_cliche_openers: [
      'Trong cuộc sống hiện đại', 'Ngày nay', 'Hiện nay', 'Bạn có biết rằng',
      'Trong xã hội ngày nay', 'Trong bài viết này', 'Trên đây là',
      'hy vọng bài viết', 'thông tin hữu ích'
    ],
    group3_fluff_adjectives: [
      'đa dạng', 'phong phú', 'đa dạng và phong phú', 'vô cùng', 'cực kỳ',
      'tuyệt vời', 'đáng chú ý'
    ],
    group4_ai_patterns: ['không chỉ', 'mà còn'],  // pattern: "không chỉ...mà còn"
    group5_marketing_fluff: ['siêu phẩm', 'số 1', 'đẳng cấp', 'hoàn hảo']
  },

  // A1.2 — Nhịp điệu câu đều (tất cả câu cùng độ dài → AI signature)
  rhythmCheck: {
    rule: 'Nếu 3+ câu liên tiếp có độ dài tương đương (±3 từ) → flag',
    targetRange: '7-18 từ/câu (theo CLAUDE.md)',
    action: 'Gợi ý xen câu ngắn hoặc câu dài để phá nhịp đều'
  },

  // A1.3 — Cấu trúc lặp (bullet list kiểu AI: mỗi item cùng pattern)
  structureRepeat: {
    rule: 'Nếu 4+ bullet items đều bắt đầu bằng danh từ/tính từ → flag',
    action: 'Gợi ý viết lại 1-2 items theo cấu trúc khác'
  },

  // A1.4 — Thiếu specificity (số liệu chung → AI pattern)
  specificityCheck: {
    rule: 'Câu có tính từ chung (bền, đẹp, tốt) mà không có số liệu đi kèm → flag',
    example_bad: '"khung sắt bền chắc"',
    example_good: '"khung sắt 1.4mm, tải 200kg"',
    action: 'Gợi ý thêm số liệu cụ thể'
  },

  // A1.5 — Xưng hô sai kênh (brand rule của Minh Quân)
  pronounCheck: {
    rule: 'Blog SEO: phải dùng "Nội Thất Minh Quân" / "chúng tôi" — "bạn / quý khách"',
    flag: 'Nếu dùng "mình", "em", "tôi" trong blog → sai kênh',
    action: 'Gợi ý đổi xưng hô đúng theo kênh'
  }
}
```

#### A2. Context Validation Rules — Không flag nhầm

```typescript
const FALSE_POSITIVE_RULES = {
  // A2.1 — Từ kỹ thuật nội thất KHÔNG phải AI fluff
  allowedTechnical: [
    'kích thước', 'chất liệu', 'bảo hành', 'tải trọng',
    'khung sắt', 'ván MDF', 'sơn tĩnh điện', 'giao hàng'
  ],

  // A2.2 — Câu ngắn (<5 từ) KHÔNG check nhịp điệu
  shortSentenceExempt: true,

  // A2.3 — Câu hỏi (?) KHÔNG check cấu trúc lặp
  questionExempt: true,

  // A2.4 — Heading H2/H3 KHÔNG check specificity (heading cần ngắn gọn)
  headingExempt: true,

  // A2.5 — CTA cuối bài ("Liên hệ ngay", "Xem thêm") KHÔNG flag dù ngắn
  ctaExempt: [
    'liên hệ', 'xem thêm', 'đặt hàng', 'báo giá', 'tư vấn'
  ]
}
```

---

### NHÓM B — REPORTING RULES (Hiển thị kết quả như thế nào)

#### B1. Score Display Rules

```typescript
const SCORE_RULES = {
  // B1.1 — Humanness Score (đã có trong CLAUDE.md)
  humannessScore: {
    gte76: 'PASS — xanh lá ✅ — cho phép publish',
    gte60_lt76: 'REVIEW — vàng ⚠️ — cần xem lại',
    lt60: 'FAIL — đỏ ❌ — tự động gửi lại để rewrite'
  },

  // B1.2 — Breakdown score theo loại lỗi (MỚI — từ JustDone)
  breakdown: {
    bannedWordScore: '0 = tốt, mỗi từ cấm trừ 3-5 điểm',
    rhythmScore: 'mỗi đoạn nhịp đều trừ 5 điểm',
    specificityScore: 'mỗi câu thiếu số liệu trừ 2 điểm',
    pronounScore: 'mỗi lỗi xưng hô trừ 4 điểm',
    toneScore: 'tone inconsistency trừ 10 điểm (từ Sidekicker)'
  },

  // B1.3 — Tone Consistency Score (MỚI — từ Sidekicker)
  toneConsistency: {
    description: 'Toàn bài có cùng giọng điệu Minh Quân không?',
    checkPoints: [
      'Intro có cùng tone với body không?',
      'Sau khi AI edit, tone có bị vỡ không?',
      'Phần CTA có quá khác với phần giới thiệu không?'
    ],
    display: '0-100, ≥80 = nhất quán'
  }
}
```

#### B2. Sentence-level Flag Display Rules

```typescript
const FLAG_DISPLAY_RULES = {
  // B2.1 — Mỗi câu bị flag PHẢI hiển thị đủ 3 thứ (từ JustDone)
  requiredPerFlag: {
    text: 'Trích đoạn câu bị flag (tối đa 60 ký tự)',
    reason: 'Lý do cụ thể (tên nhóm từ cấm / loại signal)',
    action: 'Button [⚡ Sửa ngay] + [Bỏ qua]'
  },

  // B2.2 — Màu sắc theo mức độ nghiêm trọng
  severity: {
    critical: 'đỏ — từ cấm nhóm 4-5 (AI signature + marketing fluff)',
    warning: 'vàng — từ cấm nhóm 1-3 (transition words + fluff adj)',
    info: 'xanh nhạt — nhịp câu đều / thiếu specificity'
  },

  // B2.3 — Giới hạn hiển thị (tránh overwhelming)
  displayLimit: {
    maxFlags: 10,  // tối đa 10 flag cùng lúc
    groupBy: 'type',  // nhóm cùng loại lỗi lại
    message: 'Hiển thị lỗi nặng nhất trước'
  },

  // B2.4 — Empty state (không có lỗi)
  emptyState: 'Bài viết đạt chuẩn ✅ — Không phát hiện dấu hiệu AI'
}
```

---

### NHÓM C — FIX WORKFLOW RULES (Sửa như thế nào)

#### C1. One-click Fix Rules (từ JustDone)

```typescript
const FIX_WORKFLOW_RULES = {
  // C1.1 — Fix phải giữ nguyên ý nghĩa gốc (JustDone rule)
  preserveMeaning: true,

  // C1.2 — Fix KHÔNG được thêm từ cấm mới
  avoidNewBannedWords: true,

  // C1.3 — Fix PHẢI giữ xưng hô đúng kênh (Minh Quân brand rule)
  maintainPronoun: 'Giữ đúng xưng hô theo kênh (blog: "Nội Thất Minh Quân" / "bạn")',

  // C1.4 — Fix PHẢI giữ số liệu cụ thể nếu có trong câu gốc
  preserveNumbers: true,

  // C1.5 — Sau fix → tự động re-scan câu đó (JustDone: "scan lại để đảm bảo")
  autoRescan: {
    trigger: 'sau mỗi handleAiEditCommand',
    scope: 'rescan chỉ câu đã fix, không rescan toàn bài',
    updateScore: true
  }
}
```

#### C2. Brand Voice Fix Rules (từ Sidekicker)

```typescript
const BRAND_VOICE_RULES = {
  // C2.1 — Humanize phải phản ánh đúng 3 từ khóa Minh Quân
  brandKeywords: ['Chân thật', 'Chuyên nghiệp', 'Gần gũi'],

  // C2.2 — Câu sau fix KHÔNG được có tính từ rỗng (Sidekicker: "không máy móc")
  noFluffAfterFix: true,

  // C2.3 — Tone adjustment (từ JustDone: "điều chỉnh âm điệu")
  toneOptions: {
    professional: 'Giữ giọng chuyên nghiệp — thông số kỹ thuật rõ ràng',
    casual: 'Giữ giọng gần gũi — xưng hô anh/chị, câu ngắn',
    current: 'Giữ nguyên tone hiện tại của đoạn đó'
  },

  // C2.4 — Fix phải nhất quán với tone của toàn bài (Sidekicker: tone consistency)
  toneConsistencyAfterFix: 'Câu fix phải có cùng register với 3 câu xung quanh'
}
```

---

### NHÓM D — PUBLISH GATE RULES (Từ JustDone concept + CLAUDE.md)

```typescript
const PUBLISH_GATE = {
  // D1 — Điều kiện PASS để publish (tất cả phải đạt)
  required: {
    humannessScore: '>= 76',         // rule từ CLAUDE.md
    bannedWordCount: '=== 0',         // không còn từ cấm nào
    criticalFlags: '=== 0',           // không còn flag đỏ nào
    toneConsistency: '>= 70'          // tone nhất quán tối thiểu
  },

  // D2 — Điều kiện REVIEW (được publish nhưng cần xem lại)
  review: {
    humannessScore: '>= 60',
    warningFlags: '<= 3',             // tối đa 3 flag vàng còn lại
    infoFlags: 'bất kỳ'              // flag xanh nhạt không block
  },

  // D3 — Điều kiện BLOCK (không cho publish)
  block: {
    humannessScore: '< 60',
    OR: 'bannedWordCount > 0',
    OR2: 'criticalFlags > 0',
    action: 'Tự động trigger rewrite hoặc show error message cụ thể'
  },

  // D4 — Error message phải nói RÕ lý do (từ JustDone: "hướng dẫn cụ thể")
  errorMessages: {
    bannedWord: 'Còn {n} từ cấm: [{word1}, {word2}...]. Sửa trước khi publish.',
    lowScore: 'Humanness Score {score}/100 — chưa đạt 76. Dùng Tab AI để cải thiện.',
    criticalFlag: 'Còn {n} dấu hiệu AI nặng. Nhấn [⚡ Sửa ngay] để xử lý.'
  }
}
```

---

### NHÓM E — UX FLOW RULES (Luồng người dùng)

#### E1. Detection → Fix → Verify Loop (từ JustDone 3-step workflow)

```
STEP 1: SCAN (Người dùng nhấn "Kiểm tra AI")
  ├── Run bannedWordScan() — local regex, không cần API
  ├── Run rhythmCheck() — local logic
  ├── Run specificityCheck() — local heuristic
  ├── Call /api/vbt/ai-check — AI analyze tone consistency
  └── Display: overall score + breakdown + flagged sentences

STEP 2: FIX (Người dùng nhấn "⚡ Sửa ngay" trên câu bị flag)
  ├── Pass flagged sentence + fix type to handleAiEditCommand()
  ├── AI rewrites câu đó theo brand voice rules
  ├── Replace câu trong editor
  └── Auto re-scan câu đó → cập nhật flag status

STEP 3: VERIFY (Sau khi fix hết)
  ├── Show updated score
  ├── Nếu đạt → enable Publish button
  └── Nếu chưa đạt → show remaining issues cụ thể
```

#### E2. Progressive Disclosure Rules (tránh overwhelming — từ JustDone UX)

```typescript
const UX_RULES = {
  // E2.1 — Không show toàn bộ issues ngay
  initialDisplay: 'Score tổng + top 3 issues nghiêm trọng nhất',
  expandable: 'Nút "Xem thêm {n} vấn đề" để mở rộng',

  // E2.2 — Inline fix không làm mất context
  fixInPlace: 'Không redirect, không popup lớn — fix trực tiếp trong editor',

  // E2.3 — Feedback ngay sau fix (JustDone: cảm giác instant)
  fixFeedback: {
    optimistic: 'Immediately remove flag khỏi UI',
    verify: 'Background rescan, nếu còn lỗi → show lại'
  },

  // E2.4 — Score animation (JustDone: visual feedback)
  scoreAnimation: 'Animate score từ cũ → mới sau khi fix',

  // E2.5 — "Bỏ qua" option (JustDone cho phép dismiss)
  dismiss: {
    allowed: true,
    consequence: 'Flag ẩn đi, score vẫn giảm',
    reason: 'Người dùng có thể có lý do giữ nguyên câu đó'
  }
}
```

---

## PHẦN 3 — IMPLEMENTATION MAP (Áp dụng vào step4 cụ thể)

### 3.1 Files cần tạo/sửa

```
web/
├── app/viet-bai-thong-minh/step4/page.tsx
│   ├── THÊM: computeHumannessChecks() — chạy 5 detection signals
│   ├── THÊM: state humannessFlags[] — list câu bị flag
│   ├── THÊM: state toneConsistencyScore — từ API
│   ├── SỬA: AICheckPanel — hiển thị breakdown + flags
│   ├── SỬA: handleAiEditCommand — thêm 'fix-flagged-sentence' command
│   └── SỬA: publish gate — check đủ 4 điều kiện
│
├── lib/humanness/
│   ├── bannedWordScanner.ts   ← A1.1: scan từ cấm (local regex)
│   ├── rhythmChecker.ts       ← A1.2: check nhịp điệu câu
│   ├── specificityChecker.ts  ← A1.4: check số liệu cụ thể
│   └── pronounChecker.ts      ← A1.5: check xưng hô theo kênh
│
└── api/vbt/
    └── humanness-check/route.ts  ← gọi AI: tone consistency + overall score
```

### 3.2 AICheckPanel UI nâng cấp

```
┌─────────────────────────────────────────────────┐
│  🤖 Kiểm Tra AI & Chất Lượng                    │
├─────────────────────────────────────────────────┤
│  Humanness Score    [████████░░] 72/100  ⚠️     │
│  Tone Nhất Quán     [██████████] 88/100  ✅     │
│  Từ Cấm             3 từ vi phạm        ❌     │
├─────────────────────────────────────────────────┤
│  📍 Vấn đề cần xử lý (5)              [Xem tất] │
│  ┌─────────────────────────────────────────┐    │
│  │ 🔴 "...bên cạnh đó, sản phẩm còn..."   │    │
│  │    Nhóm 1 — AI transition word          │    │
│  │    [⚡ Sửa ngay]              [Bỏ qua]  │    │
│  ├─────────────────────────────────────────┤    │
│  │ 🟡 "...tuyệt vời cho mọi không gian..." │    │
│  │    Nhóm 3 — Tính từ rỗng nghĩa          │    │
│  │    [⚡ Sửa ngay]              [Bỏ qua]  │    │
│  ├─────────────────────────────────────────┤    │
│  │ 🔵 3 câu liên tiếp có độ dài tương đồng │    │
│  │    Nhịp điệu đều — dễ bị detect là AI   │    │
│  │    [⚡ Phá nhịp]              [Bỏ qua]  │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  [🔄 Scan lại]          [✅ Publish — Đã đạt]  │
│                    ↑ chỉ enable khi score ≥ 76  │
└─────────────────────────────────────────────────┘
```

### 3.3 VBT_AI_EDIT_COMMANDS — Command mới cần thêm

```typescript
// Thêm vào VBT_AI_EDIT_COMMANDS array hiện có (đang có 10 commands)
{
  id: 'fix-banned-word',
  label: '🔴 Xóa từ cấm & viết lại',
  prompt: `Câu này chứa từ cấm: "{bannedWord}". 
    Viết lại câu giữ nguyên ý nghĩa, 
    không dùng từ cấm, 
    dùng xưng hô "Nội Thất Minh Quân" / "chúng tôi",
    thêm số liệu cụ thể nếu thiếu.`
},
{
  id: 'fix-rhythm',
  label: '🔵 Phá nhịp câu đều',
  prompt: `Đoạn này có {n} câu liên tiếp cùng độ dài ({avg} từ). 
    Viết lại 1-2 câu để tạo nhịp điệu tự nhiên hơn (ngắn xen dài),
    giữ nguyên thông tin.`
},
{
  id: 'fix-specificity',
  label: '🟡 Thêm số liệu cụ thể',
  prompt: `Câu này dùng tính từ chung: "{vague_word}". 
    Thay bằng số liệu cụ thể từ context bài viết (kg, mm, ngày, %).
    Nếu không có số liệu → xóa tính từ đó.`
},
{
  id: 'fix-tone-consistency',
  label: '⚡ Đồng nhất giọng điệu',
  prompt: `Câu này có tone khác với phần còn lại của bài. 
    Bài viết đang dùng giọng: {detectedTone}.
    Viết lại câu này theo cùng giọng điệu, 
    giữ nguyên thông tin chính.`
}
```

---

## PHẦN 4 — PRIORITY ORDER (Triển khai theo thứ tự nào)

### Sprint 1 — Local detection (không cần API, impact ngay)
- [ ] `bannedWordScanner.ts` — regex scan 5 nhóm từ cấm từ CLAUDE.md
- [ ] Map kết quả vào `humannessFlags[]` state
- [ ] Hiển thị breakdown + flag list trong AICheckPanel
- [ ] Button [Bỏ qua] + dismiss logic

### Sprint 2 — One-click fix (tích hợp với AI edit có sẵn)
- [ ] Thêm 3 commands mới vào `VBT_AI_EDIT_COMMANDS`
- [ ] Wire [⚡ Sửa ngay] → `handleAiEditCommand('fix-banned-word', sentence)`
- [ ] Auto re-scan sau fix + animate score update

### Sprint 3 — Rhythm + Specificity check (local heuristic)
- [ ] `rhythmChecker.ts` — detect 3+ câu liên tiếp cùng độ dài
- [ ] `specificityChecker.ts` — detect tính từ rỗng thiếu số liệu
- [ ] Tích hợp vào scan pipeline

### Sprint 4 — Tone consistency (cần API)
- [ ] `/api/vbt/humanness-check` — gọi Claude analyze tone consistency
- [ ] Tích hợp `toneConsistencyScore` vào AICheckPanel
- [ ] Thêm vào publish gate

### Sprint 5 — Publish gate hoàn chỉnh
- [ ] 4 điều kiện check trước publish
- [ ] Error messages cụ thể theo từng loại lỗi
- [ ] Re-enable publish button sau khi fix đủ

---

## PHẦN 5 — ANTI-PATTERNS (Không làm theo)

Rút từ điểm yếu của cả 2 platform:

```
❌ KHÔNG làm:
- Chỉ show overall score mà không giải thích lý do → user không biết fix gì
- Block publish cứng mà không hướng dẫn fix cụ thể → frustrating
- Flag tất cả câu ngắn là AI → false positive cao
- Require API call cho mọi thứ → slow + expensive
- Mở popup/modal riêng để fix → mất context editor
- Re-scan toàn bài sau mỗi lần fix nhỏ → chậm

✅ NÊN làm:
- Local scan trước (nhanh, free) → API scan sau (chính xác hơn)
- Fix inline trong editor, không rời trang
- Re-scan chỉ câu đã fix (scope nhỏ)
- Show max 10 issues, group theo loại
- Cho phép dismiss (Bỏ qua) với reason
- Animate score để user thấy progress
```

---

*File này là Rule chuẩn — mọi implement phải tuân theo.*
*Update khi có insight mới từ competitor analysis.*
