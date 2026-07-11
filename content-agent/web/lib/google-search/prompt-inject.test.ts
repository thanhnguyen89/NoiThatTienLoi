import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDataBlock } from './prompt-inject';

test('buildDataBlock creates structured prompt block', () => {
  const block = buildDataBlock({
    keyword: 'giường sắt 1m2',
    totalResults: '123000',
    fetchedAt: '2026-05-21T00:00:00.000Z',
    items: [
      {
        title: 'Giường sắt 1m2 loại nào tốt',
        link: 'https://example.com/a',
        snippet: 'Bài viết đánh giá nhanh',
        extractedText: 'Khung 1.4mm, tải 180kg, giao trong 3 ngày. Nội dung này được kéo dài thêm để vượt ngưỡng 100 ký tự và đảm bảo block "Nội dung" được render trong prompt.',
      },
    ],
  });

  assert.equal(block.includes('DỮ LIỆU THỰC TẾ TỪ GOOGLE'), true);
  assert.equal(block.includes('Keyword: "giường sắt 1m2"'), true);
  assert.equal(block.includes('https://example.com/a'), true);
  assert.equal(block.includes('Khung 1.4mm, tải 180kg'), true);
});
