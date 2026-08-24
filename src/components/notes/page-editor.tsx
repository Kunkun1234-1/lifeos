"use client";

import { useEffect, useRef } from "react";
import { zh } from "@blocknote/core/locales";
import { BlockNoteView, type Theme } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
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

const blockNoteTheme: Theme = {
  colors: {
    editor: { text: "#22332c", background: "#fbfaed" },
    menu: { text: "#22332c", background: "#fffef5" },
    tooltip: { text: "#eef5d9", background: "#063b2f" },
    hovered: { text: "#0d4f3a", background: "#edf3df" },
    selected: { text: "#ffffff", background: "#0d7050" },
    disabled: { text: "#9aa18f", background: "#f2f1e4" },
    shadow: "rgba(13, 53, 39, 0.16)",
    border: "#d8dbc6",
    sideMenu: "#87917c",
  },
  borderRadius: 6,
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
};

async function uploadEditorFile(file: File) {
  const form = new FormData();
  form.set("file", file);
  const { url } = await api<{ url: string }>("/api/upload", {
    method: "POST",
    body: form,
    backend: true,
  });
  return url;
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
  const loadedNoteId = useRef<string | null>(null);
  const suppressEditorChange = useRef(false);
  const editor = useCreateBlockNote(
    {
      dictionary: {
        ...zh,
        placeholders: {
          ...zh.placeholders,
          default: "输入内容，或按 / 唤起命令",
          heading: "标题",
        },
      },
      uploadFile: uploadEditorFile,
    },
    [noteId],
  );

  useEffect(() => {
    if (loadedNoteId.current === noteId) return;
    loadedNoteId.current = noteId;
    suppressEditorChange.current = true;

    try {
      const blocks = editor.tryParseMarkdownToBlocks(body || "");
      editor.replaceBlocks(
        editor.document,
        blocks.length > 0 ? blocks : [{ type: "paragraph" }],
      );
    } finally {
      suppressEditorChange.current = false;
    }
  }, [body, editor, noteId]);

  return (
    <div className={`${styles.editor} ${reading ? styles.editorReading : ""}`}>
      <div className={styles.titleRow}>
        <input
          className={styles.titleInput}
          value={title}
          disabled={disabled || reading}
          placeholder="未命名页面"
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>

      <BlockNoteView
        className={styles.blockEditor}
        data-testid="note-block-editor"
        editor={editor}
        editable={!disabled && !reading}
        theme={blockNoteTheme}
        onChange={(currentEditor) => {
          if (suppressEditorChange.current) return;
          onBodyChange(currentEditor.blocksToMarkdownLossy(currentEditor.document));
        }}
      />
    </div>
  );
}
