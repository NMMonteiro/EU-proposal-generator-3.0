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
    const method = req.method;
    const segments = path.split('/').filter(Boolean);

    console.log(`[DEBUG] Incoming Request: ${method} ${path}`);
    console.log(`[DEBUG] Segments: ${JSON.stringify(segments)}`);

    try {
        // --- 1. HEALTH & DIAGNOSTICS ---
        if (segments.includes('health')) {
            return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- 2. IDEATION FLOW ---
        if (segments.includes('analyze-url') && method === 'POST') {
            const body = await req.json();
            const data = await analyzeUrl(body.url, body.userPrompt, body.fundingSchemeId);
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- 3. PROPOSAL CORE ---
        if (segments.includes('generate-proposal') && method === 'POST') {
            console.log('[DEBUG] Entering generate-proposal handler');
            const body = await req.json();
            const proposal = await generateProposalFull(body);
            return new Response(JSON.stringify(proposal), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (segments.includes('proposals')) {
            let id = segments[segments.length - 1] === 'proposals' ? null : segments[segments.length - 1];
            // If the last segment is 'annexes' or 'rebalance', the ID might be the previous one
            if (segments.includes('annexes') || segments.includes('rebalance') || segments.includes('upload')) {
                const proposalsIdx = segments.indexOf('proposals');
                if (proposalsIdx !== -1 && segments.length > proposalsIdx + 1) {
                    id = segments[proposalsIdx + 1];
                }
            }
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
        if (segments.includes('partners')) {
            // Handle file uploads first (more specific routes)
            if (segments.includes('upload-logo') && method === 'POST') {
                const partnerId = segments[segments.indexOf('partners') + 1];
                const formData = await req.formData();
                const file = formData.get('file') as File;

                if (!file) {
                    return new Response(JSON.stringify({ error: 'No file provided' }), {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                const supabase = getSupabaseClient();
                const fileExt = file.name.split('.').pop();
                const fileName = `${partnerId}_${Date.now()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('partner-assets')
                    .upload(filePath, file, { cacheControl: '3600', upsert: true });

                if (uploadError) {
                    return new Response(JSON.stringify({ error: uploadError.message }), {
                        status: 500,
                        headers: corsHeaders
                    });
                }

                const { data: urlData } = supabase.storage
                    .from('partner-assets')
                    .getPublicUrl(filePath);

                // Update partner with logo URL
                const { upsertPartner, getPartner } = await import('./partner_service.ts');
                const partner = await getPartner(partnerId);
                if (partner) {
                    await upsertPartner({ ...partner, id: partnerId, logoUrl: urlData.publicUrl });
                }

                return new Response(JSON.stringify({ url: urlData.publicUrl }), { headers: corsHeaders });
            }

            if (path.includes('/upload-pdf') && req.method === 'POST') {
                const partnerId = segments[segments.indexOf('partners') + 1];
                const formData = await req.formData();
                const file = formData.get('file') as File;

                if (!file) {
                    return new Response(JSON.stringify({ error: 'No file provided' }), {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                const supabase = getSupabaseClient();
                const fileName = `${partnerId}_${Date.now()}.pdf`;
                const filePath = `pdfs/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('partner-assets')
                    .upload(filePath, file, { cacheControl: '3600', upsert: true });

                if (uploadError) {
                    return new Response(JSON.stringify({ error: uploadError.message }), {
                        status: 500,
                        headers: corsHeaders
                    });
                }

                const { data: urlData } = supabase.storage
                    .from('partner-assets')
                    .getPublicUrl(filePath);

                // Update partner with PDF URL
                const { upsertPartner, getPartner } = await import('./partner_service.ts');
                const partner = await getPartner(partnerId);
                if (partner) {
                    await upsertPartner({ ...partner, id: partnerId, pdfUrl: urlData.publicUrl });
                }

                return new Response(JSON.stringify({ url: urlData.publicUrl }), { headers: corsHeaders });
            }

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
        if (segments.includes('import-partner-pdf') && method === 'POST') {
            const { importPartnerPdf } = await import('./pdf_parser_service.ts');
            const formData = await req.formData();
            const file = formData.get('file') as File;
            const data = await importPartnerPdf(file);
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        // --- 5.5. ANNEXES MANAGEMENT ---
        if (segments.includes('annexes')) {
            const { listAnnexes, getAnnex, createAnnex, updateAnnex, deleteAnnex } = await import('./annex_service.ts');

            // POST /proposals/:proposalId/annexes/upload - Upload file and create annex
            if (segments.includes('upload') && method === 'POST') {
                const proposalId = segments[segments.indexOf('proposals') + 1];
                const formData = await req.formData();
                const file = formData.get('file') as File;
                const title = formData.get('title') as string || file.name;
                const description = formData.get('description') as string || '';
                const category = formData.get('category') as string || 'other';
                const isMandatory = formData.get('isMandatory') === 'true';

                if (!file) {
                    return new Response(JSON.stringify({ error: 'No file provided' }), {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                const supabase = getSupabaseClient();
                const fileExt = file.name.split('.').pop();
                const fileName = `${proposalId}_${Date.now()}.${fileExt}`;
                const filePath = `annexes/${fileName}`;

                // Upload to partner-assets bucket
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('partner-assets')
                    .upload(filePath, file, { cacheControl: '3600', upsert: true });

                if (uploadError) {
                    return new Response(JSON.stringify({ error: uploadError.message }), {
                        status: 500,
                        headers: corsHeaders
                    });
                }

                const { data: urlData } = supabase.storage
                    .from('partner-assets')
                    .getPublicUrl(filePath);

                // Create annex record
                const annex = await createAnnex({
                    proposalId,
                    title,
                    description,
                    fileUrl: urlData.publicUrl,
                    fileName: file.name,
                    fileType: fileExt || 'unknown',
                    fileSize: file.size,
                    category,
                    isMandatory
                });

                return new Response(JSON.stringify(annex), { headers: corsHeaders });
            }

            // GET /proposals/:proposalId/annexes - List all annexes for a proposal
            if (req.method === 'GET' && !segments[segments.length - 1].match(/^[0-9a-f-]{36}$/i)) {
                const proposalId = segments[segments.indexOf('proposals') + 1];
                const annexes = await listAnnexes(proposalId);
                return new Response(JSON.stringify({ annexes }), { headers: corsHeaders });
            }

            // GET /annexes/:id - Get single annex
            const annexId = segments[segments.length - 1];
            if (req.method === 'GET' && isUUID(annexId)) {
                const annex = await getAnnex(annexId);
                return new Response(JSON.stringify(annex), { headers: corsHeaders });
            }

            // PUT /annexes/:id - Update annex metadata
            if (req.method === 'PUT' && isUUID(annexId)) {
                const body = await req.json();
                const annex = await updateAnnex(annexId, body);
                return new Response(JSON.stringify(annex), { headers: corsHeaders });
            }

            // DELETE /annexes/:id - Delete annex
            if (req.method === 'DELETE' && isUUID(annexId)) {
                await deleteAnnex(annexId);
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }
        }

        // --- 6. AI & COPILOT ---
        if (segments.includes('proposal-copilot') && method === 'POST') {
            const body = await req.json();
            const { handleCopilotChat } = await import('./ai_editor.ts');
            const result = await handleCopilotChat(body);
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (segments.includes('ai-edit') && method === 'POST') {
            const body = await req.json();
            const { handleAiEdit } = await import('./ai_editor.ts');
            const result = await handleAiEdit(body);
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- 7. FUNDING SCHEMES ENRICHMENT ---
        if (segments.includes('enrich-scheme') && method === 'POST') {
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
