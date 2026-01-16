import { getSupabaseClient } from './supabase_client.ts';
import { isUUID } from './utils.ts';
import * as KV from './kv_store.ts';

export const listPartners = async () => {
    const supabase = getSupabaseClient();
    const { data: dbPartners } = await supabase.from('partners').select('*');

    const mappedPartners = dbPartners?.map(p => ({
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
        experience: p.experience,
        staffSkills: p.staff_skills,
        relevantProjects: p.relevant_projects,
        createdAt: p.created_at
    })) || [];

    const kvPartners = await KV.getByPrefix('partner:');
    const allPartners = [...mappedPartners];

    kvPartners.forEach(kvp => {
        const alreadyExists = allPartners.find(p => p.id === kvp.id || (p.name && kvp.name && p.name.toLowerCase() === kvp.name.toLowerCase()));
        if (!alreadyExists) allPartners.push(kvp);
    });

    return allPartners;
};

export const getPartner = async (id: string) => {
    const supabase = getSupabaseClient();
    if (isUUID(id)) {
        const { data: p } = await supabase.from('partners').select('*').eq('id', id).maybeSingle();
        if (p) return {
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
            experience: p.experience,
            staffSkills: p.staff_skills,
            relevantProjects: p.relevant_projects,
            createdAt: p.created_at
        };
    }
    return await KV.get(`partner:${id}`);
};

export const upsertPartner = async (body: any) => {
    const supabase = getSupabaseClient();
    const dbPartner = {
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
        experience: body.experience,
        staff_skills: body.staffSkills,
        relevant_projects: body.relevantProjects
    };

    const { data, error } = await supabase.from('partners').upsert(dbPartner, { onConflict: 'name' }).select().single();
    if (error) throw error;
    return { ...body, id: data.id, createdAt: data.created_at };
};
