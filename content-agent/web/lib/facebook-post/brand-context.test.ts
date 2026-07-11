import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrandContext } from './brand-context';
import type { FacebookPostRequest } from './types';

const EMPTY: FacebookPostRequest = {
  modelId: 'gemini-flash',
  keyword: 'giường sắt',
  wordCount: 140,
  tone: 'friendly',
  template: null,
  shopName: '',
  industry: '',
  brandPronouns: '',
  brandAudience: '',
  brandToneNotes: '',
  phone: '',
  address: '',
  brandDesc: '',
  brandForbidden: '',
  ctaStandard: '',
  mainProducts: '',
  includeEmojis: true,
  includeHashtags: true,
  freeShip: false,
  urgency: false,
};

test('buildBrandContext returns fallback when all brand fields are empty', () => {
  const result = buildBrandContext(EMPTY);
  assert.ok(result.includes('Không có thông tin thương hiệu'));
  assert.ok(result.includes('suy luận từ từ khóa'));
});

test('buildBrandContext returns single-line fallback (no extra newlines) when all empty', () => {
  const result = buildBrandContext(EMPTY);
  assert.equal(result.trim(), result);
  assert.ok(!result.includes('\n'));
});

test('buildBrandContext includes THƯƠNG HIỆU when shopName is set', () => {
  const result = buildBrandContext({ ...EMPTY, shopName: 'Nội Thất Minh Quân' });
  assert.ok(result.includes('THƯƠNG HIỆU / SHOP: Nội Thất Minh Quân'));
  assert.ok(!result.includes('Không có thông tin'));
});

test('buildBrandContext includes NGÀNH HÀNG when industry is set', () => {
  const result = buildBrandContext({ ...EMPTY, industry: 'Nội thất' });
  assert.ok(result.includes('NGÀNH HÀNG: Nội thất'));
});

test('buildBrandContext includes XƯNG HÔ when brandPronouns is set', () => {
  const result = buildBrandContext({ ...EMPTY, brandPronouns: 'Minh Quân' });
  assert.ok(result.includes('XƯNG HÔ: Minh Quân'));
});

test('buildBrandContext includes ĐỐI TƯỢNG when brandAudience is set', () => {
  const result = buildBrandContext({ ...EMPTY, brandAudience: 'gia đình trẻ, sinh viên thuê trọ' });
  assert.ok(result.includes('ĐỐI TƯỢNG KHÁCH HÀNG: gia đình trẻ, sinh viên thuê trọ'));
});

test('buildBrandContext includes SẢN PHẨM CHÍNH when mainProducts is set', () => {
  const result = buildBrandContext({ ...EMPTY, mainProducts: 'Giường sắt, tủ quần áo' });
  assert.ok(result.includes('SẢN PHẨM CHÍNH: Giường sắt, tủ quần áo'));
});

test('buildBrandContext trims mainProducts before including', () => {
  const result = buildBrandContext({ ...EMPTY, mainProducts: '  Giường sắt  ' });
  assert.ok(result.includes('SẢN PHẨM CHÍNH: Giường sắt'));
  assert.ok(!result.includes('  Giường sắt  '));
});

test('buildBrandContext skips mainProducts when whitespace-only', () => {
  const result = buildBrandContext({ ...EMPTY, mainProducts: '   ' });
  assert.ok(!result.includes('SẢN PHẨM CHÍNH'));
  assert.ok(result.includes('Không có thông tin thương hiệu'));
});

test('buildBrandContext includes HOTLINE when phone is set', () => {
  const result = buildBrandContext({ ...EMPTY, phone: '0909 123 456' });
  assert.ok(result.includes('HOTLINE: 0909 123 456'));
});

test('buildBrandContext includes ĐỊA CHỈ when address is set', () => {
  const result = buildBrandContext({ ...EMPTY, address: 'https://noithatminhquan.vn' });
  assert.ok(result.includes('ĐỊA CHỈ / WEBSITE: https://noithatminhquan.vn'));
});

test('buildBrandContext renders MÔ TẢ THƯƠNG HIỆU block for brandDesc', () => {
  const result = buildBrandContext({ ...EMPTY, brandDesc: 'Xưởng sản xuất trực tiếp từ 2015.' });
  assert.ok(result.includes('MÔ TẢ THƯƠNG HIỆU:'));
  assert.ok(result.includes('Xưởng sản xuất trực tiếp từ 2015.'));
});

test('buildBrandContext trims brandDesc before rendering', () => {
  const result = buildBrandContext({ ...EMPTY, brandDesc: '  Thương hiệu uy tín  ' });
  assert.ok(result.includes('Thương hiệu uy tín'));
  assert.ok(!result.includes('  Thương hiệu uy tín  '));
});

