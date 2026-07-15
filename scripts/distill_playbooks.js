import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function distillPlaybooks() {
    console.log('🧠 Starting "Expert Playbook" Synthesis...');

    // 1. Get all schemes
    const { data: schemes } = await supabase.from('funding_schemes').select('id, name, description');

    if (!schemes) return;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    for (const scheme of schemes) {
        console.log(`\n💎 Processing: ${scheme.name}...`);

        try {
            // 2. Search for relevant chunks in the Global Library
            // We'll use a simple keyword search here since we're in a Node script, 
            // but we'll focus on the most technical keywords for that scheme.
            let searchQuery = scheme.name.split(' ')[0];
            let actionCode = scheme.name.match(/KA\d{3}[-\w]*/)?.[0] || '';

            if (searchQuery.startsWith('KA')) searchQuery = 'Erasmus';
            if (searchQuery.includes('Innovation')) searchQuery = 'Innovation';
            if (scheme.name.includes('Horizon')) searchQuery = 'Horizon';
            if (scheme.name.includes('Europe')) searchQuery = 'Europe';

            console.log(`   🔍 Searching library for: "${searchQuery}" and "${actionCode}"`);

            let query = supabase.from('global_knowledge').select('content, source_name');
            if (actionCode) {
                query = query.or(`content.ilike.%${searchQuery}%,content.ilike.%${actionCode}%`);
            } else {
                query = query.ilike('content', `%${searchQuery}%`);
            }

            const { data: knowledge, error: kError } = await query.limit(20);

            if (kError) throw kError;
            console.log(`   📚 Found ${knowledge?.length || 0} chunks.`);

            const libraryContent = knowledge?.map(k => `[Source: ${k.source_name}]\n${k.content}`).join('\n\n') || "No specific detailed guidelines found.";

            const prompt = `You are a world-class EU Grant Consultant. Synthesize a professional "Expert Playbook" for the funding scheme: "${scheme.name}".

Use the following guidelines and library data to extract the most critical intelligence.
Your goal is to provide a "Winning Strategy" for applicants.

LIBRARY DATA:
${libraryContent}

INSTRUCTIONS:
1. Identify the core objectives of the program.
2. Extract specific budget rules, limits, and lump-sum constraints if available.
3. List 5-8 "Best Practices" for a high-scoring proposal.
4. List "Common Pitfalls" that lead to rejection.
5. Identify "Key Terminology" critical for the application narrative.
6. Detail the "Scoring Criteria" and their weighting.

RESPONSE FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "core_objectives": ["obj1", "obj2"],
  "budget_rules": ["rule1", "rule2"],
  "best_practices": ["practice1", "practice2"],
  "common_pitfalls": ["pitfall1", "pitfall2"],
  "key_terminology": ["term1", "term2"],
  "scoring_criteria": ["criteria1", "criteria2"]
}
If data is missing for a section, return an empty array for that field. Do NOT include markdown formatting or explanations.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                let finalPlaybook;
                try {
                    const cleanedText = jsonMatch[0].trim();
                    finalPlaybook = JSON.parse(cleanedText);
                } catch (parseError) {
                    console.error(`   ⚠️ JSON Parse Error for ${scheme.name}:`, parseError.message);
                    continue;
                }

                // 3. Update the database
                const { error } = await supabase
                    .from('funding_schemes')
                    .update({
                        expert_rules: finalPlaybook,
                        expert_playbook: finalPlaybook // Update both for consistency
                    })
                    .eq('id', scheme.id);

                if (error) console.error(`   ❌ DB Error:`, error.message);
                else console.log(`   ✅ Success: ${finalPlaybook.core_objectives?.length || 0} objectives, ${finalPlaybook.best_practices?.length || 0} best practices saved.`);
            } else {
                console.warn(`   ⚠️ AI Response didn't contain JSON.`);
            }

        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}`);
        }
    }

    console.log('\n✨ All Schemes enriched with Expert Intelligence!');
}

distillPlaybooks();
