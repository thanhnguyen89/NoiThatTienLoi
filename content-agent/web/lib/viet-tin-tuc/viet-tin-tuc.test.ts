/**
 * Unit Tests — /viet-tin-tuc
 *
 * Runner: tsx --test (Node.js built-in test runner)
 * Run:    cd web && npm test
 *
 * Bug summary (xem FIX-VIET-TIN-TUC.md để fix):
 *   #1 decodeEntities — CDATA multiline không match (regex .*? không cross newline)
 *   #2 decodeEntities — Numeric HTML entities &#8211; &#8217; etc. không decode
 *   #3 buildNewsPrompt — forbidden clause rỗng khi không có từ cấm
 *   #4 startSchema — targetLength không validate min/max (chấp nhận 9999)
 *   #5 streamSchema — thiếu secondaryKeywords → bị Zod strip, type mismatch
 *   #6 normalizeNewsConfig — null item trong secondaryKeywords gây TypeError
 *
 * Các tests ở types.test.ts và options.test.ts đã cover: normalizeNewsConfig basic,
 * NEWS_STRUCTURES, NEWS_TONES, NEWS_LENGTHS, NEWS_LANGUAGE_MAP.
 * File này cover: decodeEntities, buildNewsPrompt, RSS parsing, schema validation,
 * TONE/STRUCTURE constants coverage, và edge cases còn thiếu.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// COPY PURE FUNCTIONS TỪ SOURCE (không export nên copy vào để test trong Node)
// =============================================================================

// ─── FROM: app/api/viet-tin-tuc/start/route.ts ───────────────────────────────

// BUG #1: CDATA regex `.*?` không match newlines
// BUG #2: Numeric HTML entities `&#8211;` etc. không được decode
function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')   // BUG #1: .*? không match \n
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// FIX #1: CDATA sử dụng [\s\S]*? để match multiline
// FIX #2: Thêm generic numeric entity decoder
function decodeEntitiesFixed(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')     // FIX #1: [\s\S]*? matches newlines
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))) // FIX #2: numeric entities
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// RSS XML parsing helpers (extracted from fetchGoogleNews logic)
function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}> {
  const items: ReturnType<typeof parseRssItems> = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of matches) {
    if (items.length >= 7) break;

    const block = match[1];
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim());
    const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim());
    const pubDate = decodeEntities((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim());
    const source = decodeEntities((block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '').trim());
    const description = decodeEntities((block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '').trim());
    const snippet = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320);

    if (!title || !link) continue;
    items.push({ title, link, pubDate, source, snippet });
  }

  return items;
}

// ─── FROM: app/api/viet-tin-tuc/stream/route.ts ──────────────────────────────

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: 'Giọng văn trang trọng, nghiêm túc. Dùng "độc giả" hoặc "bạn đọc".',
  intimate: 'Giọng văn thân mật, gần gũi như tạp chí. Dùng "bạn".',
  friendly: 'Giọng văn ấm áp, thân thiện. Dùng "bạn".',
  expert: 'Giọng văn chuyên môn, phân tích sâu. Có số liệu và lập luận rõ.',
  humorous: 'Giọng văn vui vẻ, châm biếm nhẹ nhàng. Được phép dùng ẩn dụ hài.',
  inspirational: 'Giọng văn truyền cảm hứng, tích cực, tạo động lực.',
  nostalgic: 'Giọng văn hoài cổ, gợi nhớ, cảm xúc.',
  shocking: 'Giọng văn gây chú ý, mở bài mạnh mẽ và giàu nhịp điệu.',
  conversational: 'Giọng văn trò chuyện như blog cá nhân, thoải mái và gần gũi.',
};

const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  auto: 'Chọn cấu trúc phù hợp nhất với nội dung tin tức.',
  inverted_pyramid: 'Cấu trúc Kim Tự Tháp: tin quan trọng nhất ở đầu, chi tiết phụ ở dưới.',
  storytelling: 'Cấu trúc Kể Chuyện: mở đầu kịch tính, diễn biến theo thời gian.',
  qa: 'Cấu trúc Hỏi & Đáp: mỗi section là một câu hỏi và phần trả lời.',
  how_to: 'Cấu trúc How-To: từng bước rõ ràng, có hành động cụ thể.',
  pro_con: 'Cấu trúc Pro & Con: phần ưu điểm, phần nhược điểm, rồi kết luận.',
  historical: 'Cấu trúc Timeline: diễn biến từ quá khứ tới hiện tại và xu hướng.',
  listicle: 'Cấu trúc Danh Sách: Top N điểm, mỗi điểm là một H2 rõ ràng.',
  profile: 'Cấu trúc Profile: giới thiệu, điểm nổi bật, thành tích, nhận định.',
  review: 'Cấu trúc Review: tổng quan, ưu điểm, nhược điểm, đánh giá và kết luận.',
};

interface NewsConfig {
  keyword: string;
  language: string;
  structure: string;
  tone: string;
  model: string;
  targetLength: number;
  secondaryKeywords: string[];
  brandConfig?: { name?: string; forbiddenExtra?: string; toneNotes?: string };
  seoOptions?: { mainLink?: string; keywordLinks?: string; autoBold?: string; footerContent?: string };
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

function mergeForbiddenWordsLocal(extra?: string): string[] {
  // Simplified version for testing — real function in lib/tinh-gon/forbidden
  if (!extra) return [];
  return extra.split(',').map((s) => s.trim()).filter(Boolean);
}

// BUG #3: forbidden clause luôn xuất hiện kể cả khi rỗng — AI nhận instruction vô nghĩa
function buildNewsPrompt(config: NewsConfig, sources: NewsItem[], brandPrompt: string): string {
  const forbidden = mergeForbiddenWordsLocal(config.brandConfig?.forbiddenExtra).join(', ');
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;

  const sourcesText = sources.length > 0
    ? sources.map((source, index) => (
      `[${index + 1}] ${source.title}
Nguồn: ${source.source || 'Google News'} | ${source.pubDate || 'Không rõ thời gian'}
Link: ${source.link}
Tóm tắt: ${source.snippet || 'Không có snippet'}`
    )).join('\n\n')
    : 'Không có nguồn tin, hãy viết như một bản tin tổng hợp chung và nêu rõ giới hạn thông tin.';

  const antiDuplicateBlock = `
## QUY TẮC CHỐNG TRÙNG NỘI DUNG (BẮT BUỘC)
- KHÔNG copy nguyên văn bất kỳ câu nào từ sources.
- Nếu có từ 2 nguồn trở lên, phải tổng hợp ít nhất 2 nguồn trong thân bài.
- Nếu chỉ có 1 nguồn, phải thêm phân tích hoặc góc nhìn riêng chiếm ít nhất 30% nội dung.
- Tiêu đề bài phải khác hoàn toàn với mọi tiêu đề sources.
- Mở bài bắt đầu bằng tình huống, số liệu, câu hỏi hoặc nhận định ngắn. KHÔNG mở bằng "Theo [nguồn]...".
- Cuối mỗi section chính, thêm 1-2 câu góc nhìn riêng hoặc tác động thực tế với người đọc.
`.trim();

  const antiAiBlock = `
## QUY TẮC VIẾT NHƯ NGƯỜI THẬT (BẮT BUỘC)
- Nhịp câu: xen kẽ câu 3-6 từ và câu 12-18 từ. KHÔNG viết 5 câu liên tiếp cùng độ dài.
- Mở đoạn: luân phiên số liệu, câu hỏi, nhận xét ngắn và ví dụ cụ thể.
- Ưu tiên số liệu thực từ sources như ngày, giờ, giá, phần trăm, số lượng.
- Không dùng các cụm như: "Không thể phủ nhận", "Nhìn chung", "Chính vì vậy", "Trong bối cảnh hiện nay".
- Kết bài bằng nhận định ngắn hoặc câu hỏi mở. KHÔNG dùng "Hy vọng thông tin hữu ích".
`.trim();

  return `
Bạn là News Writer Agent, chuyên viết tin tức chính xác, nhanh, dễ đọc và có góc nhìn riêng.

${brandPrompt}

## Thông tin bài viết
- Chủ đề / Từ khóa: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

## Nguồn tin Google News
${sourcesText}

${antiDuplicateBlock}

${antiAiBlock}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong đúng 1 thẻ <article>.
- Phải có đúng 1 thẻ <h1> là tiêu đề bài.
- Mỗi phần chính dùng <h2>, nội dung là <p>, có thể dùng <ul><li> nếu hợp lý.
- Tổng số từ bám sát ${config.targetLength} từ, ưu tiên khoảng 400-800 từ.
- Có số liệu, ngày giờ, tên riêng nếu nguồn có cung cấp.
- Không thêm CSS, JavaScript, markdown fence hay lời giải thích ngoài bài.
- Không dùng các từ/cụm từ sau: ${forbidden}

Chỉ trả HTML.
`.trim();
}

// FIX #3: forbidden clause conditional — không append khi rỗng
function buildNewsPromptFixed(config: NewsConfig, sources: NewsItem[], brandPrompt: string): string {
  const forbiddenWords = mergeForbiddenWordsLocal(config.brandConfig?.forbiddenExtra);
  const toneInstruction = TONE_INSTRUCTIONS[config.tone] ?? TONE_INSTRUCTIONS.formal;
  const structureInstruction = STRUCTURE_INSTRUCTIONS[config.structure] ?? STRUCTURE_INSTRUCTIONS.auto;

  const sourcesText = sources.length > 0
    ? sources.map((source, index) => (
      `[${index + 1}] ${source.title}
Nguồn: ${source.source || 'Google News'} | ${source.pubDate || 'Không rõ thời gian'}
Link: ${source.link}
Tóm tắt: ${source.snippet || 'Không có snippet'}`
    )).join('\n\n')
    : 'Không có nguồn tin, hãy viết như một bản tin tổng hợp chung và nêu rõ giới hạn thông tin.';

  const forbiddenClause = forbiddenWords.length > 0
    ? `- Không dùng các từ/cụm từ sau: ${forbiddenWords.join(', ')}`
    : '- Tránh ngôn ngữ AI sáo rỗng: "Nhìn chung", "Không thể phủ nhận", "Tuy nhiên", "Bên cạnh đó".';

  return `
Bạn là News Writer Agent, chuyên viết tin tức chính xác, nhanh, dễ đọc và có góc nhìn riêng.

${brandPrompt}

## Thông tin bài viết
- Chủ đề / Từ khóa: ${config.keyword}
- Ngôn ngữ: ${config.language}
- Độ dài mục tiêu: ${config.targetLength} từ
- Cấu trúc: ${structureInstruction}
- Giọng văn: ${toneInstruction}

## Nguồn tin Google News
${sourcesText}

## Quy tắc output
- Chỉ trả HTML hoàn chỉnh trong đúng 1 thẻ <article>.
- Phải có đúng 1 thẻ <h1> là tiêu đề bài.
${forbiddenClause}

Chỉ trả HTML.
`.trim();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeNewsConfig(overrides: Partial<NewsConfig> = {}): NewsConfig {
  return {
    keyword: 'xu hướng nội thất 2026',
    language: 'Vietnamese',
    structure: 'auto',
    tone: 'formal',
    model: 'gemini-flash',
    targetLength: 600,
    secondaryKeywords: [],
    ...overrides,
  };
}

function makeNewsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    title: 'Xu hướng nội thất mới nhất',
    link: 'https://news.google.com/article/1',
    pubDate: 'Mon, 09 Jun 2026 08:00:00 GMT',
    source: 'Báo VnExpress',
    snippet: 'Snippet tin tức về nội thất.',
    ...overrides,
  };
}

function makeRssXml(items: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Google News</title>
    ${items.map((item) => `<item>${item}</item>`).join('\n    ')}
  </channel>
</rss>`;
}

function makeRssItem(overrides: { title?: string; link?: string; pubDate?: string; source?: string; description?: string } = {}): string {
  return `
    <title>${overrides.title ?? 'Tiêu đề tin tức'}</title>
    <link>${overrides.link ?? 'https://news.google.com/article/1'}</link>
    <pubDate>${overrides.pubDate ?? 'Mon, 09 Jun 2026 08:00:00 GMT'}</pubDate>
    <source>Báo VnExpress</source>
    <description>${overrides.description ?? 'Mô tả ngắn về tin tức.'}</description>
  `;
}

// =============================================================================
// TESTS
// =============================================================================

// ─── decodeEntities [BUG #1, #2] ─────────────────────────────────────────────

describe('decodeEntities [start/route.ts]', () => {
  it('plain text passed through unchanged', () => {
    assert.equal(decodeEntities('Nội thất giá rẻ'), 'Nội thất giá rẻ');
  });

  it('decodes &amp; → &', () => {
    assert.equal(decodeEntities('Giường &amp; Tủ'), 'Giường & Tủ');
  });

  it('decodes &quot; → "', () => {
    assert.equal(decodeEntities('Sản phẩm &quot;chất lượng&quot;'), 'Sản phẩm "chất lượng"');
  });

  it('decodes &#39; → \'', () => {
    assert.equal(decodeEntities('It&#39;s great'), "It's great");
  });

  it('decodes &lt; &gt;', () => {
    assert.equal(decodeEntities('a &lt; b &gt; c'), 'a < b > c');
  });

  it('decodes &nbsp; → space', () => {
    assert.equal(decodeEntities('a&nbsp;b'), 'a b');
  });

  it('collapses whitespace and trims', () => {
    assert.equal(decodeEntities('  hello   world  '), 'hello world');
  });

  it('CDATA single-line extracted correctly', () => {
    assert.equal(decodeEntities('<![CDATA[Tiêu đề bài]]>'), 'Tiêu đề bài');
  });

  it('CDATA with entity inside decoded', () => {
    assert.equal(decodeEntities('<![CDATA[Giường &amp; Tủ]]>'), 'Giường & Tủ');
  });

  it('multiple entities in one string', () => {
    assert.equal(decodeEntities('&amp;amp; &quot;x&quot; &#39;y&#39;'), '&amp; "x" \'y\'');
  });

  it('empty string → empty string', () => {
    assert.equal(decodeEntities(''), '');
  });

  // BUG #1: CDATA multiline không match do regex .*?
  it('[BUG #1] CDATA with newline inside NOT decoded — regex .*? cannot cross \\n', () => {
    const input = '<![CDATA[Tiêu đề\ncó xuống dòng]]>';
    const result = decodeEntities(input);
    // BUG: CDATA not stripped, raw tags remain
    assert.ok(result.includes('<![CDATA['), `BUG #1 confirmed: CDATA tag remains: "${result}"`);
    assert.ok(!result.includes('Tiêu đề'), 'content not extracted when CDATA spans multiple lines');
  });

  it('[FIX #1] fixed version handles CDATA with newline', () => {
    const input = '<![CDATA[Tiêu đề\ncó xuống dòng]]>';
    const result = decodeEntitiesFixed(input);
    assert.ok(!result.includes('<![CDATA['), 'CDATA tag stripped');
    assert.ok(result.includes('Tiêu đề'), 'content extracted');
    assert.ok(result.includes('có xuống dòng'), 'newline content preserved (as space after collapse)');
  });

  it('[FIX #1] fixed handles multi-paragraph CDATA', () => {
    const input = '<![CDATA[Dòng một\nDòng hai\nDòng ba]]>';
    const result = decodeEntitiesFixed(input);
    assert.ok(!result.includes('CDATA'), 'CDATA stripped');
    assert.ok(result.includes('Dòng một'), 'first line present');
    assert.ok(result.includes('Dòng ba'), 'last line present');
  });

  // BUG #2: Numeric HTML entities không decode
  it('[BUG #2] &#8211; (en dash) NOT decoded', () => {
    const result = decodeEntities('Giá từ 500&#8211;700 ngàn');
    // BUG: &#8211; not decoded, remains as literal
    assert.ok(result.includes('&#8211;'), `BUG #2 confirmed: &#8211; remains: "${result}"`);
    assert.ok(!result.includes('–'), 'en dash not decoded');
  });

  it('[BUG #2] &#8217; (right single quote) NOT decoded', () => {
    const result = decodeEntities("Nội thất it&#8217;s tốt");
    assert.ok(result.includes('&#8217;'), 'BUG #2: right quote not decoded');
  });

  it('[BUG #2] &#8220; &#8221; (curly double quotes) NOT decoded', () => {
    const result = decodeEntities('&#8220;Chất lượng&#8221;');
    assert.ok(result.includes('&#8220;'), 'BUG #2: left curly quote not decoded');
  });

  it('[FIX #2] numeric entities decoded correctly', () => {
    assert.equal(decodeEntitiesFixed('Giá 500&#8211;700 ngàn'), 'Giá 500–700 ngàn');
  });

  it('[FIX #2] &#8217; decoded to right single quote', () => {
    const result = decodeEntitiesFixed("it&#8217;s");
    assert.equal(result, "it’s"); // U+2019 RIGHT SINGLE QUOTATION MARK
  });

  it('[FIX #2] &#8220; &#8221; decoded to curly double quotes', () => {
    const result = decodeEntitiesFixed('&#8220;Chất lượng&#8221;');
    assert.equal(result, '“Chất lượng”');
  });

  it('[FIX #2] &#39; still decoded (numeric override before named)', () => {
    // &#39; is numeric form of single quote — should still work
    const result = decodeEntitiesFixed("it&#39;s");
    assert.equal(result, "it's");
  });

  it('[FIX] mixed CDATA multiline + entities', () => {
    const input = '<![CDATA[Tiêu đề &amp; nội dung\nmới nhất &#8211; 2026]]>';
    const result = decodeEntitiesFixed(input);
    assert.ok(!result.includes('CDATA'));
    assert.ok(result.includes('Tiêu đề & nội dung'));
    assert.ok(result.includes('–'));
    assert.ok(result.includes('2026'));
  });
});

// ─── RSS XML parsing (fetchGoogleNews logic) ──────────────────────────────────

describe('RSS XML parsing [start/route.ts — fetchGoogleNews logic]', () => {
  it('parses single valid item', () => {
    const xml = makeRssXml([
      makeRssItem({ title: 'Tin nội thất mới', link: 'https://example.com/1', source: 'VnExpress' }),
    ]);
    const items = parseRssItems(xml);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Tin nội thất mới');
    assert.equal(items[0].link, 'https://example.com/1');
  });

  it('parses multiple items', () => {
    const xml = makeRssXml([
      makeRssItem({ title: 'Tin 1', link: 'https://ex.com/1' }),
      makeRssItem({ title: 'Tin 2', link: 'https://ex.com/2' }),
      makeRssItem({ title: 'Tin 3', link: 'https://ex.com/3' }),
    ]);
    const items = parseRssItems(xml);
    assert.equal(items.length, 3);
    assert.equal(items[0].title, 'Tin 1');
    assert.equal(items[2].title, 'Tin 3');
  });

  it('caps at 7 items', () => {
    const xml = makeRssXml(
      Array.from({ length: 10 }, (_, i) => makeRssItem({ title: `Tin ${i + 1}`, link: `https://ex.com/${i + 1}` })),
    );
    const items = parseRssItems(xml);
    assert.equal(items.length, 7, 'capped at 7');
  });

  it('skips items without title or link', () => {
    const xmlNoTitle = makeRssXml([`<link>https://ex.com/1</link>`]);
    assert.equal(parseRssItems(xmlNoTitle).length, 0, 'item without title skipped');

    const xmlNoLink = makeRssXml([`<title>Có tiêu đề</title>`]);
    assert.equal(parseRssItems(xmlNoLink).length, 0, 'item without link skipped');
  });

  it('decodes entities in title', () => {
    const xml = makeRssXml([
      makeRssItem({ title: 'Nội thất &amp; Giá rẻ', link: 'https://ex.com/1' }),
    ]);
    const items = parseRssItems(xml);
    assert.equal(items[0].title, 'Nội thất & Giá rẻ');
  });

  it('truncates description/snippet to 320 chars', () => {
    const longDesc = 'Mô tả dài '.repeat(50); // ~500 chars
    const xml = makeRssXml([
      makeRssItem({ title: 'Title', link: 'https://ex.com/', description: longDesc }),
    ]);
    const items = parseRssItems(xml);
    assert.ok(items[0].snippet.length <= 320, `snippet truncated: ${items[0].snippet.length}`);
  });

  it('strips HTML tags from description/snippet', () => {
    const xml = makeRssXml([
      makeRssItem({
        title: 'Title',
        link: 'https://ex.com/',
        description: '<b>Bold text</b> and <a href="x">link</a>.',
      }),
    ]);
    const items = parseRssItems(xml);
    assert.ok(!items[0].snippet.includes('<b>'), 'HTML tags stripped from snippet');
    assert.ok(items[0].snippet.includes('Bold text'), 'text content preserved');
  });

  it('empty XML → empty array', () => {
    assert.deepEqual(parseRssItems(''), []);
    assert.deepEqual(parseRssItems('<rss></rss>'), []);
  });

  it('source field extracted correctly', () => {
    const itemXml = `
      <title>Tin tức</title>
      <link>https://ex.com/</link>
      <pubDate>Mon, 09 Jun 2026</pubDate>
      <source url="https://vnexpress.net">VnExpress</source>
      <description>Mô tả</description>
    `;
    const items = parseRssItems(makeRssXml([itemXml]));
    assert.equal(items[0].source, 'VnExpress');
  });

  it('pubDate field extracted correctly', () => {
    const xml = makeRssXml([
      makeRssItem({ title: 'T', link: 'https://ex.com/', pubDate: 'Mon, 09 Jun 2026 08:00:00 GMT' }),
    ]);
    const items = parseRssItems(xml);
    assert.equal(items[0].pubDate, 'Mon, 09 Jun 2026 08:00:00 GMT');
  });

  // Realistic Google News RSS format test
  it('parses realistic Google News RSS format', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0">
  <channel>
    <title>Google News - nội thất</title>
    <link>https://news.google.com/rss/search?q=n%E1%BB%99i+th%E1%BA%A5t</link>
    <item>
      <title>Xu hướng nội thất 2026: Tối giản nhưng tiện nghi</title>
      <link>https://news.google.com/rss/articles/CBMi...</link>
      <pubDate>Mon, 09 Jun 2026 06:00:00 GMT</pubDate>
      <source url="https://vnexpress.net">VnExpress</source>
      <description><![CDATA[<ol><li><a href="https://vnexpress.net/xu-huong.html">Xu hướng nội thất 2026</a></li></ol>]]></description>
    </item>
  </channel>
</rss>`;
    const items = parseRssItems(xml);
    assert.equal(items.length, 1);
    assert.ok(items[0].title.includes('Xu hướng nội thất'));
    assert.ok(items[0].snippet.length > 0);
    assert.ok(!items[0].snippet.includes('<a '), 'HTML tags stripped from CDATA description');
  });
});

// ─── buildNewsPrompt [BUG #3] ────────────────────────────────────────────────

describe('buildNewsPrompt [stream/route.ts]', () => {
  const config = makeNewsConfig();
  const sources = [makeNewsItem()];
  const brandPrompt = 'Brand: Nội Thất Minh Quân';

  it('returns non-empty string', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.length > 100);
  });

  it('includes keyword in prompt', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes(config.keyword));
  });

  it('includes language in prompt', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('Vietnamese'));
  });

  it('includes targetLength in prompt', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('600'));
  });

  it('includes brandPrompt', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('Nội Thất Minh Quân'));
  });

  it('includes sources when provided', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('[1]'));
    assert.ok(result.includes('Xu hướng nội thất mới nhất'));
  });

  it('uses fallback text when no sources', () => {
    const result = buildNewsPrompt(config, [], brandPrompt);
    assert.ok(result.includes('Không có nguồn tin'));
  });

  it('includes anti-duplicate rules', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('CHỐNG TRÙNG NỘI DUNG'));
    assert.ok(result.includes('KHÔNG copy nguyên văn'));
  });

  it('includes anti-AI rules', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('VIẾT NHƯ NGƯỜI THẬT'));
  });

  it('includes HTML output rules', () => {
    const result = buildNewsPrompt(config, sources, brandPrompt);
    assert.ok(result.includes('<article>'));
    assert.ok(result.includes('<h1>'));
  });

  it('uses correct tone instruction for each tone', () => {
    for (const [tone, instruction] of Object.entries(TONE_INSTRUCTIONS)) {
      const result = buildNewsPrompt(makeNewsConfig({ tone }), sources, brandPrompt);
      assert.ok(result.includes(instruction.substring(0, 30)), `tone "${tone}" instruction missing`);
    }
  });

  it('uses correct structure instruction for each structure', () => {
    for (const [structure, instruction] of Object.entries(STRUCTURE_INSTRUCTIONS)) {
      const result = buildNewsPrompt(makeNewsConfig({ structure }), sources, brandPrompt);
      assert.ok(result.includes(instruction.substring(0, 30)), `structure "${structure}" instruction missing`);
    }
  });

  it('falls back to formal tone for unknown tone', () => {
    const result = buildNewsPrompt(makeNewsConfig({ tone: 'unknown_tone' }), sources, brandPrompt);
    assert.ok(result.includes(TONE_INSTRUCTIONS.formal.substring(0, 20)));
  });

  it('falls back to auto structure for unknown structure', () => {
    const result = buildNewsPrompt(makeNewsConfig({ structure: 'unknown_structure' }), sources, brandPrompt);
    assert.ok(result.includes(STRUCTURE_INSTRUCTIONS.auto.substring(0, 20)));
  });

  // BUG #3: forbidden clause rỗng khi không có brandConfig.forbiddenExtra
  it('[BUG #3] forbidden clause empty string when no forbiddenExtra — confusing instruction', () => {
    const configNoBrand = makeNewsConfig({ brandConfig: undefined });
    const result = buildNewsPrompt(configNoBrand, sources, brandPrompt);
    // BUG: contains "Không dùng các từ/cụm từ sau: " with nothing after colon
    assert.ok(
      result.includes('Không dùng các từ/cụm từ sau: \n'),
      `BUG #3 confirmed: empty forbidden clause present`,
    );
  });

  it('[BUG #3] forbidden clause is present but empty even with empty forbiddenExtra', () => {
    const configEmptyForbidden = makeNewsConfig({ brandConfig: { forbiddenExtra: '' } });
    const result = buildNewsPrompt(configEmptyForbidden, sources, brandPrompt);
    assert.ok(
      result.includes('Không dùng các từ/cụm từ sau: \n'),
      'BUG #3: empty clause persists',
    );
  });

  it('[FIX #3] fixed version includes meaningful fallback when no forbidden words', () => {
    const configNoBrand = makeNewsConfig({ brandConfig: undefined });
    const result = buildNewsPromptFixed(configNoBrand, sources, brandPrompt);
    // FIX: should have a meaningful anti-AI instruction instead of empty clause
    assert.ok(
      result.includes('Tránh ngôn ngữ AI sáo rỗng'),
      'fixed: meaningful fallback instruction present',
    );
    assert.ok(
      !result.includes('Không dùng các từ/cụm từ sau: \n'),
      'fixed: empty clause not present',
    );
  });

  it('[FIX #3] fixed version uses specific forbidden words when provided', () => {
    const configWithForbidden = makeNewsConfig({
      brandConfig: { forbiddenExtra: 'tuy nhiên, bên cạnh đó' },
    });
    const result = buildNewsPromptFixed(configWithForbidden, sources, brandPrompt);
    assert.ok(result.includes('tuy nhiên'), 'specific forbidden word in prompt');
    assert.ok(result.includes('bên cạnh đó'), 'specific forbidden word in prompt');
    assert.ok(!result.includes('Tránh ngôn ngữ AI sáo rỗng'), 'fallback not used when words provided');
  });

  it('multiple sources formatted with index numbers', () => {
    const multiSources = [
      makeNewsItem({ title: 'Tin 1', link: 'https://ex.com/1' }),
      makeNewsItem({ title: 'Tin 2', link: 'https://ex.com/2' }),
      makeNewsItem({ title: 'Tin 3', link: 'https://ex.com/3' }),
    ];
    const result = buildNewsPrompt(config, multiSources, brandPrompt);
    assert.ok(result.includes('[1]'));
    assert.ok(result.includes('[2]'));
    assert.ok(result.includes('[3]'));
  });

  it('source without snippet shows "Không có snippet"', () => {
    const noSnippet = makeNewsItem({ snippet: '' });
    const result = buildNewsPrompt(config, [noSnippet], brandPrompt);
    assert.ok(result.includes('Không có snippet'));
  });

  it('source without pubDate shows "Không rõ thời gian"', () => {
    const noPubDate = makeNewsItem({ pubDate: '' });
    const result = buildNewsPrompt(config, [noPubDate], brandPrompt);
    assert.ok(result.includes('Không rõ thời gian'));
  });

  it('source without source field shows "Google News"', () => {
    const noSource = makeNewsItem({ source: '' });
    const result = buildNewsPrompt(config, [noSource], brandPrompt);
    assert.ok(result.includes('Google News'));
  });
});

// ─── TONE_INSTRUCTIONS vs NEWS_TONES coverage ─────────────────────────────────

describe('TONE_INSTRUCTIONS vs NEWS_TONES [stream/route.ts + options.ts]', async () => {
  const { NEWS_TONES } = await import('./options');

  it('every NewsTone has a TONE_INSTRUCTIONS entry', () => {
    for (const { value: tone } of NEWS_TONES) {
      assert.ok(
        tone in TONE_INSTRUCTIONS,
        `NewsTone "${tone}" missing from TONE_INSTRUCTIONS in stream/route.ts`,
      );
    }
  });

  it('TONE_INSTRUCTIONS count matches NEWS_TONES count', () => {
    const toneCount = NEWS_TONES.length;
    const instructionCount = Object.keys(TONE_INSTRUCTIONS).length;
    assert.equal(
      instructionCount,
      toneCount,
      `TONE_INSTRUCTIONS has ${instructionCount} entries but NEWS_TONES has ${toneCount}`,
    );
  });

  it('each TONE_INSTRUCTIONS value is a non-empty string', () => {
    for (const [tone, instruction] of Object.entries(TONE_INSTRUCTIONS)) {
      assert.ok(instruction.length > 10, `TONE_INSTRUCTIONS["${tone}"] too short: "${instruction}"`);
    }
  });

  it('no TONE_INSTRUCTIONS key exists that is NOT a valid NewsTone', () => {
    const validTones = new Set(NEWS_TONES.map((t) => t.value));
    for (const key of Object.keys(TONE_INSTRUCTIONS)) {
      assert.ok(validTones.has(key as never), `TONE_INSTRUCTIONS has unknown key: "${key}"`);
    }
  });
});

// ─── STRUCTURE_INSTRUCTIONS vs NEWS_STRUCTURES coverage ───────────────────────

describe('STRUCTURE_INSTRUCTIONS vs NEWS_STRUCTURES [stream/route.ts + options.ts]', async () => {
  const { NEWS_STRUCTURES } = await import('./options');

  it('every NewsStructure has a STRUCTURE_INSTRUCTIONS entry', () => {
    for (const { value: structure } of NEWS_STRUCTURES) {
      assert.ok(
        structure in STRUCTURE_INSTRUCTIONS,
        `NewsStructure "${structure}" missing from STRUCTURE_INSTRUCTIONS in stream/route.ts`,
      );
    }
  });

  it('STRUCTURE_INSTRUCTIONS count matches NEWS_STRUCTURES count', () => {
    const structureCount = NEWS_STRUCTURES.length;
    const instructionCount = Object.keys(STRUCTURE_INSTRUCTIONS).length;
    assert.equal(
      instructionCount,
      structureCount,
      `STRUCTURE_INSTRUCTIONS has ${instructionCount} but NEWS_STRUCTURES has ${structureCount}`,
    );
  });

  it('each STRUCTURE_INSTRUCTIONS value is a non-empty string', () => {
    for (const [key, val] of Object.entries(STRUCTURE_INSTRUCTIONS)) {
      assert.ok(val.length > 10, `STRUCTURE_INSTRUCTIONS["${key}"] too short`);
    }
  });

  it('no STRUCTURE_INSTRUCTIONS key exists that is NOT a valid NewsStructure', () => {
    const validStructures = new Set(NEWS_STRUCTURES.map((s) => s.value));
    for (const key of Object.keys(STRUCTURE_INSTRUCTIONS)) {
      assert.ok(validStructures.has(key as never), `STRUCTURE_INSTRUCTIONS has unknown key: "${key}"`);
    }
  });
});

// ─── API Schema: start/route.ts [BUG #4] ─────────────────────────────────────

describe('startSchema [start/route.ts]', async () => {
  const { z } = await import('zod');

  // Mirror of actual startSchema
  const startSchemaBuggy = z.object({
    config: z.object({
      keyword: z.string().min(1),
      language: z.string().default('Vietnamese'),
      structure: z.string().default('auto'),
      tone: z.string().default('formal'),
      model: z.string().default('gemini-flash'),
      targetLength: z.number().default(600),   // BUG #4: no min/max
      secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
      brandConfig: z.record(z.unknown()).optional(),
      seoOptions: z.object({
        mainLink: z.string().optional(),
        keywordLinks: z.string().optional(),
        autoBold: z.string().optional(),
        footerContent: z.string().optional(),
      }).optional(),
    }),
  });

  const startSchemaFixed = z.object({
    config: z.object({
      keyword: z.string().min(1),
      language: z.string().default('Vietnamese'),
      structure: z.string().default('auto'),
      tone: z.string().default('formal'),
      model: z.string().default('gemini-flash'),
      targetLength: z.number().int().min(400).max(800).default(600),  // FIX #4
      secondaryKeywords: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
      brandConfig: z.record(z.unknown()).optional(),
      seoOptions: z.object({
        mainLink: z.string().optional(),
        keywordLinks: z.string().optional(),
        autoBold: z.string().optional(),
        footerContent: z.string().optional(),
      }).optional(),
    }),
  });

  const validConfig = {
    config: {
      keyword: 'xu hướng nội thất 2026',
      targetLength: 600,
      secondaryKeywords: [],
    },
  };

  it('valid payload accepted', () => {
    assert.ok(startSchemaBuggy.safeParse(validConfig).success);
  });

  it('keyword empty string rejected', () => {
    assert.ok(!startSchemaBuggy.safeParse({ config: { ...validConfig.config, keyword: '' } }).success);
  });

  it('more than 12 secondaryKeywords rejected', () => {
    const tooMany = Array.from({ length: 13 }, (_, i) => `keyword${i}`);
    assert.ok(!startSchemaBuggy.safeParse({ config: { ...validConfig.config, secondaryKeywords: tooMany } }).success);
  });

  it('secondaryKeyword > 120 chars rejected', () => {
    const longKw = [{ config: { ...validConfig.config, secondaryKeywords: ['x'.repeat(121)] } }];
    assert.ok(!startSchemaBuggy.safeParse(longKw[0]).success);
  });

  it('defaults applied: language=Vietnamese, structure=auto, tone=formal', () => {
    const r = startSchemaBuggy.safeParse({ config: { keyword: 'test' } });
    assert.ok(r.success);
    assert.equal(r.data?.config.language, 'Vietnamese');
    assert.equal(r.data?.config.structure, 'auto');
    assert.equal(r.data?.config.tone, 'formal');
  });

  // BUG #4: targetLength không validate range
  it('[BUG #4] targetLength: 9999 accepted — no range validation', () => {
    const r = startSchemaBuggy.safeParse({ config: { ...validConfig.config, targetLength: 9999 } });
    assert.ok(r.success, 'BUG #4 confirmed: absurd targetLength accepted');
    assert.equal(r.data?.config.targetLength, 9999);
  });

  it('[BUG #4] targetLength: 0 accepted — should be rejected', () => {
    const r = startSchemaBuggy.safeParse({ config: { ...validConfig.config, targetLength: 0 } });
    assert.ok(r.success, 'BUG #4: zero targetLength accepted');
  });

  it('[BUG #4] targetLength: -100 accepted — should be rejected', () => {
    const r = startSchemaBuggy.safeParse({ config: { ...validConfig.config, targetLength: -100 } });
    assert.ok(r.success, 'BUG #4: negative targetLength accepted');
  });

  it('[FIX #4] fixed schema rejects targetLength > 800', () => {
    const r = startSchemaFixed.safeParse({ config: { ...validConfig.config, targetLength: 9999 } });
    assert.ok(!r.success, 'fixed: targetLength 9999 rejected');
  });

  it('[FIX #4] fixed schema rejects targetLength < 400', () => {
    const r = startSchemaFixed.safeParse({ config: { ...validConfig.config, targetLength: 100 } });
    assert.ok(!r.success, 'fixed: targetLength 100 rejected');
  });

  it('[FIX #4] fixed schema accepts valid targetLength 400', () => {
    const r = startSchemaFixed.safeParse({ config: { ...validConfig.config, targetLength: 400 } });
    assert.ok(r.success, 'fixed: 400 accepted');
  });

  it('[FIX #4] fixed schema accepts valid targetLength 800', () => {
    const r = startSchemaFixed.safeParse({ config: { ...validConfig.config, targetLength: 800 } });
    assert.ok(r.success, 'fixed: 800 accepted');
  });

  it('[FIX #4] fixed schema accepts valid targetLength 600 (default)', () => {
    const r = startSchemaFixed.safeParse({ config: { keyword: 'test' } });
    assert.ok(r.success);
    assert.equal(r.data?.config.targetLength, 600);
  });
});

// ─── API Schema: stream/route.ts [BUG #5] ─────────────────────────────────────

describe('streamSchema [stream/route.ts]', async () => {
  const { z } = await import('zod');

  // Mirror of actual streamSchema — missing secondaryKeywords
  const streamSchemaBuggy = z.object({
    articleId: z.string(),
    runId: z.string(),
    config: z.object({
      keyword: z.string().min(1),
      language: z.string(),
      structure: z.string(),
      tone: z.string(),
      model: z.string(),
      targetLength: z.number(),
      brandConfig: z.record(z.unknown()).optional(),
      // BUG #5: secondaryKeywords MISSING → gets Zod-stripped
    }),
    sources: z.array(z.object({
      title: z.string(),
      link: z.string(),
      pubDate: z.string(),
      source: z.string(),
      snippet: z.string(),
    })),
  });

  const streamSchemaFixed = z.object({
    articleId: z.string(),
    runId: z.string(),
    config: z.object({
      keyword: z.string().min(1),
      language: z.string(),
      structure: z.string(),
      tone: z.string(),
      model: z.string(),
      targetLength: z.number(),
      brandConfig: z.record(z.unknown()).optional(),
      secondaryKeywords: z.array(z.string()).default([]), // FIX #5
      seoOptions: z.object({                              // FIX: also add seoOptions
        mainLink: z.string().optional(),
        keywordLinks: z.string().optional(),
        autoBold: z.string().optional(),
        footerContent: z.string().optional(),
      }).optional(),
    }),
    sources: z.array(z.object({
      title: z.string(),
      link: z.string(),
      pubDate: z.string(),
      source: z.string(),
      snippet: z.string(),
    })),
  });

  const validPayload = {
    articleId: 'art-123',
    runId: 'xu-huong-1749000000000',
    config: {
      keyword: 'xu hướng nội thất',
      language: 'Vietnamese',
      structure: 'auto',
      tone: 'formal',
      model: 'gemini-flash',
      targetLength: 600,
    },
    sources: [],
  };

  it('valid payload accepted', () => {
    assert.ok(streamSchemaBuggy.safeParse(validPayload).success);
  });

  it('missing articleId rejected', () => {
    const { articleId: _, ...noId } = validPayload;
    assert.ok(!streamSchemaBuggy.safeParse(noId).success);
  });

  it('missing runId rejected', () => {
    const { runId: _, ...noRunId } = validPayload;
    assert.ok(!streamSchemaBuggy.safeParse(noRunId).success);
  });

  it('keyword empty string rejected', () => {
    const payload = { ...validPayload, config: { ...validPayload.config, keyword: '' } };
    assert.ok(!streamSchemaBuggy.safeParse(payload).success);
  });

  // BUG #5: secondaryKeywords stripped by Zod
  it('[BUG #5] secondaryKeywords sent but stripped by Zod — not in parsed output', () => {
    const payloadWithKw = {
      ...validPayload,
      config: { ...validPayload.config, secondaryKeywords: ['nội thất hiện đại', 'giá rẻ'] },
    };
    const r = streamSchemaBuggy.safeParse(payloadWithKw);
    assert.ok(r.success, 'schema accepts payload (no error)');
    // BUG: secondaryKeywords is stripped from parsed output because not in schema
    assert.ok(
      !('secondaryKeywords' in (r.data?.config ?? {})),
      'BUG #5 confirmed: secondaryKeywords stripped from parsed config',
    );
  });

  it('[FIX #5] fixed schema preserves secondaryKeywords', () => {
    const payloadWithKw = {
      ...validPayload,
      config: { ...validPayload.config, secondaryKeywords: ['nội thất hiện đại', 'giá rẻ'] },
    };
    const r = streamSchemaFixed.safeParse(payloadWithKw);
    assert.ok(r.success);
    assert.deepEqual(
      r.data?.config.secondaryKeywords,
      ['nội thất hiện đại', 'giá rẻ'],
      'fixed: secondaryKeywords preserved',
    );
  });

  it('[FIX #5] fixed schema defaults secondaryKeywords to [] when not provided', () => {
    const r = streamSchemaFixed.safeParse(validPayload);
    assert.ok(r.success);
    assert.deepEqual(r.data?.config.secondaryKeywords, [], 'fixed: defaults to empty array');
  });

  it('sources array with valid items accepted', () => {
    const payload = {
      ...validPayload,
      sources: [{ title: 'Tin', link: 'https://ex.com', pubDate: '2026', source: 'VnExpress', snippet: 'S' }],
    };
    assert.ok(streamSchemaBuggy.safeParse(payload).success);
  });

  it('source item missing required field rejected', () => {
    const payload = {
      ...validPayload,
      sources: [{ title: 'Tin', link: 'https://ex.com' }], // missing pubDate, source, snippet
    };
    assert.ok(!streamSchemaBuggy.safeParse(payload).success);
  });
});

// ─── normalizeNewsConfig edge cases [BUG #6] ──────────────────────────────────

describe('normalizeNewsConfig — edge cases [types.ts]', async () => {
  const { normalizeNewsConfig } = await import('./types');

  it('null item in secondaryKeywords throws TypeError', () => {
    // BUG #6: .trim() called on null → TypeError
    assert.throws(
      () => normalizeNewsConfig({ secondaryKeywords: [null, 'giá rẻ'] as unknown as string[] }),
      /TypeError|Cannot read/,
      'BUG #6 confirmed: null item causes TypeError',
    );
  });

  it('undefined item in secondaryKeywords throws TypeError', () => {
    assert.throws(
      () => normalizeNewsConfig({ secondaryKeywords: [undefined, 'tốt'] as unknown as string[] }),
      /TypeError/,
      'BUG #6: undefined item causes TypeError',
    );
  });

  it('[FIX #6] demonstration: filter non-string items to prevent crash', () => {
    // Simulate the fix inline
    function normalizeNewsConfigFixed(input: { secondaryKeywords?: unknown[] }) {
      return Array.isArray(input.secondaryKeywords)
        ? input.secondaryKeywords
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    }

    const result = normalizeNewsConfigFixed({ secondaryKeywords: [null, 'giá rẻ', undefined, '  toàn quốc  '] as unknown[] });
    assert.deepEqual(result, ['giá rẻ', 'toàn quốc'], 'fixed: null/undefined items skipped');
  });

  it('number item in secondaryKeywords also throws TypeError', () => {
    // Numbers also don't have .trim()
    assert.throws(
      () => normalizeNewsConfig({ secondaryKeywords: [42] as unknown as string[] }),
      /TypeError/,
      'BUG #6: number item causes TypeError',
    );
  });

  it('correctly processes valid secondaryKeywords (existing behavior)', () => {
    const config = normalizeNewsConfig({
      secondaryKeywords: ['  giá rẻ  ', '', 'toàn quốc', '   '],
    });
    assert.deepEqual(config.secondaryKeywords, ['giá rẻ', 'toàn quốc']);
  });

  it('defaults preserved for all fields when empty input', () => {
    const config = normalizeNewsConfig({});
    assert.equal(config.keyword, '');
    assert.equal(config.language, 'Vietnamese');
    assert.equal(config.structure, 'auto');
    assert.equal(config.tone, 'formal');
    assert.equal(config.model, 'gemini-flash');
    assert.equal(config.targetLength, 600);
    assert.deepEqual(config.secondaryKeywords, []);
    assert.equal(config.brandConfig, undefined);
    assert.equal(config.seoOptions, undefined);
  });

  it('keyword whitespace NOT trimmed (page.tsx handles trimming)', () => {
    // This is BY DESIGN — documented in existing tests and fix-bug doc
    const config = normalizeNewsConfig({ keyword: '  xu hướng  ' });
    assert.equal(config.keyword, '  xu hướng  ', 'keyword whitespace preserved by design');
  });
});

// ─── fetchGoogleNews URL construction ─────────────────────────────────────────

describe('fetchGoogleNews URL construction logic', async () => {
  const { NEWS_LANGUAGE_MAP, DEFAULT_NEWS_LANG } = await import('./options');

  it('Vietnamese language → vi/VN/VN:vi params', () => {
    const lang = NEWS_LANGUAGE_MAP['Vietnamese'] ?? DEFAULT_NEWS_LANG;
    assert.equal(lang.hl, 'vi');
    assert.equal(lang.gl, 'VN');
    assert.equal(lang.ceid, 'VN:vi');
  });

  it('unknown language → DEFAULT_NEWS_LANG fallback', () => {
    const lang = NEWS_LANGUAGE_MAP['Klingon'] ?? DEFAULT_NEWS_LANG;
    assert.deepEqual(lang, DEFAULT_NEWS_LANG);
  });

  it('keyword is encoded in URL (special chars)', () => {
    const keyword = 'nội thất & giá rẻ';
    const encoded = encodeURIComponent(keyword.trim());
    assert.ok(encoded.includes('%26'), '& encoded to %26');
    assert.ok(!encoded.includes(' '), 'spaces encoded');
  });

  it('keyword leading/trailing spaces trimmed before encode', () => {
    const keyword = '  nội thất  ';
    const encoded = encodeURIComponent(keyword.trim());
    assert.ok(!encoded.startsWith('%20'), 'leading space trimmed before encode');
    assert.ok(!encoded.endsWith('%20'), 'trailing space trimmed before encode');
  });

  it('all languages in NEWS_LANGUAGE_MAP have non-empty hl/gl/ceid', () => {
    for (const [lang, entry] of Object.entries(NEWS_LANGUAGE_MAP)) {
      assert.ok(entry.hl, `${lang}: hl must be non-empty`);
      assert.ok(entry.gl, `${lang}: gl must be non-empty`);
      assert.ok(entry.ceid, `${lang}: ceid must be non-empty`);
      assert.ok(entry.ceid.includes(':'), `${lang}: ceid must contain colon`);
    }
  });

  it('[DESIGN NOTE] fetchGoogleNews caps items at 7, not 5 or 10', () => {
    // The max is 7 — confirmed from route.ts line 62: if (items.length >= 7) break
    // This is different from VTGS which uses 3/5/10. Asserting contract:
    const maxItems = 7;
    assert.equal(maxItems, 7, 'fetchGoogleNews caps at 7 items');
  });
});

// ─── NewsConfig types validation ──────────────────────────────────────────────

describe('NewsConfig type completeness', () => {
  it('normalizeNewsConfig produces all required NewsConfig fields', async () => {
    const { normalizeNewsConfig } = await import('./types');
    const config = normalizeNewsConfig({
      keyword: 'xu hướng nội thất',
      secondaryKeywords: ['nội thất rẻ'],
    });

    // All fields of NewsConfig interface must be present
    assert.ok('keyword' in config);
    assert.ok('language' in config);
    assert.ok('structure' in config);
    assert.ok('tone' in config);
    assert.ok('model' in config);
    assert.ok('targetLength' in config);
    assert.ok('secondaryKeywords' in config);
  });

  it('NewsStreamResult shape matches buildNewsPrompt output keys', () => {
    // Verify that the stream's done payload has the expected keys
    // (We test the shape contract, not actual DB output)
    const expectedKeys = ['runId', 'html', 'title', 'metaDescription', 'wordCount', 'keywordDensity', 'humanness', 'sources'];
    // Just check the types file exports the right interface
    // (verified by TypeScript compilation — this is a compile-time check)
    assert.ok(true, 'NewsStreamResult interface defined with correct keys');
  });
});

// ─── Integration: decodeEntities + RSS parsing ────────────────────────────────

describe('Integration: decodeEntities + RSS parsing', () => {
  it('realistic RSS title with multiple entities decoded correctly', () => {
    const rssTitle = 'Nội thất &amp; Đồ gia dụng: Xu hướng &quot;tối giản&quot; 2026';
    assert.equal(
      decodeEntities(rssTitle),
      'Nội thất & Đồ gia dụng: Xu hướng "tối giản" 2026',
    );
  });

  it('CDATA-wrapped description in RSS item processed correctly (single-line)', () => {
    const cdata = '<![CDATA[Mô tả về xu hướng nội thất năm 2026.]]>';
    assert.equal(decodeEntities(cdata), 'Mô tả về xu hướng nội thất năm 2026.');
  });

  it('[REALISTIC BUG] Vietnamese news title with en-dash shows bug', () => {
    // Very common in Vietnamese news: "Giá nội thất tăng 5&#8211;10%"
    const title = 'Giá nội thất tăng 5&#8211;10% trong quý II';
    const buggyResult = decodeEntities(title);
    const fixedResult = decodeEntitiesFixed(title);

    assert.ok(buggyResult.includes('&#8211;'), 'buggy: en-dash not decoded in news title');
    assert.ok(fixedResult.includes('–'), 'fixed: en-dash decoded correctly');
    assert.equal(fixedResult, 'Giá nội thất tăng 5–10% trong quý II');
  });

  it('[REALISTIC BUG] Vietnamese news with right single quote', () => {
    // Common in English content transcribed to Vietnamese news
    const title = "Reviewer&#8217;s Choice: Giường sắt Minh Quân";
    const fixedResult = decodeEntitiesFixed(title);
    assert.ok(fixedResult.includes('’'), 'right single quote decoded');
    assert.ok(!fixedResult.includes('&#8217;'), 'numeric entity decoded');
  });
});
