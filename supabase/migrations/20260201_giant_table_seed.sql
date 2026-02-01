-- Migration to populate the "Giant Table" of Funding Schemes
-- Based on extracted intelligence from the Global Library

-- 1. First, clear existing schemes that might conflict or be outdated (optional but good for clean seed)
-- DELETE FROM public.funding_schemes WHERE acronym IN ('KA121', 'KA122', 'KA131', 'KA210', 'KA220', 'CREA-CULT', 'DIGITAL-AI', 'HORIZON-CL4', 'INTERREG-AUR', 'ESC-SOLID', 'MOVE-6');

INSERT INTO public.funding_schemes (
    id, name, acronym, description, logic_mode, 
    expert_rules, budget_rules, standardized_activities, 
    evaluation_criteria, template_json
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'Erasmus+ Short-term Projects for Mobility (KA122)',
    'KA122',
    'Small-scale mobility projects for organizations in School Education, VET, and Adult Education. Ideal for newcomers.',
    'mobility',
    '[
        {"rule": "No Work Packages", "description": "This scheme uses Mobility Flows and Activities, not Work Packages."},
        {"rule": "Max 30 mobilities", "description": "Number of participants usually capped for short-term projects (usually around 30)."},
        {"rule": "4 Objectives Mandatory", "description": "Must define exactly 4 distinct, SMART objectives aligned with European priorities (Inclusion, Digital, Green, Participation)."},
        {"rule": "Host Selection", "description": "Host organizations must be relevant to the learning outcomes of the participants."}
    ]'::jsonb,
    '{
        "type": "unit_costs",
        "categories": ["Travel", "Individual Support", "Organizational Support", "Inclusion Support", "Preparatory Visits"],
        "max_grant": 60000
    }'::jsonb,
    '[
        {"name": "Job Shadowing", "description": "Staff observing colleagues in a host organization abroad."},
        {"name": "Teaching Assignments", "description": "Staff delivering teaching or training at a host school."},
        {"name": "Courses and Training", "description": "Staff attending professional development courses."},
        {"name": "Group Mobility of Pupils", "description": "Group of pupils traveling with teachers for a collective learning experience."}
    ]'::jsonb,
    '{
        "relevance": 30,
        "quality_design": 40,
        "quality_team": 30
    }'::jsonb,
    '{
        "sections": [
            {"id": "context", "label": "Context", "questions": ["What is the field of application?", "What is the language of application?"]},
            {"id": "objectives", "label": "Project Objectives", "questions": ["Define your 4 project objectives.", "How do they align with Erasmsus+ priorities?"]},
            {"id": "activities", "label": "Activities", "questions": ["Describe the mobility activities.", "How many participants?", "Target group?"]},
            {"id": "impact", "label": "Impact and Follow-up", "questions": ["What is the impact on participants?", "What is the impact on the organization?"]}
        ]
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000002',
    'Erasmus+ Small-scale Partnerships (KA210)',
    'KA210',
    'Simplified cooperation partnerships for grassroots organizations and newcomers. Fixed lump sums.',
    'standard',
    '[
        {"rule": "Lump Sum Model", "description": "Project budget is a fixed lump sum of €30,000 or €60,000."},
        {"rule": "Simplified Reporting", "description": "Focused on results and activities rather than financial invoices."},
        {"rule": "Minimum 2 Partners", "description": "Requires at least two organizations from two different Program Countries."}
    ]'::jsonb,
    '{
        "type": "lump_sum",
        "options": [30000, 60000]
    }'::jsonb,
    '[
        {"name": "Transnational Project Meetings", "description": "Meetings for coordination and management."},
        {"name": "Local Training Activities", "description": "Training events for local staff/learners."},
        {"name": "Product Development", "description": "Creation of small-scale tools or resources."}
    ]'::jsonb,
    '{
        "relevance": 30,
        "quality_design": 30,
        "quality_team": 20,
        "impact": 20
    }'::jsonb,
    '{
        "sections": [
            {"id": "relevance", "label": "Relevance", "questions": ["How does the project address the priorities?"]},
            {"id": "work_packages", "label": "Work Packages", "questions": ["Define WP1: Management", "Define WP2: Project Activities"]}
        ]
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000003',
    'MOVE Grants - 6th Call (Western Balkans)',
    'MOVE-6',
    'Dedicated grant-making mechanism to support individual mobility, exchange, and people-to-people cooperation in Western Balkans.',
    'mobility',
    '[
        {"rule": "Max Grant €3,000", "description": "The maximum grant per application is €3,000."},
        {"rule": "100% Funding", "description": "WBF supports up to 100% of the total eligible costs."},
        {"rule": "WB6 Focus", "description": "Activities must take place within the Western Balkans region (Albania, Bosnia, Kosovo, Montenegro, North Macedonia, Serbia)."}
    ]'::jsonb,
    '{
        "type": "actual_costs",
        "max_grant": 3000,
        "funding_rate": 100
    }'::jsonb,
    '[
        {"name": "Academic Exchange", "description": "Scholars and students traveling for research or study."},
        {"name": "Cultural Exchange", "description": "Artists and cultural professionals performing or collaborating across borders."},
        {"name": "Professional Mobility", "description": "Joint activities for civil society activists and journalists."}
    ]'::jsonb,
    '{
        "relevance": 40,
        "regional_impact": 40,
        "feasibility": 20
    }'::jsonb,
    '{
        "sections": [
            {"id": "summary", "label": "Summary of Mobility", "questions": ["What is the goal of the exchange?"]},
            {"id": "host", "label": "Host Information", "questions": ["Who is the host organization in the WB region?"]},
            {"id": "budget", "label": "Budget Breakdown", "questions": ["Describe the travel and subsistence costs."]}
        ]
    }'::jsonb
),
(
    '00000000-0000-0000-0000-000000000004',
    'Creative Europe - NEWS Media Literacy',
    'CREA-CROSS-NEWS',
    'Supporting the development of media literacy across borders for a more resilient society.',
    'standard',
    '[
        {"rule": "Cross-sectoral approach", "description": "Projects should involve media organizations and literacy experts."},
        {"rule": "Transnational innovation", "description": "Must demonstrate high innovation in tackling fake news and disinformation."}
    ]'::jsonb,
    '{
        "type": "co-financing",
        "funding_rate": 80
    }'::jsonb,
    '[
        {"name": "Training Modules", "description": "Designing curricula for media literacy."},
        {"name": "Awareness Campaigns", "description": "Regional or European-wide campaigns."}
    ]'::jsonb,
    '{
        "relevance": 30,
        "quality_content": 30,
        "project_management": 20,
        "dissemination": 20
    }'::jsonb,
    '{
        "sections": [
            {"id": "relevance", "label": "Relevance and European Added Value", "questions": ["How does this scale across borders?"]},
            {"id": "activities", "label": "Description of Activities", "questions": ["List your Work Packages and Deliverables."]}
        ]
    }'::jsonb
);

-- Note: More schemes (KA220, Digital Europe, etc.) will be added in subsequent batches if needed.
-- But these cover the most diverse set (Mobility vs Standard, EU vs Regional).
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    acronym = EXCLUDED.acronym,
    description = EXCLUDED.description,
    logic_mode = EXCLUDED.logic_mode,
    expert_rules = EXCLUDED.expert_rules,
    budget_rules = EXCLUDED.budget_rules,
    standardized_activities = EXCLUDED.standardized_activities,
    evaluation_criteria = EXCLUDED.evaluation_criteria,
    template_json = EXCLUDED.template_json;
