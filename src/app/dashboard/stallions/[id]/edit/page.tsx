import { redirect, notFound } from "next/navigation";
import {
  fetchDisciplineFamilies,
  fetchStallionFormDefaultsForEdit,
} from "@/services/stallion.server";
import { stallionPermissionFlags } from "@/services/auth.server";
import { requireStaffPage } from "@/services/dashboard-page";
import AccessDenied from "@/components/admin/AccessDenied";
import { StallionPermissionsProvider } from "@/components/admin/DashboardRoleContext";
import HorseAssignmentsPanel from "@/components/admin/stallions/HorseAssignmentsPanel";
import { isUuidString } from "@/utils/common";
import EditStallionEditor from "./EditStallionEditor";

export default async function EditStallionPage({
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

  const [disciplineFamilies, loaded] = await Promise.all([
    fetchDisciplineFamilies(),
    fetchStallionFormDefaultsForEdit(id),
  ]);

  if (!loaded.ok) {
    if (loaded.reason === "not_authenticated") {
      redirect(`/login?next=/dashboard/stallions/${id}/edit`);
    }
    notFound();
  }

  const flags = await stallionPermissionFlags(gate.supabase, id);
  if (!flags.canEdit) {
    return (
      <AccessDenied
        title="Not allowed"
        message="You are not assigned to this horse and cannot edit it."
      />
    );
  }

  return (
    <StallionPermissionsProvider
      canEdit={flags.canEdit}
      canDeleteChildren={flags.canDeleteChildren}
    >
      <div className="space-y-8">
        <EditStallionEditor
          defaultValues={loaded.defaultValues}
          disciplineFamilies={disciplineFamilies}
        />
        {gate.role === "owner" ? (
          <HorseAssignmentsPanel stallionId={id} />
        ) : null}
      </div>
    </StallionPermissionsProvider>
  );
}
