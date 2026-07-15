import { getGeminiModel } from './ai_service';
import { extractJSON, withRetry } from './utils';

export const importPartnerPdf = async (fileBuffer: Buffer, fileName: string, fileSize: number) => {
    console.log(`[DEBUG] importPartnerPdf started for file: ${fileName}, size: ${fileSize}`);
    const base64Data = fileBuffer.toString('base64');
    console.log(`[DEBUG] Base64 conversion complete. Length: ${base64Data.length}`);

    const model = getGeminiModel({ temperature: 0.1, maxOutputTokens: 4096 });
    console.log(`[DEBUG] Model initialized. calling generateContent...`);

    const prompt = `You are an expert at extracting structured data from EU Partner Information Forms (PIFs).

Extract ALL available information from this PIF document and return it as a JSON object with the following structure.
Use camelCase for all field names. If a field is not present in the document, omit it or set it to null.

REQUIRED FIELDS:
- name: Full official organization name (REQUIRED)
- legalNameNational: Legal name in national language
- acronym: Organization acronym/short name
- organisationId: Organization ID (OID) or PIC number
- pic: Participant Identification Code (9-digit number)
- vatNumber: VAT registration number
- businessId: National business/company registration number
- organizationType: Type (e.g., "SME", "University", "Research Organization", "NGO", "Public Body", "Large Enterprise")
- isPublicBody: Boolean - is this a public sector organization?
- isNonProfit: Boolean - is this a non-profit organization?

ADDRESS & CONTACT:
- country: Country name (ISO format preferred, e.g., "Portugal", "Germany")
- legalAddress: Full legal/registered address
- city: City name
- postcode: Postal/ZIP code
- region: Region/State/Province
- contactEmail: General organization email
- website: Organization website URL

LEGAL REPRESENTATIVE (Person authorized to sign):
- legalRepName: Full name of legal representative
- legalRepPosition: Position/title of legal representative
- legalRepEmail: Email of legal representative
- legalRepPhone: Phone number of legal representative

CONTACT PERSON (Project contact):
- contactPersonName: Full name of main contact person
- contactPersonPosition: Position/title of contact person
- contactPersonEmail: Email of contact person
- contactPersonPhone: Phone number of contact person
- contactPersonRole: Role in the project (e.g., "Project Manager", "Technical Lead")

ORGANIZATIONAL DETAILS:
- description: Brief description of the organization (2-3 sentences)
- department: Specific department or unit involved (if applicable)
- experience: Relevant experience and track record (extract key achievements, years of operation, areas of expertise)
- staffSkills: Key staff competencies and skills (extract technical skills, certifications, expertise areas)
- relevantProjects: Previous relevant projects (extract project names, funding programs, outcomes)
- keywords: Array of strings - 5-8 descriptive keyword tags representing their areas of expertise (e.g. ["education", "youth", "digital-skills", "sustainability", "entrepreneurship"])

IMPORTANT EXTRACTION RULES:
1. Extract phone numbers in international format when possible (e.g., +351 123 456 789)
2. For boolean fields (isPublicBody, isNonProfit), infer from organization type if not explicitly stated
3. For experience/skills/projects: Extract as detailed text, preserving bullet points and structure. If there are tables of projects, list each project and its key details.
4. If multiple PICs or IDs are present, use the primary/first one
5. Ensure email addresses are valid format
6. Extract ALL text from experience, skills, and projects sections - don't summarize

Return ONLY the JSON object, no additional text or markdown formatting.`;

    const result = await withRetry(() => model.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: base64Data } },
        { text: prompt }
    ]));

    const extractedData = extractJSON(result.response.text());

    if (!extractedData.name || extractedData.name.trim() === '') {
        throw new Error('Partner name is required but was not found in the PDF');
    }

    if (typeof extractedData.isPublicBody === 'string') {
        extractedData.isPublicBody = extractedData.isPublicBody.toLowerCase() === 'true' || extractedData.isPublicBody.toLowerCase() === 'yes';
    }
    if (typeof extractedData.isNonProfit === 'string') {
        extractedData.isNonProfit = extractedData.isNonProfit.toLowerCase() === 'true' || extractedData.isNonProfit.toLowerCase() === 'yes';
    }

    // Format relevantProjects if it is returned as an array/object to avoid "[object Object]" in textareas
    if (extractedData.relevantProjects && typeof extractedData.relevantProjects === 'object') {
        if (Array.isArray(extractedData.relevantProjects)) {
            extractedData.relevantProjects = extractedData.relevantProjects.map((p: any) => {
                if (typeof p === 'object' && p !== null) {
                    const name = p.projectName || p.name || p.title || p.project || '';
                    const prog = p.euProgram || p.program || p.funding || '';
                    const yr = p.year || '';
                    const idNum = p.projectId || p.identification || p.number || p.id || '';
                    const role = p.applicant || p.beneficiary || p.role || '';
                    
                    let line = `- **${name}**`;
                    const details = [];
                    if (prog) details.push(prog);
                    if (yr) details.push(yr);
                    if (idNum) details.push(`ID: ${idNum}`);
                    if (role) details.push(`Role: ${role}`);
                    
                    if (details.length > 0) {
                        line += ` (${details.join(', ')})`;
                    }
                    return line;
                }
                return String(p);
            }).join('\n');
        } else {
            extractedData.relevantProjects = Object.entries(extractedData.relevantProjects)
                .map(([k, v]) => `- **${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join('\n');
        }
    }

    // Format experience if it is returned as an array/object
    if (extractedData.experience && typeof extractedData.experience === 'object') {
        if (Array.isArray(extractedData.experience)) {
            extractedData.experience = extractedData.experience.map((item: any) => {
                if (typeof item === 'object' && item !== null) {
                    return Object.entries(item).map(([k, v]) => `**${k}**: ${v}`).join(', ');
                }
                return String(item);
            }).join('\n');
        } else {
            extractedData.experience = Object.entries(extractedData.experience)
                .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join('\n');
        }
    }

    // Format staffSkills if it is returned as an array/object
    if (extractedData.staffSkills && typeof extractedData.staffSkills === 'object') {
        if (Array.isArray(extractedData.staffSkills)) {
            extractedData.staffSkills = extractedData.staffSkills.map((item: any) => {
                if (typeof item === 'object' && item !== null) {
                    return Object.entries(item).map(([k, v]) => `**${k}**: ${v}`).join(', ');
                }
                return String(item);
            }).join('\n');
        } else {
            extractedData.staffSkills = Object.entries(extractedData.staffSkills)
                .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join('\n');
        }
    }

    // Ensure keywords is a list of strings
    if (extractedData.keywords && typeof extractedData.keywords === 'string') {
        extractedData.keywords = (extractedData.keywords as string).split(',').map((k: string) => k.trim()).filter(Boolean);
    } else if (!Array.isArray(extractedData.keywords)) {
        extractedData.keywords = [];
    }

    const { upsertPartner } = await import('./partner_service');
    const savedPartner = await upsertPartner(extractedData);
    if (!savedPartner) {
        throw new Error('Failed to save extracted partner profile to database');
    }

    console.log(`✅ Partner imported from PDF: ${savedPartner.name} (ID: ${savedPartner.id})`);

    return {
        ...savedPartner,
        partnerId: savedPartner.id
    };
};

export const importLibraryPdf = async (fileBuffer: Buffer, fileName: string) => {
    console.log(`[API] Processing and chunking library PDF: ${fileName}`);
    const base64Data = fileBuffer.toString('base64');

    const model = getGeminiModel({ temperature: 0.1 });
    
    const prompt = `You are a Senior European Grant Expert. Deeply analyze the guidelines for "${fileName}".
        EXTRACT 15-20 TECHNICAL KNOWLEDGE CHUNKS (e.g. eligibility criteria, budget rules, lump-sum constraints, scoring weights, alignment best practices).
        Return ONLY valid JSON with this exact structure:
        {
          "chunks": [
            {
              "content": "Professional technical description of criteria, rule or best practice...",
              "type": "criteria" | "best_practice" | "output",
              "keywords": ["specific_key1", "specific_key2"]
            }
          ]
        }`;

    const result = await withRetry(() => model.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: base64Data } },
        { text: prompt }
    ]));

    const responseText = result.response.text();
    const extracted = extractJSON(responseText);
    const chunks = extracted.chunks || [];
    console.log(`[API] Gemini extracted ${chunks.length} chunks from ${fileName}`);

    if (chunks.length === 0) {
        return { success: false, error: 'No chunks extracted from document' };
    }

    const sourceName = fileName.replace('.pdf', '');
    const { db } = await import('./firebase_db');
    const { embedText } = await import('./ai_service');
    const batch = db.batch();

    for (const chunk of chunks) {
        let embedding: number[] = [];
        try {
            embedding = await embedText(chunk.content);
        } catch (embErr) {
            console.warn(`[API] Embedding failed for chunk:`, embErr);
        }

        const docRef = db.collection('global_knowledge').doc();
        batch.set(docRef, {
            source_name: sourceName,
            sourceName: sourceName,
            content: chunk.content,
            embedding: embedding,
            metadata: {
                type: chunk.type,
                keywords: chunk.keywords || [],
                source_id: fileName
            },
            created_at: new Date().toISOString()
        });
    }

    await batch.commit();
    console.log(`[API] Indexed ${chunks.length} chunks into Firestore global_knowledge collection.`);

    return {
        success: true,
        count: chunks.length,
        message: `Successfully indexed ${chunks.length} intelligence chunks from "${fileName}".`
    };
};

export const importExamplePdf = async (fileBuffer: Buffer, fileName: string) => {
    const base64Data = fileBuffer.toString('base64');

    const model = getGeminiModel({ temperature: 0.2 });
    const prompt = `You are a Grant Evaluator. Extract the full technical content of this successful proposal.
    Return a JSON object with:
    - title: Project Title
    - summary: 2-3 paragraph summary
    - full_content: { "objectives": "...", "sections": { "relevance": "...", "impact": "..." } }
    - metadata: { "year": "...", "funding_program": "..." }
    `;

    const result = await withRetry(() => model.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: base64Data } },
        { text: prompt }
    ]));

    const exampleData = extractJSON(result.response.text());
    const { syncSchemeFromContent } = await import('./funding_scheme_service');

    const syncResult = await syncSchemeFromContent(JSON.stringify(exampleData), 'example');

    if (syncResult.success && syncResult.schemeId) {
        const { db } = await import('./firebase_db');
        await db.collection('proposal_examples').add({
            funding_scheme_id: syncResult.schemeId,
            fundingSchemeId: syncResult.schemeId,
            title: exampleData.title || '',
            summary: exampleData.summary || '',
            full_content: exampleData.full_content || {},
            metadata: exampleData.metadata || {},
            createdAt: new Date().toISOString()
        });
    }

    return syncResult;
};

export const importSchemePdf = async (fileBuffer: Buffer, fileName: string) => {
    console.log(`[API] Processing scheme template PDF: ${fileName}`);
    const base64Data = fileBuffer.toString('base64');

    const model = getGeminiModel({ temperature: 0.0 }); // Zero temperature for deterministic extraction

    const prompt = `You are a precision-oriented Document Analysis AI. Your mission is to extract the EXACT structure of an EU funding application form from the provided PDF/document.

### THE GOLD STANDARD FOR EXTRACTION:
1. **LITERAL LABELS:** Extract section names exactly as they are written (e.g., "Work package n°2 -"). Do not correct grammar or capitalize differently.
2. **VERBATIM QUESTIONS:** Within each section, find every question or instruction and copy it LITERALLY. 
   - Look for text in boxes, bulleted prompts, or italicized instructions.
   - Example: If the form says "What are the concrete objectives you would like to achieve?", do not summarize it as "Define objectives." Copy the whole question.
   - Place all these verbatim questions in the "description" field.
3. **ZERO NOISE:**
   - DO NOT extract page numbers ("1 / 20", "Page 5").
   - DO NOT extract form metadata ("Form ID KA220-YOU...", "Deadline (Brussels Time)...").
   - DO NOT extract footer/header repetitions.
4. **HIERARCHY IS KEY:** 
   - Maintain the logical order of sections.
   - Return them as a flat array of sections ordered by "order" (1, 2, 3...).
5. **AI PROMPT GENERATION:** Create a surgical "aiPrompt" for the generation engine. It must say: "Draft the [Label] section. Answer these specific questions verbatim from the guidelines: [List verbatim questions]. Use a professional, technical, and persuasive tone."

Return ONLY valid JSON:
{
  "fundingScheme": "Exact Name of the Programme/Action",
  "sections": [
    {
      "key": "unique_snake_case_key",
      "label": "Exact literal label from document",
      "charLimit": number | null,
      "wordLimit": number | null,
      "mandatory": true,
      "order": number,
      "description": "ALL VERBATIM QUESTIONS AND PROMPTS CONCATENATED",
      "aiPrompt": "Draft the [Label] section by answering: [Question 1]? [Question 2]? ..."
    }
  ],
  "metadata": {
    "totalCharLimit": number | null,
    "estimatedDuration": "string"
  }
}`;

    const result = await model.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: base64Data } },
        { text: prompt }
    ]);

    const responseText = result.response.text();
    const extracted = extractJSON(responseText);
    
    console.log(`[API] Successfully parsed scheme template PDF: ${extracted.fundingScheme}`);
    return {
        success: true,
        template: {
            ...extracted,
            needsReview: true
        }
    };
};

