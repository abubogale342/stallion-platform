import CmsHeaderEditor from "@/components/cms/admin/CmsHeaderEditor";
import { fetchCmsLayoutForEdit } from "@/services/cms.server";
import { mergeCmsLayoutForEditor } from "@/services/cms";
import type { CmsHeaderLayout } from "@/types/cms";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";

export default async function EditCmsHeaderPage() {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const { row } = await fetchCmsLayoutForEdit("header");
  const layout = mergeCmsLayoutForEditor("header", row);
  const initialPublished = row?.published ?? true;

  return (
    <CmsHeaderEditor
      initialLayout={layout as CmsHeaderLayout}
      initialPublished={initialPublished}
    />
  );
}
