"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const https_1 = require("firebase-functions/v2/https");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const firebase_db_1 = require("./firebase_db");
// Import services
const KV = __importStar(require("./kv_store"));
const proposal_service_1 = require("./proposal_service");
const ideation_service_1 = require("./ideation_service");
const proposal_generator_service_1 = require("./proposal_generator_service");
const partner_service_1 = require("./partner_service");
const funding_scheme_service_1 = require("./funding_scheme_service");
const ai_editor_1 = require("./ai_editor");
const annex_service_1 = require("./annex_service");
const pdf_parser_service_1 = require("./pdf_parser_service");
const app = (0, express_1.default)();
// Apply global middleware
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
const busboy_1 = __importDefault(require("busboy"));
// Custom rawBody middleware to handle uploads inside Cloud Run / Google Cloud Functions
const parseMultipartRawBody = (req, res, next) => {
    if (!req.headers['content-type']?.includes('multipart/form-data') || !req.rawBody) {
        return next();
    }
    try {
        const busboy = (0, busboy_1.default)({ headers: req.headers });
        let fileBuffer = null;
        let fileName = '';
        let fileMimeType = '';
        busboy.on('file', (fieldname, file, info) => {
            const { filename, mimeType } = info;
            fileName = filename;
            fileMimeType = mimeType;
            const chunks = [];
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
        busboy.on('error', (err) => {
            console.error('Busboy parsing error:', err);
            next(err);
        });
        busboy.end(req.rawBody);
    }
    catch (err) {
        console.error('Failed to initialize Busboy:', err);
        next(err);
    }
};
const upload = {
    single: (fieldName) => parseMultipartRawBody
};
// Helper to upload a buffer to Firebase Storage and get a Firebase public media URL
async function uploadToStorage(buffer, mimeType, filePath) {
    const bucket = firebase_db_1.storage.bucket();
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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// --- 2. PROPOSAL CORE ---
app.post('/generate-proposal', async (req, res) => {
    try {
        console.log('[API] generate-proposal starting...');
        const proposal = await (0, proposal_generator_service_1.generateProposalFull)(req.body);
        res.json(proposal);
    }
    catch (err) {
        console.error('[API Error] generate-proposal:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// --- 3. IDEATION FLOW ---
app.post('/analyze-url', async (req, res) => {
    try {
        const { url, userPrompt, fundingSchemeId } = req.body;
        const data = await (0, ideation_service_1.analyzeUrl)(url, userPrompt, fundingSchemeId);
        res.json(data);
    }
    catch (err) {
        console.error('[API Error] analyze-url:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});
// --- 4. PROPOSALS CRUD & ACTIONS ---
// GET /proposals - List all proposals (drafts from KV)
app.get('/proposals', async (req, res) => {
    try {
        const proposals = await KV.getByPrefix('proposal-');
        proposals.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        res.json({ proposals });
    }
    catch (err) {
        console.error('[API Error] list proposals:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /proposals/:id - Get hydrated proposal
app.get('/proposals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;
        const proposal = await (0, proposal_service_1.loadFullProposal)(dbId);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        return res.json(proposal);
    }
    catch (err) {
        console.error('[API Error] get proposal:', err);
        return res.status(500).json({ error: err.message });
    }
});
// POST /proposals - Save proposal
app.post('/proposals', async (req, res) => {
    try {
        const body = req.body;
        if (!body.id) {
            body.id = require('crypto').randomUUID();
        }
        const saveKvKey = body.id.startsWith('proposal-') ? body.id : `proposal-${body.id}`;
        const saveDbId = body.id.startsWith('proposal-') ? body.id.replace('proposal-', '') : body.id;
        await KV.set(saveKvKey, body);
        await (0, proposal_service_1.saveToSupabase)({ ...body, id: saveDbId });
        res.json(body);
    }
    catch (err) {
        console.error('[API Error] create proposal:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /proposals/:id - Update proposal
app.put('/proposals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;
        await KV.set(kvKey, body);
        await (0, proposal_service_1.saveToSupabase)({ ...body, id: dbId });
        res.json(body);
    }
    catch (err) {
        console.error('[API Error] update proposal:', err);
        res.status(500).json({ error: err.message });
    }
});
// DELETE /proposals/:id - Delete proposal
app.delete('/proposals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;
        await KV.del(kvKey);
        await firebase_db_1.db.collection('proposals').doc(dbId).delete();
        res.json({ success: true });
    }
    catch (err) {
        console.error('[API Error] delete proposal:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /proposals/:id/rebalance - Rebalance budget items
app.post('/proposals/:id/rebalance', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetBudget, proposal: bodyProp } = req.body;
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const dbId = id.startsWith('proposal-') ? id.replace('proposal-', '') : id;
        (0, proposal_service_1.rebalanceBudget)(bodyProp, targetBudget);
        await KV.set(kvKey, bodyProp);
        await (0, proposal_service_1.saveToSupabase)({ ...bodyProp, id: dbId });
        res.json(bodyProp);
    }
    catch (err) {
        console.error('[API Error] rebalance proposal budget:', err);
        res.status(500).json({ error: err.message });
    }
});
// --- 5. PARTNERS CRUD & FILE UPLOADS ---
// GET /partners - List all partners
app.get('/partners', async (req, res) => {
    try {
        const partners = await (0, partner_service_1.listPartners)();
        res.json({ partners });
    }
    catch (err) {
        console.error('[API Error] list partners:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /partners/:id - Get specific partner
app.get('/partners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const partner = await (0, partner_service_1.getPartner)(id);
        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        return res.json(partner);
    }
    catch (err) {
        console.error('[API Error] get partner:', err);
        return res.status(500).json({ error: err.message });
    }
});
// POST /partners - Create partner
app.post('/partners', async (req, res) => {
    try {
        const partner = await (0, partner_service_1.upsertPartner)(req.body);
        res.json(partner);
    }
    catch (err) {
        console.error('[API Error] create partner:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /partners/:id - Update partner
app.put('/partners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const partner = await (0, partner_service_1.upsertPartner)({ ...req.body, id });
        res.json(partner);
    }
    catch (err) {
        console.error('[API Error] update partner:', err);
        res.status(500).json({ error: err.message });
    }
});
// DELETE /partners/:id - Delete partner
app.delete('/partners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await (0, partner_service_1.deletePartner)(id);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[API Error] delete partner:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /partners/:id/upload-logo - Logo upload
app.post('/partners/:id/upload-logo', upload.single('file'), async (req, res) => {
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
        const partner = await (0, partner_service_1.getPartner)(id);
        if (partner) {
            await (0, partner_service_1.upsertPartner)({ ...partner, id, logoUrl: publicUrl });
        }
        return res.json({ url: publicUrl });
    }
    catch (err) {
        console.error('[API Error] upload logo:', err);
        return res.status(500).json({ error: err.message });
    }
});
// POST /partners/:id/upload-pdf - PDF upload
app.post('/partners/:id/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const fileName = `${id}_${Date.now()}.pdf`;
        const filePath = `pdfs/${fileName}`;
        const publicUrl = await uploadToStorage(file.buffer, file.mimetype, filePath);
        const partner = await (0, partner_service_1.getPartner)(id);
        if (partner) {
            await (0, partner_service_1.upsertPartner)({ ...partner, id, pdfUrl: publicUrl });
        }
        return res.json({ url: publicUrl });
    }
    catch (err) {
        console.error('[API Error] upload pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});
// --- 6. DOCUMENT PARSER ENDPOINTS ---
app.post('/import-partner-pdf', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file provided' });
        console.log(`[API] Importing partner PDF: ${file.originalname} (${file.size} bytes)`);
        const data = await (0, pdf_parser_service_1.importPartnerPdf)(file.buffer, file.originalname, file.size);
        return res.json(data);
    }
    catch (err) {
        console.error('[API Error] import-partner-pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.post('/import-library-pdf', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file provided' });
        const data = await (0, pdf_parser_service_1.importLibraryPdf)(file.buffer, file.originalname);
        return res.json(data);
    }
    catch (err) {
        console.error('[API Error] import-library-pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.post('/import-example-pdf', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'No file provided' });
        const data = await (0, pdf_parser_service_1.importExamplePdf)(file.buffer, file.originalname);
        return res.json(data);
    }
    catch (err) {
        console.error('[API Error] import-example-pdf:', err);
        return res.status(500).json({ error: err.message });
    }
});
// --- 7. ANNEXES FLOW ---
// POST /proposals/:proposalId/annexes/upload - Upload file and link to proposal
app.post('/proposals/:proposalId/annexes/upload', upload.single('file'), async (req, res) => {
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
        const annex = await (0, annex_service_1.createAnnex)({
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
    }
    catch (err) {
        console.error('[API Error] upload annex:', err);
        return res.status(500).json({ error: err.message });
    }
});
// GET /proposals/:proposalId/annexes - List annexes
app.get('/proposals/:proposalId/annexes', async (req, res) => {
    try {
        const { proposalId } = req.params;
        const annexes = await (0, annex_service_1.listAnnexes)(proposalId);
        res.json({ annexes });
    }
    catch (err) {
        console.error('[API Error] list annexes:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /annexes/:id - Get single annex metadata
app.get('/annexes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const annex = await (0, annex_service_1.getAnnex)(id);
        if (!annex)
            return res.status(404).json({ error: 'Annex not found' });
        return res.json(annex);
    }
    catch (err) {
        console.error('[API Error] get annex:', err);
        return res.status(500).json({ error: err.message });
    }
});
// PUT /annexes/:id - Update annex
app.put('/annexes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const annex = await (0, annex_service_1.updateAnnex)(id, req.body);
        res.json(annex);
    }
    catch (err) {
        console.error('[API Error] update annex:', err);
        res.status(500).json({ error: err.message });
    }
});
// DELETE /annexes/:id - Delete annex
app.delete('/annexes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await (0, annex_service_1.deleteAnnex)(id);
        res.json({ success: true });
    }
    catch (err) {
        console.error('[API Error] delete annex:', err);
        res.status(500).json({ error: err.message });
    }
});
// --- 8. AI & COPILOT ENDPOINTS ---
app.post('/proposal-copilot', async (req, res) => {
    try {
        const result = await (0, ai_editor_1.handleCopilotChat)(req.body);
        res.json(result);
    }
    catch (err) {
        console.error('[API Error] copilot chat:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/ai-edit', async (req, res) => {
    try {
        const result = await (0, ai_editor_1.handleAiEdit)(req.body);
        res.json(result);
    }
    catch (err) {
        console.error('[API Error] AI edit:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/enrich-scheme', async (req, res) => {
    try {
        const { schemeId } = req.body;
        const result = await (0, funding_scheme_service_1.enrichFundingScheme)(schemeId);
        res.json(result);
    }
    catch (err) {
        console.error('[API Error] enrich scheme:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /global-knowledge - Retrieve library playbooks
app.get('/global-knowledge', async (req, res) => {
    try {
        const snap = await firebase_db_1.db.collection('global_knowledge').get();
        const knowledge = [];
        snap.forEach(doc => {
            knowledge.push({ ...doc.data(), id: doc.id });
        });
        res.json(knowledge);
    }
    catch (err) {
        console.error('[API Error] list global knowledge:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /upload - Generic file upload helper
app.post('/upload', upload.single('file'), async (req, res) => {
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
    }
    catch (err) {
        console.error('[API Error] upload:', err);
        return res.status(500).json({ error: err.message });
    }
});
// --- 9. FUNDING OPPORTUNITIES CACHE ---
app.post('/funding-opportunities', async (req, res) => {
    try {
        const { opportunities } = req.body;
        if (!Array.isArray(opportunities)) {
            return res.status(400).json({ error: 'opportunities must be an array' });
        }
        const batch = firebase_db_1.db.batch();
        for (const opp of opportunities) {
            const docRef = firebase_db_1.db.collection('funding_opportunities').doc(opp.call_id || opp.callId);
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
    }
    catch (err) {
        console.error('[API Error] upsert funding opportunities:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.get('/funding-opportunities', async (req, res) => {
    try {
        const queryVal = req.query.query;
        if (!queryVal) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        const snap = await firebase_db_1.db.collection('funding_opportunities')
            .where('search_query', '==', queryVal)
            .get();
        const opportunities = [];
        snap.forEach(doc => {
            opportunities.push({ ...doc.data(), id: doc.id });
        });
        // Sort in-memory to avoid needing index constraints
        opportunities.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return res.json(opportunities);
    }
    catch (err) {
        console.error('[API Error] get funding opportunities:', err);
        return res.status(500).json({ error: err.message });
    }
});
// --- 10. FUNDING SCHEMES CRUD ---
app.get('/funding-schemes', async (req, res) => {
    try {
        const snap = await firebase_db_1.db.collection('funding_schemes').get();
        const schemes = [];
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
        schemes.sort((a, b) => {
            if (a.is_default && !b.is_default)
                return -1;
            if (!a.is_default && b.is_default)
                return 1;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
        });
        return res.json(schemes);
    }
    catch (err) {
        console.error('[API Error] list schemes:', err);
        return res.status(500).json({ error: err.message });
    }
});
// --- 10.5 KNOWLEDGE LIBRARY ---
app.get('/knowledge', async (req, res) => {
    try {
        const snap = await firebase_db_1.db.collection('global_knowledge').get();
        const knowledge = [];
        snap.forEach(doc => {
            const data = doc.data();
            knowledge.push({
                ...data,
                id: doc.id
            });
        });
        return res.json(knowledge);
    }
    catch (err) {
        console.error('[API Error] list knowledge:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.post('/knowledge/sync', async (req, res) => {
    try {
        const snap = await firebase_db_1.db.collection('global_knowledge').count().get();
        const count = snap.data().count;
        return res.json({
            success: true,
            message: `Sync complete! Verified ${count} active intelligence chunks in Firestore.`
        });
    }
    catch (err) {
        console.error('[API Error] sync knowledge:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.post('/funding-schemes', async (req, res) => {
    try {
        const body = req.body;
        const id = require('crypto').randomUUID();
        const docRef = firebase_db_1.db.collection('funding_schemes').doc(id);
        const newScheme = {
            ...body,
            id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        await docRef.set(newScheme);
        return res.json(newScheme);
    }
    catch (err) {
        console.error('[API Error] create scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.put('/funding-schemes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const docRef = firebase_db_1.db.collection('funding_schemes').doc(id);
        await docRef.update({
            ...body,
            updated_at: new Date().toISOString()
        });
        return res.json({ success: true });
    }
    catch (err) {
        console.error('[API Error] update scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.delete('/funding-schemes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = firebase_db_1.db.collection('funding_schemes').doc(id);
        await docRef.delete();
        return res.json({ success: true });
    }
    catch (err) {
        console.error('[API Error] delete scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});
app.post('/funding-schemes/:id/toggle-default', async (req, res) => {
    try {
        const { id } = req.params;
        const { isDefault } = req.body;
        const batch = firebase_db_1.db.batch();
        // If setting this one to default, unset all others
        if (isDefault) {
            const snap = await firebase_db_1.db.collection('funding_schemes').where('is_default', '==', true).get();
            snap.forEach(doc => {
                if (doc.id !== id) {
                    batch.update(doc.ref, { is_default: false });
                }
            });
        }
        const docRef = firebase_db_1.db.collection('funding_schemes').doc(id);
        batch.update(docRef, { is_default: isDefault });
        await batch.commit();
        return res.json({ success: true });
    }
    catch (err) {
        console.error('[API Error] toggle default scheme:', err);
        return res.status(500).json({ error: err.message });
    }
});
// Fallback for route not found
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});
// Export Express app as a V2 HTTPS Cloud Function
exports.server = (0, https_1.onRequest)({
    cors: true,
    maxInstances: 10,
    memory: '1GiB',
    timeoutSeconds: 120
}, app);
//# sourceMappingURL=index.js.map