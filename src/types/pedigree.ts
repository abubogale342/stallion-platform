import type { PedigreeType } from "@/utils/common";

export type PedigreeRegistrationOption = {
  id?: string;
  association_name: string;
  country: string | null;
  registration_number: string | null;
  is_primary: boolean;
  sort_order?: number | null;
};

/** Row from `public.pedigrees` for admin search/select. */
export type PedigreeRecordOption = {
  id: string;
  name: string;
  type: PedigreeType;
  birth_year: number | null;
  height: string | null;
  registrations?: PedigreeRegistrationOption[];
};
