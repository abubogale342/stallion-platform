import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  hasLocalePrefix,
  isPublicLocalizedPath,
  resolveGeoLocale,
} from "@/i18n/locale-detection";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Vercel stops middleware that has not responded within 25s, which turns one
 * slow auth call into a 504 on every route the matcher covers. Give up long
 * before that and treat the request as signed out.
 */
const AUTH_TIMEOUT_MS = 3000;

/** Aborts the auth request instead of letting it hold the invocation open. */
const authFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) });

/**
 * @supabase/ssr keeps the session in `sb-<ref>-auth-token`, split into `.0`/`.1`
 * when it outgrows one cookie. Without it there is no session to read or
 * refresh, so anonymous traffic can skip the round trip entirely.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
}

/** Never throws: a timed-out or failed lookup resolves to null (signed out). */
async function getUserOrNull(
  supabase: ReturnType<typeof createServerClient>
): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Only allow same-origin path redirects (prevents open redirects). */
function safeRedirectPath(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/dashboard";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";
  return trimmed;
}

async function applySupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  if (!hasAuthCookie(request)) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: authFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await getUserOrNull(supabase);
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!isPublicLocalizedPath(path)) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { fetch: authFetch },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const user = hasAuthCookie(request) ? await getUserOrNull(supabase) : null;

    if (user && path === "/login") {
      const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next, request.url));
    }

    if (!user && path.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    return response;
  }

  const geoLocale = resolveGeoLocale(request);
  if (geoLocale && !hasLocalePrefix(path)) {
    const url = request.nextUrl.clone();
    const suffix = path === "/" ? "" : path;
    url.pathname = `/${geoLocale}${suffix}`;
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(request);
  return applySupabaseSession(request, intlResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
