import type { StallionsRow } from "@/types/database.types";
import type { BreedingMethodLabels } from "@/types/stallion-translations";
type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};
type StallionsBase = RemoveIndexSignature<StallionsRow>;

export type StallionBreed = "Quarter Horse" | "Paint" | "Appaloosa";

export type HorseType = "stallion" | "mare";

/** Embryo-transfer details for donor mares (mare_et_details, 1:1 with the stallions row). */
export type MareEtDetails = {
  et_status?: string;
  clinic_name?: string;
  clinic_location?: string;
  flush_history?: string;
  embryo_fee?: number;
  embryo_fee_currency?: string;
  /** Fresh, Frozen or Both. */
  embryo_availability?: string;
  last_verified_at?: string;
  international_availability?: boolean;
  /** Present on authenticated admin loads only; anon column grants exclude it. */
  admin_notes?: string;
};

export type SemenAvailability =
  | "Method not disclosed"
  | "Fresh"
  | "Chilled"
  | "Cooled"
  | "Frozen"
  | "ICSI"
  | "Combination"
  | "Live Cover";

/** Concrete DB-backed method values (no synthesized "Combination" label). */
export type SemenMethod = Exclude<SemenAvailability, "Combination">;
export type BreedingGuarantee = "LFG" | "Colour" | "None";

export type BreedingServiceProvider = {
  id?: string;
  name?: string;
  contact_name?: string;
  website?: string;
  country?: string;
  email?: string;
  phone?: string;
};

export type Link = { label: string; href: string };

export type Owner = {
  owner_id: string;
  owner_name: string;
  country: string;
  farm_ranch?: string;
  full_address?: string;
  address_city_state?: string;
  email?: string;
  phone?: string;
  farm_ranch_website?: string;
  facebook?: string;
  instagram?: string;
  public_display_name_only?: boolean;
};

export type PerformanceEntry = {
  year?: number;
  month?: string;
  association?: string;
  event: string;
  performance_class: string;
  discipline?: string;
  result: string;
  notable_achievements?: string;
  level?: string;
  reference?: Link;
  notes?: string;
  judges?: string;
  earnings?: string;
  level_earnings?: { value: number; currency: string };
  score?: string | number;
};

export type ProgenyEntry = {
  name: string;
  year?: number;
  association?: string;
  event?: string;
  discipline?: string;
  result: string;
  total_earnings?: number;
  reference?: Link;
};

export type FoalCropEntry = {
  foal_crop_year: number;
  number_of_foals?: number;
};

export type RacingRecordEntry = {
  race_name?: string;
  race_date?: string;
  year?: number;
  track?: string;
  race_number?: number;
  distance?: string;
  finish_position?: number;
  speed_index?: number;
  earnings?: { value: number; currency: string };
  result_note?: string;
  chart_url?: string;
  video_url?: string;
};

export type RacingSummary = {
  career_starts?: number;
  career_firsts?: number;
  career_seconds?: number;
  career_thirds?: number;
  career_earnings?: { value: number; currency: string };
  highest_rating?: number;
  earnings_per_start?: { value: number; currency: string };
  source?: string;
};

export type GeneticTestEntry = {
  id: string;
  test_type: string;
  gene_code?: string;
  result: string;
  source?: string;
  admin_notes?: string;
};

export type ColourTestEntry = {
  id: string;
  colour_test: string;
  gene_code?: string;
  result: string;
  source?: string;
  admin_notes?: string;
};

export type GalleryImage = {
  filename: string;
  caption?: string;
};

export type ProgenyRow = {
  name: string;
  year: string;
  association: string;
  discipline: string;
  result: string;
  reference: string;
};

export type VideoReference = {
  url: string;
  type?: string;
};

export type PedigreeNode = {
  name: string;
  sire?: PedigreeNode;
  dam?: PedigreeNode;
};

/** Non-primary registry row shown in pedigree chart “+” details. */
export type PedigreeChartAdditionalRegistration = {
  association_name?: string;
  country?: string;
  registration_number?: string;
};

export type PedigreeChartCell = {
  key: string;
  /** Primary display: horse name + primary registration in parentheses. */
  name: string;
  horse_name: string;
  primary_registration?: string;
  additional_registrations?: PedigreeChartAdditionalRegistration[];
  meta_lines: string[];
  kind: "male" | "female";
  /** 1-based CSS grid row start (shared across columns). */
  row_start: number;
  row_span: number;
};

export type PedigreeChartColumn = {
  generation: number;
  label: string;
  cells: PedigreeChartCell[];
};

export type PedigreeChart = {
  columns: PedigreeChartColumn[];
  /** Shared row track count for cross-generation alignment. */
  row_count: number;
};

export type DirectoryAncestorMatch = {
  ancestor_name: string;
  generation: number;
  branch: "sire" | "dam";
};

export type Stallion = {
  breed_label?: StallionBreed;
  year_of_birth?: number;
  stallion_lte?: { value: number; currency: string };
  official_registry_link?: string;
  height_hands?: number;
  discipline_focus?: string[];
  breeding_availability: SemenAvailability;
  breeding_methods?: SemenMethod[];
  /** Locale-specific semen method labels from profile translations. */
  breeding_method_labels?: BreedingMethodLabels;
  country_availability_resolved?: string[];
  stud_fee_resolved?: { value: number; currency: string };
  stud_fees_resolved?: { value: number; currency: string }[];
  breeding_manager_contact?: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
  };
  breeding_service_providers?: BreedingServiceProvider[];
  owners?: Owner[];
  breeding_guarantees_resolved?: BreedingGuarantee;
  pedigree: {
    sire: PedigreeNode;
    dam: PedigreeNode;
    extended?: {
      label: string;
      name: string;
    }[];
  };
  /** Public pedigree chart built from `stallion_pedigrees`. */
  pedigree_chart?: PedigreeChart;
  performance_records?: PerformanceEntry[];
  breeding_statistics?: {
    foal_crops_recorded?: number;
    total_registered_progeny?: number;
    progeny_started_in_competition?: number;
    performance_earners?: number;
    total_reported_offspring_earnings?: { value: number; currency: string };
    average_earnings_per_starter?: { value: number; currency: string };
  };
  notable_progeny?: ProgenyEntry[];
  foal_crops?: FoalCropEntry[];
  racing_records?: RacingRecordEntry[];
  racing_summary?: RacingSummary;
  genetic_tests?: GeneticTestEntry[];
  colour_tests?: ColourTestEntry[];
  genetic_test_results_summary?: string;
  discipline_coverage_description?: string;
  /** One match per bloodline condition when the directory search uses them. */
  directory_ancestor_matches?: DirectoryAncestorMatch[];
  media?: {
    primary_image_url?: string;
    gallery?: GalleryImage[];
    video_url?: string;
  };
  is_founding_member?: boolean;
  has_active_subscription?: boolean;
  /** Donor mare ET details; only present when horse_type is "mare". */
  et_details?: MareEtDetails;
} & StallionsBase;
