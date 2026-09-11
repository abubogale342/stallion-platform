function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function HighlightMatch({
  text,
  query,
  className = "rounded-sm bg-[#c09a64]/25 px-0.5 text-[#e8d4a8]",
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={`${part}-${index}`} className={className}>
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}
