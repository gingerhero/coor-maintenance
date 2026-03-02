-- Create photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies
-- Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'photos');

-- Users can view photos (RLS on the photos table handles access control)
CREATE POLICY "Authenticated users can view photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos');

-- Only managers/admins can delete photos
CREATE POLICY "Managers and admins can delete photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.is_manager_or_admin()
  );
