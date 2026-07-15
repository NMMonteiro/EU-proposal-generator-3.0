import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

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

async function reindex() {
    console.log('🚀 Starting "Magic Memory" Re-indexing (Built-in Fetch)...');

    for (const file of files) {
        console.log(`\n📄 Processing: ${file}`);
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/index-knowledge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANON_KEY}`,
                    'apikey': ANON_KEY
                },
                body: JSON.stringify({
                    fileUrl: file,
                    sourceName: file.replace('.pdf', '')
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log(`✅ Success: ${result.count} high-quality chunks added.`);
            } else {
                console.error(`❌ Error for ${file}:`, result.error);
            }
        } catch (e) {
            console.error(`❌ Failed:`, e.message);
        }

        // Add a 2s delay between files
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✨ Magic Memory Re-indexing complete!');
}

reindex();
