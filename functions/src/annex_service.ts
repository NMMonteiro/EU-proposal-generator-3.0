import { db } from './firebase_db';
import { isUUID } from './utils';

/**
 * Annex Service
 * Handles CRUD operations for proposal annexes in Firestore
 */

function mapAnnex(a: any) {
    if (!a) return null;
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

export const listAnnexes = async (proposalId: string) => {
    if (!proposalId || !isUUID(proposalId)) return [];

    const snap = await db.collection('proposal_annexes')
        .where('proposalId', '==', proposalId)
        .orderBy('annexNumber', 'asc')
        .get();

    const list: any[] = [];
    snap.forEach(doc => {
        list.push(mapAnnex({ ...doc.data(), id: doc.id }));
    });
    return list;
};

export const getAnnex = async (id: string) => {
    if (!id || !isUUID(id)) return null;

    const doc = await db.collection('proposal_annexes').doc(id).get();
    if (!doc.exists) return null;

    return mapAnnex({ ...doc.data(), id: doc.id });
};

export const createAnnex = async (body: any) => {
    let annexNumber = body.annexNumber || body.annex_number;
    if (!annexNumber && body.proposalId) {
        const existing = await db.collection('proposal_annexes')
            .where('proposalId', '==', body.proposalId)
            .orderBy('annexNumber', 'desc')
            .limit(1)
            .get();

        if (!existing.empty) {
            annexNumber = (existing.docs[0].data().annexNumber || existing.docs[0].data().annex_number || 0) + 1;
        } else {
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

    await db.collection('proposal_annexes').doc(id).set(annexData);
    return mapAnnex(annexData);
};

export const updateAnnex = async (id: string, body: any) => {
    if (!id || !isUUID(id)) throw new Error('Invalid annex ID');

    const docRef = db.collection('proposal_annexes').doc(id);
    const updates: any = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
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

export const deleteAnnex = async (id: string) => {
    if (!id || !isUUID(id)) throw new Error('Invalid annex ID');

    const docRef = db.collection('proposal_annexes').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { success: true };

    const data = doc.data()!;
    await docRef.delete();

    // Try to delete file from Firebase Storage
    const fileUrl = data.fileUrl || data.file_url;
    if (fileUrl && fileUrl.includes('firebasestorage.googleapis.com')) {
        try {
            const decodedUrl = decodeURIComponent(fileUrl);
            const pathStartIndex = decodedUrl.indexOf('/o/') + 3;
            const pathEndIndex = decodedUrl.indexOf('?');
            const storagePath = decodedUrl.substring(pathStartIndex, pathEndIndex);

            const { storage } = await import('./firebase_db');
            await storage.bucket().file(storagePath).delete();
            console.log(`Deleted storage file: ${storagePath}`);
        } catch (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
        }
    }

    return { success: true };
};
