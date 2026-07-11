export const DEFAULT_FORBIDDEN_WORDS = [
  'quan trọng',
  'hiệu quả',
  'tuy nhiên',
  'bên cạnh đó',
  'đáng kể',
  'không thể phủ nhận',
  'toàn diện',
  'tối ưu hóa',
  'đặc biệt quan trọng',
  'nhìn chung',
  'thực tế cho thấy',
  'chính vì vậy',
  'như vậy',
  'tóm lại',
  'trong cuộc sống hiện đại',
  'ngày nay',
  'trong bài viết này',
  'trên đây là',
  'hy vọng bài viết',
  'thông tin hữu ích',
  'vô cùng',
  'cực kỳ',
  'tuyệt vời',
  'đáng chú ý',
  'siêu phẩm',
  'số 1',
  'đẳng cấp',
  'hoàn hảo',
] as const;

/** Dùng khi KHÔNG có DB — merge DEFAULT + brandExtra */
export function mergeForbiddenWords(extra?: string | string[]): string[] {
  const extraWords = Array.isArray(extra)
    ? extra
    : typeof extra === 'string'
      ? extra.split(',')
      : [];

  return Array.from(
    new Set(
      [...DEFAULT_FORBIDDEN_WORDS, ...extraWords]
        .map((word) => word.trim())
        .filter(Boolean)
        .map((word) => word.toLowerCase()),
    ),
  );
}

/**
 * Dùng khi có DB — dbWords là nguồn chính (từ AIConfig.FORBIDDEN_WORDS).
 * - Nếu DB có dữ liệu → dùng DB làm base (bỏ qua DEFAULT_FORBIDDEN_WORDS)
 * - Nếu DB rỗng → fallback về DEFAULT_FORBIDDEN_WORDS
 * - brandExtra luôn được merge thêm vào (từ cấm riêng của từng brand)
 */
export function buildForbiddenList(dbWords: string[], brandExtra?: string | string[]): string[] {
  const base = dbWords.length > 0 ? dbWords : [...DEFAULT_FORBIDDEN_WORDS];
  const extraWords = Array.isArray(brandExtra)
    ? brandExtra
    : typeof brandExtra === 'string'
      ? brandExtra.split(',')
      : [];

  return Array.from(
    new Set(
      [...base, ...extraWords]
        .map((word) => word.trim())
        .filter(Boolean)
        .map((word) => word.toLowerCase()),
    ),
  );
}
