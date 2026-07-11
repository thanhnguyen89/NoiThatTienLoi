export const SEO_PROMPT_RULES = `
## QUY TẮC VIẾT BÀI SEO (bắt buộc tuân thủ)

1. Chỉ trả về HTML thuần, không có markdown, không có backtick, không có giải thích.
2. Bắt đầu bằng <h1> chứa keyword chính. Chỉ có đúng 1 thẻ <h1> trong toàn bài.
3. Keyword chính xuất hiện tự nhiên ở 100 từ đầu tiên.
4. Mật độ keyword chính khoảng 1.0-1.5% trên toàn bài, không nhồi nhét.
5. Có ít nhất 2 thẻ <h2>. Cấu trúc heading đúng thứ bậc: h2 -> h3, không bỏ bậc.
6. Mỗi đoạn văn 40-80 từ. Không có đoạn quá 120 từ.
7. Có ít nhất 1 thẻ <a href> trỏ ra nguồn uy tín bên ngoài khi bài có claim thực tế.
8. Keyword phụ và semantic keywords xuất hiện tự nhiên trong body.
9. Không dùng bullet list quá 5 items liên tiếp mà không có đoạn văn xen kẽ.
10. Có thẻ <strong> cho ít nhất 3-5 cụm từ quan trọng.
11. Tất cả thẻ <img> phải có alt text chứa keyword hoặc mô tả đúng nội dung ảnh.
12. Không dùng các từ: "quan trọng", "hiệu quả", "tuy nhiên", "bên cạnh đó", "vô cùng", "siêu phẩm", "số 1", "đẳng cấp", "hoàn hảo", "không chỉ ... mà còn".
13. Kết bài bằng đoạn văn tổng kết 50-80 từ, không dùng heading "Kết luận".
14. Nếu content type là how_to: dùng <ol> cho từng bước, mỗi bước có <strong> tên bước.
15. Nếu content type là listicle: mỗi item là <h3> + đoạn mô tả 30-60 từ.
16. Nếu content type là comparison: có bảng <table> so sánh ít nhất 3 tiêu chí.
17. Nếu bài dài >= 1500 từ: thêm TOC dưới <h1>, dạng <nav> với <a href="#id">.
18. Nếu có FAQ trong dàn ý: dùng format <div class="faq-item"><h3 class="faq-q">...</h3><p class="faq-a">...</p></div>.
19. Không tạo nội dung sai sự thật. Nếu không biết số liệu cụ thể, dùng mô tả thay vì bịa số.
20. E-E-A-T: thể hiện kinh nghiệm thực tế bằng ví dụ cụ thể, tình huống thật, và số liệu có thể kiểm chứng.
21. Không mở bài bằng: "Trong cuộc sống hiện đại", "Ngày nay", "Bạn có biết rằng", "Trong bài viết này".
22. Nếu config có keywordLinks, chèn đúng vị trí tự nhiên trong bài.
23. Không wrap toàn bộ output trong <html><body>; chỉ trả về fragment HTML bắt đầu từ <h1>.
`.trim();

export const SNIPPET_RULES_BY_TONE: Record<string, string> = {
  how_to: `
## TỐI ƯU FEATURED SNIPPET - HOW TO
- Câu đầu tiên sau <h1> phải trả lời trực tiếp câu hỏi trong 1-2 câu.
- Dùng <ol> với mỗi bước bắt đầu bằng động từ hành động.
- Mỗi bước <= 40 từ để snippet không bị cắt cụt.
- H2 đầu tiên nên là "Cách [keyword] từng bước" hoặc "[Keyword]: Hướng dẫn chi tiết".
`.trim(),

  listicle: `
## TỐI ƯU FEATURED SNIPPET - LISTICLE
- Câu đầu sau <h1>: "[Số] [keyword] tốt nhất gồm: [list 3-5 tên ngắn]".
- Dùng <ol> hoặc <ul> cho danh sách, mỗi item 1 dòng tên + 1 câu mô tả.
- Đặt list chính ở phần đầu bài trước khi giải thích chi tiết.
`.trim(),

  comparison: `
## TỐI ƯU FEATURED SNIPPET - COMPARISON
- Đặt bảng <table> ở gần đầu bài sau intro ngắn 30-50 từ.
- Hàng đầu bảng là tên các phương án, cột đầu là tiêu chí so sánh.
- Sau bảng có 1-2 câu kết luận kiểu: "[A] phù hợp khi..., [B] phù hợp khi...".
`.trim(),

  review: `
## TỐI ƯU FEATURED SNIPPET - REVIEW
- Câu đầu phải đưa ra kết luận ngắn (tốt/trung bình/không nên) kèm lý do chính.
- Nếu phù hợp, có thể chèn rating schema dạng <span itemprop="ratingValue">4.5</span>/5.
- Ưu và nhược điểm nên ở dạng <ul> với mỗi item ngắn, rõ ý.
`.trim(),

  blog_seo: '',
  pillar: '',
  local_seo: '',
};
