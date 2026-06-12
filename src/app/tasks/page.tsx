"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock3,
  Grid2x2,
  GripVertical,
  LayoutDashboard,
  List,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AreaSelect } from "@/components/area-select";
import { ProjectSelect } from "@/components/project-select";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask } from "@/hooks/queries";
import type { TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type BoardColumn = "TODO" | "IN_PROGRESS" | "DONE";
type TaskStatus = TaskDTO["status"];
type TaskView = "board" | "matrix" | "all";
type DragTarget = { column: BoardColumn; beforeId: string | null };
type TaskOverride = { status: TaskStatus; completedAt: string | null };

const BOARD_COLUMNS: Array<{
  key: BoardColumn;
  cn: string;
  en: string;
  hint: string;
  icon: typeof Clock3;
  tone: string;
}> = [
  {
    key: "TODO",
    cn: "准备开始",
    en: "Ready",
    hint: "已经明确，但还没有开动。",
    icon: Clock3,
    tone: "border-[var(--gold)]/45 bg-[rgba(255,252,242,0.86)]",
  },
  {
    key: "IN_PROGRESS",
    cn: "正在进行中",
    en: "In Progress",
    hint: "当前正在推进的任务。",
    icon: PlayCircle,
    tone: "border-[#3a6b8e]/45 bg-[rgba(238,247,255,0.84)]",
  },
  {
    key: "DONE",
    cn: "最近完成",
    en: "Done · 2 Days",
    hint: "只显示最近两天完成的任务。",
    icon: CheckCircle2,
    tone: "border-[var(--success)]/45 bg-[rgba(240,250,244,0.84)]",
  },
];

const PRIORITY_LABEL = ["", "High", "Normal", "Low"];
const DONE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const VIEW_TABS: Array<{
  key: TaskView;
  cn: string;
  en: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: "board", cn: "任务排布", en: "Board", icon: LayoutDashboard },
  { key: "matrix", cn: "四象限图", en: "Matrix", icon: Grid2x2 },
  { key: "all", cn: "全部任务", en: "All Tasks", icon: List },
];

const STATUS_META: Record<TaskStatus, { cn: string; en: string; tone: "default" | "accent" | "success" | "warning" | "danger" }> = {
  TODO: { cn: "准备开始", en: "Ready", tone: "warning" },
  IN_PROGRESS: { cn: "进行中", en: "In Progress", tone: "accent" },
  DONE: { cn: "已完成", en: "Done", tone: "success" },
  CANCELED: { cn: "已取消", en: "Canceled", tone: "default" },
};