test('buildBrandContext skips brandDesc block when whitespace-only', () => {
  const result = buildBrandContext({ ...EMPTY, brandDesc: '   ' });
  assert.ok(!result.includes('MÔ TẢ THƯƠNG HIỆU'));
});

test('buildBrandContext renders GIỌNG VĂN block for brandToneNotes', () => {
  const result = buildBrandContext({ ...EMPTY, brandToneNotes: 'Chân thật, không hoa mỹ.' });
  assert.ok(result.includes('GIỌNG VĂN / USP / ĐỊNH VỊ:'));
  assert.ok(result.includes('Chân thật, không hoa mỹ.'));
});

test('buildBrandContext renders CTA CHUẨN block for ctaStandard', () => {
  const result = buildBrandContext({ ...EMPTY, ctaStandard: 'Inbox ngay để nhận báo giá trong ngày.' });
  assert.ok(result.includes('CTA CHUẨN'));
  assert.ok(result.includes('BẮT BUỘC'));
  assert.ok(result.includes('Inbox ngay để nhận báo giá trong ngày.'));
});

test('buildBrandContext trims ctaStandard before rendering', () => {
  const result = buildBrandContext({ ...EMPTY, ctaStandard: '  Inbox ngay  ' });
  assert.ok(result.includes('Inbox ngay'));
  assert.ok(!result.includes('  Inbox ngay  '));
});

test('buildBrandContext renders TỪ CẤM block for brandForbidden', () => {
  const result = buildBrandContext({ ...EMPTY, brandForbidden: 'siêu rẻ, vô địch' });
  assert.ok(result.includes('TỪ CẤM BỔ SUNG (KHÔNG ĐƯỢC DÙNG): siêu rẻ, vô địch'));
});

test('buildBrandContext skips brandForbidden when whitespace-only', () => {
  const result = buildBrandContext({ ...EMPTY, brandForbidden: '   ' });
  assert.ok(!result.includes('TỪ CẤM'));
});

test('buildBrandContext places shopName before phone in output', () => {
  const result = buildBrandContext({ ...EMPTY, shopName: 'Minh Quân', phone: '0909000000' });
  const shopPos = result.indexOf('THƯƠNG HIỆU');
  const phonePos = result.indexOf('HOTLINE');
  assert.ok(shopPos < phonePos);
});

test('buildBrandContext places inline fields before block fields', () => {
  const result = buildBrandContext({
    ...EMPTY,
    shopName: 'Minh Quân',
    brandDesc: 'Xưởng uy tín',
    ctaStandard: 'Inbox ngay',
  });
  const shopPos = result.indexOf('THƯƠNG HIỆU');
  const descPos = result.indexOf('MÔ TẢ THƯƠNG HIỆU');
  const ctaPos = result.indexOf('CTA CHUẨN');
  assert.ok(shopPos < descPos);
  assert.ok(descPos < ctaPos);
});

test('buildBrandContext renders all fields when fully populated', () => {
  const full: FacebookPostRequest = {
    ...EMPTY,
    shopName: 'Nội Thất Minh Quân',
    industry: 'Nội thất',
    brandPronouns: 'Minh Quân',
    brandAudience: 'gia đình trẻ',
    mainProducts: 'Giường sắt, tủ quần áo',
    phone: '0909 999 888',
    address: 'TP.HCM',
    brandDesc: 'Xưởng sản xuất trực tiếp',
    brandToneNotes: 'Chân thật, gần gũi',
    ctaStandard: 'Inbox ngay để được báo giá',
    brandForbidden: 'siêu rẻ',
  };

  const result = buildBrandContext(full);
  assert.ok(result.includes('THƯƠNG HIỆU'));
  assert.ok(result.includes('NGÀNH HÀNG'));
  assert.ok(result.includes('XƯNG HÔ'));
  assert.ok(result.includes('ĐỐI TƯỢNG KHÁCH HÀNG'));
  assert.ok(result.includes('SẢN PHẨM CHÍNH'));
  assert.ok(result.includes('HOTLINE'));
  assert.ok(result.includes('ĐỊA CHỈ / WEBSITE'));
  assert.ok(result.includes('MÔ TẢ THƯƠNG HIỆU'));
  assert.ok(result.includes('GIỌNG VĂN'));
  assert.ok(result.includes('CTA CHUẨN'));
  assert.ok(result.includes('TỪ CẤM'));
  assert.ok(!result.includes('Không có thông tin thương hiệu'));
});
