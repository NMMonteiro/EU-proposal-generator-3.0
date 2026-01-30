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

  let budgetNum = extractNumericBudget(userPrompt || '');
  if (!budgetNum) {
    budgetNum = extractNumericBudget(constraints.budget || '') || extractNumericBudget(constraints.budgetLimit || '');
  }
  if (!budgetNum && fundingScheme?.template_json?.maxBudget) {
    budgetNum = parseInt(fundingScheme.template_json.maxBudget);
  }
  if (!budgetNum || budgetNum < 1000) {
    budgetNum = isMobility ? 60000 : 250000;
  }

  const finalBudgetStr = `€${budgetNum.toLocaleString()}`;

  const partnerDictionary = partners.map((p: any, i: number) => `[PARTNER ${i + 1}]: "${p.name}" (${p.country || 'N/A'})`).join('\n');

  const sectionInstructions = allSections.map((s) => {
    return `SECTION: ${s.label}\nKEY: "${s.key}"\nAI: ${s.aiPrompt || 'Write narrative.'}`;
  }).join('\n\n');

  const summarySection = allSections.find(s => s.key === 'project_summary' || s.label.toLowerCase().includes('project summary'));
  const rawInstruction = summarySection?.aiPrompt || summarySection?.description || '';
  const summaryInstruction = summarySection
    ? `CRITICAL: ${summarySection.label}. ${rawInstruction}. Use HTML <h3> for sub-headers.`
    : `Write detailed summary with <h3> headers.`;

  const mobilityRules = isMobility ? `
6. **MOBILITY METADATA (MANDATORY)**: Populate "mobilityMetadata" object at root.
7. **NO WORK PACKAGES**: NEVER use "Work Package" or "WP". Use "Activity 1", "Activity 2", etc.
  ` : '';

  return `You are an elite European Grant Writing Consultant.
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
3. **BUDGET**: ${isMobility ? 'Use categories: Organizational Support, Travel, Individual Support, Inclusion Support, Course Fees, Linguistic Support.' : 'Personnel, Equipment, Travel.'}
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
      ${isMobility ? '"participants": 15, "activityType": "job_shadowing", "destinationCountry": "Spain", "greenTravel": true, "fewerOpportunities": 2,' : ''}
      "activities": [
        { "name": "Task", "description": "Desc...", "leadPartner": "${partners[0]?.name}", "estimatedBudget": 5000 }
      ],
      "deliverables": ["Result 1"]
    }
  ],
  "budget": [
    { "item": "${isMobility ? 'Organizational Support' : 'Personnel'}", "cost": 5000, "description": "Desc...", "partnerAllocations": [] }
  ],
  "risks": [{ "risk": "Risk", "likelihood": "Low", "impact": "High", "mitigation": "Plan" }],
  ${isMobility ? `"mobilityMetadata": { "fieldOfApplication": "School Education", "totalGrantRequested": ${budgetNum} },` : ''}
  "dynamicSections": {
    "project_summary": "${summaryInstruction.replace(/"/g, '\\"')}",
    "${isMobility ? 'activity_1' : 'work_package_1'}": "Narrative text..."
  }
}

Return ONLY valid JSON.`;
}
