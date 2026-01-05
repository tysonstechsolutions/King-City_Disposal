-- ============================================
-- KING CITY DISPOSAL - STORAGE BUCKET SETUP
-- ============================================
--
-- Run this in Supabase SQL Editor to create
-- the "documents" storage bucket.
--
-- ============================================

-- ============================================
-- CREATE DOCUMENTS STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE POLICIES FOR DOCUMENTS BUCKET
-- ============================================

-- Policy: Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy: Allow authenticated users to read documents
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Allow authenticated users to update documents
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Allow service role full access (for API routes)
CREATE POLICY "Allow service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');

-- ============================================
-- DONE!
-- ============================================
-- The "documents" bucket is now ready.
-- Files can be uploaded via the API at:
-- POST /api/documents/upload
-- ============================================
