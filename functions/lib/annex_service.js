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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnex = exports.updateAnnex = exports.createAnnex = exports.getAnnex = exports.listAnnexes = void 0;
const firebase_db_1 = require("./firebase_db");
const utils_1 = require("./utils");
/**
 * Annex Service
 * Handles CRUD operations for proposal annexes in Firestore
 */
function mapAnnex(a) {
    if (!a)
        return null;
    return {
        id: a.id,
        proposalId: a.proposalId || a.proposal_id,
        title: a.title,
        description: a.description,
        fileUrl: a.fileUrl || a.file_url,
        fileName: a.fileName || a.file_name,
        fileType: a.fileType || a.file_type,
        fileSize: a.fileSize || a.file_size,
        category: a.category,
        annexNumber: a.annexNumber || a.annex_number,
        isMandatory: a.isMandatory || a.is_mandatory || false,
        isTemplate: a.isTemplate || a.is_template || false,
        uploadedAt: a.uploadedAt || a.uploaded_at,
        uploadedBy: a.uploadedBy || a.uploaded_by
    };
}
const listAnnexes = async (proposalId) => {
    if (!proposalId || !(0, utils_1.isUUID)(proposalId))
        return [];
    const snap = await firebase_db_1.db.collection('proposal_annexes')
        .where('proposalId', '==', proposalId)
        .orderBy('annexNumber', 'asc')
        .get();
    const list = [];
    snap.forEach(doc => {
        list.push(mapAnnex({ ...doc.data(), id: doc.id }));
    });
    return list;
};
exports.listAnnexes = listAnnexes;
const getAnnex = async (id) => {
    if (!id || !(0, utils_1.isUUID)(id))
        return null;
    const doc = await firebase_db_1.db.collection('proposal_annexes').doc(id).get();
    if (!doc.exists)
        return null;
    return mapAnnex({ ...doc.data(), id: doc.id });
};
exports.getAnnex = getAnnex;
const createAnnex = async (body) => {
    let annexNumber = body.annexNumber || body.annex_number;
    if (!annexNumber && body.proposalId) {
        const existing = await firebase_db_1.db.collection('proposal_annexes')
            .where('proposalId', '==', body.proposalId)
            .orderBy('annexNumber', 'desc')
            .limit(1)
            .get();
        if (!existing.empty) {
            annexNumber = (existing.docs[0].data().annexNumber || existing.docs[0].data().annex_number || 0) + 1;
        }
        else {
            annexNumber = 1;
        }
    }
    const id = require('crypto').randomUUID();
    const annexData = {
        id,
        proposalId: body.proposalId,
        proposal_id: body.proposalId,
        title: body.title,
        description: body.description,
        fileUrl: body.fileUrl,
        file_url: body.fileUrl,
        fileName: body.fileName,
        file_name: body.fileName,
        fileType: body.fileType,
        file_type: body.fileType,
        fileSize: body.fileSize,
        file_size: body.fileSize,
        category: body.category || 'other',
        annexNumber,
        annex_number: annexNumber,
        isMandatory: body.isMandatory || false,
        is_mandatory: body.isMandatory || false,
        isTemplate: body.isTemplate || false,
        is_template: body.isTemplate || false,
        uploadedBy: body.uploadedBy,
        uploaded_by: body.uploadedBy,
        uploadedAt: new Date().toISOString(),
        uploaded_at: new Date().toISOString()
    };
    await firebase_db_1.db.collection('proposal_annexes').doc(id).set(annexData);
    return mapAnnex(annexData);
};
exports.createAnnex = createAnnex;
const updateAnnex = async (id, body) => {
    if (!id || !(0, utils_1.isUUID)(id))
        throw new Error('Invalid annex ID');
    const docRef = firebase_db_1.db.collection('proposal_annexes').doc(id);
    const updates = {};
    if (body.title !== undefined)
        updates.title = body.title;
    if (body.description !== undefined)
        updates.description = body.description;
    if (body.category !== undefined)
        updates.category = body.category;
    if (body.annexNumber !== undefined) {
        updates.annexNumber = body.annexNumber;
        updates.annex_number = body.annexNumber;
    }
    if (body.isMandatory !== undefined) {
        updates.isMandatory = body.isMandatory;
        updates.is_mandatory = body.isMandatory;
    }
    if (body.isTemplate !== undefined) {
        updates.isTemplate = body.isTemplate;
        updates.is_template = body.isTemplate;
    }
    await docRef.update(updates);
    const updated = await docRef.get();
    return mapAnnex({ ...updated.data(), id: updated.id });
};
exports.updateAnnex = updateAnnex;
const deleteAnnex = async (id) => {
    if (!id || !(0, utils_1.isUUID)(id))
        throw new Error('Invalid annex ID');
    const docRef = firebase_db_1.db.collection('proposal_annexes').doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
        return { success: true };
    const data = doc.data();
    await docRef.delete();
    // Try to delete file from Firebase Storage
    const fileUrl = data.fileUrl || data.file_url;
    if (fileUrl && fileUrl.includes('firebasestorage.googleapis.com')) {
        try {
            const decodedUrl = decodeURIComponent(fileUrl);
            const pathStartIndex = decodedUrl.indexOf('/o/') + 3;
            const pathEndIndex = decodedUrl.indexOf('?');
            const storagePath = decodedUrl.substring(pathStartIndex, pathEndIndex);
            const { storage } = await Promise.resolve().then(() => __importStar(require('./firebase_db')));
            await storage.bucket().file(storagePath).delete();
            console.log(`Deleted storage file: ${storagePath}`);
        }
        catch (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
        }
    }
    return { success: true };
};
exports.deleteAnnex = deleteAnnex;
//# sourceMappingURL=annex_service.js.map