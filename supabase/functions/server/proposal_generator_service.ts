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
    let logicMode = 'standard';

    if (fundingSchemeId) {
        console.log(`[PROPOSAL] Using funding scheme: ${fundingSchemeId}`);
        const { data } = await supabase.from('funding_schemes').select('*').eq('id', fundingSchemeId).single();
        fundingScheme = data;
        logicMode = data?.logic_mode || 'standard';
    } else {
        // Intelligent inference if no scheme selected
        const fullText = `${idea.title} ${idea.description} ${userPrompt} ${summary}`.toLowerCase();
        if (fullText.includes('mobility') || fullText.includes('ka122') || fullText.includes('ka121') || fullText.includes('erasmus')) {
            logicMode = 'mobility';
            console.log('[PROPOSAL] Inferred mobility mode from keyword context');
        }
    }

    const model = getGeminiModel({
        temperature: 0.2,
        maxOutputTokens: 8192
    });

    const retriever = new KnowledgeRetriever();
    console.log('[PROPOSAL] Retrieving expert knowledge...');
    const smartKeywords = KnowledgeRetriever.extractSmartKeywords(`${fundingScheme?.name || ''} ${idea.title} ${userPrompt || ''}`);
    const expertKnowledge = await retriever.getRelevantKnowledge(smartKeywords, 4);

    const prompt = PromptBuilder.buildProposalPrompt(idea, summary, constraints, partners, userPrompt, fundingScheme, logicMode);
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
    proposal.logic_mode = logicMode; // Pass this explicitly to frontend

    let targetBudget = PromptBuilder.extractNumericBudget(userPrompt || '');
    console.log(`[PROPOSAL] Budget from userPrompt: ${targetBudget}`);

    if (!targetBudget) {
        targetBudget = PromptBuilder.extractNumericBudget(constraints.budget || '') ||
            PromptBuilder.extractNumericBudget(constraints.budgetLimit || '');
        console.log(`[PROPOSAL] Budget from constraints: ${targetBudget}`);
    }

    if (!targetBudget && fundingScheme?.template_json?.maxBudget) {
        targetBudget = Number(fundingScheme.template_json.maxBudget);
        console.log(`[PROPOSAL] Budget from fundingScheme template: ${targetBudget}`);
    }

    // Special handling for known schemes with missing maxBudget in template
    const contextText = `${fundingScheme?.name || ''} ${summary} ${idea.description || ''} ${idea.title || ''}`;
    if (!targetBudget && contextText.includes('KA122')) {
        targetBudget = 60000;
        console.log(`[PROPOSAL] Budget inferred from KA122 context: ${targetBudget}`);
    }

    if (!targetBudget && expertKnowledge.content) {
        targetBudget = PromptBuilder.extractNumericBudget(expertKnowledge.content);
        console.log(`[PROPOSAL] Budget from expertKnowledge: ${targetBudget}`);
    }

    if (!targetBudget || targetBudget < 1000) {
        targetBudget = logicMode === 'mobility' ? 60000 : 250000;
        console.log(`[PROPOSAL] Using fallback budget (${logicMode} mode): ${targetBudget}`);
    }

    console.log(`[PROPOSAL] FINAL Rebalancing budget to: ${targetBudget}`);
    rebalanceBudget(proposal, targetBudget);

    console.log(`[PROPOSAL] Persisting proposal ${proposal.id} (Logic Mode: ${logicMode})`);
    await KV.set(`proposal-${proposal.id}`, proposal);
    await saveToSupabase(proposal);
    console.log('[PROPOSAL] Done.');

    return proposal;
};
