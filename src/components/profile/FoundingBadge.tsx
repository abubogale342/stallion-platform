import { getTranslations } from "next-intl/server";
import Badge from "@/ui/Badge";

export default async function FoundingBadge() {
  const t = await getTranslations("profile");

  return <Badge variant="gold">{t("foundingBadge")}</Badge>;
}
