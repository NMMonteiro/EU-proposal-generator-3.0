import { getGeminiModel } from './ai_service.ts';
import { extractJSON } from './utils.ts';
import * as PromptBuilder from './prompt_builder.ts';
import { KnowledgeRetriever } from './knowledge_retriever.ts';
import { getSupabaseClient } from './supabase_client.ts';

export const analyzeUrl = async (targetUrl: string, userPrompt?: string, fundingSchemeId?: string) => {
    // 1. Fetch URL content
    let content = '';
    try {
        const res = await fetch(targetUrl);
        content = await res.text();
        content = content.substring(0, 20000);
    } catch (e) {
        content = 'Could not fetch URL content. Please rely on user prompt.';
    }

    // 2. Load funding scheme
    let fundingScheme = null;
    if (fundingSchemeId) {
        const supabase = getSupabaseClient();
        const { data } = await supabase.from('funding_schemes').select('*').eq('id', fundingSchemeId).single();
        fundingScheme = data;
    }

    // 3. RAG: Expert Intelligence Retrieval
    const retriever = new KnowledgeRetriever();
    const smartKeywords = KnowledgeRetriever.extractSmartKeywords(`${fundingScheme?.name || ''} ${userPrompt || ''} ${targetUrl}`);
    const expertKnowledge = await retriever.getRelevantKnowledge(smartKeywords, 3);

    // 4. Phase 1: Summary Extraction
    const model = getGeminiModel({ temperature: 0.1 });
    const phase1Prompt = `Analyze this funding call and extract key information.
${userPrompt ? `\nUSER PROVIDED INSTRUCTIONS: \n${userPrompt}\n` : ''}
URL: ${targetUrl}
CONTENT: ${content.substring(0, 5000)}
${expertKnowledge.content ? `### EXPERT GUIDELINES:\n${expertKnowledge.content}\n` : ''}

Extract JSON: { "summary": "...", "constraints": { "partners": "...", "budget": "...", "duration": "..." } }`;

    const phase1Result = await model.generateContent(phase1Prompt);
    const phase1Data = extractJSON(phase1Result.response.text());

    // 5. Phase 2: Idea Generation
    const ideationModel = getGeminiModel({ temperature: 0.7 });
    const phase2Prompt = PromptBuilder.buildPhase2Prompt(phase1Data.summary, phase1Data.constraints, userPrompt);
    const phase2Result = await ideationModel.generateContent(phase2Prompt);
    const phase2Data = extractJSON(phase2Result.response.text());

    return {
        summary: phase1Data.summary,
        constraints: phase1Data.constraints,
        ideas: phase2Data.ideas,
        knowledgeContext: expertKnowledge.sources
    };
};
