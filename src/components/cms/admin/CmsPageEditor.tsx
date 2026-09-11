"use client";

import CmsGuiEditor from "@/components/cms/admin/CmsGuiEditor";
import LocalizedField from "@/components/cms/admin/editor/LocalizedField";
import { CMS_DEFAULTS } from "@/utils/cms";
import { CMS_SLUG_LABELS } from "@/utils/cms";
import { parseCmsBlocks } from "@/utils/cms";
import { emptyLocalized, normalizeLocalizedTitle } from "@/utils/cms-i18n";
import { saveCmsPage } from "@/services/cms.server";
import type { CmsBlock, CmsSlug, LocalizedString } from "@/types/cms";
import Link from "next/link";
import Button, { buttonClassName } from "@/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CmsPageEditor({
  slug,
  initialTitle,
  initialBlocks,
  initialPublished,
}: {
  slug: CmsSlug;
  initialTitle: LocalizedString | null;
  initialBlocks: CmsBlock[];
  initialPublished: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState<LocalizedString>(
    initialTitle ?? emptyLocalized()
  );
  const [published, setPublished] = useState(initialPublished);
  const [blocks, setBlocks] = useState<CmsBlock[]>(initialBlocks);
  const [jsonText, setJsonText] = useState(JSON.stringify(initialBlocks, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyFromGui(next: CmsBlock[]) {
    setBlocks(next);
    setJsonText(JSON.stringify(next, null, 2));
    setError(null);
  }

  function syncJsonToBlocks(fromBlur?: boolean) {
    try {
      const raw = JSON.parse(jsonText);
      const parsed = parseCmsBlocks(raw);
      if (!parsed.ok) {
        if (!fromBlur) {
          toast.error("JSON does not match block schema", { description: parsed.error });
        }
        return;
      }
      setBlocks(parsed.blocks);
      setJsonText(JSON.stringify(parsed.blocks, null, 2));
      setError(null);
      if (!fromBlur) {
        toast.success("JSON applied to visual editor");
      }
    } catch {
      if (!fromBlur) {
        toast.error("Invalid JSON", { description: "Fix syntax and try again." });
      }
    }
  }

  async function handleSave() {
    setError(null);
    let payload: unknown;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      const msg = "Invalid JSON — check syntax.";
      setError(msg);
      toast.error("Could not save", { description: msg });
      return;
    }
    setSaving(true);
    const res = await saveCmsPage(slug, {
      title: normalizeLocalizedTitle(title),
      blocks: payload,
      published,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast.error("Save failed", { description: res.error });
      return;
    }
    toast.success("Page saved", {
      description: published
        ? `${CMS_SLUG_LABELS[slug]} — live on the public site.`
        : `${CMS_SLUG_LABELS[slug]} — saved as unpublished (hidden on the public site).`,
    });
    router.refresh();
  }

  function loadDefaults() {
    const d = CMS_DEFAULTS[slug];
    setBlocks(d);
    setJsonText(JSON.stringify(d, null, 2));
    setError(null);
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Edit: {CMS_SLUG_LABELS[slug]}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Content is stored in Supabase (<code className="text-slate-400">cms_pages</code>). Use the
          visual editor or edit JSON — blur the JSON panel or click &quot;Apply JSON&quot; to sync
          JSON → visual.
        </p>
      </div>

      <div className="space-y-4">
        <LocalizedField
          label="Page title (optional)"
          value={title}
          onChange={setTitle}
        />
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
              When off, this page&apos;s CMS content is not shown on the public site (navbar/footer
              still appear).
            </span>
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:items-start xl:gap-10">
        <div className="isolate min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-800/90 bg-[#0c0c0f]/95 p-4 shadow-sm ring-1 ring-slate-800/50">
          <CmsGuiEditor blocks={blocks} onChange={applyFromGui} />
        </div>

        <div className="min-w-0 max-w-full space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-400">JSON</label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => syncJsonToBlocks(false)}
                className="border border-slate-600 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Apply JSON
              </Button>
              <Button
                type="button"
                variant="unstyled"
                size="none"
                onClick={loadDefaults}
                className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
              >
                Load site defaults
              </Button>
            </div>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onBlur={() => syncJsonToBlocks(true)}
            spellCheck={false}
            className="min-h-[420px] w-full rounded border border-slate-700 bg-[#0a0a0c] px-3 py-2 font-mono text-xs leading-relaxed text-slate-200"
          />
          <p className="text-[11px] text-slate-600">
            Tab out of this field or use Apply JSON to validate and update the visual editor.
          </p>
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
