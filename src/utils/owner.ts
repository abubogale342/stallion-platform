import type { OwnerRecordOption, OwnerRecordFields } from "@/types/owner";
import type { FormOwnerLink } from "@/types/stallion-form";

export const EMPTY_OWNER_LINK_FIELDS = {
  email: "",
  phone: "",
  farm_ranch: "",
  farm_ranch_website: "",
  address_line_1: "",
  address_line_2: "",
  suburb: "",
  state_region: "",
  postal_code: "",
  full_address: "",
  facebook: "",
  instagram: "",
} as const satisfies Omit<
  FormOwnerLink,
  "tempId" | "owner_id" | "owner_name" | "country" | "public_display_name_only"
>;

function strOrEmpty(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

export function createEmptyOwnerLink(tempId: string): FormOwnerLink {
  return {
    tempId,
    owner_id: "",
    owner_name: "",
    country: "",
    ...EMPTY_OWNER_LINK_FIELDS,
    public_display_name_only: false,
  };
}

export function mapStallionOwnerLinkRow(
  link: Record<string, unknown>,
  tempId: string
): FormOwnerLink {
  const owner =
    link.owners && typeof link.owners === "object"
      ? (link.owners as Record<string, unknown>)
      : {};
  return {
    tempId,
    owner_id: typeof link.owner_id === "string" ? link.owner_id : "",
    owner_name: typeof owner.owner_name === "string" ? owner.owner_name : "",
    country: typeof owner.country === "string" ? owner.country : "",
    email: typeof owner.email === "string" ? owner.email : "",
    phone: typeof owner.phone === "string" ? owner.phone : "",
    farm_ranch: typeof owner.farm_ranch === "string" ? owner.farm_ranch : "",
    farm_ranch_website:
      typeof owner.farm_ranch_website === "string"
        ? owner.farm_ranch_website
        : "",
    address_line_1:
      typeof owner.address_line_1 === "string" ? owner.address_line_1 : "",
    address_line_2:
      typeof owner.address_line_2 === "string" ? owner.address_line_2 : "",
    suburb: typeof owner.suburb === "string" ? owner.suburb : "",
    state_region:
      typeof owner.state_region === "string" ? owner.state_region : "",
    postal_code:
      typeof owner.postal_code === "string" ? owner.postal_code : "",
    full_address:
      typeof owner.full_address === "string" ? owner.full_address : "",
    facebook: typeof owner.facebook === "string" ? owner.facebook : "",
    instagram: typeof owner.instagram === "string" ? owner.instagram : "",
    public_display_name_only: Boolean(link.public_display_name_only),
  };
}

export function mapOwnerRecordToFormLink(
  record: OwnerRecordOption,
  opts: {
    tempId: string;
    public_display_name_only?: boolean;
  }
): FormOwnerLink {
  return {
    tempId: opts.tempId,
    owner_id: record.id,
    owner_name: record.owner_name,
    country: strOrEmpty(record.country),
    email: strOrEmpty(record.email),
    phone: strOrEmpty(record.phone),
    farm_ranch: strOrEmpty(record.farm_ranch),
    farm_ranch_website: strOrEmpty(record.farm_ranch_website),
    address_line_1: strOrEmpty(record.address_line_1),
    address_line_2: strOrEmpty(record.address_line_2),
    suburb: strOrEmpty(record.suburb),
    state_region: strOrEmpty(record.state_region),
    postal_code: strOrEmpty(record.postal_code),
    full_address: strOrEmpty(record.full_address),
    facebook: strOrEmpty(record.facebook),
    instagram: strOrEmpty(record.instagram),
    public_display_name_only: opts.public_display_name_only ?? false,
  };
}

export function formatOwnerSummary(record: OwnerRecordOption): string {
  const parts: string[] = [];
  if (record.farm_ranch?.trim()) parts.push(record.farm_ranch.trim());
  if (record.country?.trim()) parts.push(record.country.trim());
  if (record.email?.trim()) parts.push(record.email.trim());
  return parts.join(" · ");
}

export function formLinkToOwnerFields(link: FormOwnerLink): OwnerRecordFields {
  return {
    owner_name: link.owner_name,
    country: link.country,
    email: link.email,
    phone: link.phone,
    farm_ranch: link.farm_ranch,
    farm_ranch_website: link.farm_ranch_website,
    address_line_1: link.address_line_1,
    address_line_2: link.address_line_2,
    suburb: link.suburb,
    state_region: link.state_region,
    postal_code: link.postal_code,
    full_address: link.full_address,
    facebook: link.facebook,
    instagram: link.instagram,
  };
}

export function ownerFieldsToDbPayload(fields: OwnerRecordFields) {
  const trimOrNull = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    owner_name: fields.owner_name.trim(),
    country: trimOrNull(fields.country),
    email: trimOrNull(fields.email),
    phone: trimOrNull(fields.phone),
    farm_ranch: trimOrNull(fields.farm_ranch),
    farm_ranch_website: trimOrNull(fields.farm_ranch_website),
    address_line_1: trimOrNull(fields.address_line_1),
    address_line_2: trimOrNull(fields.address_line_2),
    suburb: trimOrNull(fields.suburb),
    state_region: trimOrNull(fields.state_region),
    postal_code: trimOrNull(fields.postal_code),
    full_address: trimOrNull(fields.full_address),
    facebook: trimOrNull(fields.facebook),
    instagram: trimOrNull(fields.instagram),
  };
}
