import { getSupabaseClient } from './supabase_client.ts';
import { isUUID } from './utils.ts';

/**
 * Maps a database partner row to the application's Partner interface.
 */
function mapPartner(p: any) {
    if (!p) return null;
    return {
        id: p.id,
        name: p.name,
        legalNameNational: p.legal_name_national,
        acronym: p.acronym,
        organisationId: p.organisation_id,
        pic: p.pic,
        vatNumber: p.vat_number,
        businessId: p.business_id,
        organizationType: p.organization_type,
        isPublicBody: p.is_public_body,
        isNonProfit: p.is_non_profit,
        country: p.country,
        legalAddress: p.legal_address,
        city: p.city,
        postcode: p.postcode,
        region: p.region,
        contactEmail: p.contact_email,
        website: p.website,
        description: p.description,
        department: p.department,
        // Legal Representative
        legalRepName: p.legal_rep_name,
        legalRepPosition: p.legal_rep_position,
        legalRepEmail: p.legal_rep_email,
        legalRepPhone: p.legal_rep_phone,
        // Contact Person
        contactPersonName: p.contact_person_name,
        contactPersonPosition: p.contact_person_position,
        contactPersonEmail: p.contact_person_email,
        contactPersonPhone: p.contact_person_phone,
        contactPersonRole: p.contact_person_role,
        // Expertise & Experience
        experience: p.experience,
        staffSkills: p.staff_skills,
        relevantProjects: p.relevant_projects,
        // Assets
        logoUrl: p.logo_url,
        pdfUrl: p.pdf_url,
        keywords: p.keywords,
        createdAt: p.created_at
    };
}

export const listPartners = async () => {
    const supabase = getSupabaseClient();
    const { data: dbPartners } = await supabase.from('partners').select('*').order('name', { ascending: true });
    return dbPartners?.map(mapPartner) || [];
};

export const getPartner = async (id: string) => {
    if (!id || !isUUID(id)) return null;

    const supabase = getSupabaseClient();
    const { data: p } = await supabase.from('partners').select('*').eq('id', id).maybeSingle();
    return mapPartner(p);
};

export const upsertPartner = async (body: any) => {
    const supabase = getSupabaseClient();
    const dbPartner: any = {
        name: body.name,
        legal_name_national: body.legalNameNational,
        acronym: body.acronym,
        organisation_id: body.organisationId || body.pic,
        pic: body.pic || body.organisationId,
        vat_number: body.vatNumber,
        business_id: body.businessId,
        organization_type: body.organizationType,
        is_public_body: body.isPublicBody,
        is_non_profit: body.isNonProfit,
        country: body.country,
        legal_address: body.legalAddress,
        city: body.city,
        postcode: body.postcode,
        region: body.region,
        contact_email: body.contactEmail,
        website: body.website,
        description: body.description,
        department: body.department,
        // Legal Representative
        legal_rep_name: body.legalRepName,
        legal_rep_position: body.legalRepPosition,
        legal_rep_email: body.legalRepEmail,
        legal_rep_phone: body.legalRepPhone,
        // Contact Person
        contact_person_name: body.contactPersonName,
        contact_person_position: body.contactPersonPosition,
        contact_person_email: body.contactPersonEmail,
        contact_person_phone: body.contactPersonPhone,
        contact_person_role: body.contactPersonRole,
        // Expertise & Experience
        experience: body.experience,
        staff_skills: body.staffSkills,
        relevant_projects: body.relevantProjects,
        // Assets
        logo_url: body.logoUrl,
        pdf_url: body.pdfUrl,
        keywords: body.keywords
    };

    // If updating an existing partner (has valid UUID), include the ID
    if (body.id && isUUID(body.id)) {
        dbPartner.id = body.id;
    }

    const { data, error } = await supabase.from('partners').upsert(dbPartner).select().single();
    if (error) throw error;
    return mapPartner(data);
};

export const deletePartner = async (id: string) => {
    if (!id || !isUUID(id)) return { success: false, error: 'Invalid ID' };

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (error) throw error;

    return { success: true };
};