const STATUS_FILTERS: Array<"all" | TaskStatus> = ["all", "TODO", "IN_PROGRESS", "DONE", "CANCELED"];
const STATUS_ORDER: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
  CANCELED: 3,
};

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<TaskView>("board");
  const [taskFilter, setTaskFilter] = useState<"all" | TaskStatus>("all");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskOverride>>({});
  const pointerDragRef = useRef<{
    taskId: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const dragTargetRef = useRef<DragTarget | null>(null);

  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();

  const allTasks = useMemo(() => {
    return (tasks ?? [])
      .map((task) => applyOverride(task, taskOverrides[task.id]))
      .sort(sortForAllTasks);
  }, [taskOverrides, tasks]);

  const visibleTasks = useMemo(() => {
    const now = Date.now();
    return allTasks
      .filter((task) => task.status !== "CANCELED")
      .filter((task) => task.status !== "DONE" || isRecentDone(task, now));
  }, [allTasks]);

  useEffect(() => {
    setOrderedIds((current) => {
      const visibleIds = visibleTasks.map((task) => task.id);
      return [
        ...current.filter((id) => visibleIds.includes(id)),
        ...visibleIds.filter((id) => !current.includes(id)),
      ];
    });
  }, [visibleTasks]);

  useEffect(() => {
    if (!tasks) return;

    setTaskOverrides((current) => {
      const next = { ...current };
      for (const task of tasks) {
        const override = next[task.id];
        if (
          override &&
          task.status === override.status &&
          (task.status !== "DONE" || Boolean(task.completedAt))
        ) {
          delete next[task.id];
        }
      }
      return next;
    });
  }, [tasks]);

  const orderedTasks = useMemo(() => {
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    return [...visibleTasks].sort((a, b) => {
      const aIndex = order.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = order.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return sortByTaskShape(a, b);
    });
  }, [orderedIds, visibleTasks]);

  const grouped = useMemo(() => {
    const buckets: Record<BoardColumn, TaskDTO[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const task of orderedTasks) {
      if (task.status === "TODO" || task.status === "IN_PROGRESS" || task.status === "DONE") {
        buckets[task.status].push(task);
      }
    }

    return buckets;
  }, [orderedTasks]);

  const matrixTasks = useMemo(
    () => orderedTasks.filter((task) => task.status === "TODO" || task.status === "IN_PROGRESS"),
    [orderedTasks],
  );

  useEffect(() => {
    dragTargetRef.current = dragTarget;
  }, [dragTarget]);

  const moveTask = useCallback(
    async (taskId: string, targetColumn: BoardColumn, beforeId: string | null) => {
      const sourceTask = visibleTasks.find((task) => task.id === taskId);
      if (!sourceTask) return;

      setOrderedIds((current) => placeTaskId(current, taskId, beforeId, grouped[targetColumn]));
      setTaskOverrides((current) => ({
        ...current,
        [taskId]: {
          status: targetColumn,
          completedAt: targetColumn === "DONE" ? new Date().toISOString() : null,
        },
      }));
      setDraggedTaskId(null);
      setDragTarget(null);

      try {
        if (targetColumn === "DONE" && sourceTask.status !== "DONE") {
          await completeTask.mutateAsync(taskId);
        } else if (sourceTask.status !== targetColumn) {
          await updateTask.mutateAsync({ id: taskId, status: targetColumn });
        }
      } catch {
        setTaskOverrides((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });
      }
    },
    [completeTask, grouped, updateTask, visibleTasks],
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = pointerDragRef.current;
      if (!drag) return;

      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.active && distance > 6) {
        drag.active = true;
        setDraggedTaskId(drag.taskId);
      }
      if (!drag.active) return;

      const dropEl = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-task-drop-column]");
      if (!dropEl) return;

      const column = dropEl.dataset.taskDropColumn as BoardColumn | undefined;
      if (!column) return;

      const target = {
        column,
        beforeId: dropEl.dataset.taskBeforeId || null,
      };
      dragTargetRef.current = target;
      setDragTarget(target);
    };

    const handleMouseUp = () => {
      const drag = pointerDragRef.current;
      pointerDragRef.current = null;

      if (drag?.active && dragTargetRef.current) {
        void moveTask(drag.taskId, dragTargetRef.current.column, dragTargetRef.current.beforeId);
        return;
      }

      setDraggedTaskId(null);
      setDragTarget(null);
      dragTargetRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [moveTask]);

  const beginPointerDrag = (event: ReactMouseEvent, taskId: string) => {
    if (event.button !== 0 || isInteractiveElement(event.target)) return;
    event.preventDefault();
    pointerDragRef.current = {
      taskId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  };

  const handleDrop = (event: DragEvent, target: DragTarget) => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedTaskId) return;
    void moveTask(draggedTaskId, target.column, target.beforeId);
  };

  const completeFromButton = (task: TaskDTO) => {
    setTaskOverrides((current) => ({
      ...current,
      [task.id]: { status: "DONE", completedAt: new Date().toISOString() },
    }));
    void completeTask.mutateAsync(task.id).catch(() => {
      setTaskOverrides((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    });
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-5 px-4 py-6 md:px-8">
      <header className="panel-cream framed flex flex-col gap-4 rounded-sm p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">任务管理</span>
            <span className="en text-[11px]">Task Command</span>
          </div>
          <div className="mt-2 h-px max-w-xl bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--fg-muted)]">
            在看板中拖动任务，在四象限中判断优先级，或进入全部任务做细致整理。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <TaskViewTabs view={view} onChange={setView} />
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus size={16} />
            {showForm ? "Close" : "New Task"}
          </Button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <TaskForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="panel-cream framed rounded-sm py-16 text-center text-sm text-[var(--fg-muted)]">
          Loading...
        </div>
      ) : view === "board" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {BOARD_COLUMNS.map((column) => (
            <TaskColumn
              key={column.key}
              column={column}
              tasks={grouped[column.key]}
              dragTarget={dragTarget}
              draggedTaskId={draggedTaskId}
              isBusy={updateTask.isPending || completeTask.isPending}
              onDragStart={(taskId) => setDraggedTaskId(taskId)}
              onDragEnd={() => {
                setDraggedTaskId(null);
                setDragTarget(null);
              }}
              onDragOver={(target) => setDragTarget(target)}
              onDrop={handleDrop}
              onPointerDragStart={beginPointerDrag}
              onComplete={completeFromButton}
            />
          ))}
        </div>
      ) : view === "matrix" ? (
        <EisenhowerMatrix
          tasks={matrixTasks}
          isBusy={completeTask.isPending}
          onComplete={completeFromButton}
        />
      ) : (
        <AllTasksView
          tasks={allTasks}
          filter={taskFilter}
          isBusy={completeTask.isPending}
          onFilterChange={setTaskFilter}
          onComplete={completeFromButton}
        />
      )}
    </div>
  );
}

