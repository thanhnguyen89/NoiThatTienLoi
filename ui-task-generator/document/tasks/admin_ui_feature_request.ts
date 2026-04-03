export const VisionAPIError = {
  error: 'image_not_accessible',
  reason: 'vision_API_unavailable',
  httpStatus: 402,
  message: 'Không thể phân tích ảnh. Vui lòng mô tả nội dung UI bằng text hoặc chia sẻ lại ảnh khi vision allowance đã được khôi phục.'
} as const;

export type VisionAPIErrorType = typeof VisionAPIError;

export function isVisionAPIError(obj: unknown): obj is VisionAPIErrorType {
  if (typeof obj !== 'object' || obj === null) return false;
  const e = obj as Record<string, unknown>;
  return (
    e.error === 'image_not_accessible' &&
    e.reason === 'vision_API_unavailable' &&
    typeof e.httpStatus === 'number' &&
    e.httpStatus === 402 &&
    typeof e.message === 'string'
  );
}

export function createVisionAPIError(): VisionAPIErrorType {
  return { ...VisionAPIError };
}

export function getRetrySuggestion(error: VisionAPIErrorType): string {
  return `HTTP ${error.httpStatus} [${error.error}] — ${error.message}`;
}

export async function handleVisionAPIError(
  error: VisionAPIErrorType,
  fallback: () => Promise<string>
): Promise<string> {
  console.warn(`[${error.error}] ${error.message}`);
  return fallback();
}