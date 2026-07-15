"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeUrl = void 0;
const ai_service_1 = require("./ai_service");
const utils_1 = require("./utils");
const PromptBuilder = __importStar(require("./prompt_builder"));
const knowledge_retriever_1 = require("./knowledge_retriever");
const firebase_db_1 = require("./firebase_db");
const analyzeUrl = async (targetUrl, userPrompt, fundingSchemeId) => {
    let rawContent = '';
    try {
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        rawContent = await res.text();
    }
    catch (e) {
        rawContent = 'Could not fetch URL content. Please rely on user prompt and expert knowledge.';
    }
    const cleanContent = (0, utils_1.stripHtml)(rawContent).substring(0, 15000);
    const isPotentiallyEmpty = cleanContent.length < 500 && rawContent.length > 5000;
    const analysisContext = isPotentiallyEmpty ? rawContent.substring(0, 25000) : cleanContent;
    // 2. Load funding scheme AND examples
    let fundingScheme = null;
    let examples = [];
    if (fundingSchemeId) {
        const doc = await firebase_db_1.db.collection('funding_schemes').doc(fundingSchemeId).get();
        if (doc.exists) {
            fundingScheme = doc.data();
        }
        const exampleSnap = await firebase_db_1.db.collection('proposal_examples')
            .where('fundingSchemeId', '==', fundingSchemeId)
            .limit(2)
            .get();
        exampleSnap.forEach(exDoc => {
            examples.push(exDoc.data());
        });
    }
    // 3. RAG: Expert Intelligence Retrieval
    const retriever = new knowledge_retriever_1.KnowledgeRetriever();
    const smartKeywords = knowledge_retriever_1.KnowledgeRetriever.extractSmartKeywords(`${fundingScheme?.name || ''} ${userPrompt || ''} ${targetUrl}`);
    const expertKnowledge = await retriever.getRelevantKnowledge(smartKeywords.join(' '), 4);
    // 4. Phase 1: Summary Extraction
    const model = (0, ai_service_1.getGeminiModel)({
        temperature: 0.1,
        maxOutputTokens: 2048
    });
    const phase1Prompt = `You are an expert grant analyst. Analyze the following funding opportunity.
${userPrompt ? `\nUSER CONTEXT/INSTRUCTIONS: ${userPrompt}\n` : ''}
URL: ${targetUrl}
EXTRACTED WEBSITE CONTENT: 
${analysisContext}

${isPotentiallyEmpty ? `NOTE: The website seems to be a Javascript-rendered application. Look for data in embedded JSON, script variables, or meta tags if available in the raw snippets above.` : ''}

${fundingScheme?.expert_rules ? `### SCHEME-SPECIFIC EXPERT RULES:
${JSON.stringify(fundingScheme.expert_rules, null, 2)}\n` : ''}

${expertKnowledge.content ? `### GLOBAL LIBRARY INTELLIGENCE (Priority Information):
${expertKnowledge.content}\n` : ''}

TASK:
Extract the core details of this funding call. 
1. **Summary**: What is this call about? (Max 2 sentences)
2. **Partners**: How many partners? What types (NGO, University, etc.)? Any geographic rules?
3. **Budget**: What is the MIN and MAX grant amount? Is there a total budget? Be extremely precise with currencies.
4. **Duration**: How many months? What are the start/end dates if mentioned?

OUTPUT FORMAT: Strict JSON
{
  "summary": "Full summary here",
  "constraints": {
    "partners": "Specific partner rules",
    "budget": "Specific budget limits (e.g. 10,000€ - 12,000€)",
    "duration": "Specific duration (e.g. 12 months)"
  }
}`;
    const phase1Result = await model.generateContent(phase1Prompt);
    const phase1Data = (0, utils_1.extractJSON)(phase1Result.response.text());
    console.log(`[Analysis] URL: ${targetUrl} | Mode: ${isPotentiallyEmpty ? 'JS-Heavy (Raw Fallback)' : 'Static (Clean)'}`);
    // 5. Phase 2: Idea Generation
    const ideationModel = (0, ai_service_1.getGeminiModel)({
        temperature: 0.8,
        topP: 0.95,
        topK: 40
    });
    const phase2Prompt = PromptBuilder.buildPhase2Prompt(phase1Data.summary, phase1Data.constraints, userPrompt, fundingScheme, examples);
    const phase2Result = await ideationModel.generateContent(phase2Prompt);
    const phase2Data = (0, utils_1.extractJSON)(phase2Result.response.text());
    // Detect logic_mode
    const contextText = `${fundingScheme?.name || ''} ${phase1Data.summary} ${userPrompt || ''} ${cleanContent.substring(0, 1000)}`.toLowerCase();
    const detectedLogicMode = (fundingScheme?.logic_mode === 'mobility' ||
        contextText.includes('mobility') ||
        contextText.includes('ka122') ||
        contextText.includes('ka121') ||
        contextText.includes('erasmus')) ? 'mobility' : 'standard';
    return {
        summary: phase1Data.summary,
        constraints: phase1Data.constraints,
        ideas: phase2Data.ideas,
        knowledgeContext: expertKnowledge.sources,
        logic_mode: detectedLogicMode
    };
};
exports.analyzeUrl = analyzeUrl;
//# sourceMappingURL=ideation_service.js.map