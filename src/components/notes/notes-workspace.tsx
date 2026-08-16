"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  X,
} from "lucide-react";
import { PageTree } from "./page-tree";
import { PageEditor } from "./page-editor";
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

type NotesWorkspaceProps = {
  initialId?: string | null;
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
}: {
  breadcrumbs: NoteTreeNodeDTO[];
  reading: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onReadingChange: (reading: boolean) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenCommands: () => void;
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

export function NotesWorkspace({ initialId = null }: NotesWorkspaceProps) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [openTabs, setOpenTabs] = useState<string[]>(initialId ? [initialId] : []);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NoteDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>("files");
  const [rightView, setRightView] = useState<RightPanelView>("links");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [reading, setReading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
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
    if (selectedId || treeLoading || flatNodes.length === 0) return;
    const firstPage = flatNodes.find((node) => node.kind !== "folder") ?? flatNodes[0];
    setSelectedId(firstPage.id);
    registerOpenTab(firstPage.id);
  }, [selectedId, treeLoading, flatNodes, registerOpenTab]);

  useEffect(() => {
    if (note) {
      setDraft(note);
      pendingPatch.current = {};
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
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const selectPage = useCallback(
    (id: string) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        void flushSave();
      }
      registerOpenTab(id);
      setSelectedId(id);
      setReading(false);
      router.replace(`/notes/${id}`, { scroll: false });
    },
    [flushSave, registerOpenTab, router],
  );

  const handleCreate = useCallback(
    async (parentId: string | null, kind: "note" | "folder" = "note") => {
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
    },
    [createNote, selectPage],
  );

  const handleMove = async (id: string, parentId: string | null, position: number) => {
    try {
      await moveNote.mutateAsync({ id, parentId, position });
    } catch (err) {
      alert(err instanceof Error ? err.message : "移动失败");
    }
  };

  const handleDelete = async () => {
    if (!draft) return;
    const descendants = countNoteDescendants(flatNodes, draft.id);
    const message =
      descendants > 0
        ? `确定删除「${draft.title}」及其 ${descendants} 个子页面？此操作不可撤销。`
        : `确定删除「${draft.title}」？此操作不可撤销。`;
    if (!window.confirm(message)) return;
    try {
      await deleteNote.mutateAsync(draft.id);
      const next = flatNodes.find((node) => node.id !== draft.id && node.parentId !== draft.id);
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
    if (!draft) return;
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
          setShowArchived((value) => !value);
          setSelectedId(null);
          setDraft(null);
        },
      },
    ],
    [handleCreate, leftCollapsed, reading, rightCollapsed, showArchived, showGraph],
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
          mode={explorerMode}
          onModeChange={setExplorerMode}
          onCollapse={() => setLeftCollapsed(true)}
          onSelect={selectPage}
          onCreateRoot={() => void handleCreate(null, "note")}
          onCreateFolderRoot={() => void handleCreate(null, "folder")}
          onCreateChild={(parentId) => void handleCreate(parentId, "note")}
          onCreateFolderChild={(parentId) => void handleCreate(parentId, "folder")}
          onMove={(id, parentId, position) => void handleMove(id, parentId, position)}
          onToggleArchived={() => {
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
          />

          <main className={styles.main}>
            {empty ? (
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
                  disabled={draft.archived}
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
          note={draft}
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
