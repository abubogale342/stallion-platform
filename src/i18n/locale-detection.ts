import type { NextRequest } from "next/server";
import { routing } from "./routing";

const LOCALE_COOKIE = "NEXT_LOCALE";

/** Country codes that default to pt-BR on first visit (no saved preference). */
const PORTUGUESE_GEO_COUNTRIES = new Set(["BR"]);

export function getGeoCountry(request: NextRequest): string | null {
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  if (vercelCountry) return vercelCountry.toUpperCase();

  const cfCountry = request.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") return cfCountry.toUpperCase();

  return null;
}

export function hasLocaleCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(LOCALE_COOKIE)?.value);
}

export function hasLocalePrefix(pathname: string): boolean {
  return routing.locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

/**
 * GeoIP hint for first-time visitors: BR → pt-BR before Accept-Language runs.
 * Only applies when there is no locale prefix and no NEXT_LOCALE cookie.
 */
export function resolveGeoLocale(request: NextRequest): string | null {
  if (hasLocalePrefix(request.nextUrl.pathname)) return null;
  if (hasLocaleCookie(request)) return null;

  const country = getGeoCountry(request);
  if (country && PORTUGUESE_GEO_COUNTRIES.has(country)) {
    return "pt-BR";
  }

  return null;
}

export function isPublicLocalizedPath(pathname: string): boolean {
  if (
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname === "/no-access" ||
    pathname.startsWith("/api")
  ) {
    return false;
  }
  return true;
}
