import type { TinhGonOutlineType } from './types';

export const OUTLINE_PROMPTS: Record<TinhGonOutlineType, string> = {
  review_product: `
## LOẠI OUTLINE: Review sản phẩm

1. [Tên sản phẩm] là gì? — Giới thiệu ngắn, phân loại, ai dùng
2. Thông số kỹ thuật — Kích thước, chất liệu, màu sắc, trọng tải
3. Ưu điểm nổi bật — 3–4 điểm cụ thể, có số liệu
4. Nhược điểm cần biết — Thành thật 1–2 điểm
5. Giá bán & nơi mua — Bảng giá, nơi mua phù hợp
6. Câu hỏi thường gặp — FAQ 3–5 câu

Lưu ý: có thể dùng bảng HTML cho phần thông số.
`,
  how_to_choose: `
## LOẠI OUTLINE: Hướng dẫn chọn mua

1. Tại sao chọn [sản phẩm] quan trọng?
2. Tiêu chí 1: [tiêu chí quan trọng nhất]
3. Tiêu chí 2: [tiêu chí 2]
4. Tiêu chí 3: [tiêu chí 3]
5. Gợi ý sản phẩm theo nhu cầu
6. Checklist trước khi mua
`,
  compare: `
## LOẠI OUTLINE: So sánh sản phẩm

1. Tổng quan 2 lựa chọn đang so sánh
2. Bảng so sánh tổng hợp
3. So sánh chi tiết tiêu chí 1
4. So sánh chi tiết tiêu chí 2
5. So sánh chi tiết tiêu chí 3
6. Nên chọn loại nào?
`,
  faq: `
## LOẠI OUTLINE: Hỏi đáp FAQ

1. Giới thiệu chủ đề ngắn
2. Câu hỏi 1 phổ biến nhất
3. Câu hỏi 2 về giá/chất lượng
4. Câu hỏi 3 về giao hàng/lắp đặt
5. Câu hỏi 4 về bảo hành/đổi trả
6. Câu hỏi 5 về đặt hàng/liên hệ
`,
  listicle: `
## LOẠI OUTLINE: Danh sách Top N

1. Tiêu chí đánh giá
2. Top 1
3. Top 2
4. Top 3
5. Top 4 hoặc 5
6. Kết luận theo ngân sách/nhu cầu
`,
  problem_solution: `
## LOẠI OUTLINE: Vấn đề - Giải pháp

1. Vấn đề phổ biến
2. Nguyên nhân
3. Giải pháp 1
4. Giải pháp 2
5. Ví dụ thực tế
6. Hành động tiếp theo
`,
  step_guide: `
## LOẠI OUTLINE: Hướng dẫn từng bước

1. Chuẩn bị gì trước khi làm?
2. Bước 1
3. Bước 2
4. Bước 3
5. Bước 4 hoặc 5
6. Lưu ý quan trọng
`,
  story_brand: `
## LOẠI OUTLINE: Story thương hiệu

1. Thương hiệu bắt đầu từ đâu?
2. Điều gì tạo khác biệt?
3. Xưởng sản xuất & quy trình
4. Cam kết với khách hàng
5. Khách hàng nói gì?
6. Liên hệ & đặt hàng
`,
  use_case: `
## LOẠI OUTLINE: Trường hợp sử dụng

1. [Sản phẩm] phù hợp với không gian nào?
2. Trường hợp 1
3. Trường hợp 2
4. Trường hợp 3
5. Trường hợp 4
6. Không phù hợp với trường hợp nào?
`,
  buying_guide: `
## LOẠI OUTLINE: Cẩm nang mua sắm

1. Trước khi mua: cần biết gì?
2. Ngân sách: phân khúc giá
3. Chất liệu: loại nào tốt?
4. Kích thước: chọn sao cho đúng?
5. Thương hiệu & nơi mua uy tín
6. Checklist trước khi đặt hàng
`,
};

export const FALLBACK_SECTIONS: Record<
  TinhGonOutlineType,
  Array<{ heading: string; notes: string }>
