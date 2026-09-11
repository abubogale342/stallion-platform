"use client";

import LocalizedField from "@/components/cms/admin/editor/LocalizedField";
import { saveCmsLayout } from "@/services/cms.server";
import type { CmsHeaderLayout } from "@/types/cms";
import { normalizeHeaderLayout } from "@/utils/cms-layout-i18n";
import Link from "next/link";
import Button, { buttonClassName } from "@/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const FIELDS: { key: keyof CmsHeaderLayout; label: string }[] = [
  { key: "brand", label: "Brand name" },
  { key: "registry", label: "Registry (home link)" },
  { key: "stallionDirectory", label: "Stallion directory" },
  { key: "mareDirectory", label: "Mare directory" },
  { key: "blog", label: "Blog" },
  { key: "about", label: "About" },
  { key: "pricing", label: "Pricing" },
  { key: "resources", label: "Resources menu" },
  { key: "commercialDirectory", label: "Commercial directory" },
  { key: "associationsRegistries", label: "Associations & registries" },
  { key: "login", label: "Login button" },
];

export default function CmsHeaderEditor({
  initialLayout,
  initialPublished,
}: {
  initialLayout: CmsHeaderLayout;
  initialPublished: boolean;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<CmsHeaderLayout>(initialLayout);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: keyof CmsHeaderLayout, value: CmsHeaderLayout[typeof key]) {
    setLayout((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const res = await saveCmsLayout("header", {
      layout: normalizeHeaderLayout(layout),
      published,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast.error("Save failed", { description: res.error });
      return;
    }
    toast.success("Header saved", {
      description: published
        ? "Site header is live on the public site."
        : "Header saved as unpublished (messages fallback on the public site).",
    });
    router.refresh();
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Edit: Site header</h1>
        <p className="mt-2 text-sm text-slate-500">
          Navigation labels for the public site header. Unpublished or missing content falls back to
          message files.
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
            When off, the header uses default translations from message files.
          </span>
        </span>
      </label>

      <div className="space-y-6 rounded-xl border border-slate-800/90 bg-slate-950/50 p-4 sm:p-6">
        {FIELDS.map(({ key, label }) => (
          <LocalizedField
            key={key}
            label={label}
            value={layout[key]}
            onChange={(next) => updateField(key, next)}
          />
        ))}
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
