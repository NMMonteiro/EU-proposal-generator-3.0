import { getSupabaseClient } from './supabase_client.ts';
import { getGeminiModel } from './ai_service.ts';
import { extractJSON } from './utils.ts';
import { KnowledgeRetriever } from './knowledge_retriever.ts';

export const enrichFundingScheme = async (schemeId: string) => {
    const supabase = getSupabaseClient();

    // 1. Fetch the scheme
    const { data: scheme, error: fetchError } = await supabase
        .from('funding_schemes')
        .select('*')
        .eq('id', schemeId)
        .single();

    if (fetchError || !scheme) throw new Error('Scheme not found');

    // 2. Retrieve relevant knowledge from Global Library (Semantic Vector Search)
    const retriever = new KnowledgeRetriever();
    const query = `${scheme.name} ${scheme.description || ''} official guidelines objectives scoring criteria budget constraints`;
    const relevantKnowledge = await retriever.getRelevantKnowledge(query, 12);

    if (!relevantKnowledge.content) {
        console.warn(`[ENRICH] No semantic matches in library for: ${scheme.name}`);
        return { message: 'No relevant knowledge found in library to enrich this scheme.' };
    }

    // 3. Synthesize the Expert Playbook using Gemini
    const model = getGeminiModel({ temperature: 0.2 });
    const prompt = `You are a world-class EU Grant Consultant. Your task is to distill expert intelligence for the funding scheme: "${scheme.name}".
    
    Using the provided guidelines and documentation from the Global Library, synthesize an "Expert Playbook" that will be used to guide AI in generating winning proposals.
    
    LIBRARY CONTENT:
    ${relevantKnowledge.content}
    
    Synthesize the following into a clean JSON structure:
    1. core_objectives: The high-level goals this scheme aims to achieve.
    2. scoring_criteria: What evaluators score highest on (Impact, Quality, etc.).
    3. best_practices: Specific advice for applicants (e.g., "focus on digital skills").
    4. budget_rules: Specific constraints or preferences found in text.
    5. common_pitfalls: What to avoid.
    6. key_terminology: Buzzwords and required vocabulary for this scheme.

    RETURN ONLY THE JSON OBJECT.
    {
      "core_objectives": [],
      "scoring_criteria": [],
      "best_practices": [],
      "budget_rules": [],
      "common_pitfalls": [],
      "key_terminology": []
    }`;

    const result = await model.generateContent(prompt);
    const playbook = extractJSON(result.response.text());

    // 4. Update the database
    const { error: updateError } = await supabase
        .from('funding_schemes')
        .update({ expert_rules: playbook }) // Saved as expert_rules for consistency
        .eq('id', schemeId);

    if (updateError) throw updateError;

    return { success: true, playbook };
};

/**
 * Sync Logic: Reconciles a parsed document (template or example) with the master database. 
 */
export const syncSchemeFromContent = async (content: string, type: 'template' | 'example') => {
    const supabase = getSupabaseClient();
    const model = getGeminiModel({ temperature: 0.1 });

    // 1. Fetch all known schemes to match against
    const { data: schemes } = await supabase.from('funding_schemes').select('id, acronym, name');

    const matchingPrompt = `You are an EU Funding specialist. 
    Analyze the following fragment of a document and identify which funding scheme it belongs to.
    
    KNOWN SCHEMES:
    ${JSON.stringify(schemes)}
    
    DOCUMENT FRAGMENT:
    ${content.substring(0, 10000)}
    
    Based on the text:
    1. Which ID from the list does this document correspond to?
    2. What is the logic_mode? Use "mobility" for Short-term mobility (KA122, KA121, etc.) and "standard" for everything else.
    3. Extract the logical structure (sections and labels) if it looks like a template.
    
    RETURN JSON:
    {
        "matchedSchemeId": "the-uuid-here",
        "confidence": 0.95,
        "logicMode": "mobility" | "standard",
        "extractedTemplate": {
            "sections": [
                { "id": "relevance", "label": "Relevance", "description": "..." }
            ]
        },
        "expertRules": [
            { "rule": "...", "guidance": "..." }
        ]
    }`;

    const matchResult = await model.generateContent(matchingPrompt);
    const data = extractJSON(matchResult.response.text());

    if (data.matchedSchemeId && data.confidence > 0.7) {
        console.log(`[SYNC] Matching document to scheme: ${data.matchedSchemeId}`);

        const updates: any = {};

        // Force logic_mode if identified
        if (data.logicMode) {
            updates.logic_mode = data.logicMode;
        }

        if (type === 'template' && data.extractedTemplate?.sections?.length > 0) {
            updates.template_json = data.extractedTemplate;
        }
        if (data.expertRules?.length > 0) {
            updates.expert_rules = data.expertRules;
        }

        if (Object.keys(updates).length > 0) {
            await supabase.from('funding_schemes').update(updates).eq('id', data.matchedSchemeId);

            // Automation: Trigger enrichment in the background (fire and forget)
            console.log(`[SYNC] Triggering automated enrichment for ${data.matchedSchemeId}...`);
            enrichFundingScheme(data.matchedSchemeId).catch(err =>
                console.error(`[SYNC] Automated enrichment failed: ${err.message}`)
            );

            return { success: true, schemeId: data.matchedSchemeId, message: "Scheme master updated and enrichment triggered." };
        }
    }

    return { success: false, message: "No confident match found for scheme synchronization." };
};
