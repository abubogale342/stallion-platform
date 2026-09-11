import { fetchCmsPageForEdit } from "@/services/cms.server";
import { mergeCmsBlocksForEditor } from "@/services/cms";
import { isCmsSlug } from "@/types/cms";
import { notFound } from "next/navigation";
import CmsPageEditor from "@/components/cms/admin/CmsPageEditor";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";

type Props = { params: Promise<{ slug: string }> };

export default async function EditCmsPage({ params }: Props) {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const { slug: raw } = await params;
  if (!isCmsSlug(raw)) {
    notFound();
  }
  const slug = raw;

  const { row } = await fetchCmsPageForEdit(slug);
  const merged = mergeCmsBlocksForEditor(slug, row);
  const initialPublished = row?.published ?? true;

  return (
    <CmsPageEditor
      slug={slug}
      initialTitle={merged.title}
      initialBlocks={merged.blocks}
      initialPublished={initialPublished}
    />
  );
}
