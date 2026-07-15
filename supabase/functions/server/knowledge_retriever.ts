import { createClient } from 'jsr:@supabase/supabase-js@2';
import { embedText } from './ai_service.ts';

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
     * Retrieves relevant intelligence chunks based on semantic similarity
     */
    async getRelevantKnowledge(query: string, limit: number = 8): Promise<{ content: string; sources: string[] }> {
        try {
            if (!query) return { content: '', sources: [] };

            console.log(`[RAG] Semantic search for: "${query.substring(0, 50)}..."`);

            // 1. Generate embedding for query
            const embedding = await embedText(query);

            // 2. Search using vector similarity RPC
            const { data: results, error } = await this.supabase.rpc('match_knowledge', {
                query_embedding: embedding,
                match_threshold: 0.35, // Adjust based on required precision
                match_count: limit
            });

            if (error) {
                console.warn('[RAG] Vector search failed, falling back to keyword search:', error.message);
                // Fallback to keyword search if RPC fails
                return this.getFallbackKnowledge(query, limit);
            }

            if (!results || results.length === 0) {
                console.log('[RAG] No semantic matches found.');
                return { content: '', sources: [] };
            }

            console.log(`[RAG] Found ${results.length} semantic matches.`);

            const content = results.map((chunk: any) => `
### EXPERT DIRECTIVE: ${chunk.source_name} (${chunk.metadata?.type || 'Guideline'}) [Sim: ${(chunk.similarity * 100).toFixed(1)}%]
${chunk.content}
`).join('\n');

            const sources = Array.from(new Set(results.map((r: any) => String(r.source_name))));

            return { content, sources };

        } catch (e) {
            console.error('[RAG] Failed to retrieve knowledge:', e);
            return { content: '', sources: [] };
        }
    }

    private async getFallbackKnowledge(query: string, limit: number): Promise<{ content: string; sources: string[] }> {
        const keywords = KnowledgeRetriever.extractSmartKeywords(query);
        const results: any[] = [];
        for (const kw of keywords.slice(0, 3)) {
            const { data } = await this.supabase
                .from('global_knowledge')
                .select('source_name, content, metadata')
                .ilike('content', `%${kw}%`)
                .limit(2);
            if (data) results.push(...data);
        }

        const content = results.map(chunk => `
--- [KEYWORD MATCH] EXPERT KNOWLEDGE: ${chunk.source_name} ---
${chunk.content}
`).join('\n');
        const sources = Array.from(new Set(results.map(r => r.source_name)));
        return { content, sources };
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
