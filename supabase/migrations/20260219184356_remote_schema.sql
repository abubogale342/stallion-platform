SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

DO $$ BEGIN
  CREATE TYPE "public"."breed_type" AS ENUM ('QH', 'Paint', 'Appaloosa');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."semen_availability_type" AS ENUM ('Chilled', 'Frozen', 'Both', 'None');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."owners" (
    "id" text NOT NULL,
    "owner_name" text NOT NULL,
    "first_name" text,
    "last_name" text,
    "email" text,
    "phone" text,
    "country" text,
    "address_line_1" text,
    "address_line_2" text,
    "suburb" text,
    "state_region" text,
    "postal_code" text,
    "full_address" text,
    "publish_status" text,
    "farm_ranch" text,
    "farm_ranch_website" text,
    "facebook" text,
    "instagram" text,
    "owner_photo_url" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "founding_profile" text,
    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."stallions" (
    "id" text NOT NULL,
    "stallion_name" text NOT NULL,
    "slug" text,
    "breed" public.breed_type,
    "country_of_residence" text,
    "semen_availability" public.semen_availability_type DEFAULT 'None'::public.semen_availability_type NOT NULL,
    "live_cover_available" boolean DEFAULT false NOT NULL,
    "disciplines" text[],
    "stud_fee" numeric,
    "stud_fee_currency" text,
    "summary" text,
    "breeding_notes" text,
    "date_of_birth" date,
    "height" text,
    "registry" text,
    "registration_number" text,
    "country_of_registration" text,
    "registration_status" text,
    "publish_status" text,
    "featured" boolean DEFAULT false,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "parentage" text,
    "breeding_manager" text,
    "total_reported_earnings" numeric,
    "stallion_status" text,
    "breeding_guarantees" text,
    "genetic_testing_results" text,
    "colour_testing_results" text,
    "coat_colour" text,
    "genetic_disease_testing_results" text,
    "sire" text,
    "sires_grandsire" text,
    "sires_granddam" text,
    "dam" text,
    "dams_grandsire" text,
    "dams_granddam" text,
    "rego_papers_urls" text[],
    "sire_grandsire" text,
    "sire_granddam" text,
    "dam_grandsire" text,
    "dam_granddam" text,
    "genetic_test_results_summary" text,
    "coat_pattern" text,
    "coat_genetic_notes" text,
    "stallion_owners_text" text,
    CONSTRAINT "stallions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stallions_slug_key" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "public"."stallion_breeding_stats" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "stallion_id" text NOT NULL,
    "season_year" text NOT NULL,
    "mares_covered" integer,
    "foals_born" integer,
    "sort_order" integer,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "stallion_breeding_stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "breeding_stats_unique" UNIQUE ("stallion_id", "season_year")
);

CREATE TABLE IF NOT EXISTS "public"."stallion_foal_crops" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "stallion_id" text NOT NULL,
    "foal_crop_year" integer NOT NULL,
    "number_of_foals" integer,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "stallion_foal_crops_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "foal_crop_unique" UNIQUE ("stallion_id", "foal_crop_year")
);

CREATE TABLE IF NOT EXISTS "public"."stallion_images" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "stallion_id" text NOT NULL,
    "kind" text NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    "url" text NOT NULL,
    "filename" text,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "stallion_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stallion_images_unique_slot" UNIQUE ("stallion_id", "kind", "position"),
    CONSTRAINT "stallion_images_unique_url" UNIQUE ("stallion_id", "url")
);

CREATE TABLE IF NOT EXISTS "public"."stallion_owners" (
    "stallion_id" text NOT NULL,
    "owner_id" text NOT NULL,
    "role" text DEFAULT 'Owner'::text,
    "is_primary" boolean DEFAULT false,
    "sort_order" integer,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT "stallion_owners_pkey" PRIMARY KEY ("stallion_id", "owner_id")
);

CREATE TABLE IF NOT EXISTS "public"."stallion_performance_records" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "stallion_id" text NOT NULL,
    "achievement" text NOT NULL,
    "year" integer,
    "discipline" text,
    "level" text,
    "association_event" text,
    "reference" text,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "stallion_performance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."stallion_progeny" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "stallion_id" text NOT NULL,
    "progeny_name" text NOT NULL,
    "discipline" text,
    "achievement" text,
    "year" integer,
    "total_earnings" numeric,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT "stallion_progeny_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."stg_owners" (
    "Owner Record ID" text,
    "Owner Display Name" text,
    "Owner/s Name" text,
    "First Name" text,
    "Last Name" text,
    "Email" text,
    "Phone" text,
    "Country" text,
    "Address Line 1" text,
    "Address Line 2" text,
    "Suburb" text,
    "State / Region" text,
    "Postal Code" text,
    "Full Address" text,
    "Publish status" text,
    "Farm / Ranch" text,
    "Farm / Ranch Website" text,
    "Facebook" text,
    "Instagram" text,
    "Owner Photo" text,
    "Stallions" text,
    "Breed Manager" text,
    "Primary Photo (from Stallions)" text,
    "Stallion HTML" text,
    "Stallion Owners" text,
    "Founding profile" text
);

CREATE TABLE IF NOT EXISTS "public"."stg_stallion_owners" (
    "Stallion ID" text,
    "Owner Record ID" text,
    "Is Primary" text,
    "Role" text,
    "Sort Order" text
);

