
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY is missing');
    process.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    const filePath = path.resolve("KA122-SCH-25B623B6 (1).pdf");
    console.log(`Uploading file: ${filePath}`);

    const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: 'application/pdf',
        displayName: 'KA122-SCH Budget',
    });

    console.log(`File uploaded: ${uploadResponse.file.uri}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `
Extract the budget section from this Erasmus+ KA122-SCH application. 
Focus on pages 21 to 29.
I need a detailed list of budget items grouped by category.
The categories should follow the Erasmus+ standard for the portal:
- Organisational Support
- Travel
- Individual Support (Subsistence)
- Course Fees
- Inclusion Support
- Linguistic Support
- Exceptional Costs

For each line/activity, extract:
Line Item, Description, Participants/Units, Unit Cost, and Total.

Return the data as a clean JSON object with this structure:
{
  "totalGrant": number,
  "budget": [
    {
      "item": "Category Name (e.g. Organisational Support)",
      "description": "Short summary of what this covers",
      "cost": numberTotalForCategory,
      "breakdown": [
        {
          "subItem": "Description of specific line (e.g. Course fees for 5 staff)",
          "quantity": number,
          "unitCost": number,
          "total": number
        }
      ]
    }
  ]
}

Return ONLY the JSON.
`;

    // Wait for file to be processed
    let file = await fileManager.getFile(uploadResponse.file.name);
    while (file.state === 'PROCESSING') {
        process.stdout.write('.');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(uploadResponse.file.name);
    }

    if (file.state === 'FAILED') {
        throw new Error('File processing failed.');
    }

    console.log('Generating content...');
    const result = await model.generateContent([
        { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
        { text: prompt }
    ]);

    console.log("--- START_JSON ---");
    console.log(result.response.text());
    console.log("--- END_JSON ---");
}

run().catch(console.error);
