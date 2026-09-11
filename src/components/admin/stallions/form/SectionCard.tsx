import Card from "@/ui/Card";

export default function SectionCard({
  title,
  children,
  headerAction,
}: {
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <Card
      as="section"
      className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-4 sm:p-5"
    >
      <Card.Header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {headerAction}
      </Card.Header>
      <Card.Body className="mt-4 space-y-4">{children}</Card.Body>
    </Card>
  );
}
