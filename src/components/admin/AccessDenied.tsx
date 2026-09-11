import Link from "next/link";
import SignOutButton from "@/components/admin/SignOutButton";

export default function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to open this page.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="w-full max-w-lg space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
        403
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {title}
      </h1>
      <p className="text-sm text-slate-400">{message}</p>
      <p className="text-sm">
        <Link
          href="/dashboard/stallions"
          className="text-sky-400/90 hover:text-sky-300 hover:underline"
        >
          Go to Manage Horses
        </Link>
      </p>
    </div>
  );
}

export function NoDashboardAccess({
  userEmail,
}: {
  userEmail: string | null;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060608] px-4 text-slate-200">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-950/70 p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
          No access
        </p>
        <h1 className="text-xl font-semibold text-white">
          This account has no dashboard role
        </h1>
        <p className="text-sm text-slate-400">
          You are signed in
          {userEmail ? (
            <>
              {" "}
              as <span className="text-slate-200">{userEmail}</span>
            </>
          ) : null}
          , but there is no staff profile assigned yet. Ask a platform owner to
          grant access.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
