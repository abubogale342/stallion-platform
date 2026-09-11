"use client";

import type { CmsBlock } from "@/types/cms";
import BlockListEditor from "./BlockListEditor";
import AlignSelect from "./AlignSelect";
import LocalizedField from "./LocalizedField";
import Button from "@/ui/Button";
import { inputCls, labelCls } from "./styles";
import {
  emptyLocalized,
  formatPipeTags,
  parsePipeTags,
} from "@/utils/cms-i18n";

export default function SingleBlockEditor({
  block,
  onChange,
}: {
  block: CmsBlock;
  onChange: (b: CmsBlock) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
          <label className={labelCls()}>
            Level
            <select
              className={inputCls()}
              value={block.level}
              onChange={(e) =>
                onChange({
                  ...block,
                  level: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                })
              }
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  H{n}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls()}>
            Align
            <select
              className={inputCls()}
              value={block.align ?? "left"}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...block,
                  align:
                    v === "center" ? "center" : v === "right" ? "right" : "left",
                });
              }}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Text"
              value={block.text}
              onChange={(text) => onChange({ ...block, text })}
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={block.pricingCard ?? false}
              onChange={(e) =>
                onChange({
                  ...block,
                  pricingCard: e.target.checked ? true : undefined,
                })
              }
            />
            <span className={labelCls()}>Pricing card heading</span>
          </label>
        </div>
      );
    case "text":
      return (
        <div className="grid min-w-0 gap-3">
          <label className={labelCls()}>
            Align
            <select
              className={inputCls()}
              value={block.align ?? "left"}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...block,
                  align:
                    v === "center" ? "center" : v === "right" ? "right" : "left",
                });
              }}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <LocalizedField
            label="Content (use blank lines for paragraphs)"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            multiline
            rows={5}
          />
        </div>
      );
    case "button":
      return (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
          <div className="sm:col-span-2">
            <AlignSelect
              value={block.align}
              onChange={(align) => onChange({ ...block, align })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Label"
              value={block.label}
              onChange={(label) => onChange({ ...block, label })}
            />
          </div>
          <label>
            <span className={labelCls()}>Link (href)</span>
            <input
              className={inputCls()}
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
            />
          </label>
          <label>
            <span className={labelCls()}>Variant</span>
            <select
              className={inputCls()}
              value={block.variant ?? "secondary"}
              onChange={(e) =>
                onChange({
                  ...block,
                  variant: e.target.value === "primary" ? "primary" : "secondary",
                })
              }
            >
              <option value="primary">Primary (filled)</option>
              <option value="secondary">Secondary (outline)</option>
            </select>
          </label>
        </div>
      );
    case "buttons":
      return (
        <div className="space-y-4">
          <AlignSelect
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
          {block.items.map((item, j) => (
            <div
              key={j}
              className="grid min-w-0 gap-3 rounded border border-slate-800/80 bg-[#0a0a0b] p-3 sm:grid-cols-3 sm:[&>*]:min-w-0"
            >
              <div className="sm:col-span-3">
                <LocalizedField
                  label="Label"
                  value={item.label}
                  onChange={(label) => {
                    const items = [...block.items];
                    items[j] = { ...items[j], label };
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <label>
                <span className={labelCls()}>Href</span>
                <input
                  className={inputCls()}
                  value={item.href}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[j] = { ...items[j], href: e.target.value };
                    onChange({ ...block, items });
                  }}
                />
              </label>
              <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                <span className={labelCls()}>Variant</span>
                <div className="flex min-w-0 flex-wrap gap-1">
                  <select
                    className={inputCls()}
                    value={item.variant ?? "secondary"}
                    onChange={(e) => {
                      const items = [...block.items];
                      items[j] = {
                        ...items[j],
                        variant: e.target.value === "primary" ? "primary" : "secondary",
                      };
                      onChange({ ...block, items });
                    }}
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="min-w-0 border-red-900/40 px-2 text-xs text-red-400"
                    onClick={() =>
                      onChange({
                        ...block,
                        items: block.items.filter((_, k) => k !== j),
                      })
                    }
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="unstyled"
            size="none"
            className="text-xs text-sky-400 hover:underline"
            onClick={() =>
              onChange({
                ...block,
                items: [
                  ...block.items,
                  { label: emptyLocalized(), href: "/", variant: "secondary" },
                ],
              })
            }
          >
            + Add button
          </Button>
        </div>
      );
    case "image":
      return (
        <div className="grid min-w-0 gap-3">
          <AlignSelect
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
          <label>
            <span className={labelCls()}>Image URL</span>
            <input
              className={inputCls()}
              value={block.src}
              onChange={(e) => onChange({ ...block, src: e.target.value })}
            />
          </label>
          <LocalizedField
            label="Alt text"
            value={block.alt ?? emptyLocalized()}
            onChange={(alt) => onChange({ ...block, alt })}
          />
          <LocalizedField
            label="Caption (optional)"
            value={block.caption ?? emptyLocalized()}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </div>
      );
    case "video":
      return (
        <div className="grid min-w-0 gap-3">
          <AlignSelect
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
          <label>
            <span className={labelCls()}>Video URL (YouTube or link)</span>
            <input
              className={inputCls()}
              value={block.url}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
            />
          </label>
          <LocalizedField
            label="Caption (optional)"
            value={block.caption ?? emptyLocalized()}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </div>
      );
    case "landing_hero": {
      const tagDisplay = formatPipeTags(block.tags);
      const regionDisplay = formatPipeTags(block.regions);

      return (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:[&>*]:min-w-0">
          <label className="sm:col-span-2">
            <span className={labelCls()}>Background image path</span>
            <input
              className={inputCls()}
              value={block.imageSrc ?? ""}
              onChange={(e) => onChange({ ...block, imageSrc: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Overline"
              value={block.overline}
              onChange={(overline) => onChange({ ...block, overline })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Title (first part)"
              value={block.titleBeforeAccent}
              onChange={(titleBeforeAccent) =>
                onChange({ ...block, titleBeforeAccent })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Title accent word"
              value={block.titleAccent}
              onChange={(titleAccent) => onChange({ ...block, titleAccent })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Subtitle"
              value={block.subtitle}
              onChange={(subtitle) => onChange({ ...block, subtitle })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Description"
              value={block.description}
              onChange={(description) => onChange({ ...block, description })}
              multiline
              rows={4}
            />
          </div>
          <label className="sm:col-span-2">
            <span className={labelCls()}>
              Tags — English (use | separator, e.g. Quarter Horses | Paints)
            </span>
            <input
              className={inputCls()}
              value={tagDisplay.en}
              onChange={(e) =>
                onChange({
                  ...block,
                  tags: parsePipeTags(e.target.value, tagDisplay["pt-BR"]),
                })
              }
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls()}>
              Tags — Português (use | separator)
            </span>
            <input
              className={inputCls()}
              value={tagDisplay["pt-BR"]}
              onChange={(e) =>
                onChange({
                  ...block,
                  tags: parsePipeTags(tagDisplay.en, e.target.value),
                })
              }
            />
          </label>
          <div className="sm:col-span-2">
            <LocalizedField
              label="CTA label"
              value={block.cta.label}
              onChange={(label) =>
                onChange({ ...block, cta: { ...block.cta, label } })
              }
            />
          </div>
          <label>
            <span className={labelCls()}>CTA href</span>
            <input
              className={inputCls()}
              value={block.cta.href}
              onChange={(e) =>
                onChange({ ...block, cta: { ...block.cta, href: e.target.value } })
              }
            />
          </label>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Secondary CTA label"
              value={block.secondaryCta?.label ?? emptyLocalized()}
              onChange={(label) =>
                onChange({
                  ...block,
                  secondaryCta: {
                    href: block.secondaryCta?.href ?? "/mares",
                    label,
                  },
                })
              }
            />
          </div>
          <label>
            <span className={labelCls()}>Secondary CTA href</span>
            <input
              className={inputCls()}
              value={block.secondaryCta?.href ?? ""}
              onChange={(e) =>
                onChange({
                  ...block,
                  secondaryCta: {
                    label: block.secondaryCta?.label ?? emptyLocalized(),
                    href: e.target.value,
                  },
                })
              }
            />
          </label>

          <div className="sm:col-span-2 h-px bg-slate-800/80" />

          <div className="sm:col-span-2">
            <LocalizedField
              label="Reference left title"
              value={block.referenceLeftTitle}
              onChange={(referenceLeftTitle) =>
                onChange({ ...block, referenceLeftTitle })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Reference left text"
              value={block.referenceLeftText}
              onChange={(referenceLeftText) =>
                onChange({ ...block, referenceLeftText })
              }
              multiline
              rows={4}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Reference right title"
              value={block.referenceRightTitle}
              onChange={(referenceRightTitle) =>
                onChange({ ...block, referenceRightTitle })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Reference right text"
              value={block.referenceRightText}
              onChange={(referenceRightText) =>
                onChange({ ...block, referenceRightText })
              }
              multiline
              rows={4}
            />
          </div>

          <div className="sm:col-span-2 h-px bg-slate-800/80" />

          <div className="sm:col-span-2">
            <LocalizedField
              label="Industry section title"
              value={block.industryTitle}
              onChange={(industryTitle) => onChange({ ...block, industryTitle })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Industry section text"
              value={block.industryText}
              onChange={(industryText) => onChange({ ...block, industryText })}
              multiline
              rows={4}
            />
          </div>
          <label className="sm:col-span-2">
            <span className={labelCls()}>Regions — English (use | separator)</span>
            <input
              className={inputCls()}
              value={regionDisplay.en}
              onChange={(e) =>
                onChange({
                  ...block,
                  regions: parsePipeTags(e.target.value, regionDisplay["pt-BR"]),
                })
              }
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls()}>Regions — Português (use | separator)</span>
            <input
              className={inputCls()}
              value={regionDisplay["pt-BR"]}
              onChange={(e) =>
                onChange({
                  ...block,
                  regions: parsePipeTags(regionDisplay.en, e.target.value),
                })
              }
            />
          </label>

          <div className="sm:col-span-2 space-y-2">
            <span className={labelCls()}>Stats (4 items)</span>
            {block.stats.map((item, idx) => (
              <div
                key={`stat-${idx}`}
                className="grid gap-2 rounded border border-slate-800/80 bg-[#0a0a0b] p-2"
              >
                <LocalizedField
                  label="Value"
                  value={item.value}
                  onChange={(value) => {
                    const stats = [...block.stats];
                    stats[idx] = { ...stats[idx], value };
                    onChange({ ...block, stats });
                  }}
                />
                <LocalizedField
                  label="Label"
                  value={item.label}
                  onChange={(label) => {
                    const stats = [...block.stats];
                    stats[idx] = { ...stats[idx], label };
                    onChange({ ...block, stats });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="sm:col-span-2">
            <LocalizedField
              label="Learn more label"
              value={block.learnMore.label}
              onChange={(label) =>
                onChange({
                  ...block,
                  learnMore: { ...block.learnMore, label },
                })
              }
            />
          </div>
          <label>
            <span className={labelCls()}>Learn more href</span>
            <input
              className={inputCls()}
              value={block.learnMore.href}
              onChange={(e) =>
                onChange({
                  ...block,
                  learnMore: { ...block.learnMore, href: e.target.value },
                })
              }
            />
          </label>

          <div className="sm:col-span-2 h-px bg-slate-800/80" />

          <div className="sm:col-span-2">
            <LocalizedField
              label="Ready section title"
              value={block.readyTitle}
              onChange={(readyTitle) => onChange({ ...block, readyTitle })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Ready section subtitle"
              value={block.readySubtitle}
              onChange={(readySubtitle) => onChange({ ...block, readySubtitle })}
            />
          </div>
          <div className="sm:col-span-2">
            <LocalizedField
              label="Ready CTA label"
              value={block.readyCta.label}
              onChange={(label) =>
                onChange({
                  ...block,
                  readyCta: { ...block.readyCta, label },
                })
              }
            />
          </div>
          <label>
            <span className={labelCls()}>Ready CTA href</span>
            <input
              className={inputCls()}
              value={block.readyCta.href}
              onChange={(e) =>
                onChange({
                  ...block,
                  readyCta: { ...block.readyCta, href: e.target.value },
                })
              }
            />
          </label>
        </div>
      );
    }
    case "grid": {
      const cols = block.columns;
      return (
        <div className="min-w-0 space-y-6">
          <AlignSelect
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
          />
          <label className={labelCls()}>
            Columns
            <select
              className={inputCls()}
              value={cols}
              onChange={(e) => {
                const n = Number(e.target.value) as 2 | 3;
                const prev = block.cells;
                const nextCells: CmsBlock[][] = [];
                for (let c = 0; c < n; c++) {
                  nextCells[c] = prev[c] ?? [];
                }
                onChange({ ...block, columns: n, cells: nextCells });
              }}
            >
              <option value={2}>2 columns</option>
              <option value={3}>3 columns</option>
            </select>
          </label>
          {block.cells.map((cell, ci) => (
            <div
              key={ci}
              className="min-w-0 overflow-hidden rounded-lg border border-slate-800/90 bg-[#0a0a0b] p-3 ring-1 ring-slate-800/40"
            >
              <p className="mb-4 text-[10px] font-semibold uppercase text-slate-500">
                Column {ci + 1}
              </p>
              <BlockListEditor
                blocks={cell}
                nested
                onChange={(newCell) => {
                  const cells = [...block.cells];
                  cells[ci] = newCell;
                  onChange({ ...block, cells });
                }}
              />
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
