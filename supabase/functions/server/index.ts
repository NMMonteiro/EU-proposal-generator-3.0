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
            let id = segments[segments.length - 1] === 'proposals' ? null : segments[segments.length - 1];
            // Normalize ID: remove 'proposal-' prefix if present for DB queries
            const dbId = id ? (id.startsWith('proposal-') ? id.replace('proposal-', '') : id) : null;
            const kvKey = id ? (id.startsWith('proposal-') ? id : `proposal-${id}`) : null;

            // GET /proposals
            if (!id && req.method === 'GET') {
                const proposals = await KV.getByPrefix('proposal-');
                return new Response(JSON.stringify({ proposals: proposals.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()) }), { headers: corsHeaders });
            }

            // GET /proposals/:id (OPTIMIZED HYDRATION)
            if (id && req.method === 'GET') {
                const proposal = await loadFullProposal(dbId!);
                if (!proposal) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
                return new Response(JSON.stringify(proposal), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // POST /proposals/:id (Save/Create)
            if (!id && req.method === 'POST') {
                const body = await req.json();
                if (!body.id) body.id = crypto.randomUUID();
                const saveKvKey = body.id.startsWith('proposal-') ? body.id : `proposal-${body.id}`;
                const saveDbId = body.id.startsWith('proposal-') ? body.id.replace('proposal-', '') : body.id;

                await KV.set(saveKvKey, body);
                await saveToSupabase({ ...body, id: saveDbId });
                return new Response(JSON.stringify(body), { headers: corsHeaders });
            }

            // POST /proposals/:id/rebalance
            if (id && req.method === 'POST' && path.includes('/rebalance')) {
                const { targetBudget, proposal: bodyProp } = await req.json();
                const { rebalanceBudget } = await import('./proposal_service.ts');
                rebalanceBudget(bodyProp, targetBudget);
                await KV.set(kvKey!, bodyProp);
                await saveToSupabase({ ...bodyProp, id: dbId });
                return new Response(JSON.stringify(bodyProp), { headers: corsHeaders });
            }

            // PUT /proposals/:id (Update)
            if (id && req.method === 'PUT') {
                const body = await req.json();
                await KV.set(kvKey!, body);
                await saveToSupabase({ ...body, id: dbId });
                return new Response(JSON.stringify(body), { headers: corsHeaders });
            }

            // DELETE /proposals/:id
            if (id && req.method === 'DELETE') {
                await KV.del(kvKey!);
                const supabase = getSupabaseClient();
                await supabase.from('proposals').delete().eq('id', dbId!);
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
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

            if (id && req.method === 'DELETE') {
                const { deletePartner } = await import('./partner_service.ts');
                await deletePartner(id);
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            if (req.method === 'POST') {
                const body = await req.json();
                const { upsertPartner } = await import('./partner_service.ts');
                const partner = await upsertPartner(body);
                return new Response(JSON.stringify(partner), { headers: corsHeaders });
            }

            if (id && req.method === 'PUT') {
                const body = await req.json();
                const { upsertPartner } = await import('./partner_service.ts');
                const partner = await upsertPartner({ ...body, id });
                return new Response(JSON.stringify(partner), { headers: corsHeaders });
            }
        }

        // --- 5. PARTNER PDF IMPORT ---
        if (path.includes('/import-partner-pdf') && req.method === 'POST') {
            const { importPartnerPdf } = await import('./pdf_parser_service.ts');
            const formData = await req.formData();
            const file = formData.get('file') as File;
            const data = await importPartnerPdf(file);
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        // --- 6. FUNDING SCHEMES ENRICHMENT ---
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
