import { FullProposal } from '../types/proposal';

export interface DisplaySection {
    id: string;
    title: string;
    content?: string;
    description?: string;
    type?: string;
    level: number;
    wpIdx?: number;
    isCustom?: boolean;
    isDivider?: boolean;
    charLimit?: number;
    order?: number;
}

const normalize = (s: string) => (s || "").toLowerCase().replace(/[\W_]/g, '');

/**
 * EXTREME WP Index extraction.
 */
function extractWPIndex(text: string): number | undefined {
    if (!text) return undefined;
    // Handle ALL variations: "work_package_2", "WP_2", "Work package-3", "WorkPlan1", etc.
    const match = text.match(/\b(?:Work|WP|WorkPlan)[\s_-]*(?:Packages?|Plan)?[\s_-]*(?:n°|no\.?|#|number)?[\s_-]*(\d+)\b/i);
    if (match) return parseInt(match[1]) - 1;
    return undefined;
}

/**
 * PURE Sanitizer: Removes nulls, underscores, and ALL WP PREFIXES.
 * Returns a totally clean title (e.g. "Project Management").
 */
function cleanTitle(title: string): string {
    if (!title) return '';
    // 1. Basic string cleanup
    let t = title.replace(/undefined/gi, '').replace(/\(?\s*null\s*\)?/gi, '').replace(/-\s*null/gi, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*-\s*$/, '');

    // 2. EXTREME Regex for prefixes like "WP1:", "WP 1:", "Work Package 1 -", "work_package_1", etc.
    const wpPrefixRegex = /^(?:WP|Work[\s_-]*Packages?|Work[\s_-]*Plan)[\s_-]*(?:n°|no\.?|#|number)?[\s_-]*\d+\s*[:\.-]*/i;

    // Strip recursively to handle "WP1: WP1: ..."
    let safety = 0;
    while (wpPrefixRegex.test(t) && safety < 5) {
        t = t.replace(wpPrefixRegex, '').trim();
        safety++;
    }

    if (!t && title) {
        // If stripping the prefix leaves nothing (e.g. title was just "WP1"), 
        // return the cleaned original title instead of an empty string
        return title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
    }
    return t ? t.replace(/^\w/, (c) => c.toUpperCase()) : '';
}

/**
 * Standardized Naming: Always format as "WPX: Title" or "Activity X: Title"
 */
function formatWPTitle(idx: number, rawTitle: string, isMobility = false): string {
    const clean = cleanTitle(rawTitle);
    const prefix = isMobility ? `Activity ${idx + 1}` : `WP${idx + 1}`;
    if (!clean || ['activities', 'loading', 'activity'].includes(clean.toLowerCase())) {
        return prefix;
    }
    return `${prefix}: ${clean}`;
}

/**
 * Assembles a structured document with ABSOLUTE Sequential Lockdown and NO DUPLICATION.
 */
export function assembleDocument(proposal: FullProposal, forcedLogicMode?: 'standard' | 'mobility' | 'lumpsum' | string): DisplaySection[] {
    const layout = proposal.layout?.sequence || [];
    const fundingScheme = proposal.fundingScheme || (proposal as any).funding_scheme;
    const dynamicSections = proposal.dynamicSections || (proposal as any).dynamic_sections || {};
    const workPackages = proposal.workPackages || (proposal as any).work_packages || [];

    const sectionPool = new Map<string, DisplaySection>();
    const wpIdxToPoolKey = new Map<number, string>();
    const normTitleToPoolKey = new Map<string, string>();

    // Support dual source for logic_mode: Proposal object (persistence) or Funding Scheme (template)
    const schemeName = (fundingScheme?.name || (proposal as any).funding_scheme?.name || '').toUpperCase();
    const isMobilityImplicit = !!(proposal.mobilityMetadata?.fieldOfApplication ||
        proposal.mobilityMetadata?.nationalAgency ||
        schemeName.includes('KA122') ||
        schemeName.includes('KA121') ||
        schemeName.includes('MOBILITY') ||
        (workPackages && workPackages.some((wp: any) => wp.activityType || (wp as any).participants)));

    const logicMode = forcedLogicMode || proposal.logic_mode || (isMobilityImplicit ? 'mobility' : (fundingScheme?.logic_mode || 'standard'));
    const isMobilityMode = logicMode === 'mobility';

    const MASTER_ORDER: Record<string, number> = {
        'summary': 0, 'abstract': 0, 'projectsummary': 0,
        'context': 100,
        'relevance': 200,
        'projectdescription': 300,
        'needsanalysis': 400,
        'impact': 500,
        'design': 600, 'implementation': 600, 'projectdesignandimplementation': 600,
        'partnershiparrangements': 700, 'partnershipandcooperation': 700,
        'workpackagesoverview': 1000, 'activitiesoverview': 1000, 'wplist': 1000, 'listofworkpackages': 1000,
        'milestones': 1050,
        'timeline': 1060,
        'budget': 3000,
        'risks': 4000,
        'declaration': 9000,
        'annexes': 9500,
        'checklist': 9900, 'otherdocuments': 9910
    };

    const getPriority = (key: string, title?: string): number => {
        const nk = normalize(key);
        const nt = normalize(title || "");
        const wpNum = extractWPIndex(key) ?? extractWPIndex(title || '');
        if (wpNum !== undefined) return 1101 + wpNum;
        if (MASTER_ORDER[nk]) return MASTER_ORDER[nk];
        if (MASTER_ORDER[nt]) return MASTER_ORDER[nt];
        for (const [mk, mv] of Object.entries(MASTER_ORDER)) {
            if (nk.includes(mk) || nt.includes(mk)) return mv;
        }
        return 5000;
    };

    // 1. Process Template Skeleton
    if (fundingScheme?.template_json?.sections) {
        const process = (sections: any[], level = 1) => {
            sections.forEach((s, sIdx) => {
                const nl = normalize(s.label);
                const bk = s.key || nl;
                const wpIdx = extractWPIndex(bk) ?? extractWPIndex(s.label);

                if (wpIdx !== undefined && wpIdxToPoolKey.has(wpIdx)) {
                    if (s.subsections) process(s.subsections, level + 1);
                    return;
                }

                const pk = `t_${level}_${sIdx}_${bk}`;
                const isWPHeader = wpIdx !== undefined && (nl.includes('workpackage') || nl.includes('wp n'));

                if (isWPHeader && !wpIdxToPoolKey.has(wpIdx!)) wpIdxToPoolKey.set(wpIdx!, pk);
                normTitleToPoolKey.set(nl, pk);

                sectionPool.set(pk, {
                    id: pk,
                    title: isWPHeader ? formatWPTitle(wpIdx!, s.label, isMobilityMode) : (cleanTitle(s.label) || s.label),
                    description: s.description,
                    level: (isWPHeader || MASTER_ORDER[nl]) ? 1 : level,
                    wpIdx: wpIdx,
                    type: isWPHeader ? 'work_package' : (wpIdx !== undefined ? 'wp_item' : s.type),
                    order: getPriority(bk, s.label) + (sIdx * 0.001)
                });

                if (s.subsections && s.subsections.length > 0) process(s.subsections, level + 1);
            });
        };
        process(fundingScheme.template_json.sections);
    }

    // 2. Build Anchors
    [0, 1, 2, 3, 4].forEach(idx => {
        if (!wpIdxToPoolKey.has(idx)) {
            const id = `extra_wp_${idx}`;
            sectionPool.set(id, {
                id, title: isMobilityMode ? `Activity ${idx + 1}` : `WP${idx + 1}`, level: 1, wpIdx: idx, type: 'work_package',
                order: 1101 + idx
            });
            wpIdxToPoolKey.set(idx, id);
        }
    });

    // 3. UNIVERSAL MERGE: Merge ANY available string property from proposal or dynamicSections
    const allContentSource: Record<string, string> = { ...dynamicSections };

    // Scan dynamic sections first
    Object.entries(dynamicSections).forEach(([k, v]) => {
        if (v && typeof v === 'string' && v.length > 5) allContentSource[k] = v;
    });

    // Scan top-level proposal fields for any non-null strings (excluding internal keys)
    const excludeKeys = ['id', 'title', 'summary', 'fundingSchemeId', 'layoutId', 'projectUrl', 'generatedAt', 'savedAt', 'updatedAt', 'generationPrompt'];
    Object.entries(proposal).forEach(([k, v]) => {
        if (!excludeKeys.includes(k) && v && typeof v === 'string' && v.length > 5) {
            allContentSource[k] = v;
        }
    });

    Object.entries(allContentSource).forEach(([key, val]) => {
        const nk = normalize(key);
        // Skip keys that are handled by structured tables
        // 'summary' is tricky: we want to skip the top-level 'summary' field if it's identical to what we already processed,
        // but we DON'T want to skip 'project_summary' which might be the main content.
        if (['budget', 'partners', 'risks', 'layout', 'settings', 'workpackages', 'work_packages'].some(x => nk.includes(x))) return;
        // Only skip EXACT 'summary' to avoid skipping 'project_summary'
        if (nk === 'summary' && key === 'summary') return;

        const wpIdx = extractWPIndex(key);
        let target = wpIdx !== undefined ? wpIdxToPoolKey.get(wpIdx) : normTitleToPoolKey.get(nk);

        if (!target) {
            // Fuzzy match search
            for (const [pK, pV] of sectionPool.entries()) {
                const pn = normalize(pV.title);
                const kn = normalize(pK);

                if (kn.includes(nk) || nk.includes(kn) || pn.includes(nk) || nk.includes(pn)) {
                    target = pK;
                    break;
                }

                // Special mapping for Erasmus+ specific common patterns
                if (nk === 'objectives' && pn.includes('objective')) { target = pK; break; }
                if (nk === 'relevance' && pn.includes('needsanalysis')) { target = pK; break; }
                if (nk === 'activities' && pn.includes('activity')) { target = pK; break; }
                if (nk === 'quality' && pn.includes('qualitystandards')) { target = pK; break; }
            }
        }

        if (target) {
            const s = sectionPool.get(target)!;
            // Only update if current content is shorter or empty
            if (!s.content || val.length > s.content.length) {
                s.content = val;
            } else if (!s.content.toLowerCase().includes(val.substring(0, 20).toLowerCase())) {
                s.content += "\n\n" + val;
            }
        } else {
            // Only if it doesn't look like internal data
            if (key.length > 3 && !key.startsWith('_')) {
                sectionPool.set(`custom_${key}`, {
                    id: `custom_${key}`,
                    title: wpIdx !== undefined ? formatWPTitle(wpIdx, key, isMobilityMode) : (cleanTitle(key) || key),
                    content: val, level: 1, wpIdx: wpIdx, order: getPriority(key)
                });
            }
        }
    });

    // 3.5 Fallback for organization/background sections from partner data
    const coord = (proposal.partners || []).find(p => p.isCoordinator || (p as any).is_coordinator);
    if (coord) {
        for (const [pk, s] of sectionPool.entries()) {
            const nl = normalize(s.title);
            const isBackground = nl === 'background' || nl === 'organisationalbackground' || nl.includes('backgroundandexperience') || nl.includes('organisationprofiles');
            // If it's a background section and still empty, populate it
            if (isBackground && (!s.content || s.content.length < 50)) {
                const bgParts = [
                    coord.description || (coord as any).background,
                    coord.experience || (coord as any).organisation_experience
                ].filter(Boolean);

                if (bgParts.length > 0) {
                    s.content = bgParts.join("\n\n");
                    console.log(`Populated empty background section "${s.title}" from Coordinator data`);
                }
            }
        }
    }

    // 4. Final DB Sync (The Hammer of Cleanliness)
    workPackages.forEach((wp: any, idx: number) => {
        const key = wpIdxToPoolKey.get(idx);
        if (key) {
            const s = sectionPool.get(key)!;
            // Always overwrite with DB name if it's more descriptive, but format it carefully
            const dbNameClean = wp.name ? cleanTitle(wp.name) : "";
            if (dbNameClean) {
                // Remove ANY WP style prefixes before applying standardized naming
                const pureName = dbNameClean.replace(/^(?:WP|Work[\s_-]*Packages?|Work[\s_-]*Plan)[\s_-]*\d+\s*[:\.-]*/i, '').trim();
                s.title = formatWPTitle(idx, pureName || dbNameClean, isMobilityMode);
            }
            if (wp.description && (!s.content || wp.description.length > s.content.length)) {
                s.content = wp.description;
            }
            s.type = 'work_package';
        }
    });

    // 5. Structural Anchors & Heavy Summary Enforcement
    const ensureHeader = (id: string, searchTitle: string, type: string) => {
        let found = '';
        const nt = normalize(searchTitle);
        for (const [pK, pV] of sectionPool.entries()) {
            const pn = normalize(pV.title);
            if (pn.includes(nt) || nt.includes(pn)) { found = pK; break; }
        }
        if (found) {
            const s = sectionPool.get(found)!;
            s.type = type; s.level = 1; s.order = MASTER_ORDER[nt] || s.order;
            return found;
        } else {
            sectionPool.set(id, { id, title: searchTitle, level: 1, type, order: MASTER_ORDER[nt] || 5000 });
            return id;
        }
    };

    if (proposal.partners?.length > 0) { ensureHeader('pm', 'Participating Organisations', 'partners'); ensureHeader('pp', 'Organisation Profiles', 'partner_profiles'); }
    if ((proposal.budget || []).length > 0) ensureHeader('bm', isMobilityMode ? 'Financial Plan' : 'Budget', 'budget');
    if ((proposal.risks || []).length > 0) ensureHeader('rm', 'Risk Analysis', 'risk');
    if ((proposal.milestones || []).length > 0) ensureHeader('msm', 'Project Milestones', 'milestones');
    if ((proposal.timeline || []).length > 0) ensureHeader('tlm', 'Project Timeline', 'timeline');

    // HEAVY SUMMARY ENFORCEMENT (De-duplication & Consolidation)
    // 1. Get the best available summary content
    const bestSummary = dynamicSections['project_summary'] || dynamicSections['summary'] || proposal.summary || (proposal as any).abstract;

    // 2. Scan pool for ANY existing summary-like sections
    const sumPatterns = ['projectsummary', 'executivesummary', 'summary', 'abstract'];
    const summaryKeysFound: string[] = [];

    for (const [pk, s] of sectionPool.entries()) {
        const nt = normalize(s.title);
        const pkNorm = normalize(pk);
        if (sumPatterns.some(p => nt.includes(p) || pkNorm.includes(p))) {
            summaryKeysFound.push(pk);
        }
    }

    // 3. Consolidate into the best key (prefer template 't_' > 'summary' > 'custom_')
    let primaryKey = summaryKeysFound.find(k => k.startsWith('t_')) ||
        summaryKeysFound.find(k => k === 'summary') ||
        summaryKeysFound[0];

    if (bestSummary) {
        if (!primaryKey) {
            // Create fallback if none found at all
            primaryKey = 'summary';
            sectionPool.set(primaryKey, { id: 'summary', title: 'Executive Summary', level: 1, order: 0 });
        }

        const mainSection = sectionPool.get(primaryKey)!;

        // Ensure ID is normalized for DOCX filtering
        mainSection.id = 'summary';
        mainSection.content = bestSummary;
        mainSection.order = 0;

        // If the title was generic, make it nice
        if (normalize(mainSection.title) === 'summary') {
            mainSection.title = 'Executive Summary';
        }

        // REMOVE all other duplicate summary-like sections from the pool
        summaryKeysFound.forEach(k => {
            if (k !== primaryKey) {
                sectionPool.delete(k);
            }
        });

        // Finalize primary section in the pool with normalized ID
        sectionPool.delete(primaryKey);
        sectionPool.set('summary', mainSection);
    }

    // 6. Injection
    let items = Array.from(sectionPool.values()).sort((a, b) => (a.order ?? 5000) - (b.order ?? 5000));
    const hasOverview = items.some(s => { const n = normalize(s.title); return n.includes('workpackagesoverview') || n.includes('wplist') || n.includes('listofworkpackages'); });

    if (!hasOverview) {
        const firstWPIdx = items.findIndex(s => s.wpIdx !== undefined && s.type === 'work_package');
        if (firstWPIdx !== -1) items.splice(firstWPIdx, 0, { id: 'wp_list_final', title: isMobilityMode ? 'Activities Overview' : 'Work packages overview', level: 1, type: 'wp_list', order: 1000 });
    } else {
        const ov = items.find(s => { const n = normalize(s.title); return n.includes('workpackagesoverview') || n.includes('wplist') || n.includes('listofworkpackages') || n.includes('activitiesoverview'); });
        if (ov) ov.type = 'wp_list';
    }

    return items.filter(s => {
        const type = s.type || '';
        // Always show structured data sections
        if (['wp_list', 'partners', 'budget', 'risk', 'work_package', 'partner_profiles'].includes(type)) return true;

        // Show all level 1 and level 2 sections (headers) even if empty
        if (s.level <= 2) return true;

        // For others, only show if they have real content
        return !!(s.content && s.content.trim().length > 10);
    });
}
