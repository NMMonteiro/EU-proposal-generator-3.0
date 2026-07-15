import { db } from './firebase_db';
import { isUUID } from './utils';

/**
 * Maps a database partner row to the application's Partner interface.
 */
function mapPartner(p: any) {
    if (!p) return null;
    return {
        id: p.id,
        name: p.name,
        legalNameNational: p.legalNameNational || p.legal_name_national || p.name || '',
        acronym: p.acronym || '',
        organisationId: p.organisationId || p.organisation_id || p.pic || '',
        pic: p.pic || p.organisationId || p.organisation_id || '',
        vatNumber: p.vatNumber || p.vat_number || '',
        businessId: p.businessId || p.business_id || '',
        organizationType: p.organizationType || p.organization_type || '',
        isPublicBody: p.isPublicBody !== undefined ? p.isPublicBody : p.is_public_body || false,
        isNonProfit: p.isNonProfit !== undefined ? p.isNonProfit : p.is_non_profit || false,
        country: p.country || '',
        legalAddress: p.legalAddress || p.legal_address || '',
        city: p.city || '',
        postcode: p.postcode || '',
        region: p.region || '',
        contactEmail: p.contactEmail || p.contact_email || '',
        website: p.website || '',
        description: p.description || '',
        department: p.department || '',
        // Legal Representative
        legalRepName: p.legalRepName || p.legal_rep_name || '',
        legalRepPosition: p.legalRepPosition || p.legal_rep_position || '',
        legalRepEmail: p.legalRepEmail || p.legal_rep_email || '',
        legalRepPhone: p.legalRepPhone || p.legal_rep_phone || '',
        // Contact Person
        contactPersonName: p.contactPersonName || p.contact_person_name || '',
        contactPersonPosition: p.contactPersonPosition || p.contact_person_position || '',
        contactPersonEmail: p.contactPersonEmail || p.contact_person_email || '',
        contactPersonPhone: p.contactPersonPhone || p.contact_person_phone || '',
        contactPersonRole: p.contactPersonRole || p.contact_person_role || '',
        // Expertise & Experience
        experience: p.experience || '',
        staffSkills: p.staffSkills || p.staff_skills || '',
        relevantProjects: p.relevantProjects || p.relevant_projects || '',
        // Assets
        logoUrl: p.logoUrl || p.logo_url || '',
        pdfUrl: p.pdfUrl || p.pdf_url || '',
        keywords: p.keywords || [],
        createdAt: p.createdAt || p.created_at || new Date().toISOString()
    };
}

export const listPartners = async () => {
    const snap = await db.collection('partners').orderBy('name', 'asc').get();
    const list: any[] = [];
    snap.forEach(doc => {
        list.push(mapPartner({ ...doc.data(), id: doc.id }));
    });
    return list;
};

export const getPartner = async (id: string) => {
    if (!id) return null;
    const doc = await db.collection('partners').doc(id).get();
    if (!doc.exists) return null;
    return mapPartner({ ...doc.data(), id: doc.id });
};

export const upsertPartner = async (body: any) => {
    let id = body.id;
    if (!id || !isUUID(id)) {
        id = require('crypto').randomUUID();
    }
    const docRef = db.collection('partners').doc(id);

    // Build the data saving both styles to guarantee maximum frontend compatibility
    const dbPartner: any = {
        id,
        name: body.name || '',
        legalNameNational: body.legalNameNational || body.name || '',
        legal_name_national: body.legalNameNational || body.name || '',
        acronym: body.acronym || '',
        organisationId: body.organisationId || body.pic || '',
        organisation_id: body.organisationId || body.pic || '',
        pic: body.pic || body.organisationId || '',
        vatNumber: body.vatNumber || '',
        vat_number: body.vatNumber || '',
        businessId: body.businessId || '',
        business_id: body.businessId || '',
        organizationType: body.organizationType || '',
        organization_type: body.organizationType || '',
        isPublicBody: body.isPublicBody !== undefined ? !!body.isPublicBody : !!body.is_public_body,
        is_public_body: body.isPublicBody !== undefined ? !!body.isPublicBody : !!body.is_public_body,
        isNonProfit: body.isNonProfit !== undefined ? !!body.isNonProfit : !!body.is_non_profit,
        is_non_profit: body.isNonProfit !== undefined ? !!body.isNonProfit : !!body.is_non_profit,
        country: body.country || '',
        legalAddress: body.legalAddress || '',
        legal_address: body.legalAddress || '',
        city: body.city || '',
        postcode: body.postcode || '',
        region: body.region || '',
        contactEmail: body.contactEmail || '',
        contact_email: body.contactEmail || '',
        website: body.website || '',
        description: body.description || '',
        department: body.department || '',
        // Legal Representative
        legalRepName: body.legalRepName || body.legal_rep_name || '',
        legal_rep_name: body.legalRepName || body.legal_rep_name || '',
        legalRepPosition: body.legalRepPosition || body.legal_rep_position || '',
        legal_rep_position: body.legalRepPosition || body.legal_rep_position || '',
        legalRepEmail: body.legalRepEmail || body.legal_rep_email || '',
        legal_rep_email: body.legalRepEmail || body.legal_rep_email || '',
        legalRepPhone: body.legalRepPhone || body.legal_rep_phone || '',
        legal_rep_phone: body.legalRepPhone || body.legal_rep_phone || '',
        // Contact Person
        contactPersonName: body.contactPersonName || body.contact_person_name || '',
        contact_person_name: body.contactPersonName || body.contact_person_name || '',
        contactPersonPosition: body.contactPersonPosition || body.contact_person_position || '',
        contact_person_position: body.contactPersonPosition || body.contact_person_position || '',
        contactPersonEmail: body.contactPersonEmail || body.contact_person_email || '',
        contact_person_email: body.contactPersonEmail || body.contact_person_email || '',
        contactPersonPhone: body.contactPersonPhone || body.contact_person_phone || '',
        contact_person_phone: body.contactPersonPhone || body.contact_person_phone || '',
        contactPersonRole: body.contactPersonRole || body.contact_person_role || '',
        contact_person_role: body.contactPersonRole || body.contact_person_role || '',
        // Expertise & Experience
        experience: body.experience || '',
        staffSkills: body.staffSkills || body.staff_skills || '',
        staff_skills: body.staffSkills || body.staff_skills || '',
        relevantProjects: body.relevantProjects || body.relevant_projects || '',
        relevant_projects: body.relevantProjects || body.relevant_projects || '',
        // Assets
        logoUrl: body.logoUrl || body.logo_url || '',
        logo_url: body.logoUrl || body.logo_url || '',
        pdfUrl: body.pdfUrl || body.pdf_url || '',
        pdf_url: body.pdfUrl || body.pdf_url || '',
        keywords: body.keywords || [],
        createdAt: body.createdAt || body.created_at || new Date().toISOString(),
        created_at: body.createdAt || body.created_at || new Date().toISOString()
    };

    await docRef.set(dbPartner);
    return mapPartner(dbPartner);
};

export const deletePartner = async (id: string) => {
    if (!id || !isUUID(id)) return { success: false, error: 'Invalid ID' };
    await db.collection('partners').doc(id).delete();
    return { success: true };
};
