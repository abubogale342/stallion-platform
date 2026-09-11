import type { AdminStallionPublishStatus } from "@/types/admin-stallions";
import Badge from "@/ui/Badge";

export default function PublishStatusBadge({
  status,
}: {
  status: AdminStallionPublishStatus;
}) {
  const isPublished = status === "published";
  return (
    <Badge variant={isPublished ? "success" : "warning"}>
      {isPublished ? "Published" : "Draft"}
    </Badge>
  );
}
