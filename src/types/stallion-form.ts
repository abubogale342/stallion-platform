import type { BreedingGuarantee, HorseType } from "@/types/stallion";
import type { AdminStallionPublishStatus } from "@/types/admin-stallions";
import type {
  BreedType,
  PedigreeType,
  SemenAvailabilityOptionType,
} from "@/utils/common";

export type StallionFormStep =
  | "identity"
  | "pedigree"
  | "performance"
  | "progeny"
  | "breeding"
  | "et"
  | "health"
  | "owners"
  | "agent";

export const STALLION_FORM_STEPS: readonly {
  id: StallionFormStep;
  label: string;
}[] = [
  { id: "identity", label: "Identity" },
  { id: "pedigree", label: "Pedigree" },
  { id: "performance", label: "Performance & racing" },
  { id: "progeny", label: "Progeny & crops" },
  { id: "breeding", label: "Breeding" },
  { id: "health", label: "Health" },
  { id: "owners", label: "Owners" },
  // Milestone 17. Last because it is a review pass over everything before it,
  // and stallion-only: the agent's prompts and services are written for
  // stallions, so the mare wizard below deliberately omits it.
  { id: "agent", label: "Agent review" },
] as const;

/** Donor mare wizard: Breeding (semen/stud fees) is replaced by the ET Program step. */
export const MARE_FORM_STEPS: readonly {
  id: StallionFormStep;
  label: string;
}[] = [
  { id: "identity", label: "Identity" },
  { id: "pedigree", label: "Pedigree" },
  { id: "performance", label: "Performance & racing" },
  { id: "progeny", label: "Progeny & crops" },
  { id: "et", label: "ET Program" },
  { id: "health", label: "Health" },
  { id: "owners", label: "Owners" },
] as const;

export function getFormStepsForHorseType(
  horseType: HorseType | ""
): readonly { id: StallionFormStep; label: string }[] {
  return horseType === "mare" ? MARE_FORM_STEPS : STALLION_FORM_STEPS;
}

/** Matches `stallion_performance_records` columns (form uses strings for numeric inputs). */
export type FormPerformanceRow = {
  id: string;
  year: string;
  month: string;
  association: string;
  event: string;
  class: string;
  discipline: string;
  achievement: string;
  level: string;
  score: string;
  earnings: string;
  currency: string;
  /**
   * Milestone 17. These nine already existed on
   * `stallion_performance_records` — added by
   * 20260414160000_stallion_performance_records_expand.sql and its siblings —
   * but were never surfaced in the admin, so agent-written values were
   * invisible and uneditable.
   */
  starts: string;
  firsts: string;
  seconds: string;
  thirds: string;
  highest_rating: string;
  performance_summary: string;
  judges: string;
  comments: string;
  reference: string;
};

/** Matches `stallion_racing_results` columns. */
export type FormRacingRow = {
  id: string;
  race_name: string;
  race_date: string;
  year: string;
  track: string;
  distance: string;
  finish_position: string;
  speed_index: string;
  earnings: string;
  currency: string;
  /** Milestone 17: present on the table since the racing migration, unsurfaced. */
  race_number: string;
  result_note: string;
  chart_url: string;
  video_url: string;
  admin_notes: string;
};

export type FormRacingSummary = {
  career_starts: string;
  career_firsts: string;
  career_seconds: string;
  career_thirds: string;
  career_earnings: string;
  career_earnings_currency: string;
  highest_rating: string;
  source: string;
  /** Milestone 17. earnings_per_start is agent-derived, not computed here. */
  earnings_per_start: string;
  admin_notes: string;
};

/** Progeny step — `stallions` breeding aggregate columns. */
export type FormBreedingStatistics = {
  total_registered_progeny: string;
  progeny_started_in_competition: string;
  performance_earners: string;
  total_reported_offspring_earnings: string;
  total_reported_offspring_earnings_currency: string;
};

/** Matches `stallion_progeny` columns. */
export type FormProgenyRow = {
  id: string;
  progeny_name: string;
  year: string;
  association: string;
  event: string;
  discipline: string;
  achievement: string;
  total_earnings: string;
};

/** Matches `stallion_foal_crops` columns. */
export type FormFoalCropRow = {
  id: string;
  foal_crop_year: string;
  number_of_foals: string;
};

export type FormGeneticTestRow = {
  id: string;
  test_type: string;
  gene_code: string;
  result: string;
  source: string;
  admin_notes: string;
};

export type FormColourTestRow = {
  id: string;
  colour_test: string;
  gene_code: string;
  result: string;
  source: string;
  admin_notes: string;
};

/** Health step — `stallions` summary text columns. */
export type FormHealthSummaries = {
  genetic_disease_testing_results: string;
  genetic_testing_results: string;
  colour_testing_results: string;
  genetic_test_results_summary: string;
};

export type FormPedigreeRegistrationRow = {
  tempId: string;
  /** Existing `pedigree_registrations.id` when loaded from DB. */
  id?: string;
  association_name: string;
  country: string;
  registration_number: string;
  is_primary: boolean;
};

