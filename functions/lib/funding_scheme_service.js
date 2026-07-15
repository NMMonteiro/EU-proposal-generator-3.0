"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSchemeFromContent = exports.enrichFundingScheme = void 0;
const firebase_db_1 = require("./firebase_db");
const ai_service_1 = require("./ai_service");
const utils_1 = require("./utils");
const knowledge_retriever_1 = require("./knowledge_retriever");
const enrichFundingScheme = async (schemeId) => {
    const doc = await firebase_db_1.db.collection('funding_schemes').doc(schemeId).get();
    if (!doc.exists)
        throw new Error('Scheme not found');
    const scheme = doc.data();
    // 2. Retrieve relevant knowledge from Global Library (Semantic Vector Search)
    const retriever = new knowledge_retriever_1.KnowledgeRetriever();
    const query = `${scheme.name} ${scheme.description || ''} official guidelines objectives scoring criteria budget constraints`;
    const relevantKnowledge = await retriever.getRelevantKnowledge(query, 12);
    if (!relevantKnowledge.content) {
        console.warn(`[ENRICH] No semantic matches in library for: ${scheme.name}`);
        return { message: 'No relevant knowledge found in library to enrich this scheme.' };
    }
    // 3. Synthesize the Expert Playbook using Gemini
    const model = (0, ai_service_1.getGeminiModel)({ temperature: 0.2 });
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
    const playbook = (0, utils_1.extractJSON)(result.response.text());
    // 4. Update the database
    await firebase_db_1.db.collection('funding_schemes').doc(schemeId).update({
        expert_rules: playbook,
        expertRules: playbook
    });
    return { success: true, playbook };
};
exports.enrichFundingScheme = enrichFundingScheme;
/**
 * Sync Logic: Reconciles a parsed document (template or example) with the master database.
 */
const syncSchemeFromContent = async (content, type) => {
    const snap = await firebase_db_1.db.collection('funding_schemes').get();
    const schemes = [];
    snap.forEach(doc => {
        const d = doc.data();
        schemes.push({ id: doc.id, acronym: d.acronym, name: d.name });
    });
    const model = (0, ai_service_1.getGeminiModel)({ temperature: 0.1 });
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
    const data = (0, utils_1.extractJSON)(matchResult.response.text());
    if (data.matchedSchemeId && data.confidence > 0.7) {
        console.log(`[SYNC] Matching document to scheme: ${data.matchedSchemeId}`);
        const updates = {};
        if (data.logicMode) {
            updates.logic_mode = data.logicMode;
            updates.logicMode = data.logicMode;
        }
        if (type === 'template' && data.extractedTemplate?.sections?.length > 0) {
            updates.template_json = data.extractedTemplate;
        }
        if (data.expertRules?.length > 0) {
            updates.expert_rules = data.expertRules;
            updates.expertRules = data.expertRules;
        }
        if (Object.keys(updates).length > 0) {
            await firebase_db_1.db.collection('funding_schemes').doc(data.matchedSchemeId).update(updates);
            // Automation: Trigger enrichment in the background
            console.log(`[SYNC] Triggering automated enrichment for ${data.matchedSchemeId}...`);
            (0, exports.enrichFundingScheme)(data.matchedSchemeId).catch(err => console.error(`[SYNC] Automated enrichment failed: ${err.message}`));
            return { success: true, schemeId: data.matchedSchemeId, message: "Scheme master updated and enrichment triggered." };
        }
    }
    return { success: false, message: "No confident match found for scheme synchronization." };
};
exports.syncSchemeFromContent = syncSchemeFromContent;
//# sourceMappingURL=funding_scheme_service.js.map