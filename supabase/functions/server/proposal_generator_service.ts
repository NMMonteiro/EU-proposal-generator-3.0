import { getGeminiModel } from './ai_service.ts';
import { extractJSON, corsHeaders } from './utils.ts';
import * as PromptBuilder from './prompt_builder.ts';
import { KnowledgeRetriever } from './knowledge_retriever.ts';
import { getSupabaseClient } from './supabase_client.ts';
import * as KV from './kv_store.ts';
import { saveToSupabase, rebalanceBudget } from './proposal_service.ts';

export const generateProposalFull = async (params: any) => {
    const { idea, summary, constraints, selectedPartners = [], userPrompt, fundingSchemeId } = params;
    console.log(`[PROPOSAL] Starting generation for idea: ${idea.title}`);

    const supabase = getSupabaseClient();
    const partners: any[] = [];
    const filteredPartners = selectedPartners.filter(Boolean);

    if (filteredPartners.length > 0) {
        // ... (existing partner logic)
        console.log(`[PROPOSAL] Hydrating ${filteredPartners.length} partners`);
        const uuidPartners = filteredPartners.filter((id: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        );

        if (uuidPartners.length > 0) {
            const { data: dbPartners } = await supabase.from('partners').select('*').in('id', uuidPartners);
            if (dbPartners) {
                partners.push(...dbPartners.map(p => ({
                    ...p,
                    organisationId: p.organisation_id || p.pic || '',
                    pic: p.pic || '',
                    isCoordinator: p.id === filteredPartners[0]
                })));
            }
        }
    }

    let fundingScheme = null;
    if (fundingSchemeId) {
        console.log(`[PROPOSAL] Using funding scheme: ${fundingSchemeId}`);
        const { data } = await supabase.from('funding_schemes').select('*').eq('id', fundingSchemeId).single();
        fundingScheme = data;
    }

    const model = getGeminiModel({
        temperature: 0.2,
        maxOutputTokens: 8192
    });

    const retriever = new KnowledgeRetriever();
    console.log('[PROPOSAL] Retrieving expert knowledge...');
    const smartKeywords = KnowledgeRetriever.extractSmartKeywords(`${fundingScheme?.name || ''} ${idea.title} ${userPrompt || ''}`);
    const expertKnowledge = await retriever.getRelevantKnowledge(smartKeywords, 4);

    const prompt = PromptBuilder.buildProposalPrompt(idea, summary, constraints, partners, userPrompt, fundingScheme);
    const fullyInformedPrompt = expertKnowledge.content ? `${prompt}\n\n### EXPERT INTELLIGENCE:\n${expertKnowledge.content}` : prompt;

    console.log('[PROPOSAL] Calling Gemini model (this may take 20-40s)...');
    const result = await model.generateContent(fullyInformedPrompt);
    const text = result.response.text();
    console.log('[PROPOSAL] Gemini response received. Parsing JSON...');

    const proposal = extractJSON(text);

    proposal.id = crypto.randomUUID();
    proposal.generatedAt = new Date().toISOString();
    proposal.selectedIdea = idea;
    proposal.summary = summary;
    proposal.constraints = constraints;
    proposal.funding_scheme_id = fundingSchemeId;
    proposal.fundingScheme = fundingScheme;
    proposal.partners = partners;

    // Finalization logic
    let targetBudget = PromptBuilder.extractNumericBudget(userPrompt || '');
    if (!targetBudget) {
        targetBudget = PromptBuilder.extractNumericBudget(constraints.budget || '') ||
            PromptBuilder.extractNumericBudget(constraints.budgetLimit || '');
    }
    if (!targetBudget && fundingScheme?.template_json?.maxBudget) {
        targetBudget = parseInt(fundingScheme.template_json.maxBudget);
    }
    if (!targetBudget && expertKnowledge.content) {
        targetBudget = PromptBuilder.extractNumericBudget(expertKnowledge.content);
    }

    if (!targetBudget || targetBudget < 1000) {
        targetBudget = 250000;
    }

    console.log(`[PROPOSAL] Rebalancing budget to: ${targetBudget}`);
    rebalanceBudget(proposal, targetBudget);

    console.log(`[PROPOSAL] Persisting proposal ${proposal.id} to KV and DB...`);
    await KV.set(`proposal-${proposal.id}`, proposal);
    await saveToSupabase(proposal);
    console.log('[PROPOSAL] Done.');

    return proposal;
};
