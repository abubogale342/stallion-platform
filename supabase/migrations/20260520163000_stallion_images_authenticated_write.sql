-- Admin write access for stallion_images (draft + published listings).
-- SELECT policy already exists in 20260517120000.

DROP POLICY IF EXISTS stallion_images_authenticated_all ON public.stallion_images;
CREATE POLICY stallion_images_authenticated_all
  ON public.stallion_images
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stallion_images TO authenticated, service_role;
