-- Add missing fields for mobility and ordering to relational tables
ALTER TABLE public.proposal_work_packages 
ADD COLUMN IF NOT EXISTS participants INTEGER,
ADD COLUMN IF NOT EXISTS activity_type TEXT,
ADD COLUMN IF NOT EXISTS destination_country TEXT,
ADD COLUMN IF NOT EXISTS is_mobility BOOLEAN DEFAULT false;

-- Ensure budget items have a way to be ordered if needed (though usually category is enough)
ALTER TABLE public.proposal_budget_items
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Ensure risks have an order index
ALTER TABLE public.proposal_risks
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
