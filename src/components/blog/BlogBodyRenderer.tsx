import type { PartialBlock } from "@blocknote/core";
import type { BlogBody } from "@/types/blog";
import { isBlogBodyEmpty } from "@/utils/blog";

/**
 * Renders a stored BlockNote document on the server.
 *
 * `blocksToHTMLLossy` walks the block tree and emits plain semantic HTML —
 * headings, paragraphs, lists, images, links — which `.blog-body` in
 * globals.css styles. Because the source is a structured block array rather
 * than an HTML string, only block types the editor knows about can produce
 * output, so no sanitiser is needed on this path.
 */
/**
 * `blocksToHTMLLossy` emits editor-flavoured markup. These are the fixes an
 * audit of every block type turned up — each one is a defect on a public,
 * indexable page rather than a cosmetic preference.
 */
function normalizeSerializedHtml(html: string): string {
  return (
    html
      // An empty block serialises as U+FFFC (OBJECT REPLACEMENT CHARACTER),
      // which browsers draw as a [OBJ] box. Strip the glyph, keep the empty
      // element: a blank line is deliberate spacing.
      .replace(/\uFFFC/g, "")
      // React's `className` leaks as the invalid attribute `classname`.
      .replace(/\sclassname="/g, ' class="')
      // Checklist items serialise as live checkboxes. A reader must not be
      // able to toggle them — nothing would be saved.
      .replace(/<input type="checkbox"/g, '<input disabled type="checkbox"')
      // The page title is already the h1. A second one in the body is an
      // accessibility and SEO problem, so body headings start at h2.
      .replace(/<(\/?)h1(\s|>)/g, "<$1h2$2")
      // Tables need their own scroll container or a wide one breaks the
      // article layout on a phone.
      .replace(/<table/g, '<div class="blog-table-wrap"><table')
      .replace(/<\/table>/g, "</table></div>")
  );
}

export default async function BlogBodyRenderer({ body }: { body: BlogBody }) {
  // TEMPORARY DIAGNOSTIC: emits an HTML comment naming why the body is absent,
  // so a production failure is visible with curl. Remove once the cause of the
  // blank body on Vercel is understood.
  const debug = (reason: string) => (
    <div hidden data-blog-body-debug={reason} />
  );

  if (isBlogBodyEmpty(body)) return debug("isBlogBodyEmpty");

  let html = "";
  try {
    // Imported here rather than at module scope: `@blocknote/server-util` is an
    // external server package (see next.config.ts), so it resolves at runtime
    // rather than being bundled. Its jsdom chain reaches ESM-only packages
    // through `require()`, which needs Node >= 22.12 (or 20.19+); Node
    // 22.0-22.11 throws ERR_REQUIRE_ESM. Hence the 24.x pin in package.json --
    // this local import only limits the blast radius if that ever regresses.
    const { ServerBlockNoteEditor } = await import("@blocknote/server-util");
    const editor = ServerBlockNoteEditor.create();
    html = await editor.blocksToHTMLLossy(
      body as unknown as PartialBlock[]
    );

    html = normalizeSerializedHtml(html);
  } catch (error) {
    // A malformed document, or a renderer that will not load, should not take
    // the whole post page down: the title, date and image still render. Log it
    // though -- swallowing this silently makes a blank body indistinguishable
    // from a post that genuinely has none.
    console.error("[BlogBodyRenderer] failed to render post body:", error);
    return debug(`threw: ${error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)}`);
  }

  if (!html.trim()) return debug("empty-html");

  return (
    <div
      className="blog-body space-y-4 text-slate-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
