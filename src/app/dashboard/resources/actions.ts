"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/services/auth.server";
import {
  DIRECTORY_CONFIG,
  isDirectoryKind,
  type DirectoryKind,
} from "@/services/directory.server";
import { locales } from "@/i18n/routing";

/** Free-text form payload, straight from the modal. Trimmed here, not there. */
export type DirectoryEntryInput = {
  name: string;
  country: string;
  focus: string;
  website: string;
  notes: string;
  isActive: boolean;
  /**
   * Storage object path in the `directory-logos` bucket, or "" for none. The
   * file itself is uploaded by the browser before this action runs, so all
   * that travels here is the path.
   */
  logoPath: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

/** Generous, but stops a stray paste filling a reference table. */
const MAX_SHORT = 200;
const MAX_NOTES = 2000;

/**
 * Staff paste bare domains ("aqha.com"), but the public table renders the value
 * as an outbound link, so store an absolute URL.
 */
function normalizeWebsite(
  value: string
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "Website must be a valid URL." };
  }
  if (!url.hostname.includes(".")) {
    return { ok: false, error: "Website must be a valid URL." };
  }
  return { ok: true, value: url.toString() };
}

type ValidatedEntry = {
  name: string;
  country: string;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  focus: string | null;
  logo_path: string | null;
};

function validate(
  input: DirectoryEntryInput
): { ok: true; value: ValidatedEntry } | { ok: false; error: string } {
  const name = input.name.trim();
  const country = input.country.trim();
  const focus = input.focus.trim();
  const notes = input.notes.trim();

  // name and country are NOT NULL in both tables.
  if (!name) return { ok: false, error: "Name is required." };
  if (!country) return { ok: false, error: "Country is required." };
  if (name.length > MAX_SHORT || country.length > MAX_SHORT || focus.length > MAX_SHORT) {
    return { ok: false, error: `Name, country and focus must be under ${MAX_SHORT} characters.` };
  }
  if (notes.length > MAX_NOTES) {
    return { ok: false, error: `Notes must be under ${MAX_NOTES} characters.` };
  }

  const website = normalizeWebsite(input.website);
  if (!website.ok) return website;

  // The browser uploads into the bucket and hands back a path. Storage RLS is
  // the real gate on what may be written; this check keeps a malformed or
  // traversing value from being persisted as a row's logo.
  const logoPath = input.logoPath.trim();
  if (
    logoPath &&
    (!logoPath.startsWith("directory/") ||
      logoPath.includes("..") ||
      logoPath.length > MAX_SHORT * 2)
  ) {
    return { ok: false, error: "Logo could not be attached. Re-upload it." };
  }

  return {
    ok: true,
    value: {
      name,
      country,
      website: website.value,
      notes: notes || null,
      is_active: Boolean(input.isActive),
      focus: focus || null,
      logo_path: logoPath || null,
    },
  };
}

/** Map the normalised payload onto the table's own column names. */
function toRow(kind: DirectoryKind, value: ValidatedEntry) {
  const { focus, ...shared } = value;
  return { ...shared, [DIRECTORY_CONFIG[kind].focusColumn]: focus };
}

function revalidateDirectory(kind: DirectoryKind) {
  revalidatePath("/dashboard/resources");
  // The public pages are statically rendered per locale.
  for (const locale of locales) {
    revalidatePath(`/${locale}${DIRECTORY_CONFIG[kind].publicPath}`);
  }
}

async function authorize(kind: unknown) {
  if (!isDirectoryKind(kind)) {
    return { ok: false as const, error: "Unknown directory." };
  }
  const auth = await requireRole("owner", "admin");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, auth, kind };
}

export async function createDirectoryEntryAction(
  kind: DirectoryKind,
  input: DirectoryEntryInput
): Promise<ActionResult> {
  const gate = await authorize(kind);
  if (!gate.ok) return gate;

  const parsed = validate(input);
  if (!parsed.ok) return parsed;

  const { error } = await gate.auth.supabase
    .from(DIRECTORY_CONFIG[gate.kind].table)
    .insert(toRow(gate.kind, parsed.value));

  if (error) return { ok: false, error: error.message };
  revalidateDirectory(gate.kind);
  return { ok: true };
}

export async function updateDirectoryEntryAction(
  kind: DirectoryKind,
  id: string,
  input: DirectoryEntryInput
): Promise<ActionResult> {
  const gate = await authorize(kind);
  if (!gate.ok) return gate;
  if (!id) return { ok: false, error: "Missing entry id." };

  const parsed = validate(input);
  if (!parsed.ok) return parsed;

  const { error } = await gate.auth.supabase
    .from(DIRECTORY_CONFIG[gate.kind].table)
    .update(toRow(gate.kind, parsed.value))
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateDirectory(gate.kind);
  return { ok: true };
}

/**
 * Deactivating is the intended way to retire an entry: it drops the row from
 * the public tables while preserving any stallion links pointing at it.
 */
export async function setDirectoryEntryActiveAction(
  kind: DirectoryKind,
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const gate = await authorize(kind);
  if (!gate.ok) return gate;
  if (!id) return { ok: false, error: "Missing entry id." };

  const { error } = await gate.auth.supabase
    .from(DIRECTORY_CONFIG[gate.kind].table)
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateDirectory(gate.kind);
  return { ok: true };
}

/**
 * Hard delete. Both stallion foreign keys onto resources_directory are
 * ON DELETE SET NULL, so this unlinks rather than blocks — the caller confirms
 * with the affected count first.
 */
export async function deleteDirectoryEntryAction(
  kind: DirectoryKind,
  id: string
): Promise<ActionResult> {
  const gate = await authorize(kind);
  if (!gate.ok) return gate;
  if (!id) return { ok: false, error: "Missing entry id." };

  const { error } = await gate.auth.supabase
    .from(DIRECTORY_CONFIG[gate.kind].table)
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateDirectory(gate.kind);
  return { ok: true };
}