> = {
  review_product: [
    { heading: '{keyword} là gì và hợp với ai?', notes: 'Mở nhanh, vào đúng sản phẩm và nhu cầu phù hợp.' },
    { heading: 'Thông số kỹ thuật cần biết', notes: 'Nêu rõ kích thước, chất liệu, tải trọng, màu sắc nếu có.' },
    { heading: 'Ưu điểm nổi bật khi dùng {keyword}', notes: 'Tập trung lợi ích thật, có số liệu hoặc trải nghiệm thực tế.' },
    { heading: 'Nhược điểm và lưu ý trước khi mua', notes: 'Giữ sự trung thực để tăng độ tin cậy.' },
    { heading: 'Giá bán, chi phí đi kèm và nơi mua', notes: 'Đưa khoảng giá, thời gian giao, lắp đặt hoặc bảo hành.' },
    { heading: 'Câu hỏi thường gặp về {keyword}', notes: 'Chốt các thắc mắc hay gặp để tăng chuyển đổi.' },
  ],
  how_to_choose: [
    { heading: 'Vì sao cần chọn đúng {keyword}?', notes: 'Mô tả ngắn pain point của khách trước khi mua.' },
    { heading: 'Tiêu chí 1: Chất liệu và độ bền', notes: 'Chỉ ra điểm nên kiểm tra trước tiên.' },
    { heading: 'Tiêu chí 2: Kích thước và không gian đặt', notes: 'Gắn với diện tích hoặc layout thực tế.' },
    { heading: 'Tiêu chí 3: Ngân sách và mức đầu tư', notes: 'Phân nhóm giá để khách dễ ra quyết định.' },
    { heading: 'Nên chọn mẫu nào theo từng nhu cầu?', notes: 'Gợi ý 2-3 hướng chọn rõ ràng.' },
    { heading: 'Checklist trước khi chốt mua', notes: 'Tóm tắt thành danh sách dễ đọc và dễ áp dụng.' },
  ],
  compare: [
    { heading: 'Tổng quan 2 lựa chọn đang được so sánh', notes: 'Đặt bối cảnh và lý do cần so sánh.' },
    { heading: 'Bảng so sánh nhanh các tiêu chí chính', notes: 'Nếu phù hợp, có thể gợi ý chèn table HTML.' },
    { heading: 'So sánh về độ bền và vật liệu', notes: 'Đi vào cấu tạo, tuổi thọ, mức chịu lực.' },
    { heading: 'So sánh về giá và chi phí sử dụng', notes: 'Nhìn cả giá mua lẫn chi phí dài hạn nếu có.' },
    { heading: 'So sánh theo không gian và nhu cầu thực tế', notes: 'Phân theo người dùng hoặc bối cảnh dùng.' },
    { heading: 'Kết luận: trường hợp nào nên chọn?', notes: 'Chốt quyết định rõ, không trả lời mơ hồ.' },
  ],
  faq: [
    { heading: '{keyword} là gì và vì sao được quan tâm?', notes: 'Mở ngắn để dẫn vào cụm câu hỏi.' },
    { heading: 'Câu hỏi 1: Điều khách hỏi nhiều nhất', notes: 'Trả lời ngắn, chắc và có số liệu nếu có.' },
    { heading: 'Câu hỏi 2: Giá và chất lượng có tương xứng?', notes: 'Giải thích bằng tiêu chí cụ thể.' },
    { heading: 'Câu hỏi 3: Giao hàng hoặc lắp đặt thế nào?', notes: 'Nêu rõ thời gian, phạm vi, điều kiện.' },
    { heading: 'Câu hỏi 4: Bảo hành và đổi trả ra sao?', notes: 'Tăng trust bằng policy rõ ràng.' },
    { heading: 'Câu hỏi 5: Cách liên hệ hoặc đặt hàng nhanh', notes: 'Kết bằng CTA gọn.' },
  ],
  listicle: [
    { heading: 'Tiêu chí dùng để chọn top sản phẩm', notes: 'Giải thích ngắn để khách hiểu cách xếp hạng.' },
    { heading: 'Top 1 nổi bật nhất', notes: 'Nêu lý do đứng đầu, thông số và giá ngắn gọn.' },
    { heading: 'Top 2 đáng cân nhắc', notes: 'Nêu điểm mạnh và nhóm khách phù hợp.' },
    { heading: 'Top 3 cân bằng giữa giá và nhu cầu', notes: 'Giữ format ngắn, dễ quét.' },
    { heading: 'Các lựa chọn bổ sung đáng xem', notes: 'Tuỳ độ dài mục tiêu mà mở rộng thêm 1-2 mẫu.' },
    { heading: 'Nên chọn mẫu nào theo ngân sách?', notes: 'Chốt theo từng phân khúc tiền và nhu cầu.' },
  ],
  problem_solution: [
    { heading: 'Vấn đề thường gặp với {keyword}', notes: 'Mô tả đúng nỗi đau để người đọc thấy mình trong bài.' },
    { heading: 'Nguyên nhân cốt lõi của vấn đề', notes: 'Phân tích nguyên nhân thật, tránh nói chung chung.' },
    { heading: 'Giải pháp 1: Xử lý nhanh và tiết kiệm', notes: 'Ưu tiên giải pháp người đọc áp dụng ngay được.' },
    { heading: 'Giải pháp 2: Xử lý tận gốc hoặc bền hơn', notes: 'Cho thêm phương án nâng cấp hoặc thay thế.' },
    { heading: 'Ví dụ thực tế hoặc case tương tự', notes: 'Tăng độ tin cậy bằng tình huống thật.' },
    { heading: 'Bước tiếp theo nếu muốn xử lý gọn', notes: 'Kết bằng CTA nhẹ, thực dụng.' },
  ],
  step_guide: [
    { heading: 'Chuẩn bị gì trước khi bắt đầu?', notes: 'Dụng cụ, thông tin, số đo hoặc điều kiện cần có.' },
    { heading: 'Bước 1: Thiết lập và kiểm tra ban đầu', notes: 'Viết thành hành động cụ thể.' },
    { heading: 'Bước 2: Thực hiện phần chính', notes: 'Giải thích ngắn, tránh lan man.' },
    { heading: 'Bước 3: Kiểm tra và tinh chỉnh', notes: 'Nhắc các lỗi dễ gặp ở bước này.' },
    { heading: 'Bước cuối: Hoàn thiện và nghiệm thu', notes: 'Chốt checklist trước khi dùng thật.' },
    { heading: 'Lưu ý quan trọng để tránh làm sai', notes: 'Tổng hợp lỗi thường gặp và cách xử lý.' },
  ],
  story_brand: [
    { heading: 'Thương hiệu bắt đầu từ đâu?', notes: 'Kể origin story ngắn, có chi tiết thật.' },
    { heading: 'Điểm khác biệt khiến khách nhớ tới', notes: 'Nói USP bằng ngôn ngữ gần người đọc.' },
    { heading: 'Xưởng sản xuất và cách làm việc', notes: 'Tạo cảm giác minh bạch và tin cậy.' },
    { heading: 'Cam kết về chất lượng và dịch vụ', notes: 'Nêu bảo hành, giao hàng, chăm sóc sau mua.' },
    { heading: 'Khách hàng nhận được gì sau khi mua?', notes: 'Chuyển từ story sang value rõ ràng.' },
    { heading: 'Cách liên hệ hoặc đặt hàng nhanh', notes: 'Kết CTA tự nhiên, không quá sale.' },
  ],
  use_case: [
    { heading: '{keyword} hợp với không gian nào?', notes: 'Đặt vấn đề bằng nhu cầu sử dụng thực tế.' },
    { heading: 'Trường hợp 1: Phòng nhỏ hoặc diện tích hạn chế', notes: 'Nêu khoảng m2 và lý do phù hợp.' },
    { heading: 'Trường hợp 2: Phòng trọ hoặc nhà cho thuê', notes: 'Tập trung vào độ bền, dễ vệ sinh, tối ưu chi phí.' },
    { heading: 'Trường hợp 3: Homestay hoặc không gian dịch vụ', notes: 'Nhấn vào hiệu quả sử dụng và hình thức.' },
    { heading: 'Trường hợp 4: Gia đình cần tối ưu công năng', notes: 'Liên hệ đến nhu cầu sinh hoạt thực tế.' },
    { heading: 'Khi nào không nên chọn {keyword}?', notes: 'Nêu rõ giới hạn để tăng trust.' },
  ],
  buying_guide: [
    { heading: 'Trước khi mua {keyword}, cần biết gì?', notes: 'Mở bài theo góc thị trường và nhu cầu.' },
    { heading: 'Phân khúc giá: nên chuẩn bị ngân sách bao nhiêu?', notes: 'Chia theo tầm tiền và kỳ vọng.' },
    { heading: 'Chất liệu nào phù hợp nhất với nhu cầu?', notes: 'So sánh ngắn giữa các lựa chọn chính.' },
    { heading: 'Kích thước và số đo cần kiểm tra', notes: 'Nhắc cách đo và lỗi hay gặp khi chọn size.' },
    { heading: 'Mua ở đâu để yên tâm hơn?', notes: 'Tập trung uy tín, chính sách và hậu mãi.' },
    { heading: 'Checklist chốt đơn trước khi đặt hàng', notes: 'Tóm tắt dễ scan, giúp khách ra quyết định.' },
  ],
};
