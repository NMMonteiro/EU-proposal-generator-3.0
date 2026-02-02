-- Fix foreign key constraint to allow deleting funding schemes
-- When a funding scheme is deleted, its layouts are cascadedly deleted.
-- This migration ensures that proposals referencing those layouts will have their layout_id set to NULL instead of blocking the deletion.

ALTER TABLE public.proposals
DROP CONSTRAINT IF EXISTS proposals_layout_id_fkey;

ALTER TABLE public.proposals
ADD CONSTRAINT proposals_layout_id_fkey 
FOREIGN KEY (layout_id) 
REFERENCES public.funding_scheme_layouts(id) 
ON DELETE SET NULL;
