-- Allow authenticated users (admin/dashboard) to read all stallion_images.
-- Keeps existing public policy (published stallions only) intact.

ALTER TABLE public.stallion_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stallion_images_authenticated_select_all
  ON public.stallion_images;

CREATE POLICY stallion_images_authenticated_select_all
  ON public.stallion_images
  FOR SELECT
  TO authenticated
  USING (true);
