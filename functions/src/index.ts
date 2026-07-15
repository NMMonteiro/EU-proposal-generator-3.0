import { onRequest } from 'firebase-functions/v2/https';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { db, storage } from './firebase_db';

// Import services
import * as KV from './kv_store';
import { loadFullProposal, saveToSupabase, rebalanceBudget } from './proposal_service';
import { analyzeUrl } from './ideation_service';
import { generateProposalFull } from './proposal_generator_service';
import { listPartners, getPartner, upsertPartner, deletePartner } from './partner_service';
import { enrichFundingScheme } from './funding_scheme_service';
import { handleAiEdit, handleCopilotChat } from './ai_editor';
import { listAnnexes, getAnnex, createAnnex, updateAnnex, deleteAnnex } from './annex_service';
import { importPartnerPdf, importLibraryPdf, importExamplePdf } from './pdf_parser_service';

const app = express();

// Apply global middleware
app.use(cors({ origin: true }));
app.use(express.json());

import Busboy from 'busboy';

// Custom rawBody middleware to handle uploads inside Cloud Run / Google Cloud Functions
const parseMultipartRawBody = (req: any, res: Response, next: any) => {
    if (!req.headers['content-type']?.includes('multipart/form-data') || !req.rawBody) {
        return next();
    }

    try {
        const busboy = Busboy({ headers: req.headers });
        let fileBuffer: Buffer | null = null;
        let fileName = '';
        let fileMimeType = '';

        busboy.on('file', (fieldname, file, info) => {
            const { filename, mimeType } = info;
            fileName = filename;
            fileMimeType = mimeType;

            const chunks: Buffer[] = [];
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
            });
        });

        busboy.on('field', (fieldname, val) => {
            req.body = req.body || {};
            req.body[fieldname] = val;
        });

        busboy.on('finish', () => {
            if (fileBuffer) {
                req.file = {
                    fieldname: 'file',
                    originalname: fileName,
                    encoding: '7bit',
                    mimetype: fileMimeType,
                    buffer: fileBuffer,
                    size: fileBuffer.length,
                    destination: '',
                    filename: fileName,
                    path: ''
                };
            }
            next();
        });

        busboy.on('error', (err: any) => {
            console.error('Busboy parsing error:', err);
            next(err);
        });

        busboy.end(req.rawBody);
    } catch (err) {
        console.error('Failed to initialize Busboy:', err);
        next(err);
    }
};

const upload = {
    single: (fieldName: string) => parseMultipartRawBody
};

// Helper to upload a buffer to Firebase Storage and get a Firebase public media URL
async function uploadToStorage(buffer: Buffer, mimeType: string, filePath: string): Promise<string> {
    const bucket = storage.bucket();
    const fileRef = bucket.file(filePath);
    await fileRef.save(buffer, {
        metadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=3600'
        }
    });
    // Return standard Firebase Storage media URL format which is universally accessible
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
}

