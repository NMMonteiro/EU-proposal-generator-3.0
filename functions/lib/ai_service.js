"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedText = exports.getGeminiModel = exports.getFileManager = exports.getAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const server_1 = require("@google/generative-ai/server");
const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('CRITICAL: GEMINI_API_KEY is missing from process.env');
        throw new Error('GEMINI_API_KEY not set in environment variables');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
};
exports.getAI = getAI;
const getFileManager = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY not set');
    return new server_1.GoogleAIFileManager(apiKey);
};
exports.getFileManager = getFileManager;
const getGeminiModel = (config) => {
    const ai = (0, exports.getAI)();
    const modelName = config?.model || 'gemini-2.5-flash';
    console.log(`[DEBUG] Initializing Gemini Model: ${modelName}`);
    return ai.getGenerativeModel({
        model: modelName,
        ...config
    });
};
exports.getGeminiModel = getGeminiModel;
const embedText = async (text) => {
    const ai = (0, exports.getAI)();
    const model = ai.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
};
exports.embedText = embedText;
//# sourceMappingURL=ai_service.js.map