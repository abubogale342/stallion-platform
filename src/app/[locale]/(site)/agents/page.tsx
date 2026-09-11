import { getTranslations, setRequestLocale } from "next-intl/server";
import { agents } from "@/data/agents";
import AccentLink from "@/ui/AccentLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

type AgentsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AgentsDirectoryPage({ params }: AgentsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("agents");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6 text-zinc-100">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-white">{t("title")}</h1>
        <p className="text-sm text-zinc-400">{t("subtitle")}</p>
      </header>

      <div className="rounded-lg border border-amber-700/40 bg-black p-4 text-xs text-zinc-400">
        {t("disclaimer")}
      </div>

      <div className="overflow-hidden rounded-lg border border-amber-700/40">
        <Table minWidth="min-w-[900px]">
          <TableHead className="bg-black">
            <TableRow className="border-b border-amber-700/40 text-xs font-medium text-amber-400">
              <TableHeaderCell>{t("columns.name")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.serviceType")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.region")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.specialisation")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.contact")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.notes")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody className="bg-black">
            {agents.map((a) => (
              <TableRow
                key={a.id}
                className="border-t border-amber-700/20 text-sm text-zinc-200"
              >
                <TableCell className="font-medium text-white">{a.name}</TableCell>
                <TableCell>{a.serviceType}</TableCell>
                <TableCell>{a.region}</TableCell>
                <TableCell>{a.specialisation}</TableCell>
                <TableCell>
                  <div className="space-y-1 text-xs">
                    {a.website ? (
                      <AccentLink
                        href={a.website}
                        variant="inline"
                        external
                        className="text-amber-400 hover:underline"
                      >
                        {tCommon("website")}
                      </AccentLink>
                    ) : null}
                    {a.email ? <div>{a.email}</div> : null}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-zinc-400">
                  {a.notes || tCommon("empty")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
