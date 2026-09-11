import FathomAnalytics from "@/components/analytics/FathomAnalytics";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <div className="mx-auto w-full max-w-md py-12 text-center text-sm text-zinc-500">
      Loading…
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="py-12">
      <FathomAnalytics />
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
