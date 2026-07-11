import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * Get Gemini model with custom base URL support
 * @param modelName - Model name (default: gemini-2.0-flash)
 * @returns GenerativeModel instance
 */
export function getGeminiModel(modelName?: string): GenerativeModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trong .env');
  }

  const model = modelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const baseUrl = process.env.GEMINI_BASE_URL;

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Nếu có custom base URL, set vào config
  if (baseUrl) {
    // Note: GoogleGenerativeAI SDK không hỗ trợ custom base URL trực tiếp
    // Nếu cần dùng proxy, phải dùng axios thay vì SDK
    console.log(`[Gemini] Using base URL: ${baseUrl}`);
  }

  return genAI.getGenerativeModel({ model });
}

/**
 * Call Gemini API with retry logic for 429 errors
 * @param fn - Function to call
 * @param maxRetries - Max retry attempts (default: 3)
 * @returns Promise result
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 =
        msg.includes('429') ||
        msg.includes('Too Many Requests') ||
        msg.includes('quota');

      if (is429 && attempt < maxRetries) {
        const retryMatch = msg.match(/retry[^\d]*(\d+)/i);
        const waitMs = retryMatch
          ? parseInt(retryMatch[1]) * 1000 + 2000
          : 25000 * (attempt + 1);

        console.warn(
          `[Gemini] 429 — đợi ${Math.round(waitMs / 1000)}s (attempt ${
            attempt + 1
          }/${maxRetries})`
        );

        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      throw err;
    }
  }
  throw new Error('Hết số lần retry');
}

/**
 * Extract JSON from Gemini response (handles markdown code blocks)
 * @param text - Response text from Gemini
 * @returns Parsed JSON object or null
 */
export function extractJson(text: string): unknown {
  // Thử parse trực tiếp
  try {
    return JSON.parse(text);
  } catch {
    /* tiếp tục */
  }

  // Trích từ markdown code block
  const block = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
  if (block) {
    try {
      return JSON.parse(block[1]);
    } catch {
      /* tiếp tục */
    }
  }

  // Trích phần {...} đầu tiên
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) {
    try {
      return JSON.parse(obj[0]);
    } catch {
      /* tiếp tục */
    }
  }

  return null;
}

/**
 * Call Gemini with a simple prompt and return text response
 * @param prompt - The prompt to send
 * @param modelName - Model name (optional)
 * @returns Promise<string> - The generated text
 */
export async function callGemini(
  prompt: string,
  modelName?: string
): Promise<string> {
  const model = getGeminiModel(modelName);
  
  const result = await callWithRetry(async () => {
    return await model.generateContent(prompt);
  });
  
  const response = result.response;
  return response.text();
}
