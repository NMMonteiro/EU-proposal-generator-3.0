import { getSupabaseClient } from './supabase_client.ts';
import { isUUID } from './utils.ts';

export const saveToSupabase = async (proposal: any) => {
    try {
        const supabase = getSupabaseClient();
        const pid = proposal.id;

        // 1. Basic Metadata
        const dbProposal: any = {
            title: proposal.title || 'Untitled Proposal',
            summary: proposal.summary,
            project_url: proposal.projectUrl || proposal.project_url,
            selected_idea: proposal.selectedIdea,
            settings: proposal.settings || {},
            generated_at: proposal.generatedAt,
            saved_at: proposal.savedAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            funding_scheme_id: proposal.funding_scheme_id,
            dynamic_sections: proposal.dynamic_sections || proposal.dynamicSections || {},
            work_packages: proposal.workPackages || proposal.work_packages || [],
            budget: proposal.budget || [],
            risks: proposal.risks || [],
            partners: proposal.partners || []
        };

        let layoutId = proposal.layout_id;
        if (!layoutId && proposal.funding_scheme_id) {
            const { data: layouts } = await supabase
                .from('funding_scheme_layouts')
                .select('id')
                .eq('funding_scheme_id', proposal.funding_scheme_id)
                .eq('is_default', true)
                .limit(1);
            if (layouts && layouts.length > 0) {
                layoutId = layouts[0].id;
            }
        }

        const { error: propError } = await supabase
            .from('proposals')
            .upsert({ ...dbProposal, id: pid, layout_id: layoutId }, { onConflict: 'id' });

        if (propError) console.warn('Proposals table upsert failed:', propError.message);

        // 2. Relational Narrative Sections
        const dynamicSections = proposal.dynamic_sections || proposal.dynamicSections || {};
        const sectionsToInsert = Object.entries(dynamicSections).map(([key, val]) => ({
            proposal_id: pid,
            section_key: key,
            content: val as string,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }));

        if (proposal.summary) {
            sectionsToInsert.push({
                proposal_id: pid,
                section_key: 'summary',
                content: proposal.summary,
                label: 'Executive Summary'
            });
        }

        if (sectionsToInsert.length > 0) {
            await supabase.from('proposal_sections').upsert(sectionsToInsert, { onConflict: 'proposal_id,section_key' });
        }

        // 3. Relational Partners
        const partners = proposal.partners || [];
        const partnersToInsert = [];

        // Always delete existing links to allow for empty consortiums or full replacements
        await supabase.from('proposal_partners').delete().eq('proposal_id', pid);

        if (partners.length > 0) {
            const { upsertPartner } = await import('./partner_service.ts');

            for (const [idx, p] of partners.entries()) {
                let partnerId = (p.id && isUUID(p.id)) ? p.id : null;

                // Ensure partner exists in global table (Source of Truth)
                if (!partnerId && p.name) {
                    try {
                        const globalPartner = await upsertPartner(p);
                        partnerId = globalPartner.id;
                    } catch (e: any) {
                        console.warn(`[WARN] Could not promote partner ${p.name} to global table:`, e.message);
                    }
                }

                partnersToInsert.push({
                    proposal_id: pid,
                    partner_id: partnerId,
                    name: p.name,
                    role: p.role || 'Partner',
                    is_coordinator: !!p.isCoordinator || !!p.is_coordinator,
                    description: p.description,
                    order_index: idx
                });
            }

            if (partnersToInsert.length > 0) {
                const { error: partErr } = await supabase.from('proposal_partners').insert(partnersToInsert);
                if (partErr) console.error('Error inserting proposal partners:', partErr.message);
            }
        }

        // 4. Relational Work Packages
        const wps = proposal.workPackages || proposal.work_packages || [];
        if (wps.length > 0) {
            const wpsToInsert = wps.map((wp: any, idx: number) => ({
                proposal_id: pid,
                name: wp.name || `Work Package ${idx + 1}`,
                description: wp.description,
                duration: wp.duration || wp.timeline,
                order_index: idx,
                activities: wp.activities || []
            }));
            await supabase.from('proposal_work_packages').delete().eq('proposal_id', pid);
            await supabase.from('proposal_work_packages').insert(wpsToInsert);
        }

        console.log(`✅ Relational Sync Successful for Proposal: ${pid}`);
    } catch (err: any) {
        console.error('❌ Supabase Relational Sync Error:', err.message);
    }
};