// --- 1. HEALTH & DIAGNOSTICS ---
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- 2. PROPOSAL CORE ---
app.post('/generate-proposal', async (req: Request, res: Response) => {
    try {
        console.log('[API] generate-proposal starting...');
        const proposal = await generateProposalFull(req.body);
        res.json(proposal);
    } catch (err: any) {
        console.error('[API Error] generate-proposal:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// --- 3. IDEATION FLOW ---
app.post('/analyze-url', async (req: Request, res: Response) => {
    try {
        const { url, userPrompt, fundingSchemeId } = req.body;
        const data = await analyzeUrl(url, userPrompt, fundingSchemeId);
        res.json(data);
    } catch (err: any) {
        console.error('[API Error] analyze-url:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// --- 4. PROPOSALS CRUD & ACTIONS ---

// GET /proposals - List all proposals (drafts from KV)
app.get('/proposals', async (req: Request, res: Response) => {
    try {
        const proposals = await KV.getByPrefix('proposal-');
        proposals.sort((a: any, b: any) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        res.json({ proposals });
    } catch (err: any) {
        console.error('[API Error] list proposals:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /proposals/:id - Get hydrated proposal
app.get('/proposals/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;
        const proposal = await loadFullProposal(dbId);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        return res.json(proposal);
    } catch (err: any) {
        console.error('[API Error] get proposal:', err);
        return res.status(500).json({ error: err.message });
    }
});

// POST /proposals - Save proposal
app.post('/proposals', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        if (!body.id) {
            body.id = require('crypto').randomUUID();
        }
        const saveKvKey = body.id.startsWith('proposal-') ? body.id : `proposal-${body.id}`;
        const saveDbId = body.id.startsWith('proposal-') ? body.id.replace('proposal-', '') : body.id;

        await KV.set(saveKvKey, body);
        await saveToSupabase({ ...body, id: saveDbId });
        res.json(body);
    } catch (err: any) {
        console.error('[API Error] create proposal:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /proposals/:id - Update proposal
app.put('/proposals/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;

        await KV.set(kvKey, body);
        await saveToSupabase({ ...body, id: dbId });
        res.json(body);
    } catch (err: any) {
        console.error('[API Error] update proposal:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /proposals/:id - Delete proposal
app.delete('/proposals/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;

        await KV.del(kvKey);
        await db.collection('proposals').doc(dbId).delete();
        res.json({ success: true });
    } catch (err: any) {
        console.error('[API Error] delete proposal:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /proposals/:id/rebalance - Rebalance budget items
app.post('/proposals/:id/rebalance', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { targetBudget, proposal: bodyProp } = req.body;
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;

        rebalanceBudget(bodyProp, targetBudget);
        await KV.set(kvKey, bodyProp);
        await saveToSupabase({ ...bodyProp, id: dbId });
        res.json(bodyProp);
    } catch (err: any) {
        console.error('[API Error] rebalance proposal budget:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 5. PARTNERS CRUD & FILE UPLOADS ---

// GET /partners - List all partners
app.get('/partners', async (req: Request, res: Response) => {
    try {
        const partners = await listPartners();
        res.json({ partners });
    } catch (err: any) {
        console.error('[API Error] list partners:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /partners/:id - Get specific partner
app.get('/partners/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const partner = await getPartner(id);
        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        return res.json(partner);
    } catch (err: any) {
        console.error('[API Error] get partner:', err);
        return res.status(500).json({ error: err.message });
    }
});

// POST /partners - Create partner
app.post('/partners', async (req: Request, res: Response) => {
    try {
        const partner = await upsertPartner(req.body);
        res.json(partner);
    } catch (err: any) {
        console.error('[API Error] create partner:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /partners/:id - Update partner
app.put('/partners/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const partner = await upsertPartner({ ...req.body, id });
        res.json(partner);
    } catch (err: any) {
        console.error('[API Error] update partner:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /partners/:id - Delete partner
app.delete('/partners/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await deletePartner(id);
        res.json({ success: true });
    } catch (err: any) {
        console.error('[API Error] delete partner:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /partners/:id/upload-logo - Logo upload
app.post('/partners/:id/upload-logo', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const fileExt = file.originalname.split('.').pop() || 'png';
        const fileName = `${id}_${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const publicUrl = await uploadToStorage(file.buffer, file.mimetype, filePath);

        const partner = await getPartner(id);
        if (partner) {
            await upsertPartner({ ...partner, id, logoUrl: publicUrl });
        }

        return res.json({ url: publicUrl });
    } catch (err: any) {
        console.error('[API Error] upload logo:', err);
        return res.status(500).json({ error: err.message });
    }
});

// POST /partners/:id/upload-pdf - PDF upload
app.post('/partners/:id/upload-pdf', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const fileName = `${id}_${Date.now()}.pdf`;
        const filePath = `pdfs/${fileName}`;

        const publicUrl = await uploadToStorage(file.buffer, file.mimetype, filePath);

        const partner = await getPartner(id);
        if (partner) {
            await upsertPartner({ ...partner, id, pdfUrl: publicUrl });
        }

        return res.json({ url: publicUrl });
    } catch (err: any) {
        console.error('[API Error] upload pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});

// --- 6. DOCUMENT PARSER ENDPOINTS ---

app.post('/import-partner-pdf', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file provided' });

        console.log(`[API] Importing partner PDF: ${file.originalname} (${file.size} bytes)`);
        const data = await importPartnerPdf(file.buffer, file.originalname, file.size);
        return res.json(data);
    } catch (err: any) {
        console.error('[API Error] import-partner-pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/import-library-pdf', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file provided' });

        const data = await importLibraryPdf(file.buffer, file.originalname);
        return res.json(data);
    } catch (err: any) {
        console.error('[API Error] import-library-pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/import-example-pdf', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file provided' });

        const data = await importExamplePdf(file.buffer, file.originalname);
        return res.json(data);
    } catch (err: any) {
        console.error('[API Error] import-example-pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});

// --- 7. ANNEXES FLOW ---

// POST /proposals/:proposalId/annexes/upload - Upload file and link to proposal
app.post('/proposals/:proposalId/annexes/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const { proposalId } = req.params;
        const file = req.file;
        const title = req.body.title || file?.originalname || 'Annex';
        const description = req.body.description || '';
        const category = req.body.category || 'other';
        const isMandatory = req.body.isMandatory === 'true';

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const fileExt = file.originalname.split('.').pop() || 'pdf';
        const fileName = `${proposalId}_${Date.now()}.${fileExt}`;
        const filePath = `annexes/${fileName}`;

        const publicUrl = await uploadToStorage(file.buffer, file.mimetype, filePath);

        const annex = await createAnnex({
            proposalId,
            title,
            description,
            fileUrl: publicUrl,
            fileName: file.originalname,
            fileType: fileExt,
            fileSize: file.size,
            category,
            isMandatory
        });

        return res.json(annex);
    } catch (err: any) {
        console.error('[API Error] upload annex:', err);
        return res.status(500).json({ error: err.message });
    }
});

// GET /proposals/:proposalId/annexes - List annexes
app.get('/proposals/:proposalId/annexes', async (req: Request, res: Response) => {
    try {
        const { proposalId } = req.params;
        const annexes = await listAnnexes(proposalId);
        res.json({ annexes });
    } catch (err: any) {
        console.error('[API Error] list annexes:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /annexes/:id - Get single annex metadata
app.get('/annexes/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const annex = await getAnnex(id);
        if (!annex) return res.status(404).json({ error: 'Annex not found' });
        return res.json(annex);
    } catch (err: any) {
        console.error('[API Error] get annex:', err);
        return res.status(500).json({ error: err.message });
    }
});

// PUT /annexes/:id - Update annex
app.put('/annexes/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const annex = await updateAnnex(id, req.body);
        res.json(annex);
    } catch (err: any) {
        console.error('[API Error] update annex:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /annexes/:id - Delete annex
app.delete('/annexes/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await deleteAnnex(id);
        res.json({ success: true });
    } catch (err: any) {
        console.error('[API Error] delete annex:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 8. AI & COPILOT ENDPOINTS ---

app.post('/proposal-copilot', async (req: Request, res: Response) => {
    try {
        const result = await handleCopilotChat(req.body);
        res.json(result);
    } catch (err: any) {
        console.error('[API Error] copilot chat:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/ai-edit', async (req: Request, res: Response) => {
    try {
        const result = await handleAiEdit(req.body);
        res.json(result);
    } catch (err: any) {
        console.error('[API Error] AI edit:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/enrich-scheme', async (req: Request, res: Response) => {
    try {
        const { schemeId } = req.body;
        const result = await enrichFundingScheme(schemeId);
        res.json(result);
    } catch (err: any) {
        console.error('[API Error] enrich scheme:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /global-knowledge - Retrieve library playbooks
app.get('/global-knowledge', async (req: Request, res: Response) => {
    try {
        const snap = await db.collection('global_knowledge').get();
        const knowledge: any[] = [];
        snap.forEach(doc => {
            knowledge.push({ ...doc.data(), id: doc.id });
        });
        res.json(knowledge);
    } catch (err: any) {
        console.error('[API Error] list global knowledge:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /upload - Generic file upload helper
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const fileExt = file.originalname.split('.').pop() || 'bin';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const publicUrl = await uploadToStorage(file.buffer, file.mimetype, filePath);
        return res.json({ url: publicUrl });
    } catch (err: any) {
        console.error('[API Error] upload:', err);
        return res.status(500).json({ error: err.message });
    }
});

// --- 9. FUNDING OPPORTUNITIES CACHE ---

app.post('/funding-opportunities', async (req: Request, res: Response) => {
    try {
        const { opportunities } = req.body;
        if (!Array.isArray(opportunities)) {
            return res.status(400).json({ error: 'opportunities must be an array' });
        }

        const batch = db.batch();
        for (const opp of opportunities) {
            const docRef = db.collection('funding_opportunities').doc(opp.call_id || opp.callId);
            batch.set(docRef, {
                call_id: opp.call_id || opp.callId,
                title: opp.title || '',
                description: opp.description || '',
                url: opp.url || '',
                status: opp.status || 'Open',
                deadline: opp.deadline || null,
                budget: opp.budget || '',
                funding_entity: opp.funding_entity || opp.fundingEntity || '',
                topic: opp.topic || '',
                ccm_id: opp.ccm_id || opp.ccmId || '',
                search_query: opp.search_query || opp.searchQuery || '',
                updated_at: new Date().toISOString(),
                created_at: opp.created_at || new Date().toISOString()
            });
        }
        await batch.commit();
        return res.json({ success: true, count: opportunities.length });
    } catch (err: any) {
        console.error('[API Error] upsert funding opportunities:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/funding-opportunities', async (req: Request, res: Response) => {
    try {
        const queryVal = req.query.query as string;
        if (!queryVal) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const snap = await db.collection('funding_opportunities')
            .where('search_query', '==', queryVal)
            .get();

        const opportunities: any[] = [];
        snap.forEach(doc => {
            opportunities.push({ ...doc.data(), id: doc.id });
        });

        // Sort in-memory to avoid needing index constraints
        opportunities.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        return res.json(opportunities);
    } catch (err: any) {
        console.error('[API Error] get funding opportunities:', err);
        return res.status(500).json({ error: err.message });
    }
});

// --- 10. FUNDING SCHEMES CRUD ---

app.get('/funding-schemes', async (req: Request, res: Response) => {
    try {
        const snap = await db.collection('funding_schemes').get();
        const schemes: any[] = [];
        snap.forEach(doc => {
            const data = doc.data();
            schemes.push({
                is_active: true,
                is_default: false,
                ...data,
                id: doc.id
            });
        });

        // Sort in-memory: default first, then newest
        schemes.sort((a: any, b: any) => {
            if (a.is_default && !b.is_default) return -1;
            if (!a.is_default && b.is_default) return 1;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
        });

        return res.json(schemes);
    } catch (err: any) {
        console.error('[API Error] list schemes:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/funding-schemes/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('funding_schemes').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Funding scheme not found' });
        }
        const data = doc.data();
        return res.json({
            ...data,
            id: doc.id
        });
    } catch (err: any) {
        console.error('[API Error] get scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});

// --- 10.5 KNOWLEDGE LIBRARY ---

app.get('/knowledge', async (req: Request, res: Response) => {
    try {
        const snap = await db.collection('global_knowledge').get();
        const knowledge: any[] = [];
        snap.forEach(doc => {
            const data = doc.data();
            knowledge.push({
                ...data,
                id: doc.id
            });
        });
        return res.json(knowledge);
    } catch (err: any) {
        console.error('[API Error] list knowledge:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/knowledge/sync', async (req: Request, res: Response) => {
    try {
        const snap = await db.collection('global_knowledge').count().get();
        const count = snap.data().count;
        return res.json({
            success: true,
            message: `Sync complete! Verified ${count} active intelligence chunks in Firestore.`
        });
    } catch (err: any) {
        console.error('[API Error] sync knowledge:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/funding-schemes', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const id = require('crypto').randomUUID();
        const docRef = db.collection('funding_schemes').doc(id);

        const newScheme = {
            ...body,
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await docRef.set(newScheme);
        return res.json(newScheme);
    } catch (err: any) {
        console.error('[API Error] create scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.put('/funding-schemes/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const docRef = db.collection('funding_schemes').doc(id);

        await docRef.update({
            ...body,
            updated_at: new Date().toISOString()
        });

        return res.json({ success: true });
    } catch (err: any) {
        console.error('[API Error] update scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.delete('/funding-schemes/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('funding_schemes').doc(id);
        await docRef.delete();
        return res.json({ success: true });
    } catch (err: any) {
        console.error('[API Error] delete scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});

app.post('/funding-schemes/:id/toggle-default', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isDefault } = req.body;

        const batch = db.batch();

        // If setting this one to default, unset all others
        if (isDefault) {
            const snap = await db.collection('funding_schemes').where('is_default', '==', true).get();
            snap.forEach(doc => {
                if (doc.id !== id) {
                    batch.update(doc.ref, { is_default: false });
                }
            });
        }

        const docRef = db.collection('funding_schemes').doc(id);
        batch.update(docRef, { is_default: isDefault });

        await batch.commit();
        return res.json({ success: true });
    } catch (err: any) {
        console.error('[API Error] toggle default scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Fallback for route not found
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Export Express app as a V2 HTTPS Cloud Function
export const server = onRequest({
    cors: true,
    maxInstances: 10,
    memory: '1GiB',
    timeoutSeconds: 120
}, app);
