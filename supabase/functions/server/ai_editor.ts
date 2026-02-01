import { getGeminiModel } from './ai_service.ts';
import { extractJSON } from './utils.ts';
import { loadFullProposal, saveToSupabase } from './proposal_service.ts';

/**
 * Handles individual section/subsection AI edits
 */
export async function handleAiEdit(params: any) {
    const { proposalId, sectionKey, sectionTitle, currentContent, instruction } = params;

    const model = getGeminiModel({ temperature: 0.7 });

    const prompt = `You are an expert grant writer. 
    We are editing a specific section of a proposal.
    
    SECTION TITLE: ${sectionTitle}
    CURRENT CONTENT:
    """
    ${currentContent}
    """
    
    USER INSTRUCTION: "${instruction}"
    
    TASK:
    Rewrite this section based on the instruction. 
    Maintain professional, persuasive, and data-driven language.
    Ensure the output is in HTML format (use <p>, <h3>, <ul>, <li> as appropriate).
    Do NOT include any other text, just the new content.
    
    OUTPUT:
    Return ONLY valid JSON:
    {
      "newContent": "Your generated HTML content here..."
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = extractJSON(text);

    // If we have a proposalId, we should probably update it in the database too
    if (proposalId && data.newContent) {
        const proposal = await loadFullProposal(proposalId);
        if (proposal) {
            const dynSections = proposal.dynamic_sections || proposal.dynamicSections || {};
            dynSections[sectionKey] = data.newContent;

            // Sync back
            proposal.dynamicSections = dynSections;
            await saveToSupabase(proposal);
        }
    }

    return data;
}

/**
 * Handles the "Smart Chatbot" / Copilot interaction
 */
export async function handleCopilotChat(params: any) {
    const { proposalId, message, history = [] } = params;

    const proposal = await loadFullProposal(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // RAG: Fetch relevant intelligence from Global Knowledge Base
    const { KnowledgeRetriever } = await import('./knowledge_retriever.ts');
    const retriever = new KnowledgeRetriever();
    const smartKeywords = KnowledgeRetriever.extractSmartKeywords(`${proposal.fundingScheme?.name || ''} ${message}`);
    const expertKnowledge = await retriever.getRelevantKnowledge(smartKeywords, 3);

    const logicMode = proposal.logic_mode || proposal.fundingScheme?.logic_mode || (proposal.mobilityMetadata ? 'mobility' : 'standard');
    const mobilityRules = proposal.fundingScheme?.template_json?.mobilityRules;

    // Build context-aware system prompt
    const systemPrompt = `You are the "Proposal Copilot", an elite AI assistant specialized in European funding (Erasmus+, Horizon Europe, etc.).
    You have full access to the current project context and EXPERT INTELLIGENCE below.
    
    LOGIC MODE: "${logicMode}" 
    ${logicMode === 'mobility' ? 'This is a MOBILITY project (like KA121/KA122). Focus on participant flows, individual support, and learning outcomes instead of complex work packages.' : 'This is a STANDARD project (like KA220/Horizon). Focus on structured Work Packages, tasks, and actual cost breakdowns.'}

    ${expertKnowledge.content ? `### EXPERT INTELLIGENCE (BEST PRACTICES):
    ${expertKnowledge.content}` : ''}

    PROJECT CONTEXT:
    - Title: ${proposal.title}
    - Summary: ${proposal.summary}
    - Settings: ${JSON.stringify(proposal.settings || {})}
    - Partners: ${JSON.stringify(proposal.partners?.map((p: any) => p.name))}
    - Budget: ${JSON.stringify(proposal.budget)}
    ${logicMode === 'mobility' ? `- Mobility Activities: ${JSON.stringify(proposal.workPackages || [])}` : `- Work Packages: ${JSON.stringify(proposal.workPackages || [])}`}
    
    ${logicMode === 'mobility' && mobilityRules ? `Erasmus Mobility Rules: ${JSON.stringify(mobilityRules)}` : ''}

    YOUR CAPABILITIES:
    1. Answer questions concisely and professionally.
    2. Analyze sections and suggest deep improvements.
    3. Perform direct actions: You MUST trigger actions whenever the user asks for changes, updates, or additions. If you mention a change in your 'response' text, that change MUST be present in the 'actions' array.
    
    CRITICAL: Never just "confirm" a change in text without providing the corresponding 'actions' array to back it up.
    
    OUTPUT FORMAT:
    You must return a JSON response with:
    {
      "response": "Your message to the user confirming what you did.",
      "actions": [ // MUST be an array of actions
        {
          "type": "update_section",
          "section": "section_key_to_update",
          "content": "New HTML content for the section (use proper HTML tags)"
        },
        {
          "type": "update_metadata",
          "updates": {
             "title": "New title",
             "summary": "New summary",
             "settings": { 
                "startDate": "YYYY-MM-DD", 
                "currency": "EUR/USD",
                "duration": 24 
             }
          }
        },
        {
          "type": "update_budget",
          "data": [
            {
              "item": "Item Name",
              "cost": 1000,
              "description": "Optional description",
              "breakdown": [
                { "subItem": "Sub Name", "quantity": 1, "unitCost": 1000, "total": 1000 }
              ]
            }
          ]
        },
        {
          "type": "update_all_work_packages", // Recommended for standard projects
          "data": [
            { "name": "WP1: Management", "description": "...", "activities": [{ "name": "Task 1.1", "description": "...", "estimatedBudget": 5000 }] }
          ]
        },
        {
          "type": "update_mobility_activity", // Use for Mobility mode
          "index": 0,
          "data": { "name": "...", "description": "...", "participants": 5, "days": 10, "type": "job_shadowing" }
        }
      ]
    }
    
    CRITICAL INSTRUCTIONS: 
    1. SYNC: If you change metadata or budget, update the corresponding text sections (like "Context" or "Project Objectives") to match.
    2. PROACTIVITY: If the user asks for a project in a specific country, suggest partner profiles or local context.
    ${logicMode === 'mobility' ? '3. MOBILITY LOGIC: When adding a mobility, calculate the budget impact based on rules (e.g. org support = 100 per person).' : '3. WP LOGIC: Ensure work packages are coherent and sequential.'}
    
    AVAILABLE SECTION KEYS: ${JSON.stringify(Object.keys(proposal.dynamic_sections || proposal.dynamicSections || {}))}
    
    CRITICAL BUDGET: When updating Budget, you MUST return the FULL list of items in the 'data' array. If you want to add or modify something, include all other existing items too, otherwise they will be deleted. Ensure each item's 'cost' equals the sum of its 'breakdown' totals if breakdowns are present.
    
    CRITICAL WORK PLAN: For standard projects, ALWAYS use the 'update_all_work_packages' action with the FULL array of Work Packages. DO NOT use 'update_work_package' as it is less reliable for structural changes.
    
    Return ONLY valid JSON. Nothing else.`;

    const model = getGeminiModel({
        temperature: 0.7,
        systemInstruction: systemPrompt
    });

    const chatHistory = history.map((ms: any) => ({
        role: ms.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: ms.content }]
    }));

    const chat = model.startChat({
        history: chatHistory
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();
    const data = extractJSON(responseText);
    if (!data) return { response: "I encountered an error parsing the AI response.", actions: [] };

    // If actions were requested, perform them in the DB
    const actions = data.actions || (data.action ? [data.action] : []);

    try {
        if (actions.length > 0) {
            console.log(`[Copilot Actions] Count: ${actions.length}`, JSON.stringify(actions));

            for (const action of actions) {
                console.log(`[Copilot Processing] Action type: ${action.type}`);
                if (action.type === 'update_section') {
                    const { section, content } = action;
                    const dynSections = proposal.dynamic_sections || proposal.dynamicSections || {};
                    dynSections[section] = content;
                    proposal.dynamicSections = dynSections;
                } else if (action.type === 'update_metadata') {
                    const { updates } = action;
                    if (updates.title) proposal.title = updates.title;
                    if (updates.summary) proposal.summary = updates.summary;
                    if (updates.settings) {
                        proposal.settings = { ...(proposal.settings || {}), ...updates.settings };
                    }
                    if (updates.mobilityMetadata) {
                        proposal.mobilityMetadata = { ...(proposal.mobilityMetadata || {}), ...updates.mobilityMetadata };
                    }
                } else if (action.type === 'update_work_package' || action.type === 'update_mobility_activity') {
                    const { index, data: wpData } = action;
                    const wps = proposal.workPackages || proposal.work_packages || [];

                    // Normalize mapping for both standard and mobility
                    const normalizedWP = {
                        ...wpData,
                        name: wpData.name || wpData.title || wpData.activity_name,
                        description: wpData.description,
                        duration: wpData.duration || wpData.days || wpData.timeline,
                        participants: Number(wpData.participants || wpData.pax || wpData.count) || 0,
                        activityType: wpData.activityType || wpData.type || wpData.activity_type
                    };

                    if (index === -1 || (index !== undefined && index >= wps.length)) {
                        wps.push(normalizedWP);
                    } else if (index !== undefined && wps[index]) {
                        wps[index] = { ...wps[index], ...normalizedWP };
                    }
                    proposal.workPackages = wps;

                    // AUTO-UPDATE BUDGET for Mobility
                    if (logicMode === 'mobility' && mobilityRules) {
                        const totalParticipants = wps.reduce((sum: number, wp: any) => sum + (Number(wp.participants) || 0), 0);
                        const orgSupportTotal = totalParticipants * (mobilityRules.unitCosts?.organizational_support || 100);
                        const budget = proposal.budget || [];
                        const osIdx = budget.findIndex((b: any) =>
                            (b.category || b.item || '').toLowerCase().includes('organizational support')
                        );
                        const newItem = {
                            item: 'Organizational Support',
                            category: 'Organizational Support',
                            description: `Support for ${totalParticipants} participants.`,
                            cost: orgSupportTotal
                        };
                        if (osIdx > -1) budget[osIdx] = newItem;
                        else budget.push(newItem);
                        proposal.budget = budget;
                    }
                } else if (action.type === 'update_all_work_packages') {
                    if (Array.isArray(action.data)) {
                        proposal.workPackages = action.data;
                    }
                } else if (action.type === 'update_budget') {
                    const { data: budgetData } = action;
                    if (Array.isArray(budgetData)) {
                        proposal.budget = budgetData.map((item: any) => {
                            if (item.breakdown && item.breakdown.length > 0) {
                                item.breakdown = item.breakdown.map((b: any) => {
                                    if (b.quantity !== undefined && b.unitCost !== undefined) {
                                        b.total = (Number(b.quantity) || 0) * (Number(b.unitCost) || 0);
                                    }
                                    return b;
                                });
                                item.cost = item.breakdown.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0);
                            }
                            return item;
                        });
                    }
                }
            }
            console.log(`[Copilot] Syncing updates for proposal ${proposalId}...`);
            await saveToSupabase(proposal);
            console.log(`[Copilot] Sync complete.`);
        }
    } catch (err: any) {
        console.error("[Copilot Error]", err);
        return {
            response: `${data.response}\n\n(Note: I encountered a technical issue while saving some updates: ${err.message})`,
            actions: [],
            error: err.message
        };
    }

    return {
        ...data,
        actions,
        knowledgeContext: expertKnowledge.sources
    };
}
