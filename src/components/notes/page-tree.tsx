"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FileText,
  Files,
  Folder,
  FolderPlus,
  PanelLeftClose,
  Search,
  ChevronsUp,
} from "lucide-react";
import type { NoteTreeNodeDTO } from "@/lib/types";
import { countNoteDescendants } from "@/lib/notes";
import styles from "./notes-workspace.module.css";

type PageTreeProps = {
  forest: NoteTreeNodeDTO[];
  flatNodes: NoteTreeNodeDTO[];
  selectedId: string | null;
  showArchived: boolean;
  mode: "files" | "search";
  onModeChange: (mode: "files" | "search") => void;
  onCollapse: () => void;
  onSelect: (id: string) => void;
  onCreateRoot: () => void;
  onCreateFolderRoot: () => void;
  onCreateChild: (parentId: string) => void;
  onCreateFolderChild: (parentId: string) => void;
  onMove: (id: string, parentId: string | null, position: number) => void;
  onToggleArchived: () => void;
  query: string;
  onQueryChange: (q: string) => void;
};

function filterForest(nodes: NoteTreeNodeDTO[], q: string): NoteTreeNodeDTO[] {
  if (!q.trim()) return nodes;
  const needle = q.trim().toLowerCase();
  const walk = (list: NoteTreeNodeDTO[]): NoteTreeNodeDTO[] => {
    const out: NoteTreeNodeDTO[] = [];
    for (const n of list) {
      const kids = walk(n.children ?? []);
      const hit = n.title.toLowerCase().includes(needle);
      if (hit || kids.length) {
        out.push({ ...n, children: kids });
      }
    }
    return out;
  };
  return walk(nodes);
}

function TreeNode({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  onCreateChild,
  onCreateFolderChild,
  onDragStart,
  onDropOn,
  onDropBefore,
}: {
  node: NoteTreeNodeDTO;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onCreateFolderChild: (parentId: string) => void;
  onDragStart: (id: string) => void;
  onDropOn: (targetId: string, draggedId: string) => void;
  onDropBefore: (targetId: string, draggedId: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0 || node.childCount > 0;
  const isOpen = expanded.has(node.id);
  const active = selectedId === node.id;
  const isFolder = node.kind === "folder";
  const defaultTitle = isFolder ? "未命名文件夹" : "未命名页面";
  const hasCustomIcon = Boolean(node.icon && node.icon !== "📁" && node.icon !== "📄");

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.treeRow}${active ? ` ${styles.treeRowActive}` : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-note-id", node.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(node.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = e.dataTransfer.getData("application/x-note-id");
          if (!draggedId || draggedId === node.id) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height * 0.35;
          if (before) onDropBefore(node.id, draggedId);
          else onDropOn(node.id, draggedId);
        }}
      >
        <button
          type="button"
          className={styles.treeChevron}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          aria-label={isOpen ? "折叠" : "展开"}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className={styles.treeChevronSpacer} />
          )}
        </button>
        <button
          type="button"
          className={styles.treeLabel}
          onClick={() => onSelect(node.id)}
        >
          <span className={styles.treeIcon}>
            {hasCustomIcon ? (
              node.icon
            ) : isFolder ? (
              <Folder size={15} />
            ) : (
              <FileText size={14} />
            )}
          </span>
          <span className={styles.treeTitle}>
            {node.title || defaultTitle}
            {node.pinned ? <em className={styles.pinMark}>★</em> : null}
          </span>
        </button>
        <button
          type="button"
          className={styles.treeAddChild}
          title="新建子文件夹"
          onClick={(e) => {
            e.stopPropagation();
            onCreateFolderChild(node.id);
          }}
        >
          <FolderPlus size={13} />
        </button>
        <button
          type="button"
          className={styles.treeAddChild}
          title="新建子页面"
          onClick={(e) => {
            e.stopPropagation();
            onCreateChild(node.id);
          }}
        >
          <FilePlus size={13} />
        </button>
      </div>
      {isOpen &&
        (node.children ?? []).map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onCreateFolderChild={onCreateFolderChild}
            onDragStart={onDragStart}
            onDropOn={onDropOn}
            onDropBefore={onDropBefore}
          />
        ))}
    </div>
  );
}

