import { redirect, notFound } from "next/navigation";
import StallionMediaManager from "@/components/admin/stallions/StallionMediaManager";
import { fetchStallionForAdminEdit } from "@/services/stallion.server";
import { stallionPermissionFlags } from "@/services/auth.server";
import { requireStaffPage } from "@/services/dashboard-page";
import AccessDenied from "@/components/admin/AccessDenied";
import { StallionPermissionsProvider } from "@/components/admin/DashboardRoleContext";
import { isUuidString } from "@/utils/common";

export default async function StallionMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireStaffPage();
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const { id } = await params;

  if (id.startsWith("temp-")) {
    redirect("/dashboard/stallions");
  }

  if (!isUuidString(id)) {
    notFound();
  }

  const loaded = await fetchStallionForAdminEdit(id);

  if (!loaded.ok) {
    if (loaded.reason === "not_authenticated") {
      redirect(`/login?next=/dashboard/stallions/${id}/media`);
    }
    notFound();
  }

  const flags = await stallionPermissionFlags(gate.supabase, id);
  if (!flags.canEdit) {
    return (
      <AccessDenied
        title="Not allowed"
        message="You are not assigned to this horse and cannot edit its media."
      />
    );
  }

  const { stallion, publishStatus } = loaded;
  const media = stallion.media;

  return (
    <StallionPermissionsProvider
      canEdit={flags.canEdit}
      canDeleteChildren={flags.canDeleteChildren}
    >
      <StallionMediaManager
        stallionId={id}
        stallionName={stallion.stallion_name}
        publishStatus={publishStatus}
        initial={{
          primaryStoragePath: media?.primary_image_url,
          gallery: (media?.gallery ?? []).map((item) => ({
            storagePath: item.filename,
          })),
          videoUrl: media?.video_url,
        }}
      />
    </StallionPermissionsProvider>
  );
}