export type FormPedigreeRow = {
  tempId: string;
  /** Existing `stallion_pedigrees.id` when loaded or after save. */
  id: string;
  /** Existing `pedigrees.id` when chosen from search (this ancestor). */
  pedigree_id: string;
  /** Child `stallion_pedigrees.id` at persist time; empty in wizard (uses `progeny_ref`). */
  progeny_id: string;
  name: string;
  type: PedigreeType;
  /** `stallion_pedigrees.generation` (1 = sire/dam; stallion is implicit gen 0). */
  generation: number;
  /** Parent row `tempId` for ancestors at generation >= 2. */
  progeny_ref: string;
  birth_year: string;
  /** Maps to `pedigrees.height`. */
  height: string;
  registrations: FormPedigreeRegistrationRow[];
  /** Prefill flag; staff-only, not shown on the public profile. */
  needs_review: boolean;
  /** Prefill source notes; staff-only, not shown on the public profile. */
  admin_notes: string;
};

export type FormOwnerLink = {
  tempId: string;
  owner_id: string;
  owner_name: string;
  country: string;
  email: string;
  phone: string;
  farm_ranch: string;
  farm_ranch_website: string;
  address_line_1: string;
  address_line_2: string;
  suburb: string;
  state_region: string;
  postal_code: string;
  full_address: string;
  facebook: string;
  instagram: string;
  public_display_name_only: boolean;
};

export type FormBreedingProviderRow = {
  id: string;
  name: string;
  contact_name: string;
  website: string;
  country: string;
  email: string;
  phone: string;
  /**
   * Milestone 17. `sort_order` is deliberately absent: the RPC assigns it from
   * the array position on save, so the row's place in the list *is* its order
   * and carrying a second copy in the form would let the two disagree.
   */
  admin_notes: string;
};

/** Maps to `stallions.stud_fees` jsonb: `[{ value, currency }, ...]`. */
export type FormStudFeeRow = {
  tempId: string;
  value: string;
  currency: string;
};

export type FormGalleryItem = {
  tempId: string;
  url: string;
};

/**
 * Admin stallion form — top-level keys match `public.stallions` columns where applicable.
 * `family_ids` holds `stallion_disciplines.family_id` values (junction, not on `stallions`).
 */
/** ET Program step — maps to `mare_et_details` (string fields per form idiom). */
export type FormMareEtDetails = {
  et_status: string;
  clinic_name: string;
  clinic_location: string;
  flush_history: string;
  embryo_fee: string;
  embryo_fee_currency: string;
  embryo_availability: string;
  last_verified_at: string;
  international_availability: boolean;
  admin_notes: string;
};

export const EMPTY_MARE_ET_DETAILS: FormMareEtDetails = {
  et_status: "",
  clinic_name: "",
  clinic_location: "",
  flush_history: "",
  embryo_fee: "",
  embryo_fee_currency: "",
  embryo_availability: "",
  last_verified_at: "",
  international_availability: false,
  admin_notes: "",
};

export type StallionFormValues = {
  id: string;
  publish_status: AdminStallionPublishStatus | "";
  /** Immutable after creation; drives the wizard step list. */
  horse_type: HorseType | "";
  /** ET Program step values; persisted only when horse_type is "mare". */
  et_details: FormMareEtDetails;

  stallion_name: string;
  stallion_status: string;
  breed: BreedType | "";
  country_of_residence: string;
  year_of_birth: string;
  coat_colour: string;
  /** Milestone 17 — `stallions.coat_pattern`, written by the agent. */
  coat_pattern: string;
  height: string;
  /** Milestone 17 — `stallions.country_of_registration`, distinct from country_of_residence. */
  country_of_registration: string;
  summary: string;
  family_ids: string[];

  /** Identity step — `stallions.registration_number` */
  registration_number: string;
  /** Identity step — `stallions.registry` (association name, e.g. AQHA). */
  registry: string;
  /** Identity step — `stallions.official_registry_link` */
  official_registry_link: string;
  /** Identity step — `stallions.total_reported_earnings` (public profile Stallion LTE). */
  total_reported_earnings: string;
  total_reported_earnings_currency: string;
  /** Performance step — `stallions.performance_summary` (not per-row performance records). */
  performance_summary: string;

  performance_records: FormPerformanceRow[];
  racing_records: FormRacingRow[];
  racing_summary: FormRacingSummary;

  notable_progeny: FormProgenyRow[];
  foal_crops: FormFoalCropRow[];
  total_registered_progeny: string;
  progeny_started_in_competition: string;
  performance_earners: string;
  total_reported_offspring_earnings: string;
  total_reported_offspring_earnings_currency: string;

  semen_availability: SemenAvailabilityOptionType[];
  live_cover_available: boolean;
  country_availability: string[];
  stud_fees: FormStudFeeRow[];
  breeding_guarantees: BreedingGuarantee | "";
  breeding_manager: string;
  breeding_manager_organization: string;
  breeding_manager_email: string;
  breeding_manager_phone: string;
  breeding_notes: string;
  breeding_service_providers: FormBreedingProviderRow[];

  genetic_disease_testing_results: string;
  genetic_testing_results: string;
  colour_testing_results: string;
  genetic_test_results_summary: string;
  genetic_tests: FormGeneticTestRow[];
  colour_tests: FormColourTestRow[];

  primary_image_url: string;
  gallery: FormGalleryItem[];
  video_url: string;

  owner_links: FormOwnerLink[];
};