export function PageTree({
  forest,
  flatNodes,
  selectedId,
  showArchived,
  mode,
  onModeChange,
  onCollapse,
  onSelect,
  onCreateRoot,
  onCreateFolderRoot,
  onCreateChild,
  onCreateFolderChild,
  onMove,
  onToggleArchived,
  query,
  onQueryChange,
}: PageTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const visible = useMemo(
    () => (mode === "search" ? filterForest(forest, query) : forest),
    [forest, mode, query],
  );

  useEffect(() => {
    setExpanded((previous) => {
      if (previous.size > 0) return previous;
      return new Set(flatNodes.filter((node) => node.childCount > 0).map((node) => node.id));
    });
  }, [flatNodes]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ensureExpanded = (id: string) => {
    setExpanded((prev) => new Set(prev).add(id));
  };

  const handleDropOn = (targetId: string, draggedId: string) => {
    const siblings = flatNodes.filter(
      (n) => n.parentId === targetId && n.id !== draggedId,
    );
    onMove(draggedId, targetId, siblings.length);
    ensureExpanded(targetId);
  };

  const handleDropBefore = (targetId: string, draggedId: string) => {
    const target = flatNodes.find((n) => n.id === targetId);
    if (!target) return;
    const desc = countNoteDescendants(flatNodes, draggedId);
    let walk: string | null | undefined = targetId;
    const seen = new Set<string>();
    while (walk) {
      if (walk === draggedId) return;
      if (seen.has(walk)) break;
      seen.add(walk);
      walk = flatNodes.find((n) => n.id === walk)?.parentId;
    }
    void desc;
    onMove(draggedId, target.parentId, target.position);
  };

  return (
    <aside className={styles.tree}>
      <div className={styles.treeHead}>
        <div className={styles.explorerTitle}>
          <strong>知识库</strong>
          <button type="button" title="折叠左侧栏" onClick={onCollapse}>
            <PanelLeftClose size={17} />
          </button>
        </div>
        <div className={styles.treeActions}>
          <button
            type="button"
            title="文件"
            className={mode === "files" ? styles.treeActionOn : undefined}
            onClick={() => onModeChange("files")}
          >
            <Files size={16} />
          </button>
          <button
            type="button"
            title="搜索"
            className={mode === "search" ? styles.treeActionOn : undefined}
            onClick={() => onModeChange("search")}
          >
            <Search size={16} />
          </button>
          <button type="button" title="新建页面" onClick={onCreateRoot}>
            <FilePlus size={16} />
          </button>
          <button type="button" title="新建文件夹" onClick={onCreateFolderRoot}>
            <FolderPlus size={16} />
          </button>
          <button type="button" title="全部折叠" onClick={() => setExpanded(new Set())}>
            <ChevronsUp size={16} />
          </button>
          <button
            type="button"
            title={showArchived ? "查看活动页面" : "查看归档"}
            className={showArchived ? styles.treeActionOn : undefined}
            onClick={onToggleArchived}
          >
            <Archive size={16} />
          </button>
        </div>
        {mode === "search" ? (
          <div className={styles.searchWrap}>
            <Search size={14} />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="搜索页面…"
              className={styles.searchInput}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.treeSectionTitle}>
        <span>{mode === "search" ? "搜索结果" : showArchived ? "归档" : "文件"}</span>
        {mode === "search" && query ? <small>{visible.length}</small> : null}
      </div>

      <div
        className={styles.treeList}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData("application/x-note-id");
          if (!draggedId) return;
          const roots = flatNodes.filter(
            (n) => n.parentId === null && n.id !== draggedId,
          );
          onMove(draggedId, null, roots.length);
        }}
      >
        {visible.length === 0 ? (
          <div className={styles.treeEmpty}>
            {showArchived ? "没有归档页面" : "还没有内容，点击上方新建文件夹或页面"}
          </div>
        ) : (
          visible.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={toggle}
              onSelect={onSelect}
              onCreateChild={(parentId) => {
                ensureExpanded(parentId);
                onCreateChild(parentId);
              }}
              onCreateFolderChild={(parentId) => {
                ensureExpanded(parentId);
                onCreateFolderChild(parentId);
              }}
              onDragStart={() => undefined}
              onDropOn={handleDropOn}
              onDropBefore={handleDropBefore}
            />
          ))
        )}
      </div>
    </aside>
  );
}
