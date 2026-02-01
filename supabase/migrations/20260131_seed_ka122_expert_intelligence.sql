-- Seed File: expert logic for KA122-SCH
-- Date: 2026-01-31

UPDATE public.funding_schemes
SET 
    logic_mode = 'mobility',
    expert_rules = '[
        {
            "priority": 1,
            "topic": "Objectives",
            "guidance": "KA122-SCH requires exactly 4 objectives. They should focus on: 1. Linguistic & Pedagogical skills, 2. International Cooperation, 3. Inclusion & Diversity, 4. Professional Staff Development. Each objective must have Title, Explanation (addressing needs), and Measuring Success (how to evaluate)."
        },
        {
            "priority": 2,
            "topic": "Terminology",
            "guidance": "DO NOT use \"Work Packages\". Use \"Mobility Activities\" (e.g., Short-term learning mobility of pupils, Courses and training). Ensure the narrative refers to \"flows\" and \"host organisations\"."
        },
        {
            "priority": 3,
            "topic": "Budget Logic",
            "guidance": "Budget is calculated per person and per day. Standard categories: Organisational Support (€350/student, €100/staff), Individual Support (Daily rate based on country), Travel (€ based on distance), Course Fees (€80/day, max €800)."
        }
    ]'::jsonb,
    budget_rules = '{
        "currency": "EUR",
        "categories": [
            {"name": "Organisational Support", "rate": 350, "unit": "participant_student"},
            {"name": "Organisational Support Staff", "rate": 100, "unit": "participant_staff"},
            {"name": "Course Fees", "rate": 80, "unit": "day", "max": 800}
        ],
        "formulas": {
            "total_budget": "SUM(organisational_support, individual_support, travel, course_fees, inclusion_support)"
        }
    }'::jsonb,
    standardized_activities = '[
        "Short-term learning mobility of pupils",
        "Courses and training",
        "Job shadowing",
        "Teaching assignments",
        "Invited experts"
    ]'::jsonb
WHERE name ILIKE '%KA122-SCH%';

-- Insert the successful example into proposal_examples
INSERT INTO public.proposal_examples (funding_scheme_id, title, summary, full_content, metadata)
SELECT 
    id, 
    'Innovating Education through European Mobility Experiences (Milano Example)',
    'A successful short-term mobility project for a scientific/linguistic high school focusing on student mobility to Spain and teacher training in Finland.',
    '{
        "context": {
            "project_title": "Innovating Education through European Mobility Experiences",
            "duration_months": 18,
            "field": "School Education"
        },
        "objectives": [
            {
                "id": 1,
                "title": "Strengthening linguistic, intercultural and pedagogical competences",
                "explanation": "Addresses clinical needs for international dimension...",
                "measuring_success": "Questionnaires, observation, certificates."
            },
            {
                "id": 2,
                "title": "Strengthening international cooperation",
                "explanation": "Move from occasional to strategic cooperation...",
                "measuring_success": "New partnerships, European activities."
            },
            {
                "id": 3,
                "title": "Promoting inclusive education",
                "explanation": "Ensure equal access for fewer opportunities...",
                "measuring_success": "Fewer-opportunity student count, feedback."
            },
            {
                "id": 4,
                "title": "Enhancing teachers professional development (Finland)",
                "explanation": "Learn Finnish education model for key competences...",
                "measuring_success": "Implementation of new methodologies."
            }
        ],
        "activities": [
            {
                "type": "Short-term learning mobility of pupils",
                "destination": "Spain",
                "participants": 15,
                "duration_days": 10
            },
            {
                "type": "Courses and training",
                "destination": "Finland",
                "participants": 6,
                "duration_days": 10
            }
        ],
        "budget_total": 39269.00
    }'::jsonb,
    '{
        "year": 2026,
        "status": "approved",
        "score": 92
    }'::jsonb
FROM public.funding_schemes 
WHERE name ILIKE '%KA122-SCH%'
LIMIT 1;