export const loadFullProposal = async (id: string) => {
    const supabase = getSupabaseClient();

    // Deep query to get EVERYTHING in one go
    const { data: dbProp, error: dbError } = isUUID(id)
        ? await supabase.from('proposals').select(`
            *,
            sections:proposal_sections(*),
            rel_partners:proposal_partners(
                *,
                profile:partners(*)
            ),
            rel_work_packages:proposal_work_packages(*),
            rel_budget:proposal_budget_items(*),
            rel_risks:proposal_risks(*),
            rel_annexes:proposal_annexes(*),
            fundingScheme:funding_schemes(
                *,
                layouts:funding_scheme_layouts(*)
            )
        `).eq('id', id).single()
        : { data: null, error: null };

    if (!dbProp) {
        // Fallback to KV
        const kvKey = id.startsWith('proposal-') ? id : `proposal-${id}`;
        const { get: getKV } = await import('./kv_store.ts');
        const kvData = await getKV(kvKey);
        if (kvData) return kvData;
        return null;
    }

    // Reconstruct the proposal object with hydration
    const dynamic_sections: any = {};
    dbProp.sections?.forEach((s: any) => {
        dynamic_sections[s.section_key] = s.content;
    });

    const hydratedPartners = dbProp.rel_partners?.map((p: any) => {
        const profile = p.profile || {};
        return {
            ...profile, // Preserve raw fields for fallback
            id: p.partner_id || p.id,
            name: p.name || profile.name,
            role: p.role || 'Partner',
            isCoordinator: !!p.is_coordinator,
            description: p.description || profile.description,
            // Explicit camelCase mapping for frontend & DOCX tool
            legalNameNational: profile.legal_name_national || profile.name,
            organisationId: profile.organisation_id || profile.pic || profile.oid,
            acronym: profile.acronym,
            pic: profile.pic,
            vatNumber: profile.vat_number,
            businessId: profile.business_id,
            organizationType: profile.organization_type,
            isPublicBody: !!profile.is_public_body,
            isNonProfit: !!profile.is_non_profit,
            country: profile.country,
            legalAddress: profile.legal_address,
            city: profile.city,
            postcode: profile.postcode,
            region: profile.region,
            contactEmail: profile.contact_email,
            website: profile.website,
            legalRepName: profile.legal_rep_name,
            legalRepPosition: profile.legal_rep_position,
            legalRepEmail: profile.legal_rep_email,
            legalRepPhone: profile.legal_rep_phone,
            contactPersonName: profile.contact_person_name,
            contactPersonPosition: profile.contact_person_position,
            contactPersonEmail: profile.contact_person_email,
            contactPersonPhone: profile.contact_person_phone,
            contactPersonRole: profile.contact_person_role,
            experience: profile.experience,
            staffSkills: profile.staff_skills,
            relevantProjects: profile.relevant_projects,
            logoUrl: profile.logo_url
        };
    });

    const fundingScheme = dbProp.fundingScheme;
    const layout = fundingScheme?.layouts?.find((l: any) => l.is_default) || fundingScheme?.layouts?.[0];

    return {
        ...dbProp,
        selectedIdea: dbProp.selected_idea,
        projectUrl: dbProp.project_url,
        generatedAt: dbProp.generated_at,
        savedAt: dbProp.saved_at,
        dynamic_sections,
        dynamicSections: dynamic_sections,
        partners: hydratedPartners || dbProp.partners,
        workPackages: dbProp.rel_work_packages?.map((w: any) => ({
            name: w.name,
            description: w.description,
            duration: w.duration,
            activities: w.activities
        })) || dbProp.work_packages,
        budget: dbProp.rel_budget?.map((b: any) => ({
            item: b.item_category,
            category: b.item_category,
            description: b.description,
            cost: b.cost,
            breakdown: b.breakdown
        })) || dbProp.budget,
        risks: dbProp.rel_risks?.map((r: any) => ({
            risk: r.risk_title,
            likelihood: r.likelihood,
            impact: r.impact,
            mitigation: r.mitigation_strategy
        })) || dbProp.risks,
        annexes: dbProp.rel_annexes?.map((a: any) => ({
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
        })) || [],
        fundingScheme,
        layout,
        layout_id: layout?.id || dbProp.layout_id
    };
};

export const rebalanceBudget = (proposal: any, targetBudget: number) => {
    if (!proposal.budget || !Array.isArray(proposal.budget) || proposal.budget.length === 0) return;

    // 1. Proportional scaling for main budget items
    let currentTotal = proposal.budget.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);

    if (currentTotal > 0 && Math.abs(currentTotal - targetBudget) > 1) {
        const scaleFactor = targetBudget / currentTotal;
        let runningTotal = 0;

        proposal.budget.forEach((item: any, idx: number) => {
            if (idx === proposal.budget.length - 1) {
                item.cost = targetBudget - runningTotal;
            } else {
                item.cost = Math.round((Number(item.cost) || 0) * scaleFactor);
                runningTotal += item.cost;
            }
        });
    }

    // 2. Ensure internal consistency
    proposal.budget.forEach((item: any) => {
        const itemTarget = Number(item.cost) || 0;

        if (item.partnerAllocations && Array.isArray(item.partnerAllocations) && item.partnerAllocations.length > 0) {
            const paTotal = item.partnerAllocations.reduce((sum: number, pa: any) => sum + (Number(pa.amount) || 0), 0);
            if (paTotal !== itemTarget) {
                const sortedPA = [...item.partnerAllocations].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
                if (sortedPA[0]) sortedPA[0].amount = (Number(sortedPA[0].amount) || 0) + (itemTarget - paTotal);
            }
        }

        if (item.breakdown && Array.isArray(item.breakdown) && item.breakdown.length > 0) {
            const bdTotal = item.breakdown.reduce((sum: number, bd: any) => sum + (Number(bd.total) || 0), 0);
            if (bdTotal !== itemTarget) {
                const sortedBD = [...item.breakdown].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
                if (sortedBD[0]) sortedBD[0].total = (Number(sortedBD[0].total) || 0) + (itemTarget - bdTotal);
            }
        }
    });
};
