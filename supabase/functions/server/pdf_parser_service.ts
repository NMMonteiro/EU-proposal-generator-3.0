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
    Return ONLY valid JSON including: name, acronym, organisationId, pic, vatNumber, businessId, organizationType, country, legalAddress, city, postcode, description, experience, staffSkills, relevantProjects.`;

    const result = await model.generateContent([
        { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
        { text: prompt }
    ]);

    return extractJSON(result.response.text());
};
