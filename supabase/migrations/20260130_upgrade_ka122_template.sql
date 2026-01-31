-- Upgrade KA122-SCH Template with Multi-Objective Support
UPDATE public.funding_schemes
SET template_json = '{
    "schemaVersion": "1.1",
    "logicMode": "mobility",
    "maxBudget": "60000",
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
            "key": "objective_1",
            "label": "Objective 1",
            "type": "textarea",
            "mandatory": true,
            "order": 3,
            "description": "Title: What do you want to achieve? Explanation: Needs and challenges. Measuring success: KPIs. Topics: Relevant Erasmus themes."
        },
        {
            "key": "objective_2",
            "label": "Objective 2",
            "type": "textarea",
            "mandatory": true,
            "order": 4,
            "description": "Title: What do you want to achieve? Explanation: Needs and challenges. Measuring success: KPIs. Topics: Relevant Erasmus themes."
        },
        {
            "key": "objective_3",
            "label": "Objective 3",
            "type": "textarea",
            "mandatory": true,
            "order": 5,
            "description": "Title: What do you want to achieve? Explanation: Needs and challenges. Measuring success: KPIs. Topics: Relevant Erasmus themes."
        },
        {
            "key": "objective_4",
            "label": "Objective 4",
            "type": "textarea",
            "mandatory": true,
            "order": 6,
            "description": "Title: What do you want to achieve? Explanation: Needs and challenges. Measuring success: KPIs. Topics: Relevant Erasmus themes."
        },
        {
            "key": "activities_narrative",
            "label": "Activities Strategy",
            "type": "textarea",
            "mandatory": true,
            "order": 7,
            "description": "Detailed narrative about the types of mobilities requested and how they meet objectives."
        },
        {
            "key": "management",
            "label": "Quality Standards & Management",
            "type": "textarea",
            "mandatory": true,
            "order": 8,
            "description": "How will you manage the project and ensure Erasmus quality standards?"
        },
        {
            "key": "follow_up",
            "label": "Follow-up",
            "type": "textarea",
            "mandatory": true,
            "order": 9,
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
WHERE name = 'Erasmus+ KA122-SCH';
