-- Add description field to stallion research snippets.
-- Safe to rerun.

create table if not exists public.stallion_research_snippets (
  id uuid not null default gen_random_uuid (),
  stallion_id uuid not null,
  image_path text not null,
  ocr_text text null,
  extracted_summary text null,
  extracted_fields jsonb null,
  confidence numeric null,
  needs_review boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint stallion_research_snippets_pkey primary key (id),
  constraint fk_stallion foreign KEY (stallion_id) references stallions (id) on delete CASCADE
) TABLESPACE pg_default;

