"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Command,
  FilePlus,
  FileText,
  FolderPlus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PageTree } from "./page-tree";
import { TrashPanel } from "./trash-panel";
import {
  CommandPalette,
  type CommandAction,
  type ExplorerMode,
  RightSidebar,
  type RightPanelView,
  WorkspaceStatusBar,
} from "./workspace-chrome";
import {
  useNotesTree,
  useNotesTrash,
  useNote,
  useCreateNote,
  useUpdateNote,
  useMoveNote,
  useDeleteNote,
  useGoals,
  useProjects,
} from "@/hooks/queries";
import { countNoteDescendants } from "@/lib/notes";
import type { NoteDTO, NoteTreeNodeDTO } from "@/lib/types";
import styles from "./notes-workspace.module.css";

const PageEditor = dynamic(
  () => import("./page-editor").then((module) => module.PageEditor),
  {
    ssr: false,
    loading: () => <div className={styles.editorLoading}>正在打开编辑器…</div>,
  },
);

type NotesWorkspaceProps = {
  initialId?: string | null;
  initialTrash?: boolean;
};

const OPEN_TABS_KEY = "game-life-notes-open-tabs";
const EMPTY_NOTE_NODES: NoteTreeNodeDTO[] = [];

function readOpenTabs() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(OPEN_TABS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeOpenTabs(ids: string[]) {
  try {
    window.sessionStorage.setItem(OPEN_TABS_KEY, JSON.stringify(ids));
  } catch {
    // Tabs remain usable when storage is unavailable.
  }
}

function valuesMatch(current: unknown, next: unknown) {
  if (Array.isArray(current) && Array.isArray(next)) {
    return current.length === next.length && current.every((value, index) => value === next[index]);
  }
  return Object.is(current, next);
}

function buildBreadcrumbs(nodes: NoteTreeNodeDTO[], selectedId: string | null) {
  if (!selectedId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const crumbs: NoteTreeNodeDTO[] = [];
  const seen = new Set<string>();
  let cursor = byId.get(selectedId);

  while (cursor && !seen.has(cursor.id)) {
    crumbs.unshift(cursor);
    seen.add(cursor.id);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  return crumbs;
}

function WorkspaceTabBar({
  tabs,
  selectedId,
  onSelect,
  onClose,
  onCreate,
  onOpenCommands,
}: {
  tabs: NoteTreeNodeDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCreate: () => void;
  onOpenCommands: () => void;
}) {
  return (
    <div className={styles.tabBar}>
      <div className={styles.tabScroller}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === selectedId ? styles.tabActive : ""}`}
          >
            <button type="button" className={styles.tabSelect} onClick={() => onSelect(tab.id)}>
              <FileText size={15} />
              <span>{tab.title || "未命名页面"}</span>
            </button>
            <button
              type="button"
              className={styles.tabClose}
              title="关闭标签页"
              aria-label={`关闭 ${tab.title || "未命名页面"}`}
              onClick={() => onClose(tab.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button type="button" className={styles.newTab} title="新建页面" onClick={onCreate}>
          <Plus size={18} />
        </button>
      </div>
      <button
        type="button"
        className={styles.tabCommand}
        title="命令面板"
        onClick={onOpenCommands}
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}

function EditorPaneHeader({
  breadcrumbs,
  reading,
  leftCollapsed,
  rightCollapsed,
  onReadingChange,
  onToggleLeft,
  onToggleRight,
  onOpenCommands,
  onDelete,
  deleting,
}: {
  breadcrumbs: NoteTreeNodeDTO[];
  reading: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onReadingChange: (reading: boolean) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenCommands: () => void;
  onDelete?: () => void;
  deleting: boolean;
}) {
  return (
    <div className={styles.editorPaneHeader}>
      <div className={styles.breadcrumbs} title={breadcrumbs.map((item) => item.title).join(" / ")}>
        {breadcrumbs.map((item, index) => (
          <span key={item.id}>
            {index > 0 ? <i>/</i> : null}
            {item.title || "未命名页面"}
          </span>
        ))}
      </div>
      <div className={styles.editorModes}>
        {onDelete ? (
          <button type="button" title="移入垃圾桶" aria-label="移入垃圾桶" disabled={deleting} onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        ) : null}
        <button
          type="button"
          title={leftCollapsed ? "展开文件树" : "折叠文件树"}
          onClick={onToggleLeft}
        >
          {leftCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button
          type="button"
          className={reading ? styles.editorModeActive : undefined}
          title={reading ? "切换到编辑视图" : "切换到阅读视图"}
          onClick={() => onReadingChange(!reading)}
        >
          <BookOpen size={16} />
        </button>
        <button
          type="button"
          title={rightCollapsed ? "展开侧边信息" : "折叠侧边信息"}
          onClick={onToggleRight}
        >
          {rightCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </button>
        <button type="button" title="命令面板" aria-label="命令面板" onClick={onOpenCommands}>
          <MoreHorizontal size={17} />
        </button>
      </div>
    </div>
  );
}

export function NotesWorkspace({ initialId = null, initialTrash = false }: NotesWorkspaceProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [showTrash, setShowTrash] = useState(initialTrash);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [openTabs, setOpenTabs] = useState<string[]>(initialId ? [initialId] : []);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NoteDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>("files");
  const [rightView, setRightView] = useState<RightPanelView>("links");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [reading, setReading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Record<string, unknown>>({});
  const activeSaves = useRef(new Set<Promise<unknown>>());
  const transitioningRef = useRef(false);

  const archived = showArchived ? ("1" as const) : ("0" as const);
  const { data: treeData, isLoading: treeLoading } = useNotesTree(archived);
  const { data: trashedNotes } = useNotesTrash();
  const { data: note, isLoading: noteLoading } = useNote(selectedId);
  const { data: goals } = useGoals();
  const { data: projects } = useProjects();

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const moveNote = useMoveNote();
  const deleteNote = useDeleteNote();

  const forest = treeData?.forest ?? EMPTY_NOTE_NODES;
  const flatNodes = treeData?.nodes ?? EMPTY_NOTE_NODES;
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(flatNodes, selectedId),
    [flatNodes, selectedId],
  );
  const tabs = useMemo(() => {
    const byId = new Map(flatNodes.map((node) => [node.id, node]));
    return openTabs.map((id) => byId.get(id)).filter((item): item is NoteTreeNodeDTO => Boolean(item));
  }, [flatNodes, openTabs]);

  const registerOpenTab = useCallback((id: string) => {
    setOpenTabs((previous) => {
      const next = previous.includes(id) ? previous : [...previous, id].slice(-7);
      writeOpenTabs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const stored = readOpenTabs();
    const next = Array.from(new Set([...stored, ...(initialId ? [initialId] : [])])).slice(-7);
    if (next.length > 0) setOpenTabs(next);
  }, [initialId]);

  useEffect(() => {
    if (initialId) {
      setSelectedId(initialId);
      registerOpenTab(initialId);
    }
  }, [initialId, registerOpenTab]);

  useEffect(() => {
    if (showTrash || selectedId || treeLoading || flatNodes.length === 0) return;
    const firstPage = flatNodes.find((node) => node.kind !== "folder") ?? flatNodes[0];
    setSelectedId(firstPage.id);
    registerOpenTab(firstPage.id);
  }, [showTrash, selectedId, treeLoading, flatNodes, registerOpenTab]);

  useEffect(() => {
    if (note) {
      setDraft((previous) => {
        // A refetch from an earlier save must not overwrite newer local edits.
        const hasUnsavedChanges = activeSaves.current.size > 0 || Object.keys(pendingPatch.current).length > 0;
        return previous?.id === note.id && hasUnsavedChanges ? previous : note;
      });
    } else if (!selectedId) {
      setDraft(null);
    }
  }, [note, selectedId]);

  useEffect(() => {
    if (window.innerWidth < 820) setLeftCollapsed(true);
    if (window.innerWidth < 1180) setRightCollapsed(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (modifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setLeftCollapsed((value) => !value);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const flushSave = useCallback(async () => {
    if (!selectedId) return;
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};
    setSaving(true);
    const save = updateNote.mutateAsync({ id: selectedId, body: patch });
    activeSaves.current.add(save);
    try {
      await save;
      return true;
    } catch (err) {
      pendingPatch.current = { ...patch, ...pendingPatch.current };
      console.error(err);
      alert(err instanceof Error ? err.message : "保存失败");
      return false;
    } finally {
      activeSaves.current.delete(save);
      setSaving(activeSaves.current.size > 0);
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
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const selectPage = useCallback(
    (id: string) => {
      if (transitioningRef.current) return;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        void flushSave();
      }
      registerOpenTab(id);
      setShowTrash(false);
      setSelectedId(id);
      setReading(false);
      router.replace(`/notes/${id}`, { scroll: false });
    },
    [flushSave, registerOpenTab, router],
  );

  const handleCreate = useCallback(
    async (parentId: string | null, kind: "note" | "folder" = "note") => {
      if (createNote.isPending || transitioningRef.current) return;
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
    },
    [createNote, selectPage],
  );

  const handleMove = async (id: string, parentId: string | null, position: number) => {
    if (transitioningRef.current) return;
    try {
      await moveNote.mutateAsync({ id, parentId, position });
    } catch (err) {
      alert(err instanceof Error ? err.message : "移动失败");
    }
  };

  const handleDelete = async (id?: string) => {
    const target = id ? flatNodes.find((node) => node.id === id) : draft;
    if (!target || deleteNote.isPending || (!id && showTrash) || transitioningRef.current) return;
    const descendants = countNoteDescendants(flatNodes, target.id);
    const message =
      descendants > 0 || target.kind === "folder"
        ? `将「${target.title}」及其子页面移入垃圾桶？之后可以从垃圾桶恢复。`
        : `将「${target.title}」移入垃圾桶？之后可以从垃圾桶恢复。`;
    if (!window.confirm(message)) return;
    transitioningRef.current = true;
    setTransitioning(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await Promise.all(activeSaves.current);
      if ((await flushSave()) === false) return;
      const result = await deleteNote.mutateAsync(target.id);
      const deletedIds = new Set(result.deletedIds);
      const nextTabs = openTabs.filter((id) => !deletedIds.has(id));
      setOpenTabs(nextTabs);
      writeOpenTabs(nextTabs);
      pendingPatch.current = {};
      if (selectedId && deletedIds.has(selectedId)) {
        setDraft(null);
        const next = flatNodes.find((node) => !deletedIds.has(node.id));
        transitioningRef.current = false;
        if (next) selectPage(next.id);
        else {
          setSelectedId(null);
          router.replace("/notes", { scroll: false });
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      transitioningRef.current = false;
      setTransitioning(false);
    }
  };

  const openTrash = useCallback(async () => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitioning(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await Promise.all(activeSaves.current);
      if ((await flushSave()) === false) return;
      setShowTrash(true);
      setSelectedId(null);
      setDraft(null);
      setRightCollapsed(true);
      if (window.innerWidth < 820) setLeftCollapsed(true);
      router.replace("/notes/trash", { scroll: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败");
    } finally {
      transitioningRef.current = false;
      setTransitioning(false);
    }
  }, [flushSave, router]);

  const leaveTrash = () => {
    setShowTrash(false);
    router.replace("/notes", { scroll: false });
  };

  const patchDraft = (patch: Partial<NoteDTO> & Record<string, unknown>) => {
    if (!draft || transitioningRef.current) return;
    const changedPatch = Object.fromEntries(
      Object.entries(patch).filter(
        ([key, value]) => !valuesMatch((draft as unknown as Record<string, unknown>)[key], value),
      ),
    );
    if (Object.keys(changedPatch).length === 0) return;

    setDraft((previous) => (previous ? { ...previous, ...changedPatch } : previous));
    const apiPatch: Record<string, unknown> = { ...changedPatch };
    delete apiPatch.id;
    delete apiPatch.createdAt;
    delete apiPatch.updatedAt;
    delete apiPatch.area;
    delete apiPatch.project;
    delete apiPatch.goal;
    scheduleSave(apiPatch);
  };

  const closeTab = (id: string) => {
    if (transitioningRef.current) return;
    const index = openTabs.indexOf(id);
    const nextTabs = openTabs.filter((tabId) => tabId !== id);
    setOpenTabs(nextTabs);
    writeOpenTabs(nextTabs);
    if (selectedId !== id) return;

    const nextId = nextTabs[Math.max(0, index - 1)] ?? nextTabs[0] ?? null;
    if (nextId) selectPage(nextId);
    else {
      setSelectedId(null);
      setDraft(null);
      router.replace("/notes", { scroll: false });
    }
  };

  const showGraph = useCallback(() => {
    setRightView("graph");
    setRightCollapsed(false);
  }, []);

  const commands = useMemo<CommandAction[]>(
    () => [
      {
        id: "trash",
        label: "打开垃圾桶",
        detail: "恢复或彻底删除页面和文件夹",
        run: () => void openTrash(),
      },
      {
        id: "new-note",
        label: "新建页面",
        detail: "在知识库根目录创建 Markdown 页面",
        shortcut: "⌘ N",
        run: () => void handleCreate(null, "note"),
      },
      {
        id: "new-folder",
        label: "新建文件夹",
        detail: "在知识库根目录创建文件夹",
        run: () => void handleCreate(null, "folder"),
      },
      {
        id: "toggle-left",
        label: leftCollapsed ? "展开左侧栏" : "折叠左侧栏",
        shortcut: "⌘ B",
        run: () => setLeftCollapsed((value) => !value),
      },
      {
        id: "toggle-right",
        label: rightCollapsed ? "展开右侧栏" : "折叠右侧栏",
        run: () => setRightCollapsed((value) => !value),
      },
      {
        id: "reading-mode",
        label: reading ? "切换到编辑视图" : "切换到阅读视图",
        run: () => setReading((value) => !value),
      },
      {
        id: "graph",
        label: "打开本地关系图",
        run: showGraph,
      },
      {
        id: "archive",
        label: showArchived ? "查看活动页面" : "查看归档页面",
        run: () => {
          router.replace("/notes", { scroll: false });
          setShowArchived((value) => !value);
          setShowTrash(false);
          setSelectedId(null);
          setDraft(null);
        },
      },
    ],
    [handleCreate, leftCollapsed, reading, rightCollapsed, showArchived, showGraph, openTrash, router],
  );

  const empty = !treeLoading && flatNodes.length === 0;
  const workspaceClassName = [
    styles.workspace,
    leftCollapsed ? styles.leftCollapsed : "",
    rightCollapsed ? styles.rightCollapsed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.page} data-obsidian-workspace>
      <div className={workspaceClassName}>
        <PageTree
          forest={forest}
          flatNodes={flatNodes}
          selectedId={selectedId}
          showArchived={showArchived}
          showTrash={showTrash}
          trashCount={trashedNotes?.length ?? 0}
          onOpenTrash={() => void openTrash()}
          mode={explorerMode}
          onModeChange={(mode) => {
            setExplorerMode(mode);
            if (showTrash) leaveTrash();
          }}
          onCollapse={() => setLeftCollapsed(true)}
          onSelect={selectPage}
          onCreateRoot={() => void handleCreate(null, "note")}
          onCreateFolderRoot={() => void handleCreate(null, "folder")}
          onCreateChild={(parentId) => void handleCreate(parentId, "note")}
          onCreateFolderChild={(parentId) => void handleCreate(parentId, "folder")}
          onDelete={(id) => void handleDelete(id)}
          deleting={deleteNote.isPending || transitioning}
          onMove={(id, parentId, position) => void handleMove(id, parentId, position)}
          onToggleArchived={() => {
            if (showTrash) leaveTrash();
            setShowArchived((value) => !value);
            setSelectedId(null);
            setDraft(null);
          }}
          query={query}
          onQueryChange={setQuery}
        />

        <section className={styles.mainShell} aria-label="编辑工作区">
          <WorkspaceTabBar
            tabs={tabs}
            selectedId={selectedId}
            onSelect={selectPage}
            onClose={closeTab}
            onCreate={() => void handleCreate(null, "note")}
            onOpenCommands={() => setCommandOpen(true)}
          />
          <EditorPaneHeader
            breadcrumbs={breadcrumbs}
            reading={reading}
            leftCollapsed={leftCollapsed}
            rightCollapsed={rightCollapsed}
            onReadingChange={setReading}
            onToggleLeft={() => setLeftCollapsed((value) => !value)}
            onToggleRight={() => setRightCollapsed((value) => !value)}
            onOpenCommands={() => setCommandOpen(true)}
            onDelete={draft && !showTrash ? () => void handleDelete() : undefined}
            deleting={deleteNote.isPending || transitioning}
          />

          <main className={styles.main}>
            {showTrash ? (
              <TrashPanel onBack={leaveTrash} />
            ) : empty ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyMark}>
                  <FilePlus size={26} />
                </div>
                <h2>创建你的第一个知识节点</h2>
                <p>用文件夹、Markdown 页面和双向链接搭建属于你的 Game Life 知识网络。</p>
                <div className={styles.emptyActions}>
                  <button
                    type="button"
                    className={styles.emptyBtn}
                    disabled={createNote.isPending}
                    onClick={() => void handleCreate(null)}
                  >
                    <FilePlus size={16} />
                    {createNote.isPending ? "创建中…" : "新建页面"}
                  </button>
                  <button
                    type="button"
                    className={styles.emptyBtnSecondary}
                    disabled={createNote.isPending}
                    onClick={() => void handleCreate(null, "folder")}
                  >
                    <FolderPlus size={16} />
                    新建文件夹
                  </button>
                </div>
                {createError ? (
                  <p className={styles.createError} role="alert">
                    {createError}
                  </p>
                ) : null}
              </div>
            ) : !selectedId || (!draft && noteLoading) ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyMark}>
                  <Command size={26} />
                </div>
                <h2>没有打开的页面</h2>
                <p>从左侧文件树选择页面，或按 ⌘P 打开命令面板。</p>
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
                  reading={reading}
                  disabled={draft.archived || transitioning}
                  onTitleChange={(title) => patchDraft({ title })}
                  onBodyChange={(body) => patchDraft({ body })}
                />
              </>
            ) : (
              <div className={styles.emptyState}>
                <h2>页面不存在</h2>
                <p>它可能已被移动、归档或删除。</p>
              </div>
            )}
          </main>
        </section>

        <RightSidebar
          note={showTrash ? null : draft}
          flatNodes={flatNodes}
          goals={goals ?? []}
          projects={projects ?? []}
          saving={saving}
          view={rightView}
          onViewChange={setRightView}
          onCollapse={() => setRightCollapsed(true)}
          onChange={(patch) => patchDraft(patch)}
          onTogglePin={() => draft && patchDraft({ pinned: !draft.pinned })}
          onToggleArchive={() => {
            if (!draft) return;
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
          onSelectNote={selectPage}
        />

        <WorkspaceStatusBar note={draft} saving={saving} />
      </div>

      <CommandPalette
        open={commandOpen}
        actions={commands}
        onClose={() => setCommandOpen(false)}
      />
    </div>
  );
}
