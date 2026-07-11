import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHumanness, extractSentences } from './humanness';
import { computeKeywordDensity } from './text';

const HUMAN_LIKE_HTML = `
<article>
  <h1>Giường sắt 1m2 có hợp phòng trọ không?</h1>
  <p>Với phòng khoảng 12m2, giường sắt 1m2 thường đủ cho một người ngủ thoải mái mà vẫn chừa lối đi. Nếu khung dùng thép hộp 40x80 mm và phản dày từ 9 mm trở lên, cảm giác nằm sẽ chắc hơn khá rõ.</p>
  <p>Điểm nên kiểm tra trước khi mua là chiều cao gầm, vì phòng trọ thường cần chỗ để vali hoặc thùng đồ. Nhiều mẫu giao trong 2-3 ngày, nhưng nếu cần lên cầu thang hẹp thì nên hỏi trước kích thước từng kiện.</p>
  <p>Nếu ưu tiên bền và dễ vệ sinh, đây vẫn là lựa chọn hợp lý hơn nhiều mẫu khung mỏng giá quá thấp.</p>
</article>
`;

const AIISH_HTML = `
<article>
  <h1>Giường sắt 1m2 là gì?</h1>
  <p>Trong bài viết này, chúng tôi sẽ cung cấp thông tin hữu ích về giường sắt 1m2. Đây là một giải pháp vô cùng hiệu quả và đáng chú ý trong cuộc sống hiện đại.</p>
  <p>Nhìn chung, sản phẩm này được đánh giá là tuyệt vời. Bên cạnh đó, giường sắt 1m2 được sử dụng rộng rãi và được nhiều người lựa chọn.</p>
  <p>Tóm lại, đây là lựa chọn hoàn hảo và không thể phủ nhận là phương án số 1 hiện nay.</p>
</article>
`;

test('extractSentences returns meaningful sentence list', () => {
  const sentences = extractSentences(HUMAN_LIKE_HTML);
  assert.ok(sentences.length >= 3);
});

test('analyzeHumanness scores human-like article high', () => {
  const result = analyzeHumanness(HUMAN_LIKE_HTML);

  assert.ok(result.score >= 76);
  assert.equal(result.decision, 'PUBLISH');
  assert.equal(result.forbiddenFound.length, 0);
  assert.ok(result.metrics.specificDataHits > 0);
  assert.equal(
    result.scoreBreakdown.language_natural +
      result.scoreBreakdown.structure +
      result.scoreBreakdown.eeat_signals +
      result.scoreBreakdown.engagement,
    result.score,
  );
});

test('analyzeHumanness detects AI-ish patterns and forbidden words', () => {
  const result = analyzeHumanness(AIISH_HTML);

  assert.ok(result.score < 60);
  assert.equal(result.decision, 'REWRITE');
  assert.ok(result.forbiddenFound.length > 0);
  assert.ok(result.issues.length > 0);
});

test('computeKeywordDensity returns rounded percentage', () => {
  const density = computeKeywordDensity(HUMAN_LIKE_HTML, 'giường sắt 1m2');
  assert.ok(density > 0);
  assert.equal(Number.isFinite(density), true);
});
