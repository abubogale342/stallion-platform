"use client";

import { useEffect } from "react";

/**
 * Sets `document.title` while a route's loading.tsx skeleton is shown.
 *
 * Next 16 streams metadata, so during a client-side navigation the previous
 * title is cleared and the new page's async `generateMetadata` hasn't resolved
 * yet — leaving the tab showing the URL. Rendering this inside loading.tsx fills
 * that gap with a stable title; Next overrides it with the resolved metadata
 * once the page commits.
 */
export default function LoadingDocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
