"use client";

import LocalizedField from "@/components/cms/admin/editor/LocalizedField";
import { saveCmsLayout } from "@/services/cms.server";
import type { CmsFooterLayout } from "@/types/cms";
import { normalizeFooterLayout } from "@/utils/cms-layout-i18n";
import { inputCls, labelCls } from "@/components/cms/admin/editor/styles";
import Link from "next/link";
import Button, { buttonClassName } from "@/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const LOCALIZED_FIELDS: { key: keyof Omit<CmsFooterLayout, "contactEmail">; label: string; multiline?: boolean }[] = [
  { key: "brandTitle", label: "Brand title" },
  { key: "tagline", label: "Tagline" },
  { key: "breeds", label: "Breeds line" },
  { key: "regionsLine1", label: "Regions line 1" },
  { key: "regionsLine2", label: "Regions line 2" },
  { key: "linksHeading", label: "Links heading" },
  { key: "submitListing", label: "Submit listing link" },
  { key: "contactHeading", label: "Contact heading" },
  { key: "copyright", label: "Copyright", multiline: true },
  { key: "termsOfUse", label: "Terms of use" },
  { key: "privacyPolicy", label: "Privacy policy" },
];

export default function CmsFooterEditor({
  initialLayout,
  initialPublished,
}: {
  initialLayout: CmsFooterLayout;
  initialPublished: boolean;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<CmsFooterLayout>(initialLayout);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLocalized<K extends keyof Omit<CmsFooterLayout, "contactEmail">>(
    key: K,
    value: CmsFooterLayout[K]
  ) {
    setLayout((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const res = await saveCmsLayout("footer", {
      layout: normalizeFooterLayout(layout),
      published,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast.error("Save failed", { description: res.error });
      return;
    }
    toast.success("Footer saved", {
      description: published
        ? "Site footer is live on the public site."
        : "Footer saved as unpublished (messages fallback on the public site).",
    });
    router.refresh();
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Edit: Site footer</h1>
        <p className="mt-2 text-sm text-slate-500">
          Footer copy for the public site. Nav link labels in the footer still come from the header
          layout when published.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-600 focus:ring-sky-500"
        />
        <span>
          <span className="font-medium text-slate-200">Published</span>
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            When off, the footer uses default translations from message files.
          </span>
        </span>
      </label>

      <div className="space-y-6 rounded-xl border border-slate-800/90 bg-slate-950/50 p-4 sm:p-6">
        {LOCALIZED_FIELDS.map(({ key, label, multiline }) => (
          <LocalizedField
            key={key}
            label={label}
            value={layout[key]}
            onChange={(next) => updateLocalized(key, next)}
            multiline={multiline}
          />
        ))}

        <div className="space-y-2">
          <label className={labelCls()}>Contact email</label>
          <input
            className={inputCls()}
            type="email"
            value={layout.contactEmail}
            onChange={(e) =>
              setLayout((prev) => ({ ...prev, contactEmail: e.target.value }))
            }
          />
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="border-sky-600 bg-sky-600 text-white hover:bg-sky-500"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Link
          href="/dashboard/pages"
          className={buttonClassName({
            variant: "ghost",
            size: "lg",
            className: "border border-slate-600 text-slate-300 hover:bg-slate-800",
          })}
        >
          Back to pages
        </Link>
      </div>
    </div>
  );
}
