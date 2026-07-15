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
    charLimit?: number;
    wordLimit?: number;
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
        aiPrompt: s.aiPrompt,
        charLimit: s.charLimit || s.characterLimit,
        wordLimit: s.wordLimit
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
    const limitInfo = s.charLimit ? `MAX LIMIT: ${s.charLimit} characters.` : s.wordLimit ? `MAX LIMIT: ${s.wordLimit} words.` : 'REQUIRED DEPTH: Minimum 500 words.';
    let aiMsg = s.aiPrompt || `${limitInfo} Use a structured, professional narrative with clear headings (<h3>), bullet points, and high-impact terminology. Avoid passive voice.`;

    // Identify the "Logical Pillar" for this section (Relevance, Impact, Quality)
    let pillar = "";
    if (s.label.toLowerCase().includes('relevance') || s.label.toLowerCase().includes('context')) pillar = "RELEVANCE";
    else if (s.label.toLowerCase().includes('impact') || s.label.toLowerCase().includes('dissemination')) pillar = "IMPACT & SUSTAINABILITY";
    else if (s.label.toLowerCase().includes('design') || s.label.toLowerCase().includes('implementation') || s.label.toLowerCase().includes('work plan')) pillar = "QUALITY OF DESIGN";
    else if (s.label.toLowerCase().includes('partnership') || s.label.toLowerCase().includes('team') || s.label.toLowerCase().includes('cooperation')) pillar = "QUALITY OF PARTNERSHIP";

    if (pillar) {
      aiMsg += `\nFOCUS ON EVALUATION PILLAR: [${pillar}]. Mirror the technical precision of a winning H2020 or Erasmus+ proposal.`;
    }

    if (pillar === "QUALITY OF PARTNERSHIP") {
      aiMsg += `\nPARTNER MATRIX STRATEGY (MANDATORY):
      1. Classify partners into archetypes: "Lead Applicant" (Coordination, WP1), "Technical Expert" (Toolkit/Curriculum), "SME/Industry" (Validation), "Transnational VET" (Mobility).
      2. Assign task leadership based on this logic: Applicant leads Admin (WP1); Technical leads Intellectual Outputs (WP2/3); SMEs and Transnational partners lead Pilot/Mobility (WP4).
      3. Define Coordination Mechanisms: "Project Steering Committee (PSC)" for decision making; "Digital Workspaces" (Asana/Teams) for daily work.`;
    }

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
      1. Linguistic & Intercultural: Focus on staff/learner language proficiency and European awareness.
      2. Strategic Internationalization: Focus on institutional capacity and cross-border networking.
      3. Inclusion & Diversity: Detail specific measures for participants with fewer opportunities (economic, social, physical).
      4. Professional excellence: Innovation in pedagogy and staff professional development.` : '';

      aiMsg = `You MUST define exactly 4 project objectives. ${schGuidance}
      Use <h3>Objective X: Title</h3> format. For each:
      - Define the current GAP (Why).
      - Specify target outcomes (What).
      - List at least 3 SMART KPIs with baseline and target values.`;
    }

    if (isMobility && (s.key === 'activities_narrative' || s.label.toLowerCase().includes('activities strategy'))) {
      aiMsg = `Detail the Mobility Flow Strategy. Explain how participants are selected, how they are prepared (pedagogically, culturally, linguistically), and how their learning outcomes are recognized (e.g., Europass). Minimum 4 paragraphs.`;
    }

    return `SECTION: ${s.label}\nKEY: "${s.key}"\nINSTRUCTION: ${aiMsg}\nCONSTRAINT: usage of this specific KEY is MANDATORY.`;
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
   - WP1: Project Management & Coordination (Mandatory).
   - WP2 - WP4/5: Core Technical Work. MUST include tangible **DELIVERABLES** (e.g., "IO1: E-Learning Platform", "IO2: Best Practice Guide").
   - Last WP: Impact, Dissemination, and Sustainability.
   - **DESCRIPTION DEPTH**: For each WP, you MUST generate a structured narrative covering:
     1. **Specific Objectives**: (e.g., "O1.1: To identify gaps...")
     2. **Description of Activities**: Detailed tasks (T1.1, T1.2) with "Lead Partner" assigned.
     3. **Main Results**: Tangible outputs (R1.1, R1.2).
     4. **Mandatory Indicators**: List 3 Quantitative (e.g., "500 students") and 2 Qualitative indicators (e.g., "Satisfaction > 80%").
     5. **Budget Explanation**: Justify the WP cost (e.g., "€85,000") by breaking it down into "Staff Working Days" (e.g., "Total 150 WD: 50 Researcher days @ 240€/day, 30 Technician days..."). Explain WHY this is cost-effective.
7. **BUDGET STRATEGY (CRITICAL)**: 
   - **Total Grant**: Aim for one of the standard lump sums: €120,000, €250,000, or €400,000 (unless a specific constraint exists).
   - **WP1 (Management) CAP**: Absolutely MAX 20% of the total budget (e.g. max €50k for a €250k project).
   - **Allocation**: Distribute the rest across Technical WPs (WP2, WP3, etc.) based on workload clarity.
`;

  const dynamicKeysExample = allSections.map(s => `    "${s.key}": "Detailed content for ${s.label}..."`).join(',\n');

  return `You are a Lead Researcher and Expert Grant Writer for EU Horizon/Erasmus+ projects.
Your writing style must be **ACADEMIC, DENSE, and EVIDENCE-BASED** (similar to a scientific paper).
CRITICAL QUALITY RULES:
1. **NO BULLET POINTS IN NARRATIVES**: Write long, cohesive paragraphs (300+ words) for "Summary", "Context", and "Rationale". Use bullet points ONLY for lists of deliverables or tasks.
2. **USE CITATIONS**: Support claims with references to EU policies or academic studies (e.g., "(Smith et al., 2023)", "(EU Digital Agenda, 2030)").
3. **QUANTIFY IMPACT**: Do not say "many users". Say "engage 500 HE students and 50 teachers across 3 countries".
4. **STAFF DAYS**: You MUST estimate "Working Days" (WD) for budget justifications (e.g., "40 days for Researcher @ 240€/day").
5. **TECHNICAL TERMINOLOGY**: Use terms like "Transdisciplinary approach", "Pedagogical innovation", "Stakeholder synergy", "Micro-credentials".

    PROJECT: ${idea.title}
  DESCRIPTION: ${idea.description}
TARGET BUDGET: ${finalBudgetStr}
  PARTNERS: ${partners.length}
${partnerDictionary}

### EXPERT IQ PLAYBOOK(MANDATORY DIRECTIVES):
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
              "description": "<h3>Specific Objectives</h3>... <h3>Indicators</h3>... <h3>Budget Justification</h3>...",
              "duration": "...",
              "isMobility": ${isMobility},
            "activityType": ${isMobility ? '"e.g., job_shadowing, courses, etc."' : 'null'},
            "activities": [{ "name": "Task", "description": "..." }],
            "deliverables": ["..."]
    }
  ],
  "budget": [
    { "item": "...", "cost": 0, "description": "...", "breakdown": [{ "item": "...", "total": 0 }] }
  ],
    "risks": [...],
    "dynamicSections": {
${dynamicKeysExample}
    },
  "mobilityMetadata": ${isMobility ? '{ "fieldOfApplication": "...", "nationalAgency": "...", "language": "..." }' : 'null'}
  }
  
  **IMPORTANT FORMATTING:**
  - USE HTML TAGS inside the JSON strings for structure: <h3>Headings</h3>, <ul><li>Lists</li></ul>, <p>Paragraphs</p>.
  - DO NOT use markdown ('**bold**'). Use <strong>bold</strong>.
  `;
}
