/**
 * Supabase Database types.
 * Regenerate when Docker is available: `npm run db:types`
 * Source of truth: supabase/migrations/
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Record<string, unknown>
  | Json[];

type TableDef<Row extends Record<string, unknown> = Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      stallions: {
        Row: {
          id: string;
          stallion_name: string;
          slug: string | null;
          breed: string | null;
          country_of_residence: string | null;
          semen_availability: string;
          live_cover_available: boolean;
          disciplines: string[] | null;
          stud_fees: Json | null;
          stud_fee: number | null;
          stud_fee_currency: string | null;
          summary: string | null;
          breeding_notes: string | null;
          date_of_birth: string | null;
          height: string | null;
          registry: string | null;
          registration_number: string | null;
          country_of_registration: string | null;
          registration_status: string | null;
          publish_status: string | null;
          horse_type: string;
          featured: boolean | null;
          created_at: string;
          updated_at: string;
          parentage: string | null;
          breeding_manager: string | null;
          breeding_manager_email: string | null;
          breeding_manager_phone: string | null;
          total_reported_earnings: number | null;
          total_reported_earnings_currency: string | null;
          total_reported_offspring_earnings: number | null;
          total_reported_offspring_earnings_currency: string | null;
          stallion_status: string | null;
          breeding_guarantees: string | null;
          genetic_testing_results: string | null;
          colour_testing_results: string | null;
          coat_colour: string | null;
          genetic_disease_testing_results: string | null;
          coat_pattern: string | null;
          coat_genetic_notes: string | null;
          stallion_owners_text: string | null;
          performance_summary: string | null;
          performance_earners: number | null;
          overview: string | null;
          country_availability: Json | null;
          breeding_service_provider_name: string | null;
          breeding_service_provider_country: string | null;
          breeding_service_provider_email: string | null;
          breeding_service_provider_phone: string | null;
          breeding_service_provider_website: string | null;
          progeny_started_in_competition: number | null;

          // Milestone 17 — written by lsr-ai-agent, review-only.
          // See supabase/migrations/20260909120000_stallion_agent_draft_fields.sql
          stallion_overview_draft: string | null;
          performance_overview_draft: string | null;
          owner_email_draft: string | null;
          owner_email_follow_up_draft: string | null;
          facebook_message_draft: string | null;
          facebook_follow_up_message_draft: string | null;
          instagram_message_draft: string | null;
          instagram_follow_up_message_draft: string | null;
          whatsapp_message_draft: string | null;
          whatsapp_follow_up_message_draft: string | null;
          /** Array of {field, ...}; NOT NULL, defaults to []. */
          missing_information_flags: Json;
          /** Array of {field, ...}; NOT NULL, defaults to []. */
          conflict_flags: Json;
          /** processing | completed | completed_with_warnings | failed; 'idle' = never run. Not a closed set. */
          generation_status: string;
          last_generated_at: string | null;
          /** Written by our trigger route, never by the agent; ages a stranded 'processing'. */
          generation_started_at: string | null;
          generation_notes: string | null;
          /** 0-1 fraction, not a percentage. */
          ai_confidence: number | null;
          needs_review: boolean;
          [key: string]: Json | string | number | boolean | string[] | null | undefined;
        };
        Insert: Partial<Database["public"]["Tables"]["stallions"]["Row"]> & {
          stallion_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["stallions"]["Row"]>;
        Relationships: [];
      };
      owners: {
        Row: {
          id: string;
          owner_name: string | null;
          country: string | null;
          farm_ranch: string | null;
          farm_ranch_website: string | null;
          email: string | null;
          phone: string | null;
          full_address: string | null;
          suburb: string | null;
          state_region: string | null;
          facebook: string | null;
          instagram: string | null;
          public_display_name_only: boolean | null;
          created_at: string;
          updated_at: string;
          [key: string]: Json | string | number | boolean | null | undefined;
        };
        Insert: Partial<Database["public"]["Tables"]["owners"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["owners"]["Row"]>;
        Relationships: [];
      };
      stallion_owners: {
        Row: {
          stallion_id: string;
          owner_id: string;
          role: string | null;
          is_primary: boolean | null;
          sort_order: number | null;
          public_display_name_only: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stallion_owners"]["Row"]> & {
          stallion_id: string;
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["stallion_owners"]["Row"]>;
        Relationships: [];
      };
      stallion_performance_records: {
        Row: {
          id: string;
          stallion_id: string;
          achievement: string;
          year: number | null;
          month: string | null;
          discipline: string | null;
          level: string | null;
          association: string | null;
          event: string | null;
          class: string | null;
          association_event: string | null;
          reference: string | null;
          earnings: number | null;
          currency: string | null;
          // Added by 20260414160000_stallion_performance_records_expand.sql and
          // its siblings; surfaced in the admin for Milestone 17.
          score: number | null;
          starts: number | null;
          firsts: number | null;
          seconds: number | null;
          thirds: number | null;
          highest_rating: number | null;
          performance_summary: string | null;
          judges: string | null;
          comments: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stallion_performance_records"]["Row"]> & {
          stallion_id: string;
          achievement: string;
        };
        Update: Partial<Database["public"]["Tables"]["stallion_performance_records"]["Row"]>;
        Relationships: [];
      };
      stallion_progeny: {
        Row: {
          id: string;
          stallion_id: string;
          progeny_name: string;
          discipline: string | null;
          achievement: string | null;
          year: number | null;
          total_earnings: number | null;
          // Added by 20260506150000_stallion_progeny_association_event.sql.
          association: string | null;
          event: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stallion_progeny"]["Row"]> & {
          stallion_id: string;
          progeny_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["stallion_progeny"]["Row"]>;
        Relationships: [];
      };
      stallion_foal_crops: {
        Row: {
          id: string;
          stallion_id: string;
          foal_crop_year: number;
          number_of_foals: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stallion_foal_crops"]["Row"]> & {
          stallion_id: string;
          foal_crop_year: number;
        };
        Update: Partial<Database["public"]["Tables"]["stallion_foal_crops"]["Row"]>;
        Relationships: [];
      };
      stallion_profile_translations: {
        Row: {
          id: string;
          stallion_id: string;
          locale: string;
          summary: string | null;
          performance_summary: string | null;
          breeding_summary: string | null;
          coat_colour: string | null;
          breed_label: string | null;
          discipline_coverage: string | null;
          breeding_method_labels: Json;
          publish_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["stallion_profile_translations"]["Row"]
        > & {
          stallion_id: string;
          locale: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stallion_profile_translations"]["Row"]
        >;
        Relationships: [];
      };
      mare_et_details: {
        Row: {
          id: string;
          stallion_id: string;
          et_status: string | null;
          clinic_name: string | null;
          clinic_location: string | null;
          flush_history: string | null;
          embryo_fee: number | null;
          embryo_fee_currency: string | null;
          embryo_availability: string | null;
          last_verified_at: string | null;
          international_availability: boolean | null;
          /** Admin-only: anon column grants exclude this; never select it in public queries. */
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["mare_et_details"]["Row"]> & {
          stallion_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["mare_et_details"]["Row"]>;
        Relationships: [];
      };
      stallion_images: {
        Row: {
          id: string;
          stallion_id: string;
          kind: string;
          position: number;
          url: string;
          filename: string | null;
          created_at: string;
          public_synced_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stallion_images"]["Row"]> & {
          stallion_id: string;
          kind: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["stallion_images"]["Row"]>;
        Relationships: [];
      };
      pedigrees: {
        Row: {
          id: string;
          name: string;
          type: string;
          birth_year: number | null;
          association_name: string | null;
          height: string | null;
          registration_number: string | null;
          created_at: string;
          updated_at: string;
          [key: string]: Json | string | number | boolean | null | undefined;
        };
        Insert: Partial<Database["public"]["Tables"]["pedigrees"]["Row"]> & {
          name: string;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedigrees"]["Row"]>;
        Relationships: [];
      };
      pedigree_registrations: {
        Row: {
          id: string;
          pedigree_id: string;
          association_name: string;
          country: string | null;
          registration_number: string | null;
          is_primary: boolean;
          sort_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pedigree_registrations"]["Row"]> & {
          pedigree_id: string;
          association_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedigree_registrations"]["Row"]>;
        Relationships: [];
      };
      stallion_pedigrees: {
        Row: {
          id: string;
          stallion_id: string;
          pedigree_id: string;
          generation: number;
          progeny_id: string | null;
          created_at: string;
          updated_at: string;
          needs_review: boolean;
          admin_notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["stallion_pedigrees"]["Row"]> & {
          stallion_id: string;
          pedigree_id: string;
          generation: number;
        };
        Update: Partial<Database["public"]["Tables"]["stallion_pedigrees"]["Row"]>;
        Relationships: [];
      };
      cms_pages: {
        Row: {
          id: string;
          slug: string;
          title: Json | null;
          published: boolean;
          blocks: Json;
          layout: Json | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cms_pages"]["Row"]> & {
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["cms_pages"]["Row"]>;
        Relationships: [];
      };
      resources_directory: {
        Row: {
          id: string;
          name: string;
          country: string;
          focus: string | null;
          website: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["resources_directory"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["resources_directory"]["Row"]>;
        Relationships: [];
      };
      associations_registries: {
        Row: {
          id: string;
          name: string;
          country: string;
          breed_focus: string | null;
          website: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["associations_registries"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["associations_registries"]["Row"]>;
        Relationships: [];
      };
      stallion_disciplines: TableDef;
      discipline_families: TableDef;
      discipline_subcategories: TableDef;
      stallion_breeding_service_providers: TableDef;
      stallion_breeding_stats: TableDef;
      stallion_racing_results: TableDef;
      stallion_racing_summary: TableDef;
      stallion_genetic_tests: TableDef;
      stallion_colour_tests: TableDef;
      stallion_research_snippets: TableDef;
      stallion_research_snippets_images: TableDef;
      user_profile: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          isAdmin: boolean;
          role: Database["public"]["Enums"]["app_role"];
          subscription_status: string | null;
          subscription_expires_at: string | null;
          hasActiveSubscription: boolean;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_profile"]["Row"]> & {
          auth_id: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: Partial<Database["public"]["Tables"]["user_profile"]["Row"]>;
        Relationships: [];
      };
      horse_assignments: {
        Row: {
          stallion_id: string;
          user_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["horse_assignments"]["Row"]> & {
          stallion_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["horse_assignments"]["Row"]>;
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          occurred_at: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          stallion_id: string | null;
          stallion_name: string | null;
          table_name: string;
          record_id: string | null;
          changes: Json;
          summary: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_audit_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["admin_audit_log"]["Row"]>;
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          featured_image: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["blog_posts"]["Row"]> & {
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Row"]>;
        Relationships: [];
      };
      blog_post_translations: {
        Row: {
          post_id: string;
          locale: string;
          title: string;
          excerpt: string | null;
          body: Json;
          status: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["blog_post_translations"]["Row"]
        > & {
          post_id: string;
          locale: string;
          title: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["blog_post_translations"]["Row"]
        >;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_stallion_from_form: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      update_stallion_from_form: {
        Args: { p_payload: Json };
        Returns: Json;
      };
      set_stallion_publish_status: {
        Args: { p_stallion_id: string; p_publish_status: string };
        Returns: Json;
      };
      update_stallion_stud_fees: {
        Args: { p_stallion_id: string; p_stud_fees: Json };
        Returns: Json;
      };
      admin_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_stallion_ancestor_matches: {
        Args: {
          p_ancestor_name: string;
          /** Exact generations to accept; empty/undefined means any. */
          p_generations: number[] | null;
          p_branch?: string;
        };
        Returns: {
          stallion_id: string;
          ancestor_name: string;
          generation: number;
          branch: string;
        }[];
      };
      search_public_ancestor_names: {
        Args: {
          p_query: string;
          p_horse_type?: string | null;
          p_limit?: number;
        };
        Returns: {
          ancestor_name: string;
          horse_count: number;
          min_generation: number;
        }[];
      };
      can_edit_stallion: {
        Args: { p_id: string };
        Returns: boolean;
      };
      can_delete_stallion_children: {
        Args: { p_id: string };
        Returns: boolean;
      };
      current_app_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["app_role"] | null;
      };
      provision_invited_user_profile: {
        Args: { p_auth_id: string };
        Returns: undefined;
      };
      staff_auth_never_signed_in: {
        Args: Record<string, never>;
        Returns: string[];
      };
      staff_auth_banned: {
        Args: Record<string, never>;
        Returns: string[];
      };
      pedigree_prefill_preview: {
        Args: {
          p_pedigree_id: string;
          p_exclude_stallion_id: string;
          p_anchor_generation: number;
        };
        Returns: Json;
      };
      prefill_stallion_pedigree_ancestors: {
        Args: {
          p_stallion_id: string;
          p_anchor_link_id: string;
          p_source_anchor_id?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "data_entry";
      breed_type: string;
      semen_availability_type: string;
      pedigree_type: string;
      horse_type: string;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type StallionsRow = Tables<"stallions">;
export type MareEtDetailsRow = Tables<"mare_et_details">;
export type PedigreesRow = Tables<"pedigrees">;
export type StallionPedigreesRow = Tables<"stallion_pedigrees">;
export type PedigreeRegistrationsRow = Tables<"pedigree_registrations">;
export type BlogPostsRow = Tables<"blog_posts">;
export type BlogPostTranslationsRow = Tables<"blog_post_translations">;
