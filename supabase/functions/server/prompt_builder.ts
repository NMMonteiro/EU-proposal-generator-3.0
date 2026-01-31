// Prompt Builder module for AI integration
// Constructs prompts for Google Gemini API

export const extractNumericBudget = (text: string): number | null => {
  if (!text) return null;

  // Look for budget-specific patterns first
  const highIntentMatch = text.match(/(?:max|budget|grant|limit|total|amount|sum|allocation|funding)(?:\s+is)?(?:\s+of)?(?:\s+up\s+to)?[:\s]+(?:€|EUR)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i);
  if (highIntentMatch) {
    let val = highIntentMatch[1].replace(/[.,]/g, (m, offset, str) => {
      // If it's a thousand separator (e.g. 150.000)
      if (str.length - offset <= 3) return '';
      return m;
    });
    const rawVal = highIntentMatch[1];
    return parseRobustNumber(rawVal);
  }

  // Fallback to simple pattern
  let clean = text.replace(/&nbsp;/g, ' ').replace(/\s/g, '');

  const matchWithKeyword = clean.match(/(?:budget|grant|limit|total|amount|sum|allocation|funding|of|requested)[:\s€EUR]*(\d{1,3}(?:[.,]\d{3})+|\d{4,9})/i);
  if (matchWithKeyword) {
    const val = parseRobustNumber(matchWithKeyword[1]);
    if (val && !(val >= 2020 && val <= 2030)) return val;
  }

  const allNumbers = clean.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,9})/g);
  if (allNumbers) {
    for (const n of allNumbers) {
      const val = parseRobustNumber(n);
      if (val && val >= 1000 && !(val >= 2020 && val <= 2030)) {
        return val;
      }
    }
  }
  return null;
};

function parseRobustNumber(val: string): number | null {
  if (val.includes('.') && val.includes(',')) {
    val = val.indexOf('.') < val.indexOf(',') ? val.split(',')[0].replace(/\./g, '') : val.split('.')[0].replace(/,/g, '');
  } else if (val.includes('.') || val.includes(',')) {
    const sep = val.includes('.') ? '.' : ',';
    const parts = val.split(sep);
    if (parts[parts.length - 1].length === 3) val = val.replace(/[.,]/g, '');
    else val = parts[0].replace(/[.,]/g, '');
  } else {
    val = val.replace(/\D/g, '');
  }
  return parseInt(val) || null;
}

export function buildPhase2Prompt(summary: string, constraints: any, userPrompt?: string): string {
  const basePrompt = userPrompt
    ? `You are a creative brainstorming assistant.

🎯 MANDATORY USER REQUIREMENTS - HIGHEST PRIORITY:
${userPrompt}

CRITICAL: ALL project ideas MUST directly address these user requirements.
============================================================

CONTEXT SUMMARY: ${summary}

TASK: Generate 10-12 high-quality project ideas that DIRECTLY address the user requirements above.

OUTPUT FORMAT:
Return ONLY valid JSON structure:
{
  "ideas": [
    {
      "title": "Project idea title",
      "description": "Detailed description"
    }
  ]
}`
    : `You are a creative brainstorming assistant.

CONTEXT SUMMARY: ${summary}

CONSTRAINTS:
- Partners: ${constraints.partners || 'Not specified'}
- Budget: ${constraints.budget || 'Not specified'}
- Duration: ${constraints.duration || 'Not specified'}

TASK: Generate 10-12 innovative project ideas based on the context summary.

OUTPUT FORMAT:
Return ONLY valid JSON structure:
{
  "ideas": [
    {
      "title": "Project idea title",
      "description": "Detailed description"
    }
  ]
}`;

  return basePrompt;
}

export function buildRelevancePrompt(
  url: string,
  urlContent: string,
  constraints: any,
  ideas: any[],
  userPrompt?: string
): string {
  return `Evaluate relevance of ideas against: ${urlContent.substring(0, 2000)}. Return JSON {score, justification}`;
}

