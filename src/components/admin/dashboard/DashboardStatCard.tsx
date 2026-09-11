import Link from "next/link";
import StatCard from "@/components/common/StatCard";

export default function DashboardStatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <StatCard variant="admin" label={label} value={value} hint={hint} />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block transition hover:border-sky-500/30 hover:bg-slate-950/60"
      >
        {content}
      </Link>
    );
  }

  return content;
}
