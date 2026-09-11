import FathomAnalytics from "@/components/analytics/FathomAnalytics";
import AcceptInviteClient from "@/components/auth/AcceptInviteClient";
import { Suspense } from "react";

export default function AcceptInvitePage() {
  return (
    <div className="py-12">
      <FathomAnalytics />
      <Suspense
        fallback={
          <p className="mx-auto max-w-md text-center text-sm text-zinc-500">
            Loading…
          </p>
        }
      >
        <AcceptInviteClient />
      </Suspense>
    </div>
  );
}
