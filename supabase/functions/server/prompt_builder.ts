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

export function buildPhase2Prompt(
  summary: string,
  constraints: any,
  userPrompt?: string,
  fundingScheme?: any,
  examples: any[] = []
): string {
  const expertRules = fundingScheme?.expert_rules ? `### EXPERT DESIGN RULES (FOLLOW STRICTLY):
${JSON.stringify(fundingScheme.expert_rules, null, 2)}` : '';

  const examplesContext = examples.length > 0 ? `### SUCCESSFUL PROJECT EXAMPLES (FOR INSPIRATION):
${examples.map((ex: any) => `Example: ${ex.title}\nSummary: ${ex.summary}`).join('\n\n')}` : '';

  return `You are an elite European Grant Brainstorming Consultant.
Your task is to generate 10-12 highly innovative project ideas for the following opportunity.

### CONTEXT SUMMARY:
${summary}

### CONSTRAINTS (MANDATORY):
- Partners: ${constraints.partners || 'Not specified'}
- Budget: ${constraints.budget || 'Not specified'}
- Duration: ${constraints.duration || 'Not specified'}

${userPrompt ? `### USER SPECIFIC REQUIREMENTS (HIGHEST PRIORITY):
${userPrompt}` : ''}

${expertRules}

${examplesContext}

### TASK:
Generate 10-12 unique, high-quality project ideas.
For each idea, provide:
1. **Title**: Catchy and technical (e.g., "AI-GRID: Resilient Energy Distribution").
2. **Description**: 3-4 sentences explaining the core innovation, the target group, and the main activity.
3. **Alignment**: Mention which specific objective of the funding scheme it addresses.

OUTPUT FORMAT: Return ONLY a valid JSON object.
{
  "ideas": [
    {
      "title": "Project Title",
      "description": "Short description...",
      "alignment": "Objective X: ..."
    }
  ]
}`;
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
  logicModeOverride?: string,
  examples: any[] = []
): string {
  const logicMode = logicModeOverride || fundingScheme?.logic_mode || 'standard';
  const isMobility = logicMode === 'mobility';
  const expertRules = fundingScheme?.expert_rules || [];

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

  // Budget detection
  let budgetNum = extractNumericBudget(userPrompt || '');
  if (!budgetNum) {
    budgetNum = extractNumericBudget(constraints.budget || '') || extractNumericBudget(constraints.budgetLimit || '');
  }
  if (!budgetNum && fundingScheme?.template_json?.maxBudget) {
    budgetNum = parseInt(fundingScheme.template_json.maxBudget);
  }
  if (!budgetNum) budgetNum = 0;

  const finalBudgetStr = budgetNum > 0 ? `€${budgetNum.toLocaleString()}` : "Defined per activity";

  const partnerDictionary = partners.map((p: any, i: number) => `[PARTNER ${i + 1}]: "${p.name}" (${p.country || 'N/A'})`).join('\n');

  // Categorize expert rules for better prompt injection
  const directivePlaybook = Array.isArray(expertRules)
    ? expertRules.map((r: any) => `- [${r.rule || r.topic || 'Directive'}]: ${r.guidance || r.description}`).join('\n')
    : JSON.stringify(expertRules, null, 2);

  const sectionInstructions = allSections.map((s) => {
    let aiMsg = s.aiPrompt || 'REQUIRED DEPTH: Minimum 350 words. Use a structured, professional narrative with clear headings and bullet points where appropriate.';

    // Check if there's an expert rule for this section or generic rules
    const relevantRule = Array.isArray(expertRules) && expertRules.find((r: any) =>
      s.label.toLowerCase().includes(r.topic?.toLowerCase()) ||
      (s.key || '').toLowerCase().includes(r.topic?.toLowerCase())
    );

    if (relevantRule) {
      aiMsg += `\nCRITICAL DIRECTIVE: ${relevantRule.guidance || relevantRule.description}`;
    }

    // Inject mobility-specific logic for Objectives
    if (isMobility && (s.key === 'objectives' || s.label.toLowerCase().includes('objective'))) {
      const schGuidance = (fundingScheme?.name || '').toLowerCase().includes('sch') ? `
      SPECIFIC SCH GUIDANCE (KA122 - 4 MANDATORY OBJECTIVES):
      1. Linguistic & Intercultural: Communication, European dimension.
      2. Strategic Internationalization: Institutional growth, partnerships.
      3. Inclusion & Diversity: Equal access, support for fewer opportunities.
      4. Professional excellence: Innovation, new methodologies for staff.` : '';

      aiMsg = `Define exactly 4 project objectives. ${schGuidance}
      Use <h3>Objective X: Title</h3> format. For each, provide a deep analysis of current gaps, planned outcomes, and 3-5 concrete KPIs.`;
    }

    if (isMobility && (s.key === 'activities_narrative' || s.label.toLowerCase().includes('activities strategy'))) {
      aiMsg = `Explain the logic of mobility flows. Link each flow to one of the 4 Objectives defined. Address logistics, preparation, and follow-up in high detail. Minimum 3 paragraphs.`;
    }

    return `SECTION: ${s.label}\nKEY: "${s.key}"\nINSTRUCTION: ${aiMsg}`;
  }).join('\n\n');

  const examplesContext = examples.length > 0 ? `### GOLD-STANDARD EXAMPLES (MIRROR QUALITY, DO NOT COPY CONTENT):
${examples.map((ex: any) => `Title: ${ex.title}\nObjectives/Summary: ${JSON.stringify(ex.full_content?.objectives || ex.summary)}`).join('\n\n')}` : '';

  const mobilityRules = isMobility ? `
6. **MOBILITY METADATA**: Fill "mobilityMetadata" object. Use "Activity 1", "Activity 2" terminologies.
7. **NO WORK PACKAGES**: Use "Activity Flow" terminology throughout the text.
8. **OBJECTIVES**: You MUST define EXACTLY 4 distinct project objectives in the "objectives" section. If you provide more or fewer, the application will be rejected.
9. **BUDGET**: Calculate unit costs based on participants. Use €100-€500 per participant for travel and €50-€150/day for individual support. Total must aim at the target budget of ${finalBudgetStr}.
` : `
6. **WORK PACKAGES (WP)**: For Cooperation Partnerships (large projects), you MUST generate between 4 and 6 Work Packages.
   - WP1: Project Management & Coordination (Mandatory)
   - WP2 - WP4/5: Implementation, development, and results.
   - Last WP: Impact, Dissemination, and Sustainability.
7. **BUDGET**: Allocate the target budget of ${finalBudgetStr} across these Work Packages logically.
`;

  return `You are a Senior European Grant Writer specialized in ${isMobility ? 'Education Mobility (Erasmus+)' : 'Cross-border Cooperation'}.
Your task is to generate a HIGH-DEPTH, AUDIT-READY project proposal. Avoid generic fluff; use precise EU terminology.

PROJECT: ${idea.title}
DESCRIPTION: ${idea.description}
TARGET BUDGET: ${finalBudgetStr}
PARTNERS: ${partners.length}
${partnerDictionary}

### EXPERT IQ PLAYBOOK (MANDATORY DIRECTIVES):
${directivePlaybook}

${examplesContext}

### SECTIONS TO GENERATE:
${sectionInstructions}

${mobilityRules}

STRICT JSON OUTPUT:
{
  "title": "${idea.title}",
  "summary": "Full overview (300+ words)",
  "partners": [...],
  "workPackages": [
    {
      "name": "${isMobility ? 'Activity 1: [Flow Type]' : 'WP1: [Title]'}",
      "description": "...",
      "duration": "...",
      "isMobility": ${isMobility},
      "activityType": ${isMobility ? '"e.g., job_shadowing, courses, etc."' : 'null'},
      "activities": [{"name": "Task", "description": "..."}],
      "deliverables": ["..."]
    }
  ],
  "budget": [
    { "item": "...", "cost": 0, "description": "...", "breakdown": [{"item": "...", "total": 0}] }
  ],
  "risks": [...],
  "dynamicSections": {
    "project_summary": "...",
    "objectives": "Generate EXACTLY 4 detailed objectives numbered 1-4.",
    "relevance": "..."
  },
  "mobilityMetadata": ${isMobility ? '{ "fieldOfApplication": "...", "nationalAgency": "...", "language": "..." }' : 'null'}
}

Return ONLY valid JSON.`;
}
