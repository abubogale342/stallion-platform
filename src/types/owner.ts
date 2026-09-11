/** Row from `public.owners` for admin autocomplete and form fill. */
export type OwnerRecordOption = {
  id: string;
  owner_name: string;
  country: string | null;
  email: string | null;
  phone: string | null;
  farm_ranch: string | null;
  farm_ranch_website: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  suburb: string | null;
  state_region: string | null;
  postal_code: string | null;
  full_address: string | null;
  facebook: string | null;
  instagram: string | null;
};

export type OwnerRecordFields = {
  owner_name: string;
  country?: string;
  email?: string;
  phone?: string;
  farm_ranch?: string;
  farm_ranch_website?: string;
  address_line_1?: string;
  address_line_2?: string;
  suburb?: string;
  state_region?: string;
  postal_code?: string;
  full_address?: string;
  facebook?: string;
  instagram?: string;
};
