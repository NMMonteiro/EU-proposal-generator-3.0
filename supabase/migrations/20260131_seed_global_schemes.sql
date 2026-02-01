-- Migration: Seed Global Funding Schemes (Horizon & CERV)
-- Date: 2026-01-31

INSERT INTO public.funding_schemes (name, description, logic_mode, expert_rules, budget_rules, template_json, is_active, is_default)
VALUES 
(
    'Horizon Europe Cluster 4', 
    'Digital, Industry and Space. Focuses on climate-neutral production, strategic autonomy in value chains, and human-centred ethical development of digital technologies.',
    'standard',
    '[
        {"topic": "Excellence", "guidance": "Focus on ground-breaking innovation. Methodology must be sound and include Open Science practices and gender dimension in research content."},
        {"topic": "Impact", "guidance": "Credible pathways to achieve technical and societal outcomes. Scale and significance of contribution are key. Scale of dissemination should be international."},
        {"topic": "Implementation", "guidance": "Work plan must be effective with clear risk assessment. Consortium must bring together diverse multi-disciplinary expertise."}
    ]'::jsonb,
    '{
        "type": "standard",
        "default_currency": "EUR",
        "categories": ["Personnel", "Subcontracting", "Purchase costs", "Indirect costs (25% overhead)"]
    }'::jsonb,
    '{
        "sections": [
            {"key": "excellence", "label": "Excellence", "description": "Objectives, methodology, and ambition."},
            {"key": "impact", "label": "Impact", "description": "Project’s pathways towards impact."},
            {"key": "implementation", "label": "Quality and efficiency of the implementation", "description": "Work plan, resources, and participants."}
        ]
    }'::jsonb,
    true,
    false
),
(
    'CERV - Citizens, Equality, Rights and Values',
    'Supports civil society organizations to promote EU values, non-discrimination, and citizen participation. Includes Daphne strand for combating violence.',
    'standard',
    '[
        {"topic": "Relevance", "guidance": "Alignment with EU rights and values. Clear identification of target group needs (marginalized groups, children, etc.)."},
        {"topic": "Quality", "desc": "Methodology should be inclusive. Collaboration with local stakeholders is highly valued."},
        {"topic": "Impact", "guidance": "Sustainability of the project after funding ends. Multiplier effect at local or national level."}
    ]'::jsonb,
    '{
        "type": "lumpsum",
        "co_financing_rate": 0.9,
        "categories": ["Staff costs", "Travel and subsistence", "Equipment", "Other costs"]
    }'::jsonb,
    '{
        "sections": [
            {"key": "relevance", "label": "Relevance", "description": "Priorities and objectives of the call."},
            {"key": "quality", "label": "Quality", "description": "Project design and implementation."},
            {"key": "impact", "label": "Impact", "description": "Expected results and sustainability."}
        ]
    }'::jsonb,
    true,
    false
);
