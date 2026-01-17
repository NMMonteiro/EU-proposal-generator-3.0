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
    1. Answer questions about the proposal.
    2. Analyze sections and suggest improvements.
    3. Perform direct actions: You can choose to update a section if the user asks for it.
    
    OUTPUT FORMAT:
    You must return a JSON response with:
    {
      "response": "Your message to the user",
      "action": { // Optional
        "type": "update_section",
        "section": "section_key_to_update",
        "content": "New HTML content for the section"
      } | {
        "type": "update_metadata",
        "updates": {
           "title": "New title",
           "summary": "New summary",
           "settings": { "key": "value" }
        }
      }
    }
    
    IMPORTANT: 
    1. DO NOT ask for more information if the request is clear (e.g. "change title to X" or "set start date to Y").
    2. For any substantial change to a section, use the "update_section" action.
    3. For metadata changes, use "update_metadata". You can create NEW keys in the "settings" object (e.g., "startDate", "duration", "totalBudget") if they don't exist.
    Available section keys: ${JSON.stringify(Object.keys(proposal.dynamic_sections || proposal.dynamicSections || {}))}
    
    Return ONLY valid JSON.`;

    const chatHistory = history.map((ms: any) => ({
        role: ms.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: ms.content }]
    }));

    const chat = model.startChat({
        history: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood. I am ready to assist as your Proposal Copilot." }] },
            ...chatHistory
        ]
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();
    const data = extractJSON(responseText);

    // If an action was requested, perform it in the DB
    if (data.action) {
        if (data.action.type === 'update_section') {
            const { section, content } = data.action;
            const dynSections = proposal.dynamic_sections || proposal.dynamicSections || {};
            dynSections[section] = content;
            proposal.dynamicSections = dynSections;
            await saveToSupabase(proposal);
        } else if (data.action.type === 'update_metadata') {
            const { updates } = data.action;
            if (updates.title) proposal.title = updates.title;
            if (updates.summary) proposal.summary = updates.summary;
            if (updates.settings) {
                proposal.settings = { ...(proposal.settings || {}), ...updates.settings };
            }
            await saveToSupabase(proposal);
        }
    }

    return data;
}