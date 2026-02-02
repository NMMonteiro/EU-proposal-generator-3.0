import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { GoogleAIFileManager } from 'npm:@google/generative-ai/server';

export const getAI = () => {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (apiKey) {
        console.log(`[DEBUG] GEMINI_API_KEY present. Prefix: ${apiKey.substring(0, 7)}...`);
    } else {
        console.error('CRITICAL: GEMINI_API_KEY is missing');
        throw new Error('GEMINI_API_KEY not set in Supabase Secrets');
    }

    return new GoogleGenerativeAI(apiKey);
};

export const getFileManager = () => {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    return new GoogleAIFileManager(apiKey);
};

export const getGeminiModel = (config?: any) => {
    const ai = getAI();
    const modelName = config?.model || 'gemini-3-flash-preview';
    console.log(`[DEBUG] Initializing Gemini Model: ${modelName}`);
    return ai.getGenerativeModel({
        model: modelName,
        ...config
    });
};
