"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Flag,
  FolderKanban,
  Inbox,
  ListTodo,
  Target,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import type { PlanningItem, PlanningKind } from "./planning-model";
import { visiblePlanningItems } from "./planning-model";
import styles from "./planning.module.css";

const NODE_WIDTH = 236;
const NODE_HEIGHT = 148;

type PlanningNodeData = PlanningItem & {
  collapsed: boolean;
  selected: boolean;
  onSelect: (item: PlanningItem) => void;
  onToggle: (id: string) => void;
  onAdd: (item: PlanningItem) => void;
  onDelete: (item: PlanningItem) => void;
};

type PlanningNode = Node<PlanningNodeData, "planning">;

const KIND_LABEL: Record<PlanningKind, string> = {
  goal: "目标",
  project: "项目",
  milestone: "里程碑",
  task: "任务",
  group: "分组",
};

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: "进行中",
    done: "已完成",
    paused: "暂停",
    archived: "归档",
    idea: "构想",
    TODO: "待开始",
    IN_PROGRESS: "进行中",
    DONE: "已完成",
    CANCELED: "已取消",
    UNASSIGNED: "待归类",
  };
  return status ? labels[status] ?? status : "";
}

function NodeIcon({ kind, status }: { kind: PlanningKind; status?: string }) {
  if (status === "done" || status === "DONE") return <CheckCircle2 size={15} />;
  if (kind === "goal") return <Target size={15} />;
  if (kind === "project") return <FolderKanban size={15} />;
  if (kind === "milestone") return <Flag size={15} />;
  if (kind === "group") return <Inbox size={15} />;
  if (kind === "task") return <ListTodo size={15} />;
  return <CircleDot size={15} />;
}

function PlanningNodeCard({ data }: NodeProps<PlanningNode>) {
  const addText = data.kind === "goal" ? "添加项目" : data.kind === "project" ? "添加里程碑" : "添加任务";
  return (
    <article
      className={styles.nodeCard}
      data-kind={data.kind}
      data-selected={data.selected}
      data-done={data.status === "done" || data.status === "DONE"}
    >
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <button type="button" className={`${styles.nodeMain} nodrag nopan`} onClick={() => data.onSelect(data)}>
        <span className={styles.nodeEyebrow}>
          <span className={styles.nodeKind}>
            <NodeIcon kind={data.kind} status={data.status} />
            {KIND_LABEL[data.kind]}
          </span>
          <span className={styles.nodeStatus}>{statusLabel(data.status)}</span>
        </span>
        <strong className={styles.nodeTitle}>{data.title}</strong>
        <span className={styles.nodeSubtitle}>
          {data.progressLabel ? `${data.progressLabel} · ` : ""}
          {data.subtitle || (data.childCount ? `${data.childCount} 个下级项目` : "点击查看详情")}
        </span>
      </button>
      <div className={`${styles.nodeActions} nodrag nopan`}>
        {data.kind !== "task" ? (
          <button type="button" aria-label={`${addText}：${data.title}`} onClick={(event) => { event.stopPropagation(); data.onAdd(data); }}>
            <Plus size={13} /> {addText}
          </button>
        ) : <button type="button" aria-label={`编辑任务：${data.title}`} onClick={(event) => { event.stopPropagation(); data.onSelect(data); }}><Pencil size={13} /> 编辑任务</button>}
        {data.entity ? (
          <button type="button" className={styles.nodeDelete} aria-label={`删除${KIND_LABEL[data.kind]}：${data.title}`} onClick={(event) => { event.stopPropagation(); data.onDelete(data); }}><Trash2 size={13} /></button>
        ) : null}
      </div>
      {data.childCount > 0 ? (
        <button
          type="button"
          className={styles.collapseButton}
          aria-label={data.collapsed ? "展开下级" : "收起下级"}
          aria-expanded={!data.collapsed}
          onClick={(event) => {
            event.stopPropagation();
            data.onToggle(data.id);
          }}
        >
          {data.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          <span>{data.childCount}</span>
        </button>
      ) : null}
      <Handle type="source" position={Position.Right} className={styles.handle} />
    </article>
  );
}

const nodeTypes = { planning: PlanningNodeCard };

function layout(items: PlanningItem[], dataFor: (item: PlanningItem) => PlanningNodeData) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", ranksep: 88, nodesep: 34, marginx: 36, marginy: 36 });
  for (const item of items) graph.setNode(item.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const item of items) {
    if (item.parentId && graph.hasNode(item.parentId)) graph.setEdge(item.parentId, item.id);
  }
  const siblings = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const group = siblings.get(item.parentId) ?? [];
    group.push(item.id);
    siblings.set(item.parentId, group);
  }
  const constraints = [...siblings.values()].flatMap((group) =>
    group.slice(1).map((id, index) => ({ left: group[index], right: id })),
  );
  dagre.layout(graph, { constraints });

  const nodes: PlanningNode[] = items.map((item) => {
    const point = graph.node(item.id);
    return {
      id: item.id,
      type: "planning",
      position: { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 },
      data: dataFor(item),
      draggable: false,
      connectable: false,
      deletable: false,
      selectable: true,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });
  const edges: Edge[] = items.flatMap((item) =>
    item.parentId && graph.hasNode(item.parentId)
      ? [{
          id: `${item.parentId}->${item.id}`,
          source: item.parentId,
          target: item.id,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#9f936e" },
          style: { stroke: "#b9ad88", strokeWidth: 1.6 },
          focusable: false,
        }]
      : [],
  );
  return { nodes, edges };
}

