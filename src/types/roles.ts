export const APP_ROLES = ["owner", "admin", "data_entry"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type UserProfileRow = {
  id: string;
  auth_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  isAdmin: boolean;
};

export const ADMIN_NAV: {
  href: string;
  label: string;
  roles: readonly AppRole[];
}[] = [
  { href: "/dashboard", label: "Overview", roles: ["owner", "admin"] },
  { href: "/dashboard/pages", label: "Manage Pages", roles: ["owner", "admin"] },
  { href: "/dashboard/blog", label: "Blog", roles: ["owner", "admin"] },
  {
    href: "/dashboard/stallions",
    label: "Manage Horses",
    roles: ["owner", "admin", "data_entry"],
  },
  {
    href: "/dashboard/research-stallions",
    label: "Research Stallions",
    roles: ["owner", "admin"],
  },
  {
    href: "/dashboard/resources",
    label: "Resources",
    roles: ["owner", "admin"],
  },
  { href: "/dashboard/users", label: "Users", roles: ["owner"] },
  { href: "/dashboard/audit", label: "Audit log", roles: ["owner"] },
];

export function roleCanPublish(role: AppRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function roleCanAccess(
  role: AppRole | null | undefined,
  allowed: readonly AppRole[]
): boolean {
  return Boolean(role && allowed.includes(role));
}

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" && (APP_ROLES as readonly string[]).includes(value)
  );
}
