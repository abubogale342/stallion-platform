"use client";

import { load, trackPageview } from "fathom-client";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const siteId = process.env.NEXT_PUBLIC_FATHOM_SITE_ID?.trim();

function buildPageUrl(pathname: string, searchParams: URLSearchParams | null) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function FathomPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!siteId) return;
    load(siteId, { auto: false });
  }, []);

  useEffect(() => {
    if (!siteId || !pathname) return;
    trackPageview({
      url: buildPageUrl(pathname, searchParams),
      referrer: document.referrer,
    });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Privacy-friendly Fathom Analytics for public routes.
 * Renders nothing when `NEXT_PUBLIC_FATHOM_SITE_ID` is unset.
 * Wrap in Suspense because it uses `useSearchParams`.
 */
export default function FathomAnalytics() {
  if (!siteId) return null;

  return (
    <Suspense fallback={null}>
      <FathomPageviewTracker />
    </Suspense>
  );
}
