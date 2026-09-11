import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Hosted Supabase projects all match the wildcard below. Local development
 * runs Supabase on http://127.0.0.1:54321, which the wildcard cannot cover, so
 * the pattern is derived from the configured URL instead of hard-coded.
 */
function localSupabasePattern(): RemotePattern[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { protocol, hostname, port } = new URL(url);
    if (protocol !== "http:") return [];
    return [
      {
        protocol: "http",
        hostname,
        ...(port ? { port } : {}),
        pathname: "/storage/v1/object/**",
      },
    ];
  } catch {
    return [];
  }
}

const localPatterns = localSupabasePattern();

/**
 * Next 16 refuses to optimise images from hosts that resolve to a private IP
 * (SSRF protection), which blocks a local Supabase on 127.0.0.1. The escape
 * hatch is enabled only when the configured Supabase URL is itself plain
 * http — i.e. local development. A hosted project is https, so this stays
 * false in production, where the guard matters.
 */
const allowLocalImageHost = localPatterns.length > 0;

const nextConfig: NextConfig = {
  /**
   * BlockNote's server-side renderer reaches into its React package, which
   * calls `createContext` at import time. Loading it as an external module at
   * runtime keeps it out of the React Server Component graph.
   */
  serverExternalPackages: ["@blocknote/server-util"],
  images: {
    dangerouslyAllowLocalIP: allowLocalImageHost,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      ...localPatterns,
    ],
  },
};

export default withNextIntl(nextConfig);
