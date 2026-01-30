
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { GoogleAIFileManager } from 'npm:@google/generative-ai/server';
import * as dotenv from 'npm:dotenv';
import { resolve } from "https://deno.land/std@0.203.0/path/mod.ts";

dotenv.config();

const apiKey = Deno.env.get('GEMINI_API_KEY');
if (!apiKey) {
    console.error('GEMINI_API_KEY is missing');
    Deno.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    const filePath = resolve("KA122-SCH-25B623B6 (1).pdf");
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
The categories should follow the Erasmus+ standard:
- Organisational Support
- Travel
- Individual Support (Subsistence)
- Course Fees (if any)
- Inclusion Support (if any)
- Preparatory Visits (if any)
- Exceptional Costs (if any)

For each category, extract:
1. The label/name of the category.
2. A list of items/lines within that category.
3. For each line: Description, Number of participants/days/units, Unit cost, and Total cost.
4. The requested grant amount for that category.

Return the data as a clean JSON object with this structure:
{
  "totalGrant": number,
  "budget": [
    {
      "category": "string",
      "items": [
        {
          "description": "string",
          "units": number,
          "unitCost": number,
          "total": number
        }
      ],
      "categoryTotal": number
    }
  ]
}

Return ONLY the JSON.
`;

    const result = await model.generateContent([
        { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
        { text: prompt }
    ]);

    console.log("--- RESULTS ---");
    console.log(result.response.text());
}

run().catch(console.error);
