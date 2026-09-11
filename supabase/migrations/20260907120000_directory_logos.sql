-- Per-entry logos for the two public reference directories.
--
-- The design (Figma 411:2458 associations, 411:2018 commercial) puts a 16×16
-- mark immediately left of every business name. Neither table had anywhere to
-- put one, so this adds the column plus the bucket the admin console uploads
-- into.
--
-- Storage shape follows `blog_posts.featured_image`: the column holds an
-- *object path* inside a public bucket, not a URL. The public pages are
-- anonymous, so a public bucket avoids a signing round-trip per row, and
-- keeping the path (rather than a baked URL) means the project URL can change
-- without a data migration.
--
-- Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
-- Nullable on purpose: staff will be entering directory rows long before they
-- have sourced 48 logos, and a missing mark must never block adding an entry.

ALTER TABLE public.resources_directory
  ADD COLUMN IF NOT EXISTS logo_path text;

ALTER TABLE public.associations_registries
  ADD COLUMN IF NOT EXISTS logo_path text;

COMMENT ON COLUMN public.resources_directory.logo_path IS
  'Object path inside the public directory-logos bucket. Absolute URLs are also accepted and passed through unchanged.';
COMMENT ON COLUMN public.associations_registries.logo_path IS
  'Object path inside the public directory-logos bucket. Absolute URLs are also accepted and passed through unchanged.';

-- ---------------------------------------------------------------------------
-- 2. Bucket
-- ---------------------------------------------------------------------------
-- 2 MB rather than the 5 MB used for stallion photos: these render at 16×16,
-- so anything approaching that ceiling is already a mistake.
--
-- SVG is deliberately excluded. An SVG is an executable document, and these
-- files are uploaded by staff and then served to anonymous visitors; raster
-- formats carry no script surface and are more than adequate at this size.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'directory-logos',
  'directory-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Re-assert the settings so a bucket created by an earlier partial run is
-- brought up to spec rather than left as-is by the ON CONFLICT above.
UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'directory-logos';

-- ---------------------------------------------------------------------------
-- 3. Storage policies
-- ---------------------------------------------------------------------------
-- Mirrors the blog-images policies. Public page reads go through the public
-- bucket endpoint and bypass RLS entirely; the SELECT policy exists so that an
-- admin can still list objects (replacing a logo needs to find the old one).

DROP POLICY IF EXISTS "directory_logos_authenticated_select" ON storage.objects;
CREATE POLICY "directory_logos_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'directory-logos' AND public.is_admin());

-- Path shape: directory/{commercial|associations}/{entry_id}/{filename}
DROP POLICY IF EXISTS "directory_logos_authenticated_insert" ON storage.objects;
CREATE POLICY "directory_logos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'directory-logos'
    AND name LIKE 'directory/%'
    AND name NOT LIKE '%..%'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "directory_logos_authenticated_update" ON storage.objects;
CREATE POLICY "directory_logos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'directory-logos' AND public.is_admin())
  WITH CHECK (
    bucket_id = 'directory-logos'
    AND name LIKE 'directory/%'
    AND name NOT LIKE '%..%'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "directory_logos_authenticated_delete" ON storage.objects;
CREATE POLICY "directory_logos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'directory-logos' AND public.is_admin());
