import { cn } from "@/utils/common";

type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded bg-zinc-800", className)}
      aria-hidden
    />
  );
}
