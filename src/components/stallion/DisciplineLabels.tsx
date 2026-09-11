import Chip from "@/ui/Chip";

type DisciplineLabelsProps = {
  labels: string[];
  variant?: "directory" | "profile";
};

export default function DisciplineLabels({
  labels,
  variant = "directory",
}: DisciplineLabelsProps) {
  const items = labels.map((label) => label.trim()).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((label) => (
        <Chip key={label} variant={variant}>
          {label}
        </Chip>
      ))}
    </div>
  );
}