function TaskViewTabs({
  view,
  onChange,
}: {
  view: TaskView;
  onChange: (view: TaskView) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-sm border border-[var(--gold)]/40 bg-[rgba(255,252,242,0.55)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
      {VIEW_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = view === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex min-w-[92px] items-center justify-center gap-2 border-r border-[var(--gold)]/25 px-3 py-2 text-left transition last:border-r-0",
              active
                ? "bg-[var(--gold-tint)] text-[var(--gold-deep)] shadow-[inset_0_-2px_0_var(--gold)]"
                : "text-[var(--fg-muted)] hover:bg-white/55 hover:text-[var(--fg-strong)]",
            )}
          >
            <Icon size={15} />
            <span className="leading-none">
              <span className="block font-display text-[13px] font-bold">{tab.cn}</span>
              <span className="mt-1 block font-display-en text-[8px]">{tab.en}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TaskColumn({
  column,
  tasks,
  dragTarget,
  draggedTaskId,
  isBusy,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onPointerDragStart,
  onComplete,
}: {
  column: (typeof BOARD_COLUMNS)[number];
  tasks: TaskDTO[];
  dragTarget: DragTarget | null;
  draggedTaskId: string | null;
  isBusy: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (target: DragTarget) => void;
  onDrop: (event: DragEvent, target: DragTarget) => void;
  onPointerDragStart: (event: ReactMouseEvent, taskId: string) => void;
  onComplete: (task: TaskDTO) => void;
}) {
  const Icon = column.icon;
  const columnTarget = { column: column.key, beforeId: null };
  const isColumnTarget = dragTarget?.column === column.key && dragTarget.beforeId === null;

  return (
    <section
      data-task-drop-column={column.key}
      className={cn(
        "panel-cream framed flex min-h-[560px] flex-col rounded-sm border-2 p-3 transition-all",
        column.tone,
        isColumnTarget ? "border-[var(--gold)] shadow-[0_0_0_2px_rgba(182,136,56,0.28)]" : "",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(columnTarget);
      }}
      onDrop={(event) => onDrop(event, columnTarget)}
    >
      <div className="mb-3 flex items-start justify-between border-b border-[var(--gold)]/30 pb-3">
        <div className="flex items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-[var(--gold)]/50 bg-[var(--bg-card)] text-[var(--gold-deep)]">
            <Icon size={17} />
          </div>
          <div>
            <div className="font-display text-[15px] font-bold text-[var(--fg-strong)]">
              {column.cn}
            </div>
            <div className="font-display-en text-[9px] text-[var(--gold-deep)]">{column.en}</div>
            <p className="mt-1 text-[11px] leading-5 text-[var(--fg-muted)]">{column.hint}</p>
          </div>
        </div>
        <span className="rounded-sm border border-[var(--gold)]/50 bg-[var(--gold-tint)] px-2 py-1 font-mono text-xs font-bold text-[var(--gold-deep)]">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="grid min-h-[150px] place-items-center rounded-sm border border-dashed border-[var(--border-strong)]/60 bg-white/35 px-4 text-center text-[12px] text-[var(--fg-subtle)]">
            拖到这里
          </div>
        ) : (
          tasks.map((task) => (
            <TaskBoardCard
              key={task.id}
              task={task}
              column={column.key}
              dragging={draggedTaskId === task.id}
              dropBefore={dragTarget?.beforeId === task.id}
              isBusy={isBusy}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOver({ column: column.key, beforeId: task.id });
              }}
              onDrop={(event) => onDrop(event, { column: column.key, beforeId: task.id })}
              onPointerDragStart={onPointerDragStart}
              onComplete={onComplete}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TaskBoardCard({
  task,
  column,
  dragging,
  dropBefore,
  isBusy,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onPointerDragStart,
  onComplete,
}: {
  task: TaskDTO;
  column: BoardColumn;
  dragging: boolean;
  dropBefore: boolean;
  isBusy: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onPointerDragStart: (event: ReactMouseEvent, taskId: string) => void;
  onComplete: (task: TaskDTO) => void;
}) {
  const [editing, setEditing] = useState(false);
  const remove = useDeleteTask();

  if (editing) {
    return (
      <div className="rounded-sm border border-[var(--gold)] bg-[var(--bg-card)] p-3">
        <TaskEditForm task={task} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <article
      data-task-drop-column={column}
      data-task-before-id={task.id}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseDown={(event) => onPointerDragStart(event, task.id)}
      className={cn(
        "group relative rounded-sm border bg-[rgba(255,252,242,0.9)] p-3 text-left shadow-[0_12px_28px_-24px_rgba(7,20,36,0.68)] transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]",
        column === "IN_PROGRESS" ? "border-[#3a6b8e]/35" : "border-[var(--border)]",
        column === "DONE" ? "opacity-82" : "",
        dragging ? "opacity-45" : "",
        dropBefore ? "shadow-[0_-3px_0_0_var(--gold),0_12px_28px_-24px_rgba(7,20,36,0.68)]" : "",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={16}
          className="mt-0.5 shrink-0 cursor-grab text-[var(--fg-subtle)] active:cursor-grabbing"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[14px] font-bold leading-snug text-[var(--fg-strong)]">
            {task.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
            {task.area && (
              <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5">
                {task.area.icon} {task.area.name}
              </span>
            )}
            {task.project && (
              <span className="rounded-sm bg-white/65 px-1.5 py-0.5 text-[var(--gold-deep)]">
                {task.project.title}
              </span>
            )}
            <Badge tone={task.priority === 1 ? "danger" : "default"} className="rounded-sm text-[10px]">
              {PRIORITY_LABEL[task.priority]}
            </Badge>
            {task.dueDate && <span className="font-mono">due {formatShortDate(task.dueDate)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {task.status !== "DONE" && (
            <button
              type="button"
              onClick={() => onComplete(task)}
              disabled={isBusy}
              className="grid size-7 place-items-center rounded-sm border border-[var(--border-strong)] text-[var(--gold-deep)] transition hover:bg-[var(--gold-tint)] disabled:opacity-50"
              title="完成"
            >
              <Check size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={task.status === "DONE"}
            className="grid size-7 place-items-center rounded-sm text-[var(--fg-muted)] transition hover:bg-[var(--gold-tint)] hover:text-[var(--fg-strong)] disabled:opacity-40"
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete task "${task.title}"?`)) remove.mutate(task.id);
            }}
            className="grid size-7 place-items-center rounded-sm text-[var(--fg-muted)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {task.notes && (
        <p className="mt-3 line-clamp-3 rounded-sm border-l-2 border-[var(--gold)]/35 bg-white/45 px-3 py-2 text-[12px] leading-5 text-[var(--fg-muted)]">
          {task.notes}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[var(--gold)]/18 pt-2 text-[11px]">
        <span className="font-mono text-[var(--accent-strong)]">+{task.xpReward} XP</span>
        <span className="font-mono text-[var(--attr-gold)]">+{task.goldReward} Gold</span>
        {task.completedAt && (
          <span className="font-mono text-[var(--fg-subtle)]">{formatShortDate(task.completedAt)}</span>
        )}
      </div>
    </article>
  );
}

type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";

const QUADRANT_META: Record<
  Quadrant,
  {
    cn: string;
    en: string;
    action: string;
    hint: string;
    tone: string;
    chip: string;
  }
> = {
  Q1: {
    cn: "立即处理",
    en: "Do First",
    action: "重要且紧急",
    hint: "优先级高，并且截止日期在 3 天内。",
    tone: "border-[var(--danger)]/55 bg-[rgba(255,244,240,0.82)]",
    chip: "bg-[var(--danger)]/12 text-[var(--danger)]",
  },
  Q2: {
    cn: "安排时间",
    en: "Schedule",
    action: "重要但不紧急",
    hint: "优先级高，但还有规划空间。",
    tone: "border-[var(--gold)]/55 bg-[rgba(255,252,242,0.88)]",
    chip: "bg-[var(--gold-tint)] text-[var(--gold-deep)]",
  },
  Q3: {
    cn: "压缩处理",
    en: "Delegate",
    action: "紧急但不重要",
    hint: "临近截止，但优先级不是最高。",
    tone: "border-[#3a6b8e]/45 bg-[rgba(238,247,255,0.84)]",
    chip: "bg-[#3a6b8e]/12 text-[#2f5d7e]",
  },
  Q4: {
    cn: "暂缓或舍弃",
    en: "Eliminate",
    action: "不紧急也不重要",
    hint: "没有明确压力，可以批量处理。",
    tone: "border-[var(--border-strong)]/55 bg-[rgba(255,255,255,0.62)]",
    chip: "bg-[var(--bg-elevated)] text-[var(--fg-muted)]",
  },
};

function EisenhowerMatrix({
  tasks,
  isBusy,
  onComplete,
}: {
  tasks: TaskDTO[];
  isBusy: boolean;
  onComplete: (task: TaskDTO) => void;
}) {
  const grouped = useMemo(() => {
    const buckets: Record<Quadrant, TaskDTO[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    for (const task of tasks) buckets[classify(task)].push(task);
    return buckets;
  }, [tasks]);

  return (
    <section className="panel-cream framed rounded-sm p-4">
      <div className="mb-4 flex flex-col gap-2 border-b border-[var(--gold)]/25 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-xl">四象限图</span>
            <span className="en text-[10px]">Eisenhower Matrix</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--fg-muted)]">
            仅纳入准备开始和正在进行中的任务，用优先级和截止时间拆分行动顺序。
          </p>
        </div>
        <div className="flex gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
          <span className="rounded-sm border border-[var(--gold)]/40 bg-white/55 px-2 py-1">
            High = 重要
          </span>
          <span className="rounded-sm border border-[var(--gold)]/40 bg-white/55 px-2 py-1">
            3 Days = 紧急
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {(["Q1", "Q2", "Q3", "Q4"] as const).map((quadrant) => (
          <QuadrantCard
            key={quadrant}
            q={quadrant}
            tasks={grouped[quadrant]}
            isBusy={isBusy}
            onComplete={onComplete}
          />
        ))}
      </div>
    </section>
  );
}

function QuadrantCard({
  q,
  tasks,
  isBusy,
  onComplete,
}: {
  q: Quadrant;
  tasks: TaskDTO[];
  isBusy: boolean;
  onComplete: (task: TaskDTO) => void;
}) {
  const meta = QUADRANT_META[q];

  return (
    <div className={cn("min-h-[240px] rounded-sm border-2 p-3", meta.tone)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-[16px] font-bold text-[var(--fg-strong)]">
            {meta.cn}
            <span className="ml-2 text-[11px] font-normal text-[var(--fg-muted)]">{meta.action}</span>
          </div>
          <div className="font-display-en mt-1 text-[9px] text-[var(--gold-deep)]">
            {q} · {meta.en}
          </div>
          <p className="mt-2 text-[12px] leading-5 text-[var(--fg-muted)]">{meta.hint}</p>
        </div>
        <span className={cn("rounded-sm px-2 py-1 font-mono text-xs font-bold", meta.chip)}>
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="grid min-h-[120px] place-items-center rounded-sm border border-dashed border-[var(--border-strong)]/50 bg-white/35 text-[12px] text-[var(--fg-subtle)]">
          暂无任务
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <MatrixTaskRow key={task.id} task={task} isBusy={isBusy} onComplete={onComplete} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MatrixTaskRow({
  task,
  isBusy,
  onComplete,
}: {
  task: TaskDTO;
  isBusy: boolean;
  onComplete: (task: TaskDTO) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[rgba(255,252,242,0.86)] p-2 text-[12px] shadow-[0_8px_22px_-20px_rgba(7,20,36,0.55)]">
      <button
        type="button"
        onClick={() => onComplete(task)}
        disabled={isBusy}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-[var(--border-strong)] text-[var(--gold-deep)] transition hover:border-[var(--gold)] hover:bg-[var(--gold-tint)] disabled:opacity-50"
        title="完成"
      >
        <Check size={12} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display font-bold text-[var(--fg-strong)]">{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--fg-subtle)]">
          <Badge tone={STATUS_META[task.status].tone} className="rounded-sm text-[9px]">
            {STATUS_META[task.status].cn}
          </Badge>
          {task.area && <span>{task.area.icon} {task.area.name}</span>}
          {task.dueDate && <span className="font-mono">due {formatShortDate(task.dueDate)}</span>}
        </div>
      </div>
      <span className="font-mono text-[10px] text-[var(--gold-deep)]">
        {PRIORITY_LABEL[task.priority]}
      </span>
    </li>
  );
}

function AllTasksView({
  tasks,
  filter,
  isBusy,
  onFilterChange,
  onComplete,
}: {
  tasks: TaskDTO[];
  filter: "all" | TaskStatus;
  isBusy: boolean;
  onFilterChange: (filter: "all" | TaskStatus) => void;
  onComplete: (task: TaskDTO) => void;
}) {
  const filteredTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks],
  );

  return (
    <section className="panel-cream framed rounded-sm p-4">
      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--gold)]/25 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-xl">全部任务</span>
            <span className="en text-[10px]">All Tasks</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--fg-muted)]">
            查看所有状态的任务，并进行编辑、完成或删除。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => {
            const active = filter === item;
            const label = item === "all" ? "全部" : STATUS_META[item].cn;
            const count = item === "all" ? tasks.length : tasks.filter((task) => task.status === item).length;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(item)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]"
                    : "border-[var(--border)] bg-white/45 text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--fg-strong)]",
                )}
              >
                {label}
                <span className="ml-2 font-mono">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="grid min-h-[220px] place-items-center rounded-sm border border-dashed border-[var(--border-strong)]/60 bg-white/35 text-center text-sm text-[var(--fg-subtle)]">
          当前筛选下没有任务。
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskListRow
              key={task.id}
              task={task}
              isBusy={isBusy}
              onComplete={onComplete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskListRow({
  task,
  isBusy,
  onComplete,
}: {
  task: TaskDTO;
  isBusy: boolean;
  onComplete: (task: TaskDTO) => void;
}) {
  const [editing, setEditing] = useState(false);
  const remove = useDeleteTask();
  const done = task.status === "DONE";
  const canceled = task.status === "CANCELED";
  const status = STATUS_META[task.status];

  if (editing) {
    return (
      <li className="rounded-sm border border-[var(--gold)] bg-[var(--bg-card)] p-4">
        <TaskEditForm task={task} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li
      className={cn(
        "rounded-sm border border-[var(--border)] bg-[rgba(255,252,242,0.88)] px-4 py-3 transition hover:border-[var(--gold)]",
        done || canceled ? "opacity-70" : "",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            disabled={done || canceled || isBusy}
            onClick={() => onComplete(task)}
            className={cn(
              "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-sm border transition disabled:opacity-50",
              done
                ? "border-[var(--success)] bg-[var(--success)]/12 text-[var(--success)]"
                : "border-[var(--border-strong)] text-[var(--gold-deep)] hover:border-[var(--gold)] hover:bg-[var(--gold-tint)]",
            )}
            title="完成"
          >
            <Check size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <div className={cn("font-display text-sm font-bold text-[var(--fg-strong)]", done ? "line-through" : "")}>
              {task.title}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
              <Badge tone={status.tone} className="rounded-sm text-[10px]">
                {status.cn}
              </Badge>
              {task.area && <span>{task.area.icon} {task.area.name}</span>}
              {task.project && (
                <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5 text-[10px] text-[var(--gold-deep)]">
                  {task.project.title}
                </span>
              )}
              <span>{PRIORITY_LABEL[task.priority]}</span>
              {task.dueDate && <span className="font-mono">due {formatShortDate(task.dueDate)}</span>}
              {task.completedAt && <span className="font-mono">done {formatShortDate(task.completedAt)}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[var(--accent-strong)]">+{task.xpReward} XP</span>
            <span className="font-mono text-[var(--attr-gold)]">+{task.goldReward} Gold</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={done}
              className="grid size-8 place-items-center rounded-sm text-[var(--fg-muted)] transition hover:bg-[var(--gold-tint)] hover:text-[var(--fg-strong)] disabled:opacity-40"
              title="编辑"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete task "${task.title}"?`)) remove.mutate(task.id);
              }}
              className="grid size-8 place-items-center rounded-sm text-[var(--fg-muted)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {task.notes && (
        <div className="mt-3 whitespace-pre-wrap rounded-sm border-l-2 border-[var(--gold)]/30 bg-white/45 px-3 py-2 text-xs leading-5 text-[var(--fg-muted)]">
          {task.notes}
        </div>
      )}
    </li>
  );
}

function TaskForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState(2);
  const [dueDate, setDueDate] = useState("");
  const [xpReward, setXpReward] = useState(10);
  const [goldReward, setGoldReward] = useState(5);

  const create = useCreateTask();

  const submit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      notes: notes.trim() || null,
      areaId,
      projectId,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      xpReward,
      goldReward,
    });
    onDone();
  };

  return (
    <Card variant="cream-framed">
      <CardHeader>
        <CardTitle>New Task</CardTitle>
        <CardDescription>A one-shot action with a deadline.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Book annual health checkup"
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Project (optional) · 挂载到项目</Label>
          <ProjectSelect value={projectId} onChange={setProjectId} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Life Area</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={1}>1 — High</option>
              <option value={2}>2 — Normal</option>
              <option value={3}>3 — Low</option>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Due date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>XP</Label>
              <Input
                type="number"
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Gold</Label>
              <Input
                type="number"
                min={0}
                value={goldReward}
                onChange={(e) => setGoldReward(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !title.trim()}>
            {create.isPending ? "Saving..." : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskEditForm({ task, onDone }: { task: TaskDTO; onDone: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [areaId, setAreaId] = useState<string | null>(task.area?.id ?? null);
  const [projectId, setProjectId] = useState<string | null>(task.projectId ?? null);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [xpReward, setXpReward] = useState(task.xpReward);
  const [goldReward, setGoldReward] = useState(task.goldReward);

  const update = useUpdateTask();

  const submit = async () => {
    if (!title.trim()) return;
    await update.mutateAsync({
      id: task.id,
      title: title.trim(),
      notes: notes.trim() || null,
      areaId,
      projectId,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      xpReward,
      goldReward,
    });
    onDone();
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="font-display-en text-[10px] text-[var(--gold-deep)]">Edit Task</div>
        <Button size="icon" variant="ghost" onClick={onDone} title="Cancel">
          <X size={14} />
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="grid gap-1.5">
        <Label>Project · 挂载到项目</Label>
        <ProjectSelect value={projectId} onChange={setProjectId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Life Area</Label>
          <AreaSelect value={areaId} onChange={setAreaId} />
        </div>
        <div className="grid gap-1.5">
          <Label>Priority</Label>
          <Select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
            <option value={1}>1 — High</option>
            <option value={2}>2 — Normal</option>
            <option value={3}>3 — Low</option>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Due date (optional)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label>XP</Label>
            <Input
              type="number"
              min={0}
              value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Gold</Label>
            <Input
              type="number"
              min={0}
              value={goldReward}
              onChange={(e) => setGoldReward(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={update.isPending || !title.trim()}>
          {update.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function applyOverride(task: TaskDTO, override?: TaskOverride): TaskDTO {
  if (!override) return task;
  return {
    ...task,
    status: override.status,
    completedAt: override.completedAt,
  };
}

function isRecentDone(task: TaskDTO, now = Date.now()) {
  if (task.status !== "DONE" || !task.completedAt) return false;
  const completed = new Date(task.completedAt).getTime();
  return Number.isFinite(completed) && now - completed <= DONE_WINDOW_MS;
}

function classify(task: TaskDTO): Quadrant {
  const important = task.priority === 1;
  const urgent = isUrgent(task.dueDate);
  if (important && urgent) return "Q1";
  if (important && !urgent) return "Q2";
  if (!important && urgent) return "Q3";
  return "Q4";
}

function isUrgent(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate).getTime();
  if (!Number.isFinite(due)) return false;
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return due - Date.now() <= threeDays;
}

function sortForAllTasks(a: TaskDTO, b: TaskDTO) {
  if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  }

  if (a.status === "DONE" && b.status === "DONE") {
    const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    if (aCompleted !== bCompleted) return bCompleted - aCompleted;
  }

  return sortByTaskShape(a, b);
}

function sortByTaskShape(a: TaskDTO, b: TaskDTO) {
  const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function placeTaskId(
  currentOrder: string[],
  taskId: string,
  beforeId: string | null,
  targetColumnTasks: TaskDTO[],
) {
  const withoutTask = currentOrder.filter((id) => id !== taskId);
  if (beforeId && beforeId !== taskId) {
    const beforeIndex = withoutTask.indexOf(beforeId);
    if (beforeIndex >= 0) {
      return [
        ...withoutTask.slice(0, beforeIndex),
        taskId,
        ...withoutTask.slice(beforeIndex),
      ];
    }
  }

  const lastTargetId = targetColumnTasks
    .map((task) => task.id)
    .filter((id) => id !== taskId)
    .at(-1);
  if (!lastTargetId) return [...withoutTask, taskId];

  const afterIndex = withoutTask.indexOf(lastTargetId);
  if (afterIndex < 0) return [...withoutTask, taskId];
  return [
    ...withoutTask.slice(0, afterIndex + 1),
    taskId,
    ...withoutTask.slice(afterIndex + 1),
  ];
}

function isInteractiveElement(target: EventTarget) {
  return target instanceof Element
    ? Boolean(target.closest("button, a, input, textarea, select, option"))
    : false;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}
