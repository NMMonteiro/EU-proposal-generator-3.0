-- Migration: Add Innovate UK (National Scheme)
-- Date: 2026-01-31

INSERT INTO public.funding_schemes (name, description, logic_mode, expert_rules, budget_rules, template_json, is_active, is_default)
VALUES 
(
    'Innovate UK Smart Grants', 
    'UK national funding for game-changing, R&D innovations. Open to any sector. Focus on significant commercial potential and technical risk.',
    'standard',
    '[
        {"topic": "Innovation", "guidance": "Must be truly disruptive. Incremental improvements are not sufficient. Explain the clear jump from existing state-of-the-art."},
        {"topic": "Commercialization", "guidance": "Specific target market size, penetration strategy, and return on investment for the UK economy."},
        {"topic": "Technical Risk", "guidance": "High technical risk is expected. Explain why the project is difficult and why public funding is required."}
    ]'::jsonb,
    '{
        "type": "percentage",
        "funding_rate": 0.7,
        "max_grant": 2000000,
        "categories": ["Labor", "Overheads", "Materials", "Subcontractors", "Travel"]
    }'::jsonb,
    '{
        "sections": [
            {"key": "innovation", "label": "The Innovation", "description": "Challenge and revolutionary nature."},
            {"key": "market", "label": "Market Opportunity", "description": "Commercial strategy and ROI."},
            {"key": "risk", "label": "Project Management & Risk", "description": "How you will manage technical and financial risks."}
        ]
    }'::jsonb,
    true,
    false
);
