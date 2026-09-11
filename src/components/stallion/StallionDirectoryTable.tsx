import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Stallion } from "@/types/stallion";
import { STALLION_IMAGE_PLACEHOLDER_SRC } from "@/services/stallion";
import DisciplineLabels from "@/components/stallion/DisciplineLabels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

export default async function StallionDirectoryTable({
  stallions,
}: {
  stallions: Stallion[];
}) {
  const t = await getTranslations("stallions.table");
  const tCommon = await getTranslations("common");

  return (
    <section className="overflow-hidden rounded-lg border border-(--gold)">
      <Table>
        <TableHead className="bg-(--bg-surface) text-(--gold)">
          <TableRow>
            <TableHeaderCell>{t("photo")}</TableHeaderCell>
            <TableHeaderCell>{t("stallion")}</TableHeaderCell>
            <TableHeaderCell>{t("pedigree")}</TableHeaderCell>
            <TableHeaderCell>{t("breed")}</TableHeaderCell>
            <TableHeaderCell>{t("disciplines")}</TableHeaderCell>
            <TableHeaderCell align="center">{t("country")}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stallions.map((s) => (
            <TableRow
              key={s.id}
              className="border-t border-(--gold) hover:bg-(--bg-surface)"
            >
              <TableCell>
                <Link
                  href={`/stallions/${s.slug}`}
                  className="block w-28 max-w-full"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-md bg-zinc-900">
                    <Image
                      src={
                        s?.media?.primary_image_url || STALLION_IMAGE_PLACEHOLDER_SRC
                      }
                      alt={s.stallion_name ?? ""}
                      fill
                      sizes="112px"
                      className="object-contain object-center"
                    />
                  </div>
                </Link>
              </TableCell>
              <TableCell className="font-medium text-white">
                <Link
                  href={`/stallions/${s.slug}`}
                  className="hover:text-(--gold)"
                >
                  {s.stallion_name}
                </Link>
              </TableCell>
              <TableCell className="text-(--text-muted)">
                {s?.pedigree?.sire?.name || tCommon("empty")}{" "}
                {t("pedigreeSeparator")}{" "}
                {s?.pedigree?.dam?.name || tCommon("empty")}
              </TableCell>
              <TableCell>
                {(s?.breed_label ?? s?.breed) || tCommon("empty")}
              </TableCell>
              <TableCell>
                {s.discipline_focus?.length ? (
                  <DisciplineLabels labels={s.discipline_focus} />
                ) : s.discipline_coverage_description?.trim() ? (
                  <span className="text-(--text-muted)">
                    {s.discipline_coverage_description.trim()}
                  </span>
                ) : (
                  tCommon("empty")
                )}
              </TableCell>
              <TableCell align="center">
                {s?.country_of_residence || tCommon("empty")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
