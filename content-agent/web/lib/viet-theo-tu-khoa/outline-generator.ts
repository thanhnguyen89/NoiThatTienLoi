import { SEO_PROMPT_RULES } from '@/lib/shared/prompt-rules';
import { buildTinhGonModel } from '@/lib/tinh-gon/model';
import type { AiOutlineObjective, AiOutlineSize, KeywordArticleConfig, KeywordTone } from './types';

function buildToneInstruction(tone: KeywordTone): string {
  const map: Record<KeywordTone, string> = {
    seo_basic: 'Tập trung keyword, câu ngắn, rõ ràng, có FAQ cuối bài nếu hợp lý.',
    seo_focus: 'Tối ưu SEO tự nhiên, heading rõ, bám ý chính.',
    seo_extended: 'Giải thích đầy đủ, có ví dụ, so sánh và góc nhìn thực tế.',
    seo_longform: 'Bài dài, bao quát nhiều khía cạnh liên quan.',
    seo_nofaq: 'Tối ưu SEO nhưng không thêm FAQ cuối bài.',
    how_to: 'Dạng hướng dẫn từng bước, có trình tự rõ ràng.',
    listicle: 'Dạng danh sách, mỗi mục là một H2 riêng.',
    comparison: 'So sánh A vs B, có thể dùng bảng nếu phù hợp.',
    story: 'Dạng kể chuyện, gần gũi, có trải nghiệm thực tế.',
    technical: 'Thiên về số liệu, thông số, chính xác cao.',
    friendly: 'Thân thiện, tự nhiên, dễ đọc.',
    formal: 'Trang trọng, phù hợp doanh nghiệp hoặc báo cáo.',
    confident: 'Tự tin, dứt khoát, ít vòng vo.',
    year_in_title: 'Thêm năm hiện tại vào H1 để tăng CTR.',
    cooking: 'Tập trung công thức, nguyên liệu, dinh dưỡng.',
    random: 'Chọn ngẫu nhiên giữa SEO Focus, Confident và Friendly.',
  };

  return map[tone];
}

function buildObjectiveInstruction(objective?: AiOutlineObjective): string {
  const map: Record<AiOutlineObjective, string> = {
    basic: 'Tập trung vào đúng chủ đề.',
    problem_solution: 'Nêu vấn đề rồi đưa giải pháp rõ ràng.',
    listicle: 'Xây outline theo dạng danh sách.',
    comparison: 'Xây outline theo dạng so sánh.',
    step_by_step: 'Xây outline theo từng bước.',
    story: 'Xây outline theo cấu trúc kể chuyện.',
  };

  return objective ? map[objective] : 'Tự chọn cấu trúc phù hợp nhất với từ khóa.';
}

function buildSizeInstruction(size?: AiOutlineSize): string {
  const map: Record<AiOutlineSize, string> = {
    '2_3_h2': 'Tạo 2-3 H2.',
    '3_4_h2': 'Tạo 3-4 H2.',
    '5_6_h2': 'Tạo 5-6 H2.',
    '7_8_h2': 'Tạo 7-8 H2.',
    '9_10_h2': 'Tạo 9-10 H2.',
  };

  return size ? map[size] : 'Tạo 5-6 H2.';
}

function buildFeaturedSnippetInstruction(tone: KeywordTone, keyword: string): string {
  if (tone === 'how_to') {
    return `Featured snippet: after the intro, add a concise ordered list for "${keyword}" using <ol><li>.`;
  }
  if (tone === 'comparison') {
    return `Featured snippet: include a comparison table near the top with clear <th> headers for "${keyword}".`;
  }
  if (tone === 'listicle') {
    return `Featured snippet: include a compact list near the top, each item using <li><strong>Name</strong> - short description.`;
  }
  return '';
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, '');
}

export function parseOutlineToPreview(outlineText: string): string {
  return outlineText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('[h2]') && line.endsWith('[/h2]')) {
        const content = stripTags(line.slice(4, -5));
        return `<p class="mt-2 font-semibold text-gray-800">${content}</p>`;
      }
      if (line.startsWith('[h3]') && line.endsWith('[/h3]')) {
        const content = stripTags(line.slice(4, -5));
        return `<p class="ml-4 text-sm text-gray-500">- ${content}</p>`;
      }
      return `<p class="text-sm text-gray-500">${stripTags(line)}</p>`;
    })
    .join('');
}

