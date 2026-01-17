-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('funding-scheme-logos', 'funding-scheme-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for public access
CREATE POLICY IF NOT EXISTS "Public Access for Logo Uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'funding-scheme-logos');

CREATE POLICY IF NOT EXISTS "Public Access for Logo Reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'funding-scheme-logos');

CREATE POLICY IF NOT EXISTS "Public Access for Logo Updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'funding-scheme-logos');

CREATE POLICY IF NOT EXISTS "Public Access for Logo Deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'funding-scheme-logos');
