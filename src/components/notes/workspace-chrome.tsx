"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Link2,
  Network,
  PanelRightClose,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { GoalDTO, NoteDTO, NoteTreeNodeDTO, ProjectDTO } from "@/lib/types";
import { PageProperties } from "./page-properties";
import styles from "./notes-workspace.module.css";

export type ExplorerMode = "files" | "search";
export type RightPanelView = "links" | "graph" | "properties";

export type CommandAction = {
  id: string;
  label: string;
  detail?: string;
  shortcut?: string;
  run: () => void;
};

export function extractWikiLinks(body: string) {
  const links = new Set<string>();
  const pattern = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const title = match[1]?.trim();
    if (title) links.add(title);
  }
  return Array.from(links);
}

type RightSidebarProps = {
  note: NoteDTO | null;
  flatNodes: NoteTreeNodeDTO[];
  goals: GoalDTO[];
  projects: ProjectDTO[];
  saving: boolean;
  view: RightPanelView;
  onViewChange: (view: RightPanelView) => void;
  onCollapse: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  onSelectNote: (id: string) => void;
};

export function RightSidebar({
  note,
  flatNodes,
  goals,
  projects,
  saving,
  view,
  onViewChange,
  onCollapse,
  onChange,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onSelectNote,
}: RightSidebarProps) {
  const outgoingLinks = useMemo(() => extractWikiLinks(note?.body ?? ""), [note?.body]);
  const relatedNodes = useMemo(() => {
    if (!note) return [];
    const siblings = flatNodes.filter(
      (node) => node.id !== note.id && node.parentId === note.parentId && node.kind !== "folder",
    );
    const rest = flatNodes.filter(
      (node) => node.id !== note.id && node.kind !== "folder" && !siblings.some((item) => item.id === node.id),
    );
    return [...siblings, ...rest].slice(0, 6);
  }, [flatNodes, note]);

  return (
    <aside className={styles.rightSidebar} aria-label="右侧边栏">
      <div className={styles.rightTabs}>
        <button
          type="button"
          className={view === "links" ? styles.rightTabActive : undefined}
          title="链接"
          aria-label="链接"
          onClick={() => onViewChange("links")}
        >
          <Link2 size={18} />
        </button>
        <button
          type="button"
          className={view === "graph" ? styles.rightTabActive : undefined}
          title="本地关系图"
          aria-label="本地关系图"
          onClick={() => onViewChange("graph")}
        >
          <Network size={18} />
        </button>
        <button
          type="button"
          className={view === "properties" ? styles.rightTabActive : undefined}
          title="属性"
          aria-label="属性"
          onClick={() => onViewChange("properties")}
        >
          <SlidersHorizontal size={18} />
        </button>
        <button
          type="button"
          className={styles.rightCollapse}
          title="折叠右侧栏"
          onClick={onCollapse}
        >
          <PanelRightClose size={17} />
        </button>
      </div>

      <div className={styles.rightContent}>
        {view === "properties" ? (
          note ? (
            <PageProperties
              note={note}
              goals={goals}
              projects={projects}
              saving={saving}
              onChange={onChange}
              onTogglePin={onTogglePin}
              onToggleArchive={onToggleArchive}
              onDelete={onDelete}
            />
          ) : (
            <div className={styles.sideEmpty}>选择页面后编辑属性。</div>
          )
        ) : view === "graph" ? (
          <LocalGraph note={note} nodes={relatedNodes} onSelectNote={onSelectNote} />
        ) : (
          <LinksPanel
            note={note}
            outgoingLinks={outgoingLinks}
            relatedNodes={relatedNodes}
            onSelectNote={onSelectNote}
          />
        )}
      </div>
    </aside>
  );
}

