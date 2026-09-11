-- =============================================================================
-- Blog CMS — public articles per locale + admin-managed content.
--
-- Shape note: translations live one row per locale rather than in a
-- jsonb-per-locale blob (the shape cms_pages uses). Two requirements force it:
--
--   1. Each locale publishes independently, and row-level security cannot hide
--      part of a row. One blob holding every locale would hand an anonymous
--      REST caller the still-draft translations of any post that is live in
--      another language.
--   2. Adding a language must be content/translation work only. So `locale` is
--      free-form text (format-checked, never enumerated) and nothing in this
--      migration — no type, column, constraint or policy — names a specific
--      language.
--
-- The slug is shared across locales: /en/blog/<slug> and /pt-BR/blog/<slug>
-- address the same post.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  -- Storage object path in the `blog-images` bucket. Shared across locales.
  featured_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  -- Lowercase kebab-case only, so the UNIQUE constraint above cannot be
  -- defeated by case variants and the value is always URL-safe.
  CONSTRAINT blog_posts_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON COLUMN public.blog_posts.slug IS
  'Shared across locales; generated from the English title, editable by admins.';
COMMENT ON COLUMN public.blog_posts.featured_image IS
  'Object path inside the public blog-images bucket; shared across locales.';

CREATE TABLE IF NOT EXISTS public.blog_post_translations (
  post_id uuid NOT NULL
    REFERENCES public.blog_posts (id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL,
  excerpt text,
  -- BlockNote document: a JSON array of blocks. Stored as structured blocks
  -- rather than HTML so rendering can only ever emit known block types —
  -- sanitisation is structural instead of a library we would have to keep
  -- trusting.
  body jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT blog_post_translations_body_is_array_chk
    CHECK (jsonb_typeof(body) = 'array'),
  status text NOT NULL DEFAULT 'draft',
  -- Null until this locale is first published, then stamped by trigger.
  -- Deliberately per-locale: a translation that goes live in November should
  -- not advertise the English publication date of August.
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, locale),
  CONSTRAINT blog_post_translations_status_chk
    CHECK (status IN ('draft', 'published')),
  -- Format check only. Enumerating locales here would make adding Italian a
  -- schema migration, which the brief explicitly rules out.
  CONSTRAINT blog_post_translations_locale_format_chk
    CHECK (locale ~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})?$'),
  CONSTRAINT blog_post_translations_title_present_chk
    CHECK (btrim(title) <> '')
);

COMMENT ON TABLE public.blog_post_translations IS
  'One row per locale per post. Absence of a row means the post does not exist '
  'in that language; there is no fallback to another locale.';

-- Feed query: published posts for one locale, newest first.
CREATE INDEX IF NOT EXISTS blog_post_translations_locale_feed_idx
  ON public.blog_post_translations (locale, status, published_at DESC);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_blog_post_translations_updated_at
  ON public.blog_post_translations;
CREATE TRIGGER set_blog_post_translations_updated_at
  BEFORE UPDATE ON public.blog_post_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Stamp the publication date the first time a locale goes live, in the
-- database rather than the client so it holds however the row is written.
-- Unpublishing keeps the date, so re-publishing does not silently move a
-- post to the top of the feed; admins can still edit it by hand.
CREATE OR REPLACE FUNCTION public.blog_translation_stamp_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_post_translations_stamp_published_at
  ON public.blog_post_translations;
CREATE TRIGGER blog_post_translations_stamp_published_at
  BEFORE INSERT OR UPDATE ON public.blog_post_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.blog_translation_stamp_published_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;

-- A post row is visible anonymously only once at least one of its locales is
-- published; otherwise an unpublished post would leak its slug. The EXISTS
-- runs under the anon policy on the translations table, so it can only match
-- rows that are themselves public.
DROP POLICY IF EXISTS blog_posts_anon_read ON public.blog_posts;
CREATE POLICY blog_posts_anon_read
  ON public.blog_posts FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.blog_post_translations t
      WHERE t.post_id = public.blog_posts.id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS blog_posts_auth_select ON public.blog_posts;
CREATE POLICY blog_posts_auth_select
  ON public.blog_posts FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.blog_post_translations t
      WHERE t.post_id = public.blog_posts.id
        AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS blog_posts_auth_insert ON public.blog_posts;
CREATE POLICY blog_posts_auth_insert
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS blog_posts_auth_update ON public.blog_posts;
CREATE POLICY blog_posts_auth_update
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS blog_posts_auth_delete ON public.blog_posts;
CREATE POLICY blog_posts_auth_delete
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.is_admin());

-- The requirement that carries the security weight: a locale's content is
-- unreadable until that locale itself is published. No fallback, no leak.
DROP POLICY IF EXISTS blog_post_translations_anon_read
  ON public.blog_post_translations;
CREATE POLICY blog_post_translations_anon_read
  ON public.blog_post_translations FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS blog_post_translations_auth_select
  ON public.blog_post_translations;
CREATE POLICY blog_post_translations_auth_select
  ON public.blog_post_translations FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS blog_post_translations_auth_insert
  ON public.blog_post_translations;
CREATE POLICY blog_post_translations_auth_insert
  ON public.blog_post_translations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS blog_post_translations_auth_update
  ON public.blog_post_translations;
CREATE POLICY blog_post_translations_auth_update
  ON public.blog_post_translations FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS blog_post_translations_auth_delete
  ON public.blog_post_translations;
CREATE POLICY blog_post_translations_auth_delete
  ON public.blog_post_translations FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (PostgREST needs table privileges on top of the policies above)
-- ---------------------------------------------------------------------------

GRANT SELECT ON TABLE public.blog_posts TO anon;
GRANT SELECT ON TABLE public.blog_post_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.blog_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.blog_post_translations TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: featured images
--
-- Public bucket, like stallion-photos-public: featured images appear on
-- unauthenticated pages, so a stable CDN-cacheable URL beats a signed one.
-- Unlike that bucket these are uploaded straight from the admin browser
-- client, so authenticated write policies are required.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5 MB, matches the stallion photo buckets
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = true
WHERE id = 'blog-images';

-- Listing is what orphan cleanup relies on. Public page reads go through the
-- public bucket endpoint and bypass RLS, so without this policy `list()`
-- returns nothing to an admin and cleanup silently becomes a no-op.
DROP POLICY IF EXISTS "blog_images_authenticated_select" ON storage.objects;
CREATE POLICY "blog_images_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'blog-images' AND public.is_admin());

-- Path shape: blog/{post_id}/{filename}
DROP POLICY IF EXISTS "blog_images_authenticated_insert" ON storage.objects;
CREATE POLICY "blog_images_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND name LIKE 'blog/%'
    AND name NOT LIKE '%..%'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "blog_images_authenticated_update" ON storage.objects;
CREATE POLICY "blog_images_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.is_admin())
  WITH CHECK (
    bucket_id = 'blog-images'
    AND name LIKE 'blog/%'
    AND name NOT LIKE '%..%'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "blog_images_authenticated_delete" ON storage.objects;
CREATE POLICY "blog_images_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.is_admin());
