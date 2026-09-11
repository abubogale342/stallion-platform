import type { CSSProperties } from "react";
import type { PedigreeChartCell } from "@/types/stallion";
import PedigreeCellLabel from "./PedigreeCellLabel";

export default function PedigreeRow({
  cell,
  style,
  showColumnBorder,
  isMobile,
}: {
  cell: PedigreeChartCell;
  style: CSSProperties;
  showColumnBorder: boolean;
  isMobile: boolean;
}) {
  const tone = cell.kind === "female" ? "bg-pedigree-female" : "bg-surface";
  const metaDisplayLines = cell.meta_lines.flatMap((line) =>
    line
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  );

  return (
    <div
      style={style}
      className={`flex h-full min-h-0 w-full min-w-0 self-stretch items-center justify-center overflow-visible border-b border-white/10 px-3 py-3 text-center md:px-4 md:py-3 ${
        showColumnBorder ? "border-r border-white/10" : ""
      } ${tone}`}
    >
      <div className="relative min-w-0 w-full max-w-full">
        <PedigreeCellLabel cell={cell} isMobile={isMobile} />
        {metaDisplayLines.map((line, idx) => (
          <p
            key={`${cell.key}-meta-${idx}`}
            className={`text-sm leading-snug text-white/45 break-words ${idx === 0 ? "mt-2" : "mt-1"}`}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
