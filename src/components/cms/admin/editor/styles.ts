export function labelCls() {
  return "block text-[11px] font-medium uppercase tracking-wide text-slate-500";
}

export function inputCls() {
  return "mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white";
}

export function blockCardShellClass(nested: boolean | undefined) {
  return [
    "relative z-0 w-full min-w-0 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#0c0c0f] p-4 shadow-sm ring-1 ring-slate-800/60",
    nested ? "border-slate-800/80" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
