-- Admin dashboard reporting aggregates (single RPC for /dashboard overview).

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stallion_counts AS (
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE publish_status = 'published'::public.publish_status_type)::bigint AS published,
      COUNT(*) FILTER (WHERE publish_status = 'draft'::public.publish_status_type)::bigint AS draft
    FROM public.stallions
  ),
  research_count AS (
    SELECT COUNT(*)::bigint AS cnt FROM public.stallion_research_snippets
  ),
  image_counts AS (
    SELECT COUNT(DISTINCT stallion_id)::bigint AS with_image
    FROM public.stallion_images
    WHERE filename IS NOT NULL
      AND btrim(filename) <> ''
  ),
  genetic_counts AS (
    SELECT COUNT(DISTINCT s.id)::bigint AS with_results
    FROM public.stallions s
    WHERE EXISTS (
      SELECT 1
      FROM public.stallion_genetic_tests gt
      WHERE gt.stallion_id = s.id
    )
    OR NULLIF(btrim(COALESCE(s.genetic_testing_results, '')), '') IS NOT NULL
    OR NULLIF(btrim(COALESCE(s.genetic_disease_testing_results, '')), '') IS NOT NULL
  ),
  by_country AS (
    SELECT
      COALESCE(NULLIF(btrim(s.country_of_residence), ''), 'Unknown') AS label,
      COUNT(*)::bigint AS count
    FROM public.stallions s
    GROUP BY 1
    ORDER BY count DESC, label ASC
  ),
  by_discipline AS (
    SELECT
      df.name AS label,
      COUNT(DISTINCT sd.stallion_id)::bigint AS count
    FROM public.stallion_disciplines sd
    INNER JOIN public.discipline_families df ON df.id = sd.family_id
    GROUP BY df.name
    ORDER BY count DESC, label ASC
  ),
  country_discipline AS (
    SELECT
      COALESCE(NULLIF(btrim(s.country_of_residence), ''), 'Unknown') AS country,
      df.name AS discipline,
      COUNT(DISTINCT s.id)::bigint AS count
    FROM public.stallions s
    INNER JOIN public.stallion_disciplines sd ON sd.stallion_id = s.id
    INNER JOIN public.discipline_families df ON df.id = sd.family_id
    GROUP BY 1, 2
    ORDER BY count DESC, country ASC, discipline ASC
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'stallions', sc.total
    ),
    'byPublishStatus', jsonb_build_object(
      'published', sc.published,
      'draft', sc.draft
    ),
    'review', jsonb_build_object(
      'stallionResearches', rc.cnt
    ),
    'byCountry', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('label', bc.label, 'count', bc.count)) FROM by_country bc),
      '[]'::jsonb
    ),
    'byDiscipline', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('label', bd.label, 'count', bd.count)) FROM by_discipline bd),
      '[]'::jsonb
    ),
    'countryDiscipline', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('country', cd.country, 'discipline', cd.discipline, 'count', cd.count)
        )
        FROM country_discipline cd
      ),
      '[]'::jsonb
    ),
    'photos', jsonb_build_object(
      'withImage', ic.with_image,
      'withoutImage', GREATEST(sc.total - ic.with_image, 0)
    ),
    'geneticTesting', jsonb_build_object(
      'withResults', gc.with_results,
      'withoutResults', GREATEST(sc.total - gc.with_results, 0)
    ),
    'generatedAt', to_jsonb(now() AT TIME ZONE 'utc')
  )
  FROM stallion_counts sc
  CROSS JOIN research_count rc
  CROSS JOIN image_counts ic
  CROSS JOIN genetic_counts gc;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
