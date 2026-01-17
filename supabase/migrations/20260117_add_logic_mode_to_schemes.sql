-- Add logic_mode to funding_schemes
ALTER TABLE public.funding_schemes 
ADD COLUMN IF NOT EXISTS logic_mode TEXT DEFAULT 'standard';

-- Create index for logic_mode
CREATE INDEX IF NOT EXISTS idx_funding_schemes_logic_mode ON public.funding_schemes(logic_mode);

-- Update existing default template to standard
UPDATE public.funding_schemes SET logic_mode = 'standard' WHERE logic_mode IS NULL;
