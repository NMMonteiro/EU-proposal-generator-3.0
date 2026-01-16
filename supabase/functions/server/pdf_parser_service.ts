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

    const model = getGeminiModel();
    const prompt = `Extract partner organization info from this PIF PDF. 
    Return ONLY valid JSON including: name, acronym, organisationId, pic, vatNumber, businessId, organizationType, isPublicBody, isNonProfit, country, legalAddress, city, postcode, region, contactEmail, website, description, experience, staffSkills, relevantProjects.
    
    IMPORTANT: Ensure all field names use camelCase exactly as specified above.`;

    const result = await model.generateContent([
        { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
        { text: prompt }
    ]);

    const extractedData = extractJSON(result.response.text());

    // Immediately save to database
    const { upsertPartner } = await import('./partner_service.ts');
    const savedPartner = await upsertPartner(extractedData);

    console.log(`✅ Partner imported from PDF: ${savedPartner.name} (ID: ${savedPartner.id})`);

    return {
        ...savedPartner,
        partnerId: savedPartner.id
    };
};
