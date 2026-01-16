import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface KnowledgeChunk {
    content: string;
    source_name: string;
    metadata: {
        type: string;
        keywords: string[];
        source_id?: string;
    };
}

export class KnowledgeRetriever {
    private supabase;

    constructor() {
        const url = Deno.env.get('SUPABASE_URL') || '';
        const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        this.supabase = createClient(url, key);
    }

    /**
     * Retrieves relevant intelligence chunks based on provided keywords
     */
    async getRelevantKnowledge(keywords: string[], limit: number = 5): Promise<{ content: string; sources: string[] }> {
        try {
            if (!keywords || keywords.length === 0) return { content: '', sources: [] };

            console.log(`[RAG] Searching knowledge for: ${keywords.join(', ')}`);

            // Loop through keywords to avoid complex OR strings that break PostgREST
            const results: any[] = [];
            for (const kw of keywords.slice(0, 5)) { // Limit to top 5 keywords for speed
                const { data, error } = await this.supabase
                    .from('global_knowledge')
                    .select('source_name, content, metadata')
                    .ilike('content', `%${kw}%`)
                    .limit(3);

                if (data) results.push(...data);
                if (error) console.warn(`[RAG] Keyword ${kw} failed:`, error.message);
            }

            if (results.length === 0) {
                console.log('[RAG] No relevant chunks found in library.');
                return { content: '', sources: [] };
            }

            // Deduplicate results by content
            const uniqueResults = Array.from(new Map(results.map(item => [item.content, item])).values());
            console.log(`[RAG] Found ${uniqueResults.length} unique intelligence chunks.`);

            const content = uniqueResults.map(chunk => `
--- EXPERT KNOWLEDGE: ${chunk.source_name} (${chunk.metadata?.type || 'Guideline'}) ---
${chunk.content}
`).join('\n');

            const sources = Array.from(new Set(uniqueResults.map(r => r.source_name)));

            return { content, sources };

        } catch (e) {
            console.error('[RAG] Failed to retrieve knowledge:', e);
            return { content: '', sources: [] };
        }
    }

    /**
     * Extracts smart keywords from text to facilitate RAG lookup
     */
    static extractSmartKeywords(text: string): string[] {
        if (!text) return [];

        const keywords = new Set<string>();

        // 1. Funding Program Patterns
        const programs = [
            /Erasmus\+?/gi,
            /Horizon\s*Europe/gi,
            /Creative\s*Europe/gi,
            /Digital\s*Europe/gi,
            /Interreg/gi,
            /Aurora/gi, // Added specifically as user has Aurora docs
            /LIFE\s*Programme/gi,
            /KA\d{3}(-ADU|-VET|-YOU|-HED)?/gi
        ];

        programs.forEach(regex => {
            const matches = text.match(regex);
            if (matches) matches.forEach(m => keywords.add(m.trim()));
        });

        // 2. Transversal Priorities
        const priorities = [
            'Inclusion', 'Digital', 'Green', 'Sustainable', 'Circular Economy',
            'SME', 'Innovation', 'Skills', 'Capacity Building', 'Impact',
            'Cross-border', 'Integration', 'Diversity', 'VET', 'Adult Education'
        ];

        priorities.forEach(p => {
            if (text.toLowerCase().includes(p.toLowerCase())) keywords.add(p);
        });

        // 3. Extract technical-looking capitalized words (min 5 chars)
        const techTerms = text.match(/[A-Z][a-z]{4,}/g);
        if (techTerms) {
            techTerms.slice(0, 10).forEach(term => keywords.add(term));
        }

        // 4. URL Segment Extraction (e.g., civic-innovation-fund -> Civic Innovation Fund)
        const urlMatch = text.match(/https?:\/\/[^\s]+/gi);
        if (urlMatch) {
            urlMatch.forEach(url => {
                const segments = url.split('/').pop()?.split(/[?#]/)[0].split(/[-_]/);
                segments?.forEach(seg => {
                    if (seg.length > 3) {
                        keywords.add(seg.charAt(0).toUpperCase() + seg.slice(1));
                    }
                });
            });
        }

        return Array.from(keywords);
    }
}
