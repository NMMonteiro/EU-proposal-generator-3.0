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

    const model = getGeminiModel({ temperature: 0.7 });

    const logicMode = proposal.fundingScheme?.logic_mode || 'standard';
    const mobilityRules = proposal.fundingScheme?.template_json?.mobilityRules;

    // Build context-aware system prompt
    const systemPrompt = `You are the "Proposal Copilot", an elite AI assistant specialized in European funding (Erasmus+, Horizon Europe, etc.).
    You have full access to the current project context below.
    
    LOGIC MODE: "${logicMode}" 
    ${logicMode === 'mobility' ? 'This is a MOBILITY project (like KA121/KA122). Focus on participant flows, individual support, and learning outcomes instead of complex work packages.' : 'This is a STANDARD project (like KA220/Horizon). Focus on structured Work Packages, tasks, and actual cost breakdowns.'}

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
    3. Perform direct actions: You MUST trigger actions when the user asks for changes.
    
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
          "type": "update_work_package", // Use for Standard mode
          "index": 0,
          "data": { "name": "...", "description": "...", "activities": [] }
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
    
    Available section keys: ${JSON.stringify(Object.keys(proposal.dynamic_sections || proposal.dynamicSections || {}))}
    
    Return ONLY valid JSON. Nothing else.`;

    const chatHistory = history.map((ms: any) => ({
        role: ms.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: ms.content }]
    }));

    const chat = model.startChat({
        history: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood. I am now acting as the Proposal Copilot. I will trigger actions via the 'actions' array and ensure metadata/section consistency." }] },
            ...chatHistory
        ]
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();
    const data = extractJSON(responseText);

    // If actions were requested, perform them in the DB
    const actions = data.actions || (data.action ? [data.action] : []);

    if (actions.length > 0) {
        console.log(`[Copilot Actions] Count: ${actions.length}`, actions);

        for (const action of actions) {
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
                    proposal.settings = {
                        ...(proposal.settings || {}),
                        ...updates.settings
                    };
                }
            } else if (action.type === 'update_work_package') {
                const { index, data: wpData } = action;
                const wps = proposal.workPackages || [];
                if (index === -1) {
                    wps.push(wpData);
                } else if (wps[index]) {
                    wps[index] = { ...wps[index], ...wpData };
                }
                proposal.workPackages = wps;
            } else if (action.type === 'update_mobility_activity') {
                const { index, data: mobData } = action;
                const wps = proposal.workPackages || [];

                // Mobility activities are stored in the same place as WPs for now
                // but with specific metadata
                const activityObj = {
                    name: mobData.name || mobData.title,
                    description: mobData.description,
                    duration: mobData.days || mobData.duration,
                    participants: mobData.participants,
                    activityType: mobData.type,
                    isMobility: true
                };

                if (index === -1) {
                    wps.push(activityObj);
                } else if (wps[index]) {
                    wps[index] = { ...wps[index], ...activityObj };
                }
                proposal.workPackages = wps;

                // AUTO-UPDATE BUDGET for Mobility (Basic implementation)
                if (logicMode === 'mobility' && mobilityRules) {
                    const totalParticipants = wps.reduce((sum, wp) => sum + (Number(wp.participants) || 0), 0);
                    const orgSupportTotal = totalParticipants * (mobilityRules.unitCosts?.organizational_support || 100);

                    // Update specific budget item
                    const budget = proposal.budget || [];
                    const osIdx = budget.findIndex((b: any) => b.category === 'Organizational Support' || b.item === 'Organizational Support');

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
            }
        }
        await saveToSupabase(proposal);
    }

    return {
        ...data,
        actions // Ensure we return normalized actions
    };
}
