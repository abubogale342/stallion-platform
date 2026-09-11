"use client";

import type { LocalizedString } from "@/types/cms";
import { inputCls, labelCls } from "./styles";

export default function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: LocalizedString;
  onChange: (next: LocalizedString) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-3">
      <p className={labelCls()}>{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            English
          </span>
          {multiline ? (
            <textarea
              className={`${inputCls()} min-h-[80px] font-sans`}
              rows={rows}
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
            />
          ) : (
            <input
              className={inputCls()}
              value={value.en}
              onChange={(e) => onChange({ ...value, en: e.target.value })}
            />
          )}
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Português (pt-BR)
          </span>
          {multiline ? (
            <textarea
              className={`${inputCls()} min-h-[80px] font-sans`}
              rows={rows}
              value={value["pt-BR"]}
              onChange={(e) => onChange({ ...value, "pt-BR": e.target.value })}
            />
          ) : (
            <input
              className={inputCls()}
              value={value["pt-BR"]}
              onChange={(e) => onChange({ ...value, "pt-BR": e.target.value })}
            />
          )}
        </label>
      </div>
    </div>
  );
}
