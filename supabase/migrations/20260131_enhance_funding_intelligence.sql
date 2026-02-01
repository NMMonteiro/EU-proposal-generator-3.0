-- Migration: Enhance Funding Schemes for Expert Intelligence
-- Date: 2026-01-31

-- Add expert fields to funding_schemes
ALTER TABLE public.funding_schemes 
ADD COLUMN IF NOT EXISTS expert_rules JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS budget_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS standardized_activities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB DEFAULT '{}'::jsonb;

-- Create table for successful proposal examples
CREATE TABLE IF NOT EXISTS public.proposal_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funding_scheme_id UUID REFERENCES public.funding_schemes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    full_content JSONB NOT NULL, -- The actual proposal data (sections, budget, etc.)
    metadata JSONB DEFAULT '{}'::jsonb, -- Approval year, score, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_proposal_examples_scheme_id ON public.proposal_examples(funding_scheme_id);

-- RLS for proposal_examples
ALTER TABLE public.proposal_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to examples" 
    ON public.proposal_examples
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated users to manage examples" 
    ON public.proposal_examples
    FOR ALL 
    USING (auth.role() = 'authenticated');

-- Comments
COMMENT ON COLUMN public.funding_schemes.expert_rules IS 'Rich text/markdown guidelines or specific AI prompt injections for expert results';
COMMENT ON COLUMN public.funding_schemes.budget_rules IS 'Formula definitions and rates (e.g., individual support per country category)';
COMMENT ON TABLE public.proposal_examples IS 'Library of successfully submitted and approved project proposals to serve as gold-standard examples for the AI.';
