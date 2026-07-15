import { getGeminiModel } from './ai_service';
import { extractJSON, stripHtml } from './utils';
import * as PromptBuilder from './prompt_builder';
import { KnowledgeRetriever } from './knowledge_retriever';
import { db } from './firebase_db';

export const analyzeUrl = async (targetUrl: string, userPrompt?: string, fundingSchemeId?: string) => {
    let rawContent = '';
    try {
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        rawContent = await res.text();
    } catch (e) {
        rawContent = 'Could not fetch URL content. Please rely on user prompt and expert knowledge.';
    }

    const cleanContent = stripHtml(rawContent).substring(0, 15000);
    const isPotentiallyEmpty = cleanContent.length < 500 && rawContent.length > 5000;

    const analysisContext = isPotentiallyEmpty ? rawContent.substring(0, 25000) : cleanContent;

    // 2. Load funding scheme AND examples
    let fundingScheme = null;
    let examples: any[] = [];
    if (fundingSchemeId) {
        const doc = await db.collection('funding_schemes').doc(fundingSchemeId).get();
        if (doc.exists) {
            fundingScheme = doc.data()!;
        }

        const exampleSnap = await db.collection('proposal_examples')
            .where('fundingSchemeId', '==', fundingSchemeId)
            .limit(2)
            .get();
        exampleSnap.forEach(exDoc => {
            examples.push(exDoc.data());
        });
    }

    // 3. RAG: Expert Intelligence Retrieval
    const retriever = new KnowledgeRetriever();
    const smartKeywords = KnowledgeRetriever.extractSmartKeywords(`${fundingScheme?.name || ''} ${userPrompt || ''} ${targetUrl}`);
    const expertKnowledge = await retriever.getRelevantKnowledge(smartKeywords.join(' '), 4);

    // 4. Phase 1: Summary Extraction
    const model = getGeminiModel({
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
    const phase1Data = extractJSON(phase1Result.response.text());

    console.log(`[Analysis] URL: ${targetUrl} | Mode: ${isPotentiallyEmpty ? 'JS-Heavy (Raw Fallback)' : 'Static (Clean)'}`);

    // 5. Phase 2: Idea Generation
    const ideationModel = getGeminiModel({
        temperature: 0.8,
        topP: 0.95,
        topK: 40
    });

    const phase2Prompt = PromptBuilder.buildPhase2Prompt(
        phase1Data.summary,
        phase1Data.constraints,
        userPrompt,
        fundingScheme,
        examples
    );

    const phase2Result = await ideationModel.generateContent(phase2Prompt);
    const phase2Data = extractJSON(phase2Result.response.text());

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
