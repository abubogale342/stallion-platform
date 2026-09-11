"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { PartialBlock } from "@blocknote/core";
import { uploadBlogImage } from "@/services/blog";
import { blogImagePublicUrl } from "@/utils/blog";
import type { BlogBody } from "@/types/blog";

type BlogBodyEditorProps = {
  value: BlogBody;
  onChange: (next: BlogBody) => void;
  /** Changes when the author switches language, so the editor reloads. */
  documentKey: string;
  /** Scopes uploaded images to this post's folder in the bucket. */
  postId: string;
  disabled?: boolean;
};

export default function BlogBodyEditor({
  value,
  onChange,
  documentKey,
  postId,
  disabled,
}: BlogBodyEditorProps) {
  /**
   * Images go to the same public `blog-images` bucket as the featured image,
   * so an author never needs a developer to host a file. BlockNote calls this
   * for the file picker, drag-and-drop and paste alike.
   */
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      const result = await uploadBlogImage(postId || "unassigned", file);
      if (!result.ok) throw new Error(result.error);
      const url = blogImagePublicUrl(result.path);
      if (!url) throw new Error("Could not resolve the uploaded image URL.");
      return url;
    },
    [postId]
  );

  // BlockNote rejects an empty array, so an empty document starts as one
  // paragraph the author can type into.
  const initialContent = useMemo<PartialBlock[]>(
    () =>
      Array.isArray(value) && value.length > 0
        ? (value as unknown as PartialBlock[])
        : [{ type: "paragraph" }],
    // Only the initial mount matters; language swaps remount via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentKey]
  );

  const editor = useCreateBlockNote(
    { initialContent, uploadFile },
    [documentKey]
  );

  useEffect(() => {
    editor.isEditable = !disabled;
  }, [disabled, editor]);

  return (
    <div className="blog-editor-shell overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
      <BlockNoteView
        editor={editor}
        editable={!disabled}
        theme="dark"
        onChange={() => {
          onChange(editor.document as unknown as BlogBody);
        }}
      />
    </div>
  );
}
