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
  Trash2,
} from "lucide-react";
import type { NoteTreeNodeDTO } from "@/lib/types";
import styles from "./notes-workspace.module.css";

type DropTarget = { id: string | null; placement: "inside" | "before" };

type PageTreeProps = {
  forest: NoteTreeNodeDTO[];
  flatNodes: NoteTreeNodeDTO[];
  selectedId: string | null;
  showArchived: boolean;
  showTrash: boolean;
  trashCount: number;
  onOpenTrash: () => void;
  mode: "files" | "search";
  onModeChange: (mode: "files" | "search") => void;
  onCollapse: () => void;
  onSelect: (id: string) => void;
  onCreateRoot: () => void;
  onCreateFolderRoot: () => void;
  onCreateChild: (parentId: string) => void;
  onCreateFolderChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
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
  onDelete,
  deleting,
  onDragStart,
  onDragEnd,
  draggedId,
  dropTarget,
  onDragOver,
  onDragLeave,
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
  onDelete: (id: string) => void;
  deleting: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  draggedId: string | null;
  dropTarget: DropTarget | null;
  onDragOver: (id: string, placement: DropTarget["placement"]) => boolean;
  onDragLeave: (id: string) => void;
  onDropOn: (targetId: string, draggedId: string) => void;
  onDropBefore: (targetId: string, draggedId: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0 || node.childCount > 0;
  const isOpen = expanded.has(node.id);
  const active = selectedId === node.id;
  const isFolder = node.kind === "folder";
  const defaultTitle = isFolder ? "未命名文件夹" : "未命名页面";
  const hasCustomIcon = Boolean(node.icon && node.icon !== "📁" && node.icon !== "📄");
  const dropInside = dropTarget?.id === node.id && dropTarget.placement === "inside";
  const dropBefore = dropTarget?.id === node.id && dropTarget.placement === "before";
  const rowClassName = [
    styles.treeRow,
    active ? styles.treeRowActive : "",
    draggedId === node.id ? styles.treeRowDragging : "",
    dropInside ? styles.treeRowDropInside : "",
    dropBefore ? styles.treeRowDropBefore : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={styles.treeNode}>
      <div
        className={rowClassName}
        data-note-id={node.id}
        data-drop-placement={dropInside ? "inside" : dropBefore ? "before" : undefined}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={!deleting}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-note-id", node.id);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const placement = e.clientY < rect.top + rect.height * 0.35 ? "before" : "inside";
          if (onDragOver(node.id, placement)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          } else {
            e.dataTransfer.dropEffect = "none";
          }
        }}
        onDragLeave={(e) => {
          if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
          onDragLeave(node.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const sourceId = e.dataTransfer.getData("application/x-note-id") || draggedId;
          onDragEnd();
          if (!sourceId || sourceId === node.id) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height * 0.35;
          if (before) onDropBefore(node.id, sourceId);
          else onDropOn(node.id, sourceId);
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
        {dropInside ? <span className={styles.treeDropHint}>移入</span> : null}
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
        <button
          type="button"
          className={`${styles.treeAddChild} ${styles.treeDelete}`}
          title="移入垃圾桶"
          aria-label={`将 ${node.title || defaultTitle} 移入垃圾桶`}
          disabled={deleting}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
        >
          <Trash2 size={13} />
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
            onDelete={onDelete}
            deleting={deleting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            draggedId={draggedId}
            dropTarget={dropTarget}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
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
  showTrash,
  trashCount,
  onOpenTrash,
  mode,
  onModeChange,
  onCollapse,
  onSelect,
  onCreateRoot,
  onCreateFolderRoot,
  onCreateChild,
  onCreateFolderChild,
  onDelete,
  deleting,
  onMove,
  onToggleArchived,
  query,
  onQueryChange,
}: PageTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const byId = useMemo(() => new Map(flatNodes.map((node) => [node.id, node])), [flatNodes]);
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

  const endDrag = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const canMoveTo = (sourceId: string, parentId: string | null) => {
    if (deleting || !byId.has(sourceId)) return false;
    const seen = new Set<string>();
    let current = parentId;
    while (current) {
      if (current === sourceId || seen.has(current)) return false;
      seen.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
    return true;
  };

  const highlightDrop = (id: string | null, placement: DropTarget["placement"]) => {
    const target = id ? byId.get(id) : null;
    const parentId = placement === "before" ? target?.parentId ?? null : id;
    if (!draggedId || id === draggedId || (id && !target) || !canMoveTo(draggedId, parentId)) {
      setDropTarget(null);
      return false;
    }
    setDropTarget((previous) => previous?.id === id && previous.placement === placement ? previous : { id, placement });
    return true;
  };

  const clearDrop = (id: string | null) => {
    setDropTarget((previous) => previous?.id === id ? null : previous);
  };

  const handleDropOn = (targetId: string, draggedId: string) => {
    if (!byId.has(targetId) || !canMoveTo(draggedId, targetId)) return;
    const siblings = flatNodes.filter(
      (n) => n.parentId === targetId && n.id !== draggedId,
    );
    onMove(draggedId, targetId, siblings.length);
    ensureExpanded(targetId);
  };

  const handleDropBefore = (targetId: string, draggedId: string) => {
    const target = byId.get(targetId);
    if (!target || targetId === draggedId || !canMoveTo(draggedId, target.parentId)) return;
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
            className={mode === "files" && !showTrash ? styles.treeActionOn : undefined}
            onClick={() => onModeChange("files")}
          >
            <Files size={16} />
          </button>
          <button
            type="button"
            title="搜索"
            className={mode === "search" && !showTrash ? styles.treeActionOn : undefined}
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
        className={`${styles.treeList}${dropTarget?.id === null ? ` ${styles.treeListDropActive}` : ""}`}
        data-drop-placement={dropTarget?.id === null ? "root" : undefined}
        onDragOver={(e) => {
          if (highlightDrop(null, "inside")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          } else {
            e.dataTransfer.dropEffect = "none";
          }
        }}
        onDragLeave={(e) => {
          if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
          clearDrop(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const sourceId = e.dataTransfer.getData("application/x-note-id") || draggedId;
          endDrag();
          if (!sourceId || !canMoveTo(sourceId, null)) return;
          const roots = flatNodes.filter(
            (n) => n.parentId === null && n.id !== sourceId,
          );
          onMove(sourceId, null, roots.length);
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
              onDelete={onDelete}
              deleting={deleting}
              onDragStart={(id) => {
                setDraggedId(id);
                setDropTarget(null);
              }}
              onDragEnd={endDrag}
              draggedId={draggedId}
              dropTarget={dropTarget}
              onDragOver={highlightDrop}
              onDragLeave={clearDrop}
              onDropOn={handleDropOn}
              onDropBefore={handleDropBefore}
            />
          ))
        )}
        {dropTarget?.id === null ? <div className={styles.treeRootDropHint}>移动到知识库根目录</div> : null}
      </div>
      <button
        type="button"
        className={`${styles.trashEntry}${showTrash ? ` ${styles.treeActionOn}` : ""}`}
        aria-pressed={showTrash}
        onClick={onOpenTrash}
      >
        <Trash2 size={16} />
        <span>垃圾桶</span>
        {trashCount > 0 ? <small>{trashCount}</small> : null}
      </button>
    </aside>
  );
}
