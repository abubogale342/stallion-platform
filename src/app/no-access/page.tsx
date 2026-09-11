import { NoDashboardAccess } from "@/components/admin/AccessDenied";
import { getServerUser, requireServerAuth } from "@/services/auth.server";

export default async function NoAccessPage() {
  const user = await getServerUser();
  if (!user) {
    return <NoDashboardAccess userEmail={null} />;
  }
  const auth = await requireServerAuth();
  return (
    <NoDashboardAccess
      userEmail={auth.ok ? auth.user.email ?? null : user.email ?? null}
    />
  );
}
