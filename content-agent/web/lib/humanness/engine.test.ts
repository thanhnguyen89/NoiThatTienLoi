import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAICheckResult, extractSentenceTargets } from './engine';
import type { AIConfigData } from './types';

const CONFIG: AIConfigData = {
  FORBIDDEN_WORDS: ['tuy nhiên', 'bên cạnh đó', 'vô cùng', 'không chỉ', 'mà còn', 'hoàn hảo'],
  CLICHE_OPENINGS: ['Trong bài viết này', 'Bạn có biết rằng'],
};

const HTML = `
<article>
  <h1>Giường sắt 1m2 cho phòng trọ</h1>
  <p>Trong bài viết này, mình sẽ chia sẻ một vài kinh nghiệm thực tế khi chọn giường sắt 1m2.</p>
  <p>Tuy nhiên, mẫu này vô cùng phù hợp nếu cần khung cao 35 cm để chứa vali bên dưới.</p>
  <p>Khung thép hộp 40x80 mm, tải trọng khoảng 180 kg, nên cảm giác nằm chắc hơn khá rõ.</p>
  <p>Giường có thiết kế đẹp và phù hợp với nhiều không gian khác nhau.</p>
  <p>Khung sơn tĩnh điện giúp bề mặt dễ lau hơn sau vài tháng sử dụng.</p>
  <p>Giá giao trong 2-3 ngày nếu kho còn sẵn.</p>
</article>
`;

test('extractSentenceTargets builds sentence list from html', () => {
  const sentences = extractSentenceTargets(HTML);
  assert.ok(sentences.length >= 5);
});

test('buildAICheckResult detects banned words and pronouns from API config', () => {
  const result = buildAICheckResult({
    html: HTML,
    config: CONFIG,
    aiResult: {
      toneConsistencyScore: 74,
      sentenceInsights: [
        {
          index: 1,
          risk: 'DANGER',
          reasons: ['Transition word máy móc'],
          suggestion: 'Mẫu này hợp phòng trọ khi cần khoảng trống 35 cm dưới gầm để cất vali.',
        },
      ],
    },
  });

  assert.ok(result.issues.forbiddenWords.includes('tuy nhiên'));
  assert.ok(result.issues.pronounIssues.includes('mình'));
  assert.ok(result.flags.some((flag) => flag.type === 'banned_word'));
  assert.ok(result.flags.some((flag) => flag.type === 'pronoun'));
  assert.equal(result.breakdown.toneConsistencyScore, 74);
  assert.ok(result.humannessScore < 76);
});
