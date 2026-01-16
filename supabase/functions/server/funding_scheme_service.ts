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

    // 2. Retrieve relevant knowledge from Global Library
    const retriever = new KnowledgeRetriever();
    const query = `${scheme.name} ${scheme.description || ''} guidelines objectives criteria budget constraints`;
    const smartKeywords = KnowledgeRetriever.extractSmartKeywords(query);
    const relevantKnowledge = await retriever.getRelevantKnowledge(smartKeywords, 10);

    if (!relevantKnowledge.content) {
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
        .update({ expert_playbook: playbook })
        .eq('id', schemeId);

    if (updateError) throw updateError;

    return { success: true, playbook };
};