CREATE TABLE IF NOT EXISTS "public"."stg_stallions" (
    "Stallion ID" text,
    "Stallion Name" text,
    "Slug" text,
    "Breed Code" text,
    "Country of Residence" text,
    "Semen Avail (export to Supabase)" text,
    "Live Cover Available" text,
    "Disciplines" text,
    "Stud fee" text,
    "Stud Fee Currency" text,
    "Summary" text,
    "Breeding notes" text,
    "Date of Birth" text,
    "Height" text,
    "Registry" text,
    "Registration Number" text,
    "Country of Registration" text,
    "Registration Status" text,
    "Publish status" text,
    "Featured" text,
    "Parentage" text,
    "Breeding Manager" text,
    "Total Reported Earnings" text,
    "Stallion status" text,
    "Breeding Guarantees" text,
    "Genetic testing results" text,
    "Colour testing results" text,
    "Coat colour" text,
    "Dam + Sire" text,
    "Stallion Status" text,
    "Genetic Testing Results" text,
    "Colour Testing Results" text,
    "Genetic Disease Testing Results" text,
    "Coat Colour" text,
    "Sire" text,
    "Dam" text,
    "Sires Grandsire" text,
    "Sires Granddam" text,
    "Dams Grandsire" text,
    "Dams Granddam" text,
    "Genetic Test Results Summary" text,
    "Coat Pattern" text,
    "Additional coat, pattern or genetic notes" text,
    "Sire - Grandsire" text,
    "Sire - Granddam" text,
    "Dam - Grandsire" text,
    "Dam - Granddam" text,
    "Stallion Owners" text
);

CREATE OR REPLACE VIEW "public"."v_stallion_primary_owner" AS
SELECT s.id AS stallion_id,
       s.stallion_name,
       o.owner_name AS primary_owner_name
FROM public.stallions s
LEFT JOIN public.stallion_owners so ON so.stallion_id = s.id AND so.is_primary = true
LEFT JOIN public.owners o ON o.id = so.owner_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_breeding_stats_stallion_id_fkey'
      AND conrelid = 'public.stallion_breeding_stats'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_breeding_stats"
      ADD CONSTRAINT "stallion_breeding_stats_stallion_id_fkey"
      FOREIGN KEY ("stallion_id") REFERENCES "public"."stallions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_foal_crops_stallion_id_fkey'
      AND conrelid = 'public.stallion_foal_crops'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_foal_crops"
      ADD CONSTRAINT "stallion_foal_crops_stallion_id_fkey"
      FOREIGN KEY ("stallion_id") REFERENCES "public"."stallions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_images_stallion_id_fkey'
      AND conrelid = 'public.stallion_images'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_images"
      ADD CONSTRAINT "stallion_images_stallion_id_fkey"
      FOREIGN KEY ("stallion_id") REFERENCES "public"."stallions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_owners_owner_id_fkey'
      AND conrelid = 'public.stallion_owners'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_owners"
      ADD CONSTRAINT "stallion_owners_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_owners_stallion_id_fkey'
      AND conrelid = 'public.stallion_owners'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_owners"
      ADD CONSTRAINT "stallion_owners_stallion_id_fkey"
      FOREIGN KEY ("stallion_id") REFERENCES "public"."stallions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_performance_records_stallion_id_fkey'
      AND conrelid = 'public.stallion_performance_records'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_performance_records"
      ADD CONSTRAINT "stallion_performance_records_stallion_id_fkey"
      FOREIGN KEY ("stallion_id") REFERENCES "public"."stallions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stallion_progeny_stallion_id_fkey'
      AND conrelid = 'public.stallion_progeny'::regclass
  ) THEN
ALTER TABLE ONLY "public"."stallion_progeny"
      ADD CONSTRAINT "stallion_progeny_stallion_id_fkey"
      FOREIGN KEY ("stallion_id") REFERENCES "public"."stallions"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "owners_email_unique" ON "public"."owners" USING btree (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS "owners_owner_name_trgm_idx" ON "public"."owners" USING gin ("owner_name" "public"."gin_trgm_ops");
CREATE UNIQUE INDEX IF NOT EXISTS "perf_unique_idx" ON "public"."stallion_performance_records" USING btree ("stallion_id", "achievement", COALESCE("year", -1), COALESCE("discipline", ''), COALESCE("level", ''), COALESCE("association_event", ''));
CREATE UNIQUE INDEX IF NOT EXISTS "progeny_unique_idx" ON "public"."stallion_progeny" USING btree ("stallion_id", "progeny_name", COALESCE("year", -1), COALESCE("achievement", ''));
CREATE UNIQUE INDEX IF NOT EXISTS "stallion_one_primary_owner" ON "public"."stallion_owners" USING btree ("stallion_id") WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS "stallion_owners_owner_idx" ON "public"."stallion_owners" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "stallion_owners_stallion_idx" ON "public"."stallion_owners" USING btree ("stallion_id");
CREATE INDEX IF NOT EXISTS "stallions_filters_idx" ON "public"."stallions" USING btree ("country_of_residence", "breed", "semen_availability");
CREATE INDEX IF NOT EXISTS "stallions_name_trgm_idx" ON "public"."stallions" USING gin ("stallion_name" "public"."gin_trgm_ops");

REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";
