import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent('Hi');
        console.log('API Response:', result.response.text());
        console.log('✅ API Key is working!');
    } catch (e) {
        console.error('❌ API Key Error:', e.message);
    }
}

test();
