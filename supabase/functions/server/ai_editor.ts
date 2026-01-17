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

    // Build context-aware system prompt
    const systemPrompt = `You are the "Proposal Copilot", an elite AI assistant specialized in European funding (Erasmus+, Horizon Europe, etc.).
    You have full access to the current project context below.
    
    PROJECT CONTEXT:
    - Title: ${proposal.title}
    - Summary: ${proposal.summary}
    - Settings: ${JSON.stringify(proposal.settings || {})}
    - Partners: ${JSON.stringify(proposal.partners?.map((p: any) => p.name))}
    - Budget: ${JSON.stringify(proposal.budget)}
    
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
                "sourceUrl": "...",
                "duration": 24 
             }
          }
        }
      ]
    }
    
    CRITICAL INSTRUCTIONS: 
    1. For date changes (e.g. project start date), use "update_metadata" -> "settings" -> "startDate" in YYYY-MM-DD format.
    2. Always confirm the action in your "response".
    3. SYNC: If you change metadata (like project start date or title) that is also displayed in a text section (like "Context" or "Project Summary"), you MUST ALSO include an "update_section" action for that section to keep the text consistent with the metadata.
    
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
            }
        }
        await saveToSupabase(proposal);
    }

    return {
        ...data,
        actions // Ensure we return normalized actions
    };
}