export function PlanningMap({
  items,
  initialCollapsed,
  selectedId,
  focusId,
  inactive = false,
  onSelect,
  onAdd,
  onDelete,
}: {
  items: PlanningItem[];
  initialCollapsed: string[];
  selectedId?: string;
  focusId?: string;
  inactive?: boolean;
  onSelect: (item: PlanningItem) => void;
  onAdd: (item: PlanningItem) => void;
  onDelete: (item: PlanningItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(() => new Set(initialCollapsed));
  const fittedRef = useRef(false);
  const flowRef = useRef<ReactFlowInstance<PlanningNode, Edge> | null>(null);
  const focusedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!focusId) return;
    const byId = new Map(items.map((item) => [item.id, item]));
    const target = byId.get(focusId);
    if (!target) return;
    const ancestors = new Set<string>();
    let parentId = target.parentId;
    while (parentId) {
      ancestors.add(parentId);
      parentId = byId.get(parentId)?.parentId;
    }
    setCollapsed((current) => {
      const next = new Set([...current].filter((id) => !ancestors.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [focusId, items]);

  useEffect(() => {
    setCollapsed((current) => {
      const validIds = new Set(items.map((item) => item.id));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const toggle = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visible = useMemo(() => visiblePlanningItems(items, collapsed), [items, collapsed]);
  const { nodes, edges } = useMemo(
    () => layout(visible, (item) => ({
      ...item,
      collapsed: collapsed.has(item.id),
      selected: item.id === selectedId,
      onSelect,
      onToggle: toggle,
      onAdd,
      onDelete,
    })),
    [visible, collapsed, selectedId, onSelect, toggle, onAdd, onDelete],
  );

  useEffect(() => {
    if (!focusId || focusedRef.current === focusId) return;
    const node = nodes.find((candidate) => candidate.id === focusId);
    if (!node || !flowRef.current) return;
    const frame = requestAnimationFrame(() => {
      focusedRef.current = focusId;
      void flowRef.current?.setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1, duration: 180 });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusId, nodes]);

  return (
    <div className={styles.mapFrame} aria-hidden={inactive} inert={inactive}>
      <ReactFlow<PlanningNode, Edge>
        aria-label="规划地图画布"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        onNodeClick={(_event, node) => onSelect(node.data)}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        minZoom={0.35}
        maxZoom={1.45}
        panOnScroll
        selectionOnDrag={false}
        onInit={(instance) => {
          flowRef.current = instance;
          if (!fittedRef.current) {
            fittedRef.current = true;
            requestAnimationFrame(() => instance.fitView({ padding: 0.16, maxZoom: 1 }));
          }
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#cfc5a5" />
        <MiniMap
          className={styles.miniMap}
          nodeColor={(node) => {
            const kind = (node.data as PlanningNodeData).kind;
            return kind === "goal" ? "#2d7b62" : kind === "project" ? "#b68838" : kind === "milestone" ? "#597da2" : "#9d8f72";
          }}
          maskColor="rgba(255, 250, 240, 0.72)"
          pannable
          zoomable
        />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
