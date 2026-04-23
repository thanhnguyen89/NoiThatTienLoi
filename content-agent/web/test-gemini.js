import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

try {
  const result = await model.generateContent('Trả lời ngắn gọn: 1+1 bằng mấy?');
  console.log('✅ OK:', result.response.text());
} catch (e) {
  console.error('❌ ERROR:', e.message);
}
