"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, FileText, Folder, RotateCcw, Search, Trash2 } from "lucide-react";
import { useNotesTrash, usePermanentlyDeleteNote, useRestoreNote } from "@/hooks/queries";
import { countNoteDescendants } from "@/lib/notes";
import type { NoteDTO } from "@/lib/types";
import styles from "./notes-workspace.module.css";

export function TrashPanel({ onBack }: { onBack: () => void }) {
  const { data: notes, isLoading, error: loadError, refetch } = useNotesTrash();
  const restore = useRestoreNote();
  const remove = usePermanentlyDeleteNote();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pending = restore.isPending || remove.isPending;
  const byId = useMemo(() => new Map((notes ?? []).map((note) => [note.id, note])), [notes]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (notes ?? []).filter((note) => note.title.toLocaleLowerCase().includes(needle));
  }, [notes, query]);

  const restoreNote = async (note: NoteDTO) => {
    setError("");
    setMessage("");
    try {
      const result = await restore.mutateAsync(note.id);
      setMessage(`已恢复「${note.title}」${result.restoredIds.length > 1 ? `及 ${result.restoredIds.length - 1} 个子页面` : ""}${result.note.archived ? "到归档" : "到知识库"}。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "恢复失败，请重试");
    }
  };

  const permanentlyDelete = async (note: NoteDTO) => {
    const descendants = countNoteDescendants(notes ?? [], note.id);
    if (!window.confirm(`彻底删除「${note.title}」${descendants ? `及其 ${descendants} 个子页面` : ""}？此操作不可撤销。`)) return;
    setError("");
    setMessage("");
    try {
      await remove.mutateAsync(note.id);
      setMessage(`已彻底删除「${note.title}」。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试");
    }
  };

  return (
    <section className={styles.trashPanel} aria-label="垃圾桶">
      <div className={styles.trashHeading}>
        <div>
          <h1><Trash2 size={23} />垃圾桶</h1>
          <p>删除的页面和文件夹保留在这里，可随时恢复。彻底删除后无法找回。</p>
        </div>
        <button type="button" className={styles.emptyBtnSecondary} onClick={onBack}>
          <ArrowLeft size={15} />返回知识库
        </button>
      </div>
      <div className={styles.trashToolbar}>
        <label className={styles.searchWrap}>
          <Search size={15} />
          <input className={styles.searchInput} placeholder="搜索已删除的页面…" aria-label="搜索垃圾桶" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <span>{notes?.length ?? 0} 个已删除项目</span>
      </div>
      {message ? <p className={styles.trashMessage} role="status">{message}</p> : null}
      {error ? <p className={styles.createError} role="alert">{error}</p> : null}
      {isLoading ? <div className={styles.treeEmpty}>正在加载垃圾桶…</div> : loadError ? (
        <div className={styles.trashEmpty} role="alert">
          <p>垃圾桶加载失败：{loadError.message}</p>
          <button type="button" className={styles.emptyBtnSecondary} onClick={() => void refetch()}>重试</button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.trashEmpty}>
          <Trash2 size={32} />
          <h2>{query.trim() ? "没有匹配的已删除页面" : "垃圾桶是空的"}</h2>
          <p>{query.trim() ? "试试其他关键词。" : "移入垃圾桶的页面和文件夹会显示在这里。"}</p>
        </div>
      ) : (
        <ul className={styles.trashList} aria-label="已删除的页面">
          {visible.map((note) => {
            const parent = note.parentId ? byId.get(note.parentId) : undefined;
            return (
              <li key={note.id} className={styles.trashRow}>
                <span className={styles.trashIcon}>{note.kind === "folder" ? <Folder size={20} /> : <FileText size={20} />}</span>
                <div className={styles.trashDetails}>
                  <strong>{note.title || "未命名页面"}</strong>
                  <small>
                    {note.deletedAt ? `${new Date(note.deletedAt).toLocaleString("zh-CN")} 删除` : "已删除"}
                    {note.archived ? " · 原为归档页面" : ""}
                    {parent ? ` · 位于「${parent.title}」` : ""}
                  </small>
                </div>
                <div className={styles.trashActions}>
                  <button type="button" className={styles.emptyBtnSecondary} disabled={pending} aria-label={`恢复 ${note.title}`} onClick={() => void restoreNote(note)}>
                    <RotateCcw size={14} />{restore.isPending && restore.variables === note.id ? "恢复中…" : "恢复"}
                  </button>
                  <button type="button" className={styles.trashDelete} disabled={pending} aria-label={`彻底删除 ${note.title}`} onClick={() => void permanentlyDelete(note)}>
                    <Trash2 size={14} />{remove.isPending && remove.variables === note.id ? "删除中…" : "彻底删除"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
