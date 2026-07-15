import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const LIBRARY_PATH = 'C:/Users/nunom/Documents/EU-Projects-generator-5.0/Global Library';

async function indexTextFiles() {
    console.log('📝 Indexing Text/Markdown Knowledge...');

    const files = fs.readdirSync(LIBRARY_PATH).filter(f => f.endsWith('.md') || f.endsWith('.txt'));

    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    for (const file of files) {
        console.log(`📄 Processing: ${file}`);
        const content = fs.readFileSync(path.join(LIBRARY_PATH, file), 'utf-8');

        // Split into logical chunks (paragraphs or sections)
        const rawChunks = content.split(/\n#{1,3}\s+/).filter(c => c.trim().length > 50);

        for (const rawChunk of rawChunks) {
            try {
                const emb = await model.embedContent(rawChunk);

                await supabase.from('global_knowledge').insert({
                    source_name: file,
                    content: rawChunk.substring(0, 4000),
                    embedding: emb.embedding.values,
                    metadata: {
                        type: 'best_practice',
                        source_id: file,
                        keywords: [file.split('_')[0]]
                    }
                });
                console.log(`   ✅ Chunk indexed.`);
            } catch (e) {
                console.error(`   ❌ Failed to index chunk: ${e.message}`);
            }
        }
    }

    console.log('✨ Text knowledge indexing complete!');
}

indexTextFiles();
