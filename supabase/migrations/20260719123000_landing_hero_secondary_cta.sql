-- Milestone 14: add a "Mare Directory" secondary CTA to the landing hero block.
-- Surgical jsonb patch: only adds the key where a landing_hero block lacks it,
-- preserving any admin-edited content. The renderer treats secondaryCta as optional.

UPDATE public.cms_pages
SET
  blocks = (
    SELECT jsonb_agg(
      CASE
        WHEN b ->> 'type' = 'landing_hero' AND NOT (b ? 'secondaryCta') THEN
          b || jsonb_build_object(
            'secondaryCta',
            jsonb_build_object(
              'label',
              jsonb_build_object(
                'en', 'Mare Directory',
                'pt-BR', 'Diretório de Éguas'
              ),
              'href', '/mares'
            )
          )
        ELSE b
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(blocks) WITH ORDINALITY AS t(b, ord)
  ),
  updated_at = now()
WHERE slug = 'landing'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(blocks) AS eb(b)
    WHERE eb.b ->> 'type' = 'landing_hero'
  );
