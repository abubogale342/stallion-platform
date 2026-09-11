import AccessDenied from "@/components/admin/AccessDenied";
import BlogPostEditor from "@/components/blog/BlogPostEditor";
import { requireDashboardPage } from "@/services/dashboard-page";
import { routing } from "@/i18n/routing";
import { localeDisplayLabels } from "@/utils/blog";

export default async function NewBlogPostPage() {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) return <AccessDenied />;

  return (
    <div className="w-full">
      <BlogPostEditor
        post={null}
        locales={routing.locales}
        defaultLocale={routing.defaultLocale}
        localeLabels={localeDisplayLabels(routing.locales)}
      />
    </div>
  );
}
