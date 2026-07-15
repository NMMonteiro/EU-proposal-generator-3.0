import { getGeminiModel } from './ai_service';
import { extractJSON } from './utils';
import * as PromptBuilder from './prompt_builder';
import { KnowledgeRetriever } from './knowledge_retriever';
import { db } from './firebase_db';
import * as KV from './kv_store';
import { saveToSupabase, rebalanceBudget } from './proposal_service';

export const generateProposalFull = async (params: any) => {
    const { idea, summary, constraints, selectedPartners = [], userPrompt, fundingSchemeId } = params;
    console.log(`[PROPOSAL] Starting generation for idea: ${idea.title}`);

    const partners: any[] = [];
    const filteredPartners = selectedPartners.filter(Boolean);

    if (filteredPartners.length > 0) {
        console.log(`[PROPOSAL] Hydrating ${filteredPartners.length} partners`);
        const uuidPartners = filteredPartners.filter((id: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        );

        if (uuidPartners.length > 0) {
            const snap = await db.collection('partners').where('__name__', 'in', uuidPartners).get();
            const dbPartners: any[] = [];
            snap.forEach(doc => {
                dbPartners.push({ ...doc.data(), id: doc.id });
            });
            
            if (dbPartners.length > 0) {
                partners.push(...dbPartners.map(p => ({
                    ...p,
                    organisationId: p.organisationId || p.organisation_id || p.pic || '',
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
        const doc = await db.collection('funding_schemes').doc(fundingSchemeId).get();
        if (doc.exists) {
            fundingScheme = doc.data()!;
            logicMode = fundingScheme.logicMode || fundingScheme.logic_mode || 'standard';
        }
    } else {
        const fullText = `${idea.title} ${idea.description} ${userPrompt} ${summary}`.toLowerCase();
        if (fullText.includes('mobility') || fullText.includes('ka122') || fullText.includes('ka121') || fullText.includes('erasmus')) {
            logicMode = 'mobility';
            console.log('[PROPOSAL] Inferred mobility mode from keyword context');
        }
    }

    // 2. Load examples for this scheme
    let examples: any[] = [];
    if (fundingSchemeId) {
        const exampleSnap = await db.collection('proposal_examples')
            .where('fundingSchemeId', '==', fundingSchemeId)
            .limit(2)
            .get();
        exampleSnap.forEach(doc => {
            examples.push(doc.data());
        });
    }

    const model = getGeminiModel({
        temperature: 0.3,
        maxOutputTokens: 8192
    });

    const retriever = new KnowledgeRetriever();
    console.log('[PROPOSAL] Retrieving semantic intelligence from Global Library...');
    const contextQuery = `${idea.title} ${summary} ${userPrompt || ''} ${fundingScheme?.name || ''}`;
    const expertKnowledge = await retriever.getRelevantKnowledge(contextQuery, 6);

    const prompt = PromptBuilder.buildProposalPrompt(
        idea,
        summary,
        constraints,
        partners,
        userPrompt,
        fundingScheme,
        logicMode,
        examples
    );

    const fullyInformedPrompt = expertKnowledge.content
        ? `${prompt}\n\n### GLOBAL LIBRARY INTELLIGENCE (LATEST EU GUIDELINES):\n${expertKnowledge.content}`
        : prompt;

    console.log('[PROPOSAL] Calling Gemini model (Elite Strategy Mode)...');
    const result = await model.generateContent(fullyInformedPrompt);
    let text = result.response.text();

    console.log('[PROPOSAL] Bypass Reviewer: Returning primary generation result.');
    console.log('[PROPOSAL] Gemini response received. Parsing JSON...');

    const proposal = extractJSON(text);

    proposal.id = require('crypto').randomUUID();
    proposal.generatedAt = new Date().toISOString();
    proposal.savedAt = proposal.generatedAt;
    proposal.selectedIdea = idea;
    proposal.summary = summary;
    proposal.constraints = constraints;
    proposal.funding_scheme_id = fundingSchemeId;
    proposal.fundingScheme = fundingScheme;
    proposal.partners = partners;

    proposal.logic_mode = logicMode; 
    proposal.logicMode = logicMode; 

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

    if (!targetBudget && expertKnowledge.content) {
        targetBudget = PromptBuilder.extractNumericBudget(expertKnowledge.content);
        console.log(`[PROPOSAL] Budget from expertKnowledge: ${targetBudget}`);
    }

    if (!targetBudget && fundingScheme?.budget_rules?.type === 'lump_sum' && fundingScheme?.budget_rules?.options) {
        const options = fundingScheme.budget_rules.options;
        if (Array.isArray(options) && options.length > 0) {
            targetBudget = Math.max(...options.map(Number));
            console.log(`[PROPOSAL] Using max lump sum option as targetBudget: ${targetBudget}`);
        }
    }

    if (!targetBudget || targetBudget < 1000) {
        console.log(`[PROPOSAL] No clear budget constraint found. Setting targetBudget to 0 for dynamic calculation.`);
        targetBudget = 0;
    }

    if (targetBudget > 0) {
        console.log(`[PROPOSAL] FINAL Rebalancing budget to: ${targetBudget}`);
        rebalanceBudget(proposal, targetBudget);
    } else {
        console.log(`[PROPOSAL] Keeping original AI-generated budget (no target budget constraint found).`);
    }

    console.log(`[PROPOSAL] Persisting proposal ${proposal.id} (Logic Mode: ${logicMode})`);
    await KV.set(`proposal-${proposal.id}`, proposal);
    await saveToSupabase(proposal);
    console.log('[PROPOSAL] Done.');

    return proposal;
};
