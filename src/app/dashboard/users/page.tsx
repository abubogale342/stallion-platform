import AccessDenied from "@/components/admin/AccessDenied";
import InviteUserModal from "@/components/admin/users/InviteUserModal";
import UsersManager from "@/components/admin/users/UsersManager";
import { listStaffProfiles } from "@/app/dashboard/users/actions";
import { requireDashboardPage } from "@/services/dashboard-page";

export default async function UsersPage() {
  const gate = await requireDashboardPage("owner");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  const listed = await listStaffProfiles();

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
            Owner
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Users
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Invite Admin or Data Entry staff. They set a password from the email
            link. Extra owner accounts cannot be invited here.
          </p>
        </div>
        <InviteUserModal />
      </div>
      {listed.ok ? (
        <UsersManager rows={listed.rows} selfAuthId={gate.user.id} />
      ) : (
        <p className="text-sm text-red-300">{listed.error}</p>
      )}
    </div>
  );
}
