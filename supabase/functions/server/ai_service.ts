import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { GoogleAIFileManager } from 'npm:@google/generative-ai/server';

export const getAI = () => {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
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
    return ai.getGenerativeModel({
        model: 'gemini-1.5-flash',
        ...config
    });
};
