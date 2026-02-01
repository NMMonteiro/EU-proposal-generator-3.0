-- Giant Table Seed Migration
-- Comprehensive population of all requested EU funding schemes

-- Ensure schema is correct
ALTER TABLE public.funding_schemes ADD COLUMN IF NOT EXISTS acronym TEXT;

INSERT INTO public.funding_schemes (
    id, name, acronym, description, logic_mode, 
    expert_rules, budget_rules, standardized_activities, 
    evaluation_criteria, template_json, is_active
) VALUES 
-- ERASMUS+ KA121 (Accredited Mobility)
(
    '00000000-0000-0000-0000-000000001210',
    'Erasmus+ KA121: Accredited Projects for Mobility',
    'KA121',
    'Mobility projects for organizations with an Erasmus accreditation. Streamlined funding.',
    'mobility',
    '[{"rule": "Accreditation Required", "guidance": "Only organizations with a valid Erasmus Accreditation can apply."}]'::jsonb,
    '{"type": "unit_costs"}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- ERASMUS+ KA122 Variants
(
    '00000000-0000-0000-0000-000000001221',
    'Erasmus+ KA122-SCH: Short-term Mobility for School Education',
    'KA122-SCH',
    'Mobility for pupils and staff in school education.',
    'mobility',
    '[{"rule": "4 Objectives", "guidance": "Mandatory 4 objectives for KA122-SCH."}]'::jsonb,
    '{"type": "unit_costs"}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000001222',
    'Erasmus+ KA122-VET: Short-term Mobility for Vocational Training',
    'KA122-VET',
    'Mobility for learners and staff in VET.',
    'mobility',
    '[]'::jsonb,
    '{"type": "unit_costs"}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000001223',
    'Erasmus+ KA122-ADU: Short-term Mobility for Adult Education',
    'KA122-ADU',
    'Mobility for adult learners and staff.',
    'mobility',
    '[]'::jsonb,
    '{"type": "unit_costs"}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- ERASMUS+ KA131
(
    '00000000-0000-0000-0000-000000001310',
    'Erasmus+ KA131: Higher Education Mobility',
    'KA131',
    'Mobility for higher education students and staff between program countries.',
    'mobility',
    '[]'::jsonb,
    '{"type": "unit_costs"}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- ERASMUS+ KA210 Variants
(
    '00000000-0000-0000-0000-000000002101',
    'Erasmus+ KA210-SCH: Small-scale Partnerships in School Education',
    'KA210-SCH',
    'Grassroots partnerships for schools.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [30000, 60000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000002102',
    'Erasmus+ KA210-ADU: Small-scale Partnerships in Adult Education',
    'KA210-ADU',
    'Grassroots partnerships for adult learning.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [30000, 60000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000002103',
    'Erasmus+ KA210-YOU: Small-scale Partnerships in Youth',
    'KA210-YOU',
    'Grassroots partnerships for youth work.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [30000, 60000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- ERASMUS+ KA220 Variants
(
    '00000000-0000-0000-0000-000000002201',
    'Erasmus+ KA220-SCH: Cooperation Partnerships in School Education',
    'KA220-SCH',
    'Large-scale cooperation projects for schools.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [120000, 250000, 400000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000002202',
    'Erasmus+ KA220-VET: Cooperation Partnerships in Vocational Training',
    'KA220-VET',
    'Large-scale cooperation projects for VET.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [120000, 250000, 400000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000002203',
    'Erasmus+ KA220-ADU: Cooperation Partnerships in Adult Education',
    'KA220-ADU',
    'Large-scale cooperation projects for adult learning.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [120000, 250000, 400000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
(
    '00000000-0000-0000-0000-000000002204',
    'Erasmus+ KA220-HED: Cooperation Partnerships in Higher Education',
    'KA220-HED',
    'Large-scale cooperation projects for universities.',
    'standard',
    '[]'::jsonb,
    '{"type": "lump_sum", "options": [120000, 250000, 400000]}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- DIGITAL EUROPE (AI Continent)
(
    '00000000-0000-0000-0000-010000000001',
    'Digital Europe: AI Continent (Advanced Skills)',
    'DIGITAL-AI-2026',
    'Supporting development of high-tech skills in AI across Europe.',
    'standard',
    '[]'::jsonb,
    '{"type": "co-financing", "funding_rate": 50}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- HORIZON EUROPE (Cluster 4)
(
    '00000000-0000-0000-0000-020000000001',
    'Horizon Europe: Cluster 4 Digital, Industry and Space',
    'HORIZON-CL4',
    'World-class research and innovation projects.',
    'standard',
    '[]'::jsonb,
    '{"type": "reimbursement", "rate": 100}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- MOVE 6th CfP
(
    '00000000-0000-0000-0000-030000000001',
    'MOVE Grants: 6th Call for Regional Cooperation',
    'MOVE-6',
    'Mobility grants for the Western Balkans.',
    'mobility',
    '[]'::jsonb,
    '{"type": "fixed_amount", "max_budget": 3000}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
),
-- CREATIVE EUROPE
(
    '00000000-0000-0000-0000-040000000001',
    'Creative Europe: NEWS Media Literacy',
    'CREA-NEWS-LIT',
    'Media literacy education projects.',
    'standard',
    '[]'::jsonb,
    '{"type": "grant", "funding_rate": 80}'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    '{"sections": []}'::jsonb,
    true
)
ON CONFLICT (name) DO UPDATE SET
    acronym = EXCLUDED.acronym,
    description = EXCLUDED.description,
    logic_mode = EXCLUDED.logic_mode,
    expert_rules = EXCLUDED.expert_rules,
    budget_rules = EXCLUDED.budget_rules,
    standardized_activities = EXCLUDED.standardized_activities,
    evaluation_criteria = EXCLUDED.evaluation_criteria,
    template_json = EXCLUDED.template_json,
    is_active = EXCLUDED.is_active;
