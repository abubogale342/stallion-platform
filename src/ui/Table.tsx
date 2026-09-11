import { cn } from "@/utils/common";

type TableProps = {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
  /** Extra classes for the horizontal scroll container (e.g. scrollbar styling). */
  wrapperClassName?: string;
};

export function Table({
  children,
  className,
  minWidth = "min-w-225",
  wrapperClassName,
}: TableProps) {
  return (
    <div className={cn("w-full overflow-x-auto", wrapperClassName)}>
      <table
        className={cn(
          "w-full border-collapse text-sm",
          minWidth,
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={className}>{children}</tr>;
}

export function TableHeaderCell({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";
  return (
    <th className={cn("px-4 py-3", alignClass, className)}>{children}</th>
  );
}

export function TableCell({
  children,
  className,
  align,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
}) {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";
  return (
    <td className={cn("px-4 py-3", alignClass, className)} colSpan={colSpan}>{children}</td>
  );
}
