-- Ensure Racing exists as a discipline family for identity coverage + directory filters.

INSERT INTO public.discipline_families (name, display_order)
SELECT 'Racing', 70
WHERE NOT EXISTS (
  SELECT 1
  FROM public.discipline_families
  WHERE lower(btrim(name)) = 'racing'
);
