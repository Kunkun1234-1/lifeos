"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageTree } from "./page-tree";
import { PageEditor } from "./page-editor";
import { PageProperties } from "./page-properties";
import {
  useNotesTree,
  useNote,
  useCreateNote,
  useUpdateNote,
  useMoveNote,
  useDeleteNote,
  useGoals,
  useProjects,
} from "@/hooks/queries";
import { countNoteDescendants } from "@/lib/notes";
import type { NoteDTO } from "@/lib/types";
import styles from "./notes-workspace.module.css";

type NotesWorkspaceProps = {
  initialId?: string | null;
};

export function NotesWorkspace({ initialId = null }: NotesWorkspaceProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NoteDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Record<string, unknown>>({});

  const archived = showArchived ? ("1" as const) : ("0" as const);
  const { data: treeData, isLoading: treeLoading } = useNotesTree(archived);
  const { data: note, isLoading: noteLoading } = useNote(selectedId);
  const { data: goals } = useGoals();
  const { data: projects } = useProjects();

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const moveNote = useMoveNote();
  const deleteNote = useDeleteNote();

  const forest = treeData?.forest ?? [];
  const flatNodes = treeData?.nodes ?? [];

  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  // Auto-select first page when none selected
  useEffect(() => {
    if (selectedId || treeLoading) return;
    if (flatNodes.length > 0) {
      setSelectedId(flatNodes[0].id);
    }
  }, [selectedId, treeLoading, flatNodes]);

  useEffect(() => {
    if (note) {
      setDraft(note);
      pendingPatch.current = {};
    } else if (!selectedId) {
      setDraft(null);
    }
  }, [note, selectedId]);

  const flushSave = useCallback(async () => {
    if (!selectedId) return;
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};
    setSaving(true);
    try {
      await updateNote.mutateAsync({ id: selectedId, body: patch });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [selectedId, updateNote]);

  const scheduleSave = useCallback(
    (patch: Record<string, unknown>) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave();
      }, 450);
    },
    [flushSave]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const selectPage = (id: string) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      void flushSave();
    }
    setSelectedId(id);
    router.replace(`/notes/${id}`, { scroll: false });
  };

  const handleCreate = async (
    parentId: string | null,
    kind: "note" | "folder" = "note",
  ) => {
    if (createNote.isPending) return;
    setCreateError(null);
    try {
      const isFolder = kind === "folder";
      const res = await createNote.mutateAsync({
        title: isFolder ? "未命名文件夹" : "未命名页面",
        body: "",
        parentId,
        kind,
        icon: isFolder ? "📁" : null,
      });
      selectPage(res.note.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      setCreateError(message);
      alert(message);
    }
  };

  const handleMove = async (
    id: string,
    parentId: string | null,
    position: number
  ) => {
    try {
      await moveNote.mutateAsync({ id, parentId, position });
    } catch (err) {
      alert(err instanceof Error ? err.message : "移动失败");
    }
  };

  const handleDelete = async () => {
    if (!draft) return;
    const descendants = countNoteDescendants(flatNodes, draft.id);
    const msg =
      descendants > 0
        ? `确定删除「${draft.title}」及其 ${descendants} 个子页面？此操作不可撤销。`
        : `确定删除「${draft.title}」？此操作不可撤销。`;
    if (!window.confirm(msg)) return;
    try {
      await deleteNote.mutateAsync(draft.id);
      const next = flatNodes.find(
        (n) => n.id !== draft.id && n.parentId !== draft.id
      );
      if (next) selectPage(next.id);
      else {
        setSelectedId(null);
        setDraft(null);
        router.replace("/notes", { scroll: false });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const patchDraft = (patch: Partial<NoteDTO> & Record<string, unknown>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    const apiPatch: Record<string, unknown> = { ...patch };
    delete apiPatch.id;
    delete apiPatch.createdAt;
    delete apiPatch.updatedAt;
    delete apiPatch.area;
    delete apiPatch.project;
    delete apiPatch.goal;
    scheduleSave(apiPatch);
  };

  const empty = !treeLoading && flatNodes.length === 0;

  const subtitle = useMemo(
    () =>
      showArchived
        ? "归档区 · 已归档的页面树"
        : "页面树 · 块编辑 · 属性面板",
    [showArchived]
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <div className="section-label">
            <span className="cn text-2xl">知识库</span>
            <span className="en text-[11px]">Knowledge · Pages</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className={styles.headDesc}>{subtitle}</p>
        </div>
      </header>

      <div className={styles.workspace}>
        <PageTree
          forest={forest}
          flatNodes={flatNodes}
          selectedId={selectedId}
          showArchived={showArchived}
          onSelect={selectPage}
          onCreateRoot={() => void handleCreate(null, "note")}
          onCreateFolderRoot={() => void handleCreate(null, "folder")}
          onCreateChild={(parentId) => void handleCreate(parentId, "note")}
          onCreateFolderChild={(parentId) => void handleCreate(parentId, "folder")}
          onMove={(id, parentId, position) => void handleMove(id, parentId, position)}
          onToggleArchived={() => {
            setShowArchived((v) => !v);
            setSelectedId(null);
            setDraft(null);
          }}
          query={query}
          onQueryChange={setQuery}
        />

        <main className={styles.main}>
          {empty ? (
            <div className={styles.emptyState}>
              <h2>搭建你的知识工作区</h2>
              <p>像 Notion 一样用页面树组织笔记、高亮与灵感。</p>
              <button
                type="button"
                className={styles.emptyBtn}
                disabled={createNote.isPending}
                onClick={() => void handleCreate(null)}
              >
                {createNote.isPending ? "创建中…" : "创建第一页"}
              </button>
              <button
                type="button"
                className={styles.emptyBtnSecondary}
                disabled={createNote.isPending}
                onClick={() => void handleCreate(null, "folder")}
              >
                创建文件夹
              </button>
              {createError ? (
                <p className={styles.createError} role="alert">
                  {createError}
                </p>
              ) : null}
            </div>
          ) : !selectedId || (!draft && noteLoading) ? (
            <div className={styles.emptyState}>
              <p>从左侧选择一个页面，或新建页面。</p>
            </div>
          ) : draft ? (
            <>
              {draft.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.coverUrl} alt="" className={styles.cover} />
              ) : null}
              <PageEditor
                noteId={draft.id}
                title={draft.title}
                body={draft.body}
                icon={draft.icon}
                disabled={draft.archived}
                onTitleChange={(title) => patchDraft({ title })}
                onBodyChange={(body) => patchDraft({ body })}
                onIconChange={(icon) => patchDraft({ icon })}
              />
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>页面不存在或已被删除。</p>
            </div>
          )}
        </main>

        {draft ? (
          <PageProperties
            note={draft}
            goals={goals ?? []}
            projects={projects ?? []}
            saving={saving}
            onChange={(patch) => patchDraft(patch)}
            onTogglePin={() => patchDraft({ pinned: !draft.pinned })}
            onToggleArchive={() => {
              const next = !draft.archived;
              patchDraft({ archived: next });
              if (next) {
                setTimeout(() => {
                  setSelectedId(null);
                  setDraft(null);
                  router.replace("/notes", { scroll: false });
                }, 500);
              }
            }}
            onDelete={() => void handleDelete()}
          />
        ) : (
          <aside className={styles.props}>
            <div className={styles.propsHead}>
              <span>属性</span>
            </div>
            <p className={styles.propsHint}>选择页面后编辑属性</p>
          </aside>
        )}
      </div>
    </div>
  );
}
