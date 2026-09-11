import AdminShell from "@/components/admin/AdminShell";
import { DashboardRoleProvider } from "@/components/admin/DashboardRoleContext";
import { requireServerAuth } from "@/services/auth.server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin · Leading Sires Registry",
  description: "Administration console",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireServerAuth();

  if (!auth.ok) {
    if (auth.code === "NOT_AUTHENTICATED") {
      redirect("/login?next=/dashboard");
    }
    redirect("/no-access");
  }

  return (
    <DashboardRoleProvider role={auth.role}>
      <AdminShell userEmail={auth.user.email ?? null} role={auth.role}>
        {children}
      </AdminShell>
    </DashboardRoleProvider>
  );
}
