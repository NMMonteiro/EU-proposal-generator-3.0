import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { withRetry } from './utils';

export const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('CRITICAL: GEMINI_API_KEY is missing from process.env');
        throw new Error('GEMINI_API_KEY not set in environment variables');
    }
    return new GoogleGenerativeAI(apiKey);
};

export const getFileManager = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    return new GoogleAIFileManager(apiKey);
};

export const getGeminiModel = (config?: any) => {
    const ai = getAI();
    const modelName = config?.model || 'gemini-2.5-flash';
    console.log(`[DEBUG] Initializing Gemini Model: ${modelName}`);
    return ai.getGenerativeModel({
        model: modelName,
        ...config
    });
};

export const embedText = async (text: string) => {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await withRetry(() => model.embedContent(text));
    return result.embedding.values;
};
