-- Seed KA122-SCH (Short-term mobility for schools)
INSERT INTO public.funding_schemes (name, description, logic_mode, is_default, template_json)
VALUES (
    'Erasmus+ KA122-SCH',
    'Short-term projects for mobility of learners and staff in school education. Accessible entry point for small-scale international activities.',
    'mobility',
    false,
    '{
        "schemaVersion": "1.0",
        "logicMode": "mobility",
        "sections": [
            {
                "key": "context",
                "label": "Context",
                "type": "textarea",
                "mandatory": true,
                "order": 1,
                "description": "General information about the project and applicant organization."
            },
            {
                "key": "background",
                "label": "Background",
                "type": "textarea",
                "mandatory": true,
                "order": 2,
                "description": "Who are you as an organization? Your experience and motivation."
            },
            {
                "key": "objectives",
                "label": "Project Objectives",
                "type": "textarea",
                "mandatory": true,
                "order": 3,
                "description": "What do you want to achieve with the mobilities?"
            },
            {
                "key": "activities_narrative",
                "label": "Activities Strategy",
                "type": "textarea",
                "mandatory": true,
                "order": 4,
                "description": "Detailed narrative about the types of mobilities requested and how they meet objectives."
            },
            {
                "key": "quality_standards",
                "label": "Quality Standards & Management",
                "type": "textarea",
                "mandatory": true,
                "order": 5,
                "description": "How will you manage the project and ensure Erasmus quality standards?"
            },
            {
                "key": "follow_up",
                "label": "Follow-up",
                "type": "textarea",
                "mandatory": true,
                "order": 6,
                "description": "Impact, dissemination of results, and future sustainability."
            }
        ],
        "mobilityRules": {
            "categories": ["Staff", "Learners", "Other"],
            "unitCosts": {
                "organizational_support": 100,
                "course_fee_per_day": 80,
                "inclusion_support_base": 125
            },
            "activityTypes": [
                {"key": "job_shadowing", "label": "Job Shadowing", "category": "Staff", "minDays": 2, "maxDays": 60},
                {"key": "teaching_assignments", "label": "Teaching Assignments", "category": "Staff", "minDays": 2, "maxDays": 365},
                {"key": "courses_training", "label": "Courses and Training", "category": "Staff", "minDays": 2, "maxDays": 10},
                {"key": "group_pupils", "label": "Group Mobility of Pupils", "category": "Learners", "minDays": 2, "maxDays": 30},
                {"key": "short_individual_pupils", "label": "Short-term Individual Mobility", "category": "Learners", "minDays": 10, "maxDays": 29},
                {"key": "long_individual_pupils", "label": "Long-term Individual Mobility", "category": "Learners", "minDays": 30, "maxDays": 365}
            ]
        }
    }'::jsonb
) ON CONFLICT (name) DO UPDATE SET 
    logic_mode = EXCLUDED.logic_mode,
    template_json = EXCLUDED.template_json;
