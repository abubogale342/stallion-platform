import { NextResponse } from "next/server";
import { requireServerAuth, stallionPermissionFlags } from "@/services/auth.server";
import { fetchStallionProfileTranslationWithClient } from "@/services/stallion-translations";
import type { TranslatableProfileLocale } from "@/types/stallion-translations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stallionId = searchParams.get("stallionId")?.trim() ?? "";
  const locale = (searchParams.get("locale")?.trim() ?? "") as TranslatableProfileLocale;

  if (!stallionId || locale !== "pt-BR") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const auth = await requireServerAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.code === "NOT_AUTHENTICATED" ? 401 : 403 }
    );
  }

  const flags = await stallionPermissionFlags(auth.supabase, stallionId);
  if (!flags.canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await fetchStallionProfileTranslationWithClient(
    auth.supabase,
    stallionId,
    locale
  );

  if (!row) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    locale: row.locale,
    summary: row.summary ?? "",
    performance_summary: row.performance_summary ?? "",
    breeding_summary: row.breeding_summary ?? "",
    coat_colour: row.coat_colour ?? "",
    breed_label: row.breed_label ?? "",
    discipline_coverage: row.discipline_coverage ?? "",
    breeding_method_labels: row.breeding_method_labels ?? {},
    publish_status: row.publish_status,
  });
}
