import { notFound } from "next/navigation";
import AccessDenied from "@/components/admin/AccessDenied";
import BlogPostEditor from "@/components/blog/BlogPostEditor";
import { requireDashboardPage } from "@/services/dashboard-page";
import { fetchBlogAdminPost } from "@/services/blog.server";
import { routing } from "@/i18n/routing";
import { localeDisplayLabels } from "@/utils/blog";

type EditBlogPostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBlogPostPage({
  params,
}: EditBlogPostPageProps) {
  const gate = await requireDashboardPage("owner", "admin");
  if (!gate.ok) return <AccessDenied />;

  const { id } = await params;
  const post = await fetchBlogAdminPost(id);
  if (!post) notFound();

  return (
    <div className="w-full">
      <BlogPostEditor
        post={post}
        locales={routing.locales}
        defaultLocale={routing.defaultLocale}
        localeLabels={localeDisplayLabels(routing.locales)}
      />
    </div>
  );
}
