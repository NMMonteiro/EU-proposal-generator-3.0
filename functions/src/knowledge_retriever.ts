import { db } from './firebase_db';
import { embedText } from './ai_service';

function cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        mA += a[i] * a[i];
        mB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export class KnowledgeRetriever {
    /**
     * Retrieves relevant intelligence chunks based on semantic similarity using Firestore + in-memory cosine distance
     */
    async getRelevantKnowledge(query: string, limit: number = 8): Promise<{ content: string; sources: string[] }> {
        try {
            if (!query) return { content: '', sources: [] };

            console.log(`[RAG-Firestore] Semantic search for: "${query.substring(0, 50)}..."`);

            // 1. Generate embedding for query
            const queryEmbedding = await embedText(query);

            // 2. Fetch all chunks in global_knowledge collection
            const snap = await db.collection('global_knowledge').get();
            const results: any[] = [];

            snap.forEach(doc => {
                const data = doc.data();
                if (data && data.embedding && Array.isArray(data.embedding)) {
                    const similarity = cosineSimilarity(queryEmbedding, data.embedding);
                    results.push({
                        ...data,
                        similarity
                    });
                }
            });

            // 3. Filter and sort by similarity descending
            const filteredResults = results
                .filter(chunk => chunk.similarity >= 0.35)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            if (filteredResults.length === 0) {
                console.log('[RAG-Firestore] No semantic matches found.');
                // Fallback: simple keyword/text matching in-memory
                return this.getFallbackKnowledge(query, limit);
            }

            console.log(`[RAG-Firestore] Found ${filteredResults.length} semantic matches.`);

            const content = filteredResults.map((chunk: any) => `
### EXPERT DIRECTIVE: ${chunk.sourceName || chunk.source_name} (${chunk.metadata?.type || 'Guideline'}) [Sim: ${(chunk.similarity * 100).toFixed(1)}%]
${chunk.content}
`).join('\n');

            const sources = Array.from(new Set(filteredResults.map((r: any) => String(r.sourceName || r.source_name))));

            return { content, sources };

        } catch (e) {
            console.error('[RAG-Firestore] Failed to retrieve knowledge:', e);
            return { content: '', sources: [] };
        }
    }

    private async getFallbackKnowledge(query: string, limit: number): Promise<{ content: string; sources: string[] }> {
        const keywords = KnowledgeRetriever.extractSmartKeywords(query);
        const results: any[] = [];
        
        try {
            const snap = await db.collection('global_knowledge').get();
            const allDocs: any[] = [];
            snap.forEach(doc => allDocs.push({ ...doc.data(), id: doc.id }));

            for (const kw of keywords.slice(0, 3)) {
                const kwLower = kw.toLowerCase();
                const matched = allDocs.filter(d => d.content?.toLowerCase().includes(kwLower));
                results.push(...matched.slice(0, 2));
            }
        } catch (err) {
            console.warn('[RAG-Firestore] Fallback query failed:', err);
        }

        const content = results.map(chunk => `
--- [KEYWORD MATCH] EXPERT KNOWLEDGE: ${chunk.sourceName || chunk.source_name || 'Library'} ---
${chunk.content}
`).join('\n');
        const sources = Array.from(new Set(results.map(r => r.sourceName || r.source_name)));
        return { content, sources };
    }

    /**
     * Extracts smart keywords from text to facilitate RAG lookup
     */
    static extractSmartKeywords(text: string): string[] {
        if (!text) return [];

        const keywords = new Set<string>();

        const programs = [
            /Erasmus\+?/gi,
            /Horizon\s*Europe/gi,
            /Creative\s*Europe/gi,
            /Digital\s*Europe/gi,
            /Interreg/gi,
            /Aurora/gi,
            /LIFE\s*Programme/gi,
            /KA\d{3}(-ADU|-VET|-YOU|-HED)?/gi
        ];

        programs.forEach(regex => {
            const matches = text.match(regex);
            if (matches) matches.forEach(m => keywords.add(m.trim()));
        });

        const priorities = [
            'Inclusion', 'Digital', 'Green', 'Sustainable', 'Circular Economy',
            'SME', 'Innovation', 'Skills', 'Capacity Building', 'Impact',
            'Cross-border', 'Integration', 'Diversity', 'VET', 'Adult Education'
        ];

        priorities.forEach(p => {
            if (text.toLowerCase().includes(p.toLowerCase())) keywords.add(p);
        });

        const techTerms = text.match(/[A-Z][a-z]{4,}/g);
        if (techTerms) {
            techTerms.slice(0, 10).forEach(term => keywords.add(term));
        }

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
