"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  ImagePlus,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import { api } from "@/lib/fetcher";
import styles from "./notes-workspace.module.css";

type PageEditorProps = {
  noteId: string;
  title: string;
  body: string;
  reading?: boolean;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  disabled?: boolean;
};

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.toolbarBtn}${active ? ` ${styles.toolbarBtnActive}` : ""}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export function PageEditor({
  noteId,
  title,
  body,
  reading = false,
  onTitleChange,
  onBodyChange,
  disabled,
}: PageEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastNoteId = useRef(noteId);
  const skipNextUpdate = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Placeholder.configure({
        placeholder: "输入内容，或用 # / ## 做标题…",
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: body || "",
    editable: !disabled && !reading,
    onUpdate: ({ editor: ed }) => {
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        return;
      }
      const storage = ed.storage as {
        markdown?: { getMarkdown: () => string };
      };
      onBodyChange(storage.markdown?.getMarkdown() ?? "");
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (lastNoteId.current !== noteId) {
      lastNoteId.current = noteId;
      skipNextUpdate.current = true;
      setToolsOpen(false);
      editor.commands.setContent(body || "");
    }
  }, [editor, noteId, body]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled && !reading);
  }, [editor, disabled, reading]);

  const uploadImage = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const { url } = await api<{ url: string }>("/api/upload", {
        method: "POST",
        body: form,
        backend: true,
      });
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("链接 URL", prev ?? "https://");
    if (next === null) return;
    if (!next.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next.trim() }).run();
  };

  return (
    <div className={`${styles.editor} ${reading ? styles.editorReading : ""}`}>
      <div className={styles.titleRow}>
        <input
          className={styles.titleInput}
          value={title}
          disabled={disabled || reading}
          placeholder="未命名页面"
          onChange={(e) => onTitleChange(e.target.value)}
        />
        {!reading ? (
          <button
            type="button"
            className={styles.editorToolsToggle}
            title={toolsOpen ? "收起编辑工具" : "更多编辑工具"}
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((value) => !value)}
          >
            <MoreHorizontal size={18} />
          </button>
        ) : null}
      </div>

      {editor && !reading && toolsOpen ? (
        <div className={styles.toolbar}>
          <ToolbarButton
            title="一级标题"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="二级标题"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="三级标题"
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 size={15} />
          </ToolbarButton>
          <span className={styles.toolbarSep} />
          <ToolbarButton
            title="粗体"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="斜体"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="代码"
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code size={15} />
          </ToolbarButton>
          <span className={styles.toolbarSep} />
          <ToolbarButton
            title="无序列表"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="有序列表"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="引用"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={15} />
          </ToolbarButton>
          <ToolbarButton
            title="分隔线"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={15} />
          </ToolbarButton>
          <span className={styles.toolbarSep} />
          <ToolbarButton title="插入链接" active={editor.isActive("link")} onClick={setLink}>
            <Link2 size={15} />
          </ToolbarButton>
          <ToolbarButton
            title={uploading ? "上传中…" : "插入图片"}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={15} />
          </ToolbarButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadImage(f);
            }}
          />
        </div>
      ) : null}

      <EditorContent editor={editor} className={styles.prose} />
    </div>
  );
}
