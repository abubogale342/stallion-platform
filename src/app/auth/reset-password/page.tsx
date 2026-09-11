import FathomAnalytics from "@/components/analytics/FathomAnalytics";
import ResetPasswordClient from "@/components/auth/ResetPasswordClient";
import { Suspense } from "react";

export default function ResetPasswordPage() {
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
        <ResetPasswordClient />
      </Suspense>
    </div>
  );
}
