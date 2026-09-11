"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/ui/Button";
import SignOutButton from "./SignOutButton";
import { ADMIN_NAV, type AppRole } from "@/types/roles";

function NavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={
        active
          ? "flex items-center gap-2 rounded-md border border-sky-500/25 bg-sky-950/40 px-3 py-2 text-sm font-medium text-sky-100"
          : "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
      }
    >
      {children}
    </Link>
  );
}

export default function AdminShell({
  userEmail,
  role,
  children,
}: {
  userEmail: string | null;
  role: AppRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060608] text-slate-200">
      {/* Mobile overlay */}
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={
          mobileNavOpen
            ? "fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col overflow-hidden border-r border-slate-800/90 bg-[#070709] shadow-xl md:static md:w-60 md:shadow-none"
            : "hidden w-60 shrink-0 flex-col overflow-hidden border-r border-slate-800/90 bg-[#070709] md:flex"
        }
      >
        <div className="flex h-14 items-center border-b border-slate-800/80 px-4">
          <Link
            href={role === "data_entry" ? "/dashboard/stallions" : "/dashboard"}
            className="text-sm font-semibold tracking-tight text-white"
            onClick={() => setMobileNavOpen(false)}
          >
            Admin
          </Link>
          <span className="ml-2 rounded border border-sky-500/30 bg-sky-950/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
            Console
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {ADMIN_NAV.filter((item) => item.roles.includes(role)).map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              onNavigate={() => setMobileNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-800/80 bg-[#0c0c0f]/95 px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="unstyled"
              size="none"
              className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 md:hidden"
              aria-expanded={mobileNavOpen}
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">Administration</p>
              <p className="truncate text-xs text-slate-500">Leading Sires Registry</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {userEmail ? (
              <span className="hidden max-w-[200px] truncate text-xs text-slate-500 sm:inline" title={userEmail}>
                {userEmail}
              </span>
            ) : null}
            <SignOutButton />
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
