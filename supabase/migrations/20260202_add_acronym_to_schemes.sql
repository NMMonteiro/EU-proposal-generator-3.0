-- Janitor Migration: Correcting Logic Modes
-- Ensures mobility schemes are not incorrectly labeled as "Work Package-Based"

-- 1. Force Mobility Mode for known mobility acronyms
UPDATE public.funding_schemes 
SET logic_mode = 'mobility' 
WHERE acronym ILIKE ANY (ARRAY['%KA122%', '%KA121%', '%KA131%', '%MOVE%', '%ESC-SOLID%'])
   OR name ILIKE ANY (ARRAY['%KA122%', '%KA121%', '%KA131%', '%MOVE%', '%ESC-SOLID%']);

-- 2. Force Standard Mode for partnership acronyms (just in case)
UPDATE public.funding_schemes 
SET logic_mode = 'standard' 
WHERE acronym ILIKE ANY (ARRAY['%KA210%', '%KA220%', '%CREA%', '%HORIZON%', '%DIGITAL%'])
   OR name ILIKE ANY (ARRAY['%KA210%', '%KA220%', '%CREA%', '%HORIZON%', '%DIGITAL%']);

-- 3. Final default check
UPDATE public.funding_schemes SET logic_mode = 'standard' WHERE logic_mode IS NULL;
