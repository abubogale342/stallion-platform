import type { StallionBreed } from "@/types/stallion";
import {
  BLOODLINE_PARAM,
  serializeBloodlineConditions,
} from "@/utils/bloodline-search";
import type { BloodlineCondition } from "@/utils/bloodline-search";

/** Mare directory URL state: the stallion filters, plus ET, plus pedigree. */
export type MareDirectoryHrefParams = {
  q?: string;
  country?: string;
  breed?: StallionBreed | "All";
  discipline?: string;
  color?: string;
  geneticProfile?: string;
  etStatus?: string;
  embryoAvailability?: string;
  /** Ancestor conditions, ANDed together (see `@/utils/bloodline-search`). */
  bloodlines?: BloodlineCondition[];
  page?: number;
};

export function buildMareDirectoryHref({
  q = "",
  country = "All",
  breed = "All",
  discipline = "All",
  color = "All",
  geneticProfile = "All",
  etStatus = "All",
  embryoAvailability = "All",
  bloodlines = [],
  page = 1,
}: MareDirectoryHrefParams): string {
  const params = new URLSearchParams();
  const trimmedQ = q.trim();
  if (trimmedQ) params.set("q", trimmedQ);
  if (country && country !== "All") params.set("country", country);
  if (breed !== "All") params.set("breed", breed);
  if (discipline && discipline !== "All") params.set("discipline", discipline);
  if (color && color !== "All") params.set("color", color);
  if (geneticProfile && geneticProfile !== "All") {
    params.set("geneticProfile", geneticProfile);
  }
  if (etStatus && etStatus !== "All") params.set("etStatus", etStatus);
  if (embryoAvailability && embryoAvailability !== "All") {
    params.set("embryoAvailability", embryoAvailability);
  }
  for (const value of serializeBloodlineConditions(bloodlines)) {
    params.append(BLOODLINE_PARAM, value);
  }
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/mares?${query}` : "/mares";
}

const ET_VERIFICATION_STALE_MONTHS = 12;

/**
 * True when the ET listing has not been confirmed with the owner within the
 * last 12 months (renders the "unconfirmed" flag). False when never verified —
 * the field simply doesn't render in that case.
 */
export function isEtVerificationStale(
  lastVerifiedAt: string | undefined | null,
  now: Date = new Date()
): boolean {
  if (!lastVerifiedAt?.trim()) return false;
  const verified = new Date(lastVerifiedAt);
  if (Number.isNaN(verified.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - ET_VERIFICATION_STALE_MONTHS);
  return verified < cutoff;
}