function LinksPanel({
  note,
  outgoingLinks,
  relatedNodes,
  onSelectNote,
}: {
  note: NoteDTO | null;
  outgoingLinks: string[];
  relatedNodes: NoteTreeNodeDTO[];
  onSelectNote: (id: string) => void;
}) {
  if (!note) return <div className={styles.sideEmpty}>选择页面后查看链接。</div>;

  return (
    <div className={styles.linkPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>链接</h2>
          <p>{outgoingLinks.length} 个内部链接</p>
        </div>
        <Link2 size={17} aria-hidden />
      </div>

      <section className={styles.sideSection}>
        <h3>反向链接</h3>
        <div className={styles.unlinkedMention}>没有反向链接</div>
      </section>

      <section className={styles.sideSection}>
        <h3>出链</h3>
        {outgoingLinks.length > 0 ? (
          <div className={styles.outgoingList}>
            {outgoingLinks.map((title) => (
              <div key={title} className={styles.outgoingItem}>
                <FileText size={14} />
                <span>{title}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.unlinkedMention}>正文中还没有 [[双向链接]]</div>
        )}
      </section>

      <section className={styles.sideSection}>
        <h3>同级页面</h3>
        <div className={styles.relatedList}>
          {relatedNodes.slice(0, 4).map((node) => (
            <button key={node.id} type="button" onClick={() => onSelectNote(node.id)}>
              <FileText size={14} />
              <span>{node.title || "未命名页面"}</span>
              <small>{new Date(node.updatedAt).toLocaleDateString("zh-CN")}</small>
            </button>
          ))}
          {relatedNodes.length === 0 ? (
            <div className={styles.unlinkedMention}>没有可显示的相关页面</div>
          ) : null}
        </div>
      </section>

      <section className={styles.sideSection}>
        <h3>本地关系图</h3>
        <GraphCanvas note={note} nodes={relatedNodes} onSelectNote={onSelectNote} compact />
      </section>
    </div>
  );
}

const GRAPH_POSITIONS = [
  { left: "15%", top: "25%" },
  { left: "68%", top: "17%" },
  { left: "76%", top: "59%" },
  { left: "20%", top: "67%" },
  { left: "46%", top: "80%" },
  { left: "48%", top: "7%" },
];

function LocalGraph({
  note,
  nodes,
  onSelectNote,
}: {
  note: NoteDTO | null;
  nodes: NoteTreeNodeDTO[];
  onSelectNote: (id: string) => void;
}) {
  return (
    <div className={styles.graphPanel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>本地关系图</h2>
          <p>{note ? `围绕「${note.title || "未命名页面"}」` : "选择页面后查看"}</p>
        </div>
        <Network size={17} />
      </div>
      <GraphCanvas note={note} nodes={nodes} onSelectNote={onSelectNote} />
    </div>
  );
}

function GraphCanvas({
  note,
  nodes,
  onSelectNote,
  compact = false,
}: {
  note: NoteDTO | null;
  nodes: NoteTreeNodeDTO[];
  onSelectNote: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.localGraph} ${compact ? styles.localGraphCompact : ""}`}>
      {note ? (
        <>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {nodes.slice(0, GRAPH_POSITIONS.length).map((node, index) => {
              const position = GRAPH_POSITIONS[index];
              return (
                <line
                  key={node.id}
                  x1="50"
                  y1="48"
                  x2={Number.parseFloat(position.left)}
                  y2={Number.parseFloat(position.top)}
                />
              );
            })}
          </svg>
          <div className={styles.graphCenter} title={note.title}>
            {note.title || "未命名页面"}
          </div>
          {nodes.slice(0, GRAPH_POSITIONS.length).map((node, index) => (
            <button
              key={node.id}
              type="button"
              className={styles.graphNode}
              style={GRAPH_POSITIONS[index]}
              title={node.title}
              onClick={() => onSelectNote(node.id)}
            >
              <span />
              {node.title || "未命名页面"}
            </button>
          ))}
        </>
      ) : (
        <div className={styles.sideEmpty}>暂无图谱数据</div>
      )}
    </div>
  );
}

export function WorkspaceStatusBar({
  note,
  saving,
}: {
  note: NoteDTO | null;
  saving: boolean;
}) {
  const body = note?.body ?? "";
  const characterCount = body.replace(/\s/g, "").length;
  const linkCount = extractWikiLinks(body).length;

  return (
    <footer className={styles.statusBar}>
      <div className={styles.statusRight}>
        <span>{linkCount} 个链接</span>
        <span>{characterCount} 字</span>
        <span className={styles.saveState}>
          <CheckCircle2 size={13} />
          {saving ? "保存中" : "已保存"}
        </span>
      </div>
    </footer>
  );
}

export function CommandPalette({
  open,
  actions,
  onClose,
}: {
  open: boolean;
  actions: CommandAction[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) =>
      `${action.label} ${action.detail ?? ""}`.toLowerCase().includes(needle),
    );
  }, [actions, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const run = (action: CommandAction) => {
    onClose();
    action.run();
  };

  return (
    <div className={styles.commandBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.commandPalette}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.commandSearch}>
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            placeholder="输入命令或搜索…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && filtered[0]) run(filtered[0]);
            }}
          />
          <button type="button" aria-label="关闭命令面板" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className={styles.commandList}>
          {filtered.map((action, index) => (
            <button
              key={action.id}
              type="button"
              className={index === 0 ? styles.commandItemActive : undefined}
              onClick={() => run(action)}
            >
              <span>
                <strong>{action.label}</strong>
                {action.detail ? <small>{action.detail}</small> : null}
              </span>
              {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
            </button>
          ))}
          {filtered.length === 0 ? <div className={styles.commandEmpty}>没有匹配的命令</div> : null}
        </div>
      </div>
    </div>
  );
}
