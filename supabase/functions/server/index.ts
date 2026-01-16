import { corsHeaders, isUUID } from './utils.ts';
import { getSupabaseClient } from './supabase_client.ts';
import { getGeminiModel } from './ai_service.ts';
import * as KV from './kv_store.ts';
import { loadFullProposal, saveToSupabase } from './proposal_service.ts';
import { analyzeUrl } from './ideation_service.ts';
import { generateProposalFull } from './proposal_generator_service.ts';
import { listPartners, getPartner, upsertPartner } from './partner_service.ts';
import { importPartnerPdf } from './pdf_parser_service.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const url = new URL(req.url);
    const path = url.pathname;
    const segments = path.split('/').filter(Boolean);

    try {
        // --- 1. HEALTH & DIAGNOSTICS ---
        if (path.includes('/health')) {
            return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- 2. IDEATION FLOW ---
        if (path.includes('/analyze-url') && req.method === 'POST') {
            const body = await req.json();
            const data = await analyzeUrl(body.url, body.userPrompt, body.fundingSchemeId);
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- 3. PROPOSAL CORE ---
        if (path.includes('/generate-proposal') && req.method === 'POST') {
            const body = await req.json();
            const proposal = await generateProposalFull(body);
            return new Response(JSON.stringify(proposal), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (path.includes('/proposals')) {
            const id = segments[segments.length - 1] === 'proposals' ? null : segments[segments.length - 1];

            // GET /proposals
            if (!id && req.method === 'GET') {
                const proposals = await KV.getByPrefix('proposal-');
                return new Response(JSON.stringify({ proposals: proposals.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()) }), { headers: corsHeaders });
            }

            // GET /proposals/:id (OPTIMIZED HYDRATION)
            if (id && req.method === 'GET') {
                const proposal = await loadFullProposal(id);
                if (!proposal) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
                return new Response(JSON.stringify(proposal), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // POST /proposals/:id (Save/Create)
            if (!id && req.method === 'POST') {
                const body = await req.json();
                await KV.set(body.id, body);
                await saveToSupabase(body);
                return new Response(JSON.stringify(body), { headers: corsHeaders });
            }

            // POST /proposals/:id/rebalance
            if (id && req.method === 'POST' && path.includes('/rebalance')) {
                const { targetBudget, proposal: bodyProp } = await req.json();
                const { rebalanceBudget } = await import('./proposal_service.ts');
                rebalanceBudget(bodyProp, targetBudget);
                await KV.set(id, bodyProp);
                await saveToSupabase(bodyProp);
                return new Response(JSON.stringify(bodyProp), { headers: corsHeaders });
            }

            // PUT /proposals/:id (Update)
            if (id && req.method === 'PUT') {
                const body = await req.json();
                await KV.set(id, body);
                await saveToSupabase(body);
                return new Response(JSON.stringify(body), { headers: corsHeaders });
            }
        }

        // --- 4. PARTNERS CORE ---
        if (path.includes('/partners')) {
            const id = segments[segments.length - 1] === 'partners' ? null : segments[segments.length - 1];

            if (!id && req.method === 'GET') {
                const partners = await listPartners();
                return new Response(JSON.stringify({ partners }), { headers: corsHeaders });
            }

            if (id && req.method === 'GET') {
                const partner = await getPartner(id);
                return new Response(JSON.stringify(partner), { headers: corsHeaders });
            }

            if (req.method === 'POST') {
                if (path.includes('/import-partner-pdf')) {
                    const formData = await req.formData();
                    const file = formData.get('file') as File;
                    const data = await importPartnerPdf(file);
                    return new Response(JSON.stringify(data), { headers: corsHeaders });
                }
                const body = await req.json();
                const partner = await upsertPartner(body);
                return new Response(JSON.stringify(partner), { headers: corsHeaders });
            }
        }

        // --- 5. FUNDING SCHEMES ENRICHMENT ---
        if (path.includes('/enrich-scheme') && req.method === 'POST') {
            const { schemeId } = await req.json();
            const { enrichFundingScheme } = await import('./funding_scheme_service.ts');
            const result = await enrichFundingScheme(schemeId);
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Route not found', path }), { status: 404, headers: corsHeaders });

    } catch (error: any) {
        console.error(`[ERROR] ${path}:`, error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
