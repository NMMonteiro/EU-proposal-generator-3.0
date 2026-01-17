-- Create annexes table for proposal attachments
-- Supports multiple file types and metadata

CREATE TABLE IF NOT EXISTS public.proposal_annexes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    
    -- File Information
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx', 'image', etc.
    file_size INTEGER, -- Size in bytes
    
    -- Categorization
    category TEXT, -- 'technical', 'financial', 'legal', 'supporting', 'other'
    annex_number INTEGER, -- For ordering: Annex 1, Annex 2, etc.
    
    -- Metadata
    is_mandatory BOOLEAN DEFAULT false, -- Required by funding scheme
    is_template BOOLEAN DEFAULT false, -- Is this a template to be filled?
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User association
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_annexes_proposal_id ON public.proposal_annexes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_annexes_category ON public.proposal_annexes(category);
CREATE INDEX IF NOT EXISTS idx_proposal_annexes_annex_number ON public.proposal_annexes(annex_number);

-- Enable Row Level Security
ALTER TABLE public.proposal_annexes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from proposal access)
CREATE POLICY "Users can read annexes of their proposals"
    ON public.proposal_annexes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_annexes.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert annexes to their proposals"
    ON public.proposal_annexes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_annexes.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update annexes of their proposals"
    ON public.proposal_annexes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_annexes.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete annexes of their proposals"
    ON public.proposal_annexes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.proposals
            WHERE proposals.id = proposal_annexes.proposal_id
            AND proposals.user_id = auth.uid()
        )
    );

-- Update timestamp trigger
CREATE TRIGGER update_proposal_annexes_updated_at 
    BEFORE UPDATE ON public.proposal_annexes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.proposal_annexes IS 'Stores file attachments (annexes) for proposals';
COMMENT ON COLUMN public.proposal_annexes.category IS 'Categorization: technical, financial, legal, supporting, other';
COMMENT ON COLUMN public.proposal_annexes.annex_number IS 'Display order in proposal (Annex 1, Annex 2, etc.)';
