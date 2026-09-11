-- Idempotent creation of stallion racing results & summary tables.

-- Ensure the shared updated_at trigger function exists.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- stallion_racing_results -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stallion_racing_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  race_name text NULL,
  race_date date NULL,
  year integer NULL,
  track text NULL,
  race_number integer NULL,
  distance text NULL,
  finish_position integer NULL,
  speed_index integer NULL,
  earnings numeric(12, 2) NULL,
  currency character(3) NULL DEFAULT 'USD'::bpchar,
  result_note text NULL,
  chart_url text NULL,
  video_url text NULL,
  admin_notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT stallion_racing_results_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_racing_results_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_racing_results_stallion_id
  ON public.stallion_racing_results USING btree (stallion_id) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_racing_results;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_racing_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- stallion_racing_summary -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stallion_racing_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stallion_id uuid NOT NULL,
  career_starts integer NULL,
  career_firsts integer NULL,
  career_seconds integer NULL,
  career_thirds integer NULL,
  career_earnings numeric(14, 2) NULL,
  highest_rating numeric(10, 2) NULL,
  earnings_per_start numeric(14, 2) NULL,
  source text NULL,
  admin_notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stallion_racing_summary_pkey PRIMARY KEY (id),
  CONSTRAINT stallion_racing_summary_stallion_id_key UNIQUE (stallion_id),
  CONSTRAINT stallion_racing_summary_stallion_id_fkey
    FOREIGN KEY (stallion_id) REFERENCES public.stallions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS set_updated_at ON public.stallion_racing_summary;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.stallion_racing_summary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
