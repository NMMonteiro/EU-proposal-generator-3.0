import { getSupabaseClient } from './supabase_client.ts';
import { isUUID } from './utils.ts';

/**
 * Annex Service
 * Handles CRUD operations for proposal annexes
 */

function mapAnnex(a: any) {
    if (!a) return null;
    return {
        id: a.id,
        proposalId: a.proposal_id,
        title: a.title,
        description: a.description,
        fileUrl: a.file_url,
        fileName: a.file_name,
        fileType: a.file_type,
        fileSize: a.file_size,
        category: a.category,
        annexNumber: a.annex_number,
        isMandatory: a.is_mandatory,
        isTemplate: a.is_template,
        uploadedAt: a.uploaded_at,
        uploadedBy: a.uploaded_by
    };
}

export const listAnnexes = async (proposalId: string) => {
    if (!proposalId || !isUUID(proposalId)) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('proposal_annexes')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('annex_number', { ascending: true });

    if (error) {
        console.error('Error fetching annexes:', error);
        return [];
    }

    return data?.map(mapAnnex) || [];
};

export const getAnnex = async (id: string) => {
    if (!id || !isUUID(id)) return null;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('proposal_annexes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching annex:', error);
        return null;
    }

    return mapAnnex(data);
};

export const createAnnex = async (body: any) => {
    const supabase = getSupabaseClient();

    // Auto-assign annex number if not provided
    let annexNumber = body.annexNumber;
    if (!annexNumber && body.proposalId) {
        const { data: existing } = await supabase
            .from('proposal_annexes')
            .select('annex_number')
            .eq('proposal_id', body.proposalId)
            .order('annex_number', { ascending: false })
            .limit(1)
            .maybeSingle();

        annexNumber = (existing?.annex_number || 0) + 1;
    }

    const dbAnnex = {
        proposal_id: body.proposalId,
        title: body.title,
        description: body.description,
        file_url: body.fileUrl,
        file_name: body.fileName,
        file_type: body.fileType,
        file_size: body.fileSize,
        category: body.category || 'other',
        annex_number: annexNumber,
        is_mandatory: body.isMandatory || false,
        is_template: body.isTemplate || false,
        uploaded_by: body.uploadedBy
    };

    const { data, error } = await supabase
        .from('proposal_annexes')
        .insert(dbAnnex)
        .select()
        .single();

    if (error) throw error;
    return mapAnnex(data);
};

export const updateAnnex = async (id: string, body: any) => {
    if (!id || !isUUID(id)) throw new Error('Invalid annex ID');

    const supabase = getSupabaseClient();
    const dbAnnex: any = {};

    // Only update provided fields
    if (body.title !== undefined) dbAnnex.title = body.title;
    if (body.description !== undefined) dbAnnex.description = body.description;
    if (body.category !== undefined) dbAnnex.category = body.category;
    if (body.annexNumber !== undefined) dbAnnex.annex_number = body.annexNumber;
    if (body.isMandatory !== undefined) dbAnnex.is_mandatory = body.isMandatory;
    if (body.isTemplate !== undefined) dbAnnex.is_template = body.isTemplate;

    const { data, error } = await supabase
        .from('proposal_annexes')
        .update(dbAnnex)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return mapAnnex(data);
};

export const deleteAnnex = async (id: string) => {
    if (!id || !isUUID(id)) throw new Error('Invalid annex ID');

    const supabase = getSupabaseClient();

    // Get file URL before deleting to clean up storage
    const { data: annex } = await supabase
        .from('proposal_annexes')
        .select('file_url')
        .eq('id', id)
        .maybeSingle();

    // Delete from database
    const { error } = await supabase
        .from('proposal_annexes')
        .delete()
        .eq('id', id);

    if (error) throw error;

    // Try to delete file from storage (best effort)
    if (annex?.file_url && annex.file_url.includes('supabase.co/storage')) {
        try {
            const urlParts = annex.file_url.split('/');
            const bucket = urlParts[urlParts.indexOf('object') + 2];
            const filePath = urlParts.slice(urlParts.indexOf('object') + 3).join('/');

            await supabase.storage.from(bucket).remove([filePath]);
        } catch (storageError) {
            console.warn('Failed to delete file from storage:', storageError);
        }
    }

    return { success: true };
};