export function buildProposalPrompt(
  idea: any,
  summary: string,
  constraints: any,
  partners: any = [],
  userPrompt?: string,
  fundingScheme?: any,
  logicModeOverride?: string
): string {
  const logicMode = logicModeOverride || fundingScheme?.logic_mode || 'standard';
  const isMobility = logicMode === 'mobility';

  interface FlatSection {
    key: string;
    label: string;
    description: string;
    aiPrompt?: string;
  }

  const flattenSections = (sections: any[]): FlatSection[] => {
    let result: FlatSection[] = [];
    sections.forEach(s => {
      const fallbackKey = (s.label || 'section').toLowerCase().replace(/\s+/g, '_').replace(/\W/g, '');
      const validKey = s.key || fallbackKey;
      result.push({
        key: validKey,
        label: s.label || 'Untitled Section',
        description: s.description || '',
        aiPrompt: s.aiPrompt
      });
      if (s.subsections && s.subsections.length > 0) {
        result = [...result, ...flattenSections(s.subsections)];
      }
    });
    return result;
  };

  let allSections = fundingScheme?.template_json?.sections
    ? flattenSections(fundingScheme.template_json.sections)
    : [
      { key: 'project_summary', label: 'Project Summary', description: 'Overview.' },
      { key: 'relevance', label: 'Relevance', description: 'Why.' },
      { key: 'impact', label: 'Impact', description: 'Change.' }
    ];

  const prioritySections = [
    { key: 'project_description', label: 'Project description', description: 'Overview.' },
    { key: 'needs_analysis', label: 'Needs analysis', description: 'Analysis.' }
  ];

  prioritySections.forEach(ps => {
    if (!allSections.some(s => s.key === ps.key || s.label.toLowerCase().includes(ps.label.toLowerCase()))) {
      allSections.splice(1, 0, ps);
    }
  });

  // Ensure budget detection is robust
  let budgetNum = extractNumericBudget(userPrompt || '');
  if (!budgetNum) {
    budgetNum = extractNumericBudget(constraints.budget || '') || extractNumericBudget(constraints.budgetLimit || '');
  }
  if (!budgetNum && fundingScheme?.template_json?.maxBudget) {
    budgetNum = parseInt(fundingScheme.template_json.maxBudget);
  }

  // Determine if this is specifically KA122-SCH
  const isSCH = (fundingScheme?.name || '').toLowerCase().includes('sch') || (idea.title + idea.description).toLowerCase().includes('school');

  // If still no budget, we don't assume a default. We use 0 if necessary but prefer leaving it to the AI to suggest if not told, 
  // though the prompt requires a number. So we'll use a very low minimum or just allow the AI to decide if not constrained.
  // Actually, to avoid breaking the math, we use a placeholder if absolute nothing found.
  if (!budgetNum) {
    console.log("[PROMPT_BUILDER] No budget found in prompt or template.");
    budgetNum = 0;
  }

  const finalBudgetStr = budgetNum > 0 ? `€${budgetNum.toLocaleString()}` : "To be determined based on activity scale";

  const partnerDictionary = partners.map((p: any, i: number) => `[PARTNER ${i + 1}]: "${p.name}" (${p.country || 'N/A'})`).join('\n');

  const sectionInstructions = allSections.map((s) => {
    let aiMsg = s.aiPrompt || 'Write narrative.';

    // Inject mobility-specific logic for Objectives
    if (isMobility && (s.key === 'objectives' || s.label.toLowerCase().includes('objective'))) {
      const schGuidance = isSCH ? `
      SPECIFIC SCH GUIDANCE:
      1. Institutional internationalization: How the school builds capacity for international projects.
      2. Student Competences: Focus on key competences, language skills, and European citizenship.
      3. Inclusive Mobility: Transparent selection and support for students with fewer opportunities.
      4. Professional Excellence: Staff learning innovative pedagogies (e.g., STEAM, Finnish model).` : '';

      aiMsg = `Define the project's objectives based on its specific context and needs. ${schGuidance}
      Objectives should be distinct, concrete, and measurable. Create a separate section for each objective starting with an <h3> tag.
      Format each objective as: <h3>Objective X: Title</h3> followed by:
      - **Context & Relevance**: Why is this objective important for this specific project?
      - **Planned Outcome**: What specific change or improvement is expected?
      - **Measurement (KPIs)**: How will success be measured?
      - **Topic Linking**: How does this align with broader project priorities?`;
    }

    // Inject mobility-specific logic for Activities Narrative
    if (isMobility && (s.key === 'activities_narrative' || s.label.toLowerCase().includes('activities strategy'))) {
      aiMsg = `Describe the planned mobilities in detail. For each flow (e.g. Spain, Finland), explain: 
      - The profile of participants. 
      - The learning outcomes. 
      - MAPPING: Explicitly state WHICH of the 4 project objectives this specific activity contributes to.
      Ensure the narrative matches the numbers in the "workPackages" array below.`;
    }

    return `SECTION: ${s.label}\nKEY: "${s.key}"\nAI: ${aiMsg}`;
  }).join('\n\n');

  const summarySection = allSections.find(s => s.key === 'project_summary' || s.label.toLowerCase().includes('project summary'));
  const rawInstruction = summarySection?.aiPrompt || summarySection?.description || '';
  const summaryInstruction = summarySection
    ? `CRITICAL: ${summarySection.label}. ${rawInstruction}. Use HTML <h3> for sub-headers.`
    : `Write detailed summary with <h3> headers.`;

  const mobilityRules = isMobility ? `
6. **MOBILITY METADATA (MANDATORY)**: Populate "mobilityMetadata" object at root.
7. **NO WORK PACKAGES**: NEVER use "Work Package" or "WP". Use "Activity 1", "Activity 2", etc.
8. **OBJECTIVES**: The "objectives" section in "dynamicSections" MUST contain EXACTLY 4 distinct objectives, each with an <h3> header containing its name.
9. **ACTIVITY LINKING**: In the activities narrative, you MUST explicitly link each mobility flow to the 4 objectives defined earlier.
  ` : '';

  return `You are an elite European Grant Writing Consultant specialized in Erasmus+ and Horizon Europe.
Writing Style: Technical, persuasive, data-driven.

MANDATORY SECTIONS SEQUENCE:
1. Relevance
2. Project description
3. Needs analysis
4. Impact
5. Implementation
6. ${isMobility ? 'Erasmus Mobility Activities (Activity 1, 2...). NO "Work Packages".' : 'Work Packages and Tasks.'}

PROJECT: ${idea.title} - ${idea.description}

PARTNERS: ${partners.length} organizations.
${partnerDictionary}

BUDGET: ${finalBudgetStr} (${budgetNum} EUR).
The sum of all "budget" items MUST equal EXACTLY ${budgetNum} EUR.

STRICT CONTRACT:
1. **PARTNERS**: Include all ${partners.length} in "partners" array. First one is Lead Coordinator.
2. **STRUCTURE**: ${isMobility ? 'Use "Activity" terminology, NEVER "Work Package".' : 'Use Work Packages.'}
3. **BUDGET**: ${isMobility ? 'Use categories: Organizational Support, Travel, Individual Support, Inclusion Support, Course Fees, Linguistic Support. Use the "breakdown" field to assign costs to Activity 1, Activity 2, etc.' : 'Personnel, Equipment, Travel.'}
${mobilityRules}

STRUCTURE TO FOLLOW:
${sectionInstructions}
KEY: "${isMobility ? 'activities_overview' : 'work_packages_overview'}" (Terminology: ${isMobility ? 'Activities' : 'Work Packages'})

STRICT JSON FORMAT:
{
  "title": "${idea.title}",
  "summary": "Metadata summary...",
  "partners": [
    ${partners.map((p: any) => `{ "name": "${p.name}", "role": "${p.isCoordinator ? 'Lead Coordinator' : 'Partner'}", "country": "${p.country || ''}", "isCoordinator": ${p.isCoordinator || false} }`).join(',')}
  ],
  "workPackages": [
    {
      "name": "${isMobility ? 'Activity 1: Title' : 'WP1: Title'}",
      "description": "Narrative...",
      "duration": "Duration...",
      "isMobility": true,
      ${isMobility ? '"participants": 15, "activityType": "job_shadowing", "destinationCountry": "Spain", "greenTravel": true, "fewerOpportunities": 2,' : ''}
      "activities": [
        { "name": "Task", "description": "Desc...", "leadPartner": "${partners[0]?.name}", "estimatedBudget": 5000 }
      ],
      "deliverables": ["Result 1"]
    }
  ],
  "budget": [
    { 
      "item": "${isMobility ? 'Organizational Support' : 'Personnel'}", 
      "cost": 5000, 
      "description": "Desc...", 
      "breakdown": [
        { "item": "${isMobility ? 'Activity 1' : 'Task 1'}", "total": 5000 }
      ] 
    }
  ],
  "risks": [{ "risk": "Risk", "likelihood": "Low", "impact": "High", "mitigation": "Plan" }],
  ${isMobility ? `"mobilityMetadata": { "fieldOfApplication": "School Education", "totalGrantRequested": ${budgetNum} },` : ''}
  "dynamicSections": {
    "project_summary": "${summaryInstruction.replace(/"/g, '\\"')}",
    "objectives": "<h3>Objective 1: Title</h3><p>...</p><h3>Objective 2: Title</h3><p>...</p><h3>Objective 3: Title</h3><p>...</p><h3>Objective 4: Title</h3><p>...</p>",
    "${isMobility ? 'activity_1' : 'work_package_1'}": "Narrative text..."
  }
}

Return ONLY valid JSON.`;
}
