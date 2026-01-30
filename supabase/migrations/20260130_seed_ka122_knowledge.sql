-- Add KA122-SCH Best Practices to Global Knowledge base
DELETE FROM public.global_knowledge WHERE source_name = 'Erasmus+ KA122-SCH Example Intelligence';

INSERT INTO public.global_knowledge (source_name, content, metadata)
VALUES (
    'Erasmus+ KA122-SCH Example Intelligence',
    'Short-term projects for mobility of learners and staff in school education (KA122-SCH) do not require work packages. Instead, they use Mobility Activities. Key objectives include strengthening linguistic, intercultural and pedagogical competences, international cooperation, and promoting inclusion. Typical activities involve student mobility (e.g., 15 pupils to Spain for 10 days) and staff courses (e.g., in Finland). Budget covers Organisational Support, Individual Support, Travel, and specific rates for Course Fees and Inclusion.',
    '{
        "type": "best_practice",
        "keywords": ["Erasmus+", "KA122", "KA122-SCH", "Mobility", "School Education", "Short-term"],
        "source_id": "KA122-SCH-25B623B6"
    }'::jsonb
);
