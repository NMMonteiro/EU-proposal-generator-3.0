import { getGeminiModel, getFileManager } from './ai_service.ts';
import { extractJSON } from './utils.ts';

export const importPartnerPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const tempFileName = `partner-${Date.now()}.pdf`;
    const tempFilePath = `/tmp/${tempFileName}`;
    await Deno.writeFile(tempFilePath, new Uint8Array(arrayBuffer));

    const fileManager = getFileManager();
    const uploadResponse = await fileManager.uploadFile(tempFilePath, {
        mimeType: 'application/pdf',
        displayName: file.name,
    });

    const model = getGeminiModel({ temperature: 0.1, maxOutputTokens: 4096 });

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

IMPORTANT EXTRACTION RULES:
1. Extract phone numbers in international format when possible (e.g., +351 123 456 789)
2. For boolean fields (isPublicBody, isNonProfit), infer from organization type if not explicitly stated
3. For experience/skills/projects: Extract as detailed text, preserving bullet points and structure
4. If multiple PICs or IDs are present, use the primary/first one
5. Ensure email addresses are valid format
6. Extract ALL text from experience, skills, and projects sections - don't summarize

Return ONLY the JSON object, no additional text or markdown formatting.`;

    const result = await model.generateContent([
        { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
        { text: prompt }
    ]);

    const extractedData = extractJSON(result.response.text());

    // Data validation and cleanup
    if (!extractedData.name || extractedData.name.trim() === '') {
        throw new Error('Partner name is required but was not found in the PDF');
    }

    // Normalize boolean fields
    if (typeof extractedData.isPublicBody === 'string') {
        extractedData.isPublicBody = extractedData.isPublicBody.toLowerCase() === 'true' || extractedData.isPublicBody.toLowerCase() === 'yes';
    }
    if (typeof extractedData.isNonProfit === 'string') {
        extractedData.isNonProfit = extractedData.isNonProfit.toLowerCase() === 'true' || extractedData.isNonProfit.toLowerCase() === 'yes';
    }

    // Immediately save to database
    const { upsertPartner } = await import('./partner_service.ts');
    const savedPartner = await upsertPartner(extractedData);

    console.log(`✅ Partner imported from PDF: ${savedPartner.name} (ID: ${savedPartner.id})`);
    console.log(`   Organization Type: ${savedPartner.organizationType || 'Not specified'}`);
    console.log(`   Country: ${savedPartner.country || 'Not specified'}`);
    console.log(`   PIC: ${savedPartner.pic || 'Not specified'}`);

    return {
        ...savedPartner,
        partnerId: savedPartner.id
    };
};
