import CmsFooterEditor from "@/components/cms/admin/CmsFooterEditor";
import { fetchCmsLayoutForEdit } from "@/services/cms.server";
import { mergeCmsLayoutForEditor } from "@/services/cms";
import type { CmsFooterLayout } from "@/types/cms";
import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";

export default async function EditCmsFooterPage() {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const { row } = await fetchCmsLayoutForEdit("footer");
  const layout = mergeCmsLayoutForEditor("footer", row);
  const initialPublished = row?.published ?? true;

  return (
    <CmsFooterEditor
      initialLayout={layout as CmsFooterLayout}
      initialPublished={initialPublished}
    />
  );
}