export async function generateKeywordOutline(config: KeywordArticleConfig): Promise<string> {
  const model = buildTinhGonModel(config.model);
  const secondaryKeywords = config.secondaryKeywords.slice(0, 10);

  const prompt = `
Bạn là chuyên gia SEO outline.

Từ khóa chính: ${config.keyword}
Ngôn ngữ: ${config.language}
Giọng văn: ${buildToneInstruction(config.tone)}
Mục tiêu outline: ${buildObjectiveInstruction(config.aiOutlineObjective)}
Số lượng H2 mong muốn: ${buildSizeInstruction(config.aiOutlineSize)}
Viết dạng toplist: ${config.isToplist ? 'Có' : 'Không'}
Từ khóa phụ: ${secondaryKeywords.length ? secondaryKeywords.join(', ') : 'Không có'}

YÊU CẦU:
- Chỉ trả về outline thuần text.
- Mỗi H2 phải ở dạng [h2]Tiêu đề[/h2].
- H3 dùng khi cần, ở dạng [h3]Tiêu đề[/h3].
- Không markdown, không giải thích thêm.
- Nếu là toplist, các H2 phải là các mục trong danh sách.

Ví dụ:
[h2]X là gì?[/h2]
[h3]Định nghĩa[/h3]
[h2]Cách áp dụng X[/h2]
`.trim();

  const response = await model.generateContent(prompt);
  return response.response.text().trim();
}

export function buildKeywordWritingPrompt(config: KeywordArticleConfig, outlineText: string, competitorAnalysis = ''): string {
  const secondaryKeywords = config.secondaryKeywords.slice(0, 10);
  const seoLinks = config.seoKeywordLinks?.map((item) => `${item.keyword} | ${item.url}`).join('\n') || '';
  const brandName = config.brandConfig?.name?.trim() || '';
  const finalOutline = outlineText.trim() || config.resolvedOutline?.trim() || '';
  const featuredSnippetInstruction = buildFeaturedSnippetInstruction(config.tone, config.keyword);
  const toneMap: Record<KeywordTone, string> = {
    seo_basic: 'Tập trung từ khóa, câu ngắn, dễ đọc.',
    seo_focus: 'Tối ưu SEO tự nhiên, không nhồi nhét.',
    seo_extended: 'Giải thích đầy đủ, có ví dụ và so sánh.',
    seo_longform: 'Bài dài, bao quát sâu.',
    seo_nofaq: 'Tối ưu SEO nhưng không thêm FAQ.',
    how_to: 'Hướng dẫn từng bước.',
    listicle: 'Dạng danh sách, rõ ràng.',
    comparison: 'So sánh A vs B.',
    story: 'Dạng kể chuyện, tự nhiên.',
    technical: 'Kỹ thuật, chính xác.',
    friendly: 'Thân thiện, tự nhiên.',
    formal: 'Trang trọng, chuyên nghiệp.',
    confident: 'Tự tin, dứt khoát.',
    year_in_title: 'Thêm năm hiện tại vào tiêu đề.',
    cooking: 'Tập trung công thức và nguyên liệu.',
    random: 'Chọn ngẫu nhiên giữa SEO Focus, Confident và Friendly.',
  };

  const sections = [
    `Viết bài chuẩn SEO bằng ${config.language} cho từ khóa: "${config.keyword}"`,
    `Giọng văn: ${toneMap[config.tone]}`,
    `Độ dài mục tiêu: khoảng ${config.targetLength} từ`,
    `Toplist: ${config.isToplist ? 'Có' : 'Không'}`,
    secondaryKeywords.length ? `Từ khóa phụ: ${secondaryKeywords.join(', ')}` : '',
    finalOutline ? `Dàn ý bắt buộc:\n${finalOutline}` : '',
    competitorAnalysis ? `Phân tích đối thủ:\n${competitorAnalysis}` : '',
    brandName ? `Thương hiệu: ${brandName}` : '',
    config.brandConfig?.pronouns ? `Xưng hô: ${config.brandConfig.pronouns}` : '',
    config.brandConfig?.audience ? `Đối tượng: ${config.brandConfig.audience}` : '',
    config.brandConfig?.toneNotes ? `Ghi chú brand: ${config.brandConfig.toneNotes}` : '',
    config.seoMainLink ? `Link SEO chính: ${config.seoMainLink}` : '',
    seoLinks ? `Link keyword phụ:\n${seoLinks}` : '',
    config.footerContent ? `Nội dung cuối bài:\n${config.footerContent}` : '',
    featuredSnippetInstruction,
    '',
    'YÊU CẦU OUTPUT:',
    '- Chỉ trả về HTML hợp lệ trong một thẻ <article>.',
    '- Dùng <h1> cho tiêu đề, <h2>/<h3> cho heading, <p> cho đoạn văn, <ul><li> cho list nếu phù hợp.',
    '- Không thêm markdown, không thêm CSS hay script.',
    '- Nếu là toplist, dùng cấu trúc danh sách rõ ràng.',
    '',
    SEO_PROMPT_RULES,
  ].filter(Boolean);

  if (competitorAnalysis) {
    sections.push('');
    sections.push('Góc chênh khác biệt với đối thủ: phải bao phủ các gap content, thêm góc nhìn mới, không sao chép nguyên văn.');
  }

  return sections.join('\n');
}
