import type { CmsAlign } from "@/types/cms";
import { inputCls, labelCls } from "./styles";

export default function AlignSelect({
  value,
  onChange,
}: {
  value: CmsAlign | undefined;
  onChange: (v: CmsAlign) => void;
}) {
  return (
    <label className={labelCls()}>
      Align
      <select
        className={inputCls()}
        value={value ?? "left"}
        onChange={(e) => {
          const v = e.target.value;
          onChange(
            v === "center" ? "center" : v === "right" ? "right" : "left"
          );
        }}
      >
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </label>
  );
}
