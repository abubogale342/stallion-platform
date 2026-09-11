import FathomAnalytics from "@/components/analytics/FathomAnalytics";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="py-12">
      <FathomAnalytics />
      <ForgotPasswordForm />
    </div>
  );
}
