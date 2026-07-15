import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const files = [
    "Application Guidelines of MOVE 6th CfP_FINAL - October 2025.pdf",
    "Creative_Europe_program_guide_2025.pdf",
    "Digital Europe programme _CREA_NEWS_Media_literacy_2026.pdf",
    "Digital Europe programme _DIGITAL_AI Continent_2026.pdf",
    "Digital Europe programme _DIGITAL_advanced_digital_skills_2026.pdf",
    "EU funding and tenders Online manual.pdf",
    "Erasmus_guide_for_experts_on_quality_assessment_2025.pdf",
    "Erasmus_program_guide_2025.pdf",
    "European-Solidarity_Corps_Guide_for_experts_2025.pdf",
    "European_Energy_Communities_Facility_Guidelines_2025.pdf",
    "European_research_council_guidelines_2026.pdf",
    "Horizon_Europe_guidelines_2025.pdf",
    "Horizon_work_program_culture_creativity_inclusion_2025.pdf",
    "Interreg Aurora Programe guide 2026.pdf"
];

async function runLocalIndexing() {
    console.log('🚀 Starting Local Knowledge Indexing...');
    console.log(`🔗 URL: ${process.env.SUPABASE_URL}`);
    console.log(`🔑 Key Prefix: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10)}...`);
    console.log(`🤖 AI Key Prefix: ${process.env.GEMINI_API_KEY?.substring(0, 10)}...`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    for (const file of files) {
        console.log(`\n📄 Processing: ${file}`);
        try {
            // 1. Download
            const { data: fileData, error: dlError } = await supabase.storage.from('global-library').download(file);
            if (dlError) throw dlError;

            const buffer = await fileData.arrayBuffer();
            const base64Data = Buffer.from(buffer).toString('base64');

            // 2. Extract
            const prompt = `You are a Senior European Grant Expert. Deeply analyze the guidelines for "${file}".
                EXTRACT 15-20 TECHNICAL KNOWLEDGE CHUNKS.
                Structure your response as ONLY valid JSON:
                {
                  "chunks": [
                    {
                      "content": "Professional technical description...",
                      "type": "criteria",
                      "keywords": ["key1"]
                    }
                  ]
                }`;

            const result = await model.generateContent([
                prompt,
                { inlineData: { mimeType: "application/pdf", data: base64Data } }
            ]);

            const responseText = result.response.text();
            let chunks = [];
            try {
                const cleanedText = responseText.replace(/```json\s*|```/g, '').trim();
                chunks = JSON.parse(cleanedText).chunks || [];
            } catch (e) {
                console.error(`   ⚠️ JSON Parse Error for ${file}`);
                continue;
            }

            console.log(`   🧠 Extracted ${chunks.length} chunks. Generating embeddings...`);

            // 3. Embed and Insert
            for (const chunk of chunks) {
                try {
                    const emb = await embeddingModel.embedContent(chunk.content);
                    const { error } = await supabase.from('global_knowledge').insert({
                        source_name: file.replace('.pdf', ''),
                        content: chunk.content,
                        embedding: emb.embedding.values,
                        metadata: {
                            type: chunk.type,
                            keywords: chunk.keywords,
                            source_id: file
                        }
                    });
                    if (error) {
                        console.warn(`   ❌ DB Insert Error for chunk: ${error.message}`);
                    }
                } catch (e) {
                    console.warn(`   ⚠️ Embedding Error: ${e.message}`);
                }
            }
            console.log(`   ✅ Success: ${file} processed.`);

        } catch (e) {
            console.error(`   ❌ Error for ${file}:`, e.message);
        }
    }

    console.log('\n✨ Local Indexing complete!');
}

runLocalIndexing();
