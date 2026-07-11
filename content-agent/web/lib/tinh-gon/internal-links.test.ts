import test from 'node:test';
import assert from 'node:assert/strict';
import { rankInternalLinks } from './internal-links';

test('rankInternalLinks returns relevant links and excludes near-duplicate topic', () => {
  const links = rankInternalLinks({
    keyword: 'giường sắt 1m2',
    html: '<article><p>Bài đang viết chưa có internal link nào.</p></article>',
    baseUrl: 'https://example.com',
    articles: [
      { title: 'Cách chọn giường sắt cho phòng trọ', slug: 'cach-chon-giuong-sat-phong-tro', keyword: 'chọn giường sắt' },
      { title: 'Kích thước giường 1m2 cho phòng nhỏ', slug: 'kich-thuoc-giuong-1m2-phong-nho', keyword: 'giường 1m2 phòng nhỏ' },
      { title: 'Giường sắt 1m2', slug: 'giuong-sat-1m2', keyword: 'giường sắt 1m2' },
      { title: 'Bàn học gỗ công nghiệp', slug: 'ban-hoc-go-cong-nghiep', keyword: 'bàn học' },
    ],
  });

  assert.ok(links.length >= 1);
  assert.equal(links.some((link) => link.slug === 'giuong-sat-1m2'), false);
  assert.equal(links[0].url.startsWith('https://example.com/'), true);
});
