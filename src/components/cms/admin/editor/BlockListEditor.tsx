"use client";

import type { CmsBlock } from "@/types/cms";
import { useId } from "react";
import SingleBlockEditor from "./SingleBlockEditor";
import { CMS_BLOCK_DEFAULTS } from "./block-defaults";
import Button from "@/ui/Button";
import { blockCardShellClass, inputCls, labelCls } from "./styles";

export default function BlockListEditor({
  blocks,
  onChange,
  nested,
}: {
  blocks: CmsBlock[];
  onChange: (next: CmsBlock[]) => void;
  nested?: boolean;
}) {
  const baseId = useId();

  function updateAt(i: number, block: CmsBlock) {
    const next = [...blocks];
    next[i] = block;
    onChange(next);
  }

  function removeAt(i: number) {
    onChange(blocks.filter((_, j) => j !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  function addBlock(type: CmsBlock["type"]) {
    onChange([...blocks, structuredClone(CMS_BLOCK_DEFAULTS[type])]);
  }

  return (
    <div
      className={
        nested
          ? "isolate flex w-full min-w-0 flex-col gap-5"
          : "isolate flex w-full min-w-0 flex-col gap-6"
      }
    >
      {blocks.map((block, i) => (
        <div
          key={`${baseId}-${block.type}-${i}`}
          className={blockCardShellClass(nested)}
        >
          <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wider text-sky-500/90">
              {block.type}
              {nested ? ` · cell` : ""}
            </span>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >
                Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(i, 1)}
                disabled={i === blocks.length - 1}
                className="border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >
                Down
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeAt(i)}
                className="border-red-900/50 px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-950/40"
              >
                Remove
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <SingleBlockEditor block={block} onChange={(b) => updateAt(i, b)} />
          </div>
        </div>
      ))}

      <div className={blockCardShellClass(nested)}>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Add block
        </p>
        <label className="block w-full max-w-md min-w-0">
          <span className={labelCls()}>Block type</span>
          <select
            className={`${inputCls()} mt-1`}
            defaultValue=""
            aria-label="Choose block type to add"
            onChange={(e) => {
              const t = e.target.value as CmsBlock["type"] | "";
              e.target.value = "";
              if (t) addBlock(t);
            }}
          >
            <option value="" disabled>
              Choose type…
            </option>
            <option value="heading">Heading</option>
            <option value="text">Text</option>
            <option value="button">Button</option>
            <option value="buttons">Button group</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="landing_hero">Landing hero</option>
            <option value="grid">Grid</option>
          </select>
        </label>
      </div>
    </div>
  );
}
