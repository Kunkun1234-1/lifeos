"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AreaSelect } from "@/components/area-select";
import { ProjectSelect } from "@/components/project-select";
import {
  useAreas,
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useRoutines,
  useTasks,
  useUpdateTask,
} from "@/hooks/queries";
import { addDaysYMD, endOfWeekYMD, startOfWeekYMD, todayYMD, toYMD } from "@/lib/date";
import { defaultTaskPriorityNumber } from "@/lib/settings-prefs";
import type { TaskDTO } from "@/lib/types";
import styles from "./page.module.css";

type ViewTab = "mine" | "schedule" | "week" | "month";
/** 任务类型：主线=挂项目；支线=一次性无项目；日/周循环归 Routines */
type TypeId = "all" | "main" | "side" | "done";
type AreaFilter = "all" | "none" | string; // area id

type PriorityFilter = Set<number>; // 1 high, 2 mid, 3 low; empty = all
type StatusFilter = "all" | "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
type DueFilter = "all" | "today" | "week" | "overdue" | "none";
type CompletedGroupKey = "today" | "week" | "month" | "earlier";

const COMPLETED_PAGE_SIZE = 20;

const VIEW_TABS: Array<{ id: ViewTab; label: string }> = [
  { id: "mine", label: "我的任务" },
  { id: "schedule", label: "日程视图" },
  { id: "week", label: "周视图" },
  { id: "month", label: "月视图" },
];

const TYPE_CATEGORIES: Array<{ id: TypeId; label: string; icon: string }> = [
  { id: "all", label: "全部任务", icon: "☰" },
  { id: "main", label: "主线任务", icon: "⚔" },
  { id: "side", label: "支线任务", icon: "🗺" },
  { id: "done", label: "已完成", icon: "✓" },
];

const RECOMMENDATIONS = [
  { title: "每日冥想", notes: "静心 10 分钟，恢复专注", xp: 80, gold: 20 },
  { title: "清理背包道具", notes: "整理库存，腾出空间", xp: 50, gold: 15 },
  { title: "阅读 30 分钟", notes: "学习成长日常", xp: 60, gold: 10 },
  { title: "散步 20 分钟", notes: "健康生活小目标", xp: 40, gold: 10 },
];

const TIME_SLOTS = ["08:00", "10:00", "14:00", "16:00", "20:00"];
const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function shiftMonth(ymd: string, delta: number) {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toYMD(d);
}

const ATTR_TONE: Record<string, string> = {
  STR: "green",
  INT: "blue",
  CHA: "purple",
  WIS: "blue",
  CRE: "purple",
  GOLD: "orange",
};

function dueYmd(task: TaskDTO): string | null {
  if (!task.dueDate) return null;
  return toYMD(new Date(task.dueDate));
}

function isOverdue(task: TaskDTO, today = todayYMD()) {
  if (task.status === "DONE" || task.status === "CANCELED") return false;
  const ymd = dueYmd(task);
  return Boolean(ymd && ymd < today);
}

function progressOf(task: TaskDTO) {
  if (task.status === "DONE") return 100;
  if (task.status === "IN_PROGRESS") return 55;
  if (task.status === "CANCELED") return 0;
  return 0;
}

function matchesType(task: TaskDTO, type: TypeId) {
  switch (type) {
    case "all":
      return task.status === "TODO" || task.status === "IN_PROGRESS";
    case "main":
      return Boolean(task.projectId) && task.status !== "DONE" && task.status !== "CANCELED";
    case "side":
      return !task.projectId && task.status !== "DONE" && task.status !== "CANCELED";
    case "done":
      return task.status === "DONE";
    default:
      return true;
  }
}

function completedTime(task: TaskDTO) {
  return task.completedAt ? new Date(task.completedAt).getTime() : 0;
}

function completedGroup(task: TaskDTO, today: string): CompletedGroupKey {
  if (!task.completedAt) return "earlier";
  const completedYmd = toYMD(new Date(task.completedAt));
  if (completedYmd === today) return "today";
  if (completedYmd >= startOfWeekYMD(today) && completedYmd <= endOfWeekYMD(today)) {
    return "week";
  }
  if (completedYmd.startsWith(today.slice(0, 7))) return "month";
  return "earlier";
}

function matchesArea(task: TaskDTO, areaFilter: AreaFilter) {
  if (areaFilter === "all") return true;
  if (areaFilter === "none") return !task.areaId;
  return task.areaId === areaFilter;
}

function taskIcon(task: TaskDTO) {
  if (task.area?.icon) return task.area.icon;
  if (task.projectId) return "⚔";
  return "📜";
}

function taskTags(task: TaskDTO): Array<{ label: string; tone: string }> {
  const tags: Array<{ label: string; tone: string }> = [];
  if (task.projectId) tags.push({ label: "主线", tone: "orange" });
  else if (task.status !== "DONE") tags.push({ label: "支线", tone: "green" });
  if (task.area) {
    tags.push({
      label: task.area.name,
      tone: ATTR_TONE[task.area.attributeKey] ?? "blue",
    });
  }
  return tags;
}

function formatDue(task: TaskDTO, today = todayYMD()) {
  const ymd = dueYmd(task);
  if (!ymd) return "无截止日期";
  if (ymd === today) {
    const d = task.dueDate ? new Date(task.dueDate) : null;
    const hh = d ? String(d.getHours()).padStart(2, "0") : "23";
    const mm = d ? String(d.getMinutes()).padStart(2, "0") : "59";
    return `今天 ${hh}:${mm}`;
  }
  const tomorrow = addDaysYMD(today, 1);
  if (ymd === tomorrow) return "明天";
  const diff =
    (new Date(ymd + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) /
    (24 * 60 * 60 * 1000);
  if (diff > 0 && diff <= 7) return `${Math.round(diff)} 天后`;
  if (diff < 0) return `逾期 ${Math.abs(Math.round(diff))} 天`;
  return ymd.slice(5);
}

function formatCompletedAt(task: TaskDTO, today = todayYMD()) {
  if (!task.completedAt) return "完成时间未记录";
  const date = new Date(task.completedAt);
  const ymd = toYMD(date);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (ymd === today) return `今天 ${time}`;
  return `${ymd.slice(5)} ${time}`;
}

function priorityLabel(p: number) {
  if (p === 1) return "高";
  if (p === 3) return "低";
  return "中";
}

function Ring({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);
  return (
    <div className={styles.ringWrap}>
      <div className={styles.ring}>
        <svg viewBox="0 0 72 72" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e6e8d8" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={styles.ringValue}>{pct}%</div>
      </div>
      <div className={styles.ringLabel}>{label}</div>
    </div>
  );
}

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: areas = [] } = useAreas();
  const { data: routines = [] } = useRoutines();
  const complete = useCompleteTask();
  const remove = useDeleteTask();
  const create = useCreateTask();

  const [view, setView] = useState<ViewTab>("mine");
  const [typeId, setTypeId] = useState<TypeId>("all");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [priorities, setPriorities] = useState<PriorityFilter>(new Set([1, 2, 3]));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [cursorDate, setCursorDate] = useState(() => todayYMD());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskDTO | null>(null);
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [todayDoneOpen, setTodayDoneOpen] = useState(false);
  const [completedVisibleCount, setCompletedVisibleCount] = useState(COMPLETED_PAGE_SIZE);

  const today = todayYMD();
  const weekStart = startOfWeekYMD(cursorDate);
  const weekEnd = endOfWeekYMD(cursorDate);
  const monthPrefix = cursorDate.slice(0, 7);

  const activeAreas = useMemo(
    () => [...areas].filter((a) => !a.archived).sort((a, b) => a.order - b.order),
    [areas],
  );

  const typeCounts = useMemo(() => {
    const map = Object.fromEntries(TYPE_CATEGORIES.map((c) => [c.id, 0])) as Record<TypeId, number>;
    for (const t of tasks) {
      for (const c of TYPE_CATEGORIES) {
        if (matchesType(t, c.id)) map[c.id] += 1;
      }
    }
    return map;
  }, [tasks]);

  const areaCounts = useMemo(() => {
    const map: Record<string, number> = { all: 0, none: 0 };
    for (const a of activeAreas) map[a.id] = 0;
    for (const t of tasks) {
      const belongsToCurrentCollection =
        typeId === "done"
          ? t.status === "DONE"
          : t.status === "TODO" || t.status === "IN_PROGRESS";
      if (!belongsToCurrentCollection) continue;
      map.all += 1;
      if (!t.areaId) map.none += 1;
      else if (map[t.areaId] !== undefined) map[t.areaId] += 1;
    }
    return map;
  }, [tasks, activeAreas, typeId]);

  const overview = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "CANCELED");
    const inProgress = active.filter((t) => t.status === "IN_PROGRESS").length;
    const todo = active.filter((t) => t.status === "TODO").length;
    const overdue = active.filter((t) => isOverdue(t, today)).length;

    const dueToday = active.filter((t) => dueYmd(t) === today);
    const todayDone = dueToday.filter((t) => t.status === "DONE").length;
    const todayRate = dueToday.length ? Math.round((todayDone / dueToday.length) * 100) : 0;

    const dueWeek = active.filter((t) => {
      const y = dueYmd(t);
      return y && y >= startOfWeekYMD(today) && y <= endOfWeekYMD(today);
    });
    const dueWeekDone = dueWeek.filter((t) => t.status === "DONE").length;
    const weekRate = dueWeek.length ? Math.round((dueWeekDone / dueWeek.length) * 100) : 0;
    const weekDone = active.filter((t) => {
      if (t.status !== "DONE" || !t.completedAt) return false;
      const ymd = toYMD(new Date(t.completedAt));
      return ymd >= startOfWeekYMD(today) && ymd <= endOfWeekYMD(today);
    }).length;

    return { inProgress, todo, weekDone, overdue, todayRate, weekRate };
  }, [tasks, today]);

  /** 侧栏筛选后的任务（不含顶栏视图时间窗） */
  const scoped = useMemo(() => {
    let list = tasks.filter(
      (t) =>
        (statusFilter === "CANCELED" || matchesType(t, typeId)) && matchesArea(t, areaFilter),
    );

    if (priorities.size < 3) {
      list = list.filter((t) => priorities.has(t.priority));
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (dueFilter === "today") list = list.filter((t) => dueYmd(t) === today);
    if (dueFilter === "week") {
      list = list.filter((t) => {
        const y = dueYmd(t);
        return y && y >= startOfWeekYMD(today) && y <= endOfWeekYMD(today);
      });
    }
    if (dueFilter === "overdue") list = list.filter((t) => isOverdue(t, today));
    if (dueFilter === "none") list = list.filter((t) => !t.dueDate);

    return [...list].sort((a, b) => {
      const aDone = a.status === "DONE" ? 1 : 0;
      const bDone = b.status === "DONE" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
  }, [tasks, typeId, areaFilter, priorities, statusFilter, dueFilter, today]);

  const listTasks = useMemo(() => {
    if (view === "schedule") {
      return scoped.filter(
        (t) => dueYmd(t) === cursorDate || (!t.dueDate && t.status !== "DONE" && cursorDate === today),
      );
    }
    if (view === "week") {
      return scoped.filter((t) => {
        const y = dueYmd(t);
        return y && y >= weekStart && y <= weekEnd;
      });
    }
    if (view === "month") {
      return scoped.filter((t) => {
        const y = dueYmd(t);
        return y && y.startsWith(monthPrefix);
      });
    }
    return scoped;
  }, [scoped, view, cursorDate, today, weekStart, weekEnd, monthPrefix]);

  const todayCompleted = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.status === "DONE" &&
            task.completedAt &&
            toYMD(new Date(task.completedAt)) === today &&
            matchesArea(task, areaFilter) &&
            priorities.has(task.priority) &&
            (typeId === "all" ||
              (typeId === "main" && Boolean(task.projectId)) ||
              (typeId === "side" && !task.projectId)),
        )
        .sort((a, b) => completedTime(b) - completedTime(a)),
    [tasks, today, areaFilter, priorities, typeId],
  );

  const completedHistory = useMemo(
    () => [...listTasks].sort((a, b) => completedTime(b) - completedTime(a)),
    [listTasks],
  );

  const visibleCompleted = useMemo(
    () => completedHistory.slice(0, completedVisibleCount),
    [completedHistory, completedVisibleCount],
  );

  const completedGroups = useMemo(() => {
    const groups: Record<CompletedGroupKey, TaskDTO[]> = {
      today: [],
      week: [],
      month: [],
      earlier: [],
    };
    for (const task of visibleCompleted) groups[completedGroup(task, today)].push(task);
    return groups;
  }, [visibleCompleted, today]);

  useEffect(() => {
    setCompletedVisibleCount(COMPLETED_PAGE_SIZE);
  }, [areaFilter, dueFilter, priorities, statusFilter, typeId]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysYMD(weekStart, i)),
    [weekStart],
  );

  const monthCells = useMemo(() => {
    const first = `${monthPrefix}-01`;
    const start = startOfWeekYMD(first);
    return Array.from({ length: 42 }, (_, i) => addDaysYMD(start, i));
  }, [monthPrefix]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const t of scoped) {
      const y = dueYmd(t);
      if (!y) continue;
      const arr = map.get(y) ?? [];
      arr.push(t);
      map.set(y, arr);
    }
    return map;
  }, [scoped]);

  const scheduleDayTasks = useMemo(() => {
    const dated = scoped.filter((t) => dueYmd(t) === cursorDate);
    const undated =
      cursorDate === today
        ? scoped.filter((t) => !t.dueDate && t.status !== "DONE" && t.status !== "CANCELED")
        : [];
    return { dated, undated };
  }, [scoped, cursorDate, today]);

  const viewTitle =
    view === "mine"
      ? "任务列表"
      : view === "schedule"
        ? "日程视图"
        : view === "week"
          ? "周视图"
          : "月视图";

  const switchView = (next: ViewTab) => {
    setView(next);
    if (next !== "mine") setCursorDate(today);
  };

  const selectType = (next: TypeId) => {
    setTypeId(next);
    setStatusFilter("all");
    if (next === "done") setCompletedVisibleCount(COMPLETED_PAGE_SIZE);
  };

  const upcoming = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "DONE" && t.status !== "CANCELED" && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasks]);

  const planItems = useMemo(() => {
    const dueToday = tasks.filter(
      (t) => dueYmd(t) === today && t.status !== "DONE" && t.status !== "CANCELED",
    );
    const routineItems = routines
      .filter((r) => !r.completedToday)
      .slice(0, 3)
      .map((r) => ({ title: r.title, sub: "日常习惯" }));
    const taskItems = dueToday.slice(0, 5).map((t) => ({
      title: t.title,
      sub: t.project?.title ?? t.area?.name ?? "任务",
    }));
    const merged = [...taskItems, ...routineItems].slice(0, 5);
    return TIME_SLOTS.map((time, i) => ({
      time,
      title: merged[i]?.title ?? "空闲时段",
      sub: merged[i]?.sub ?? "可添加任务",
      empty: !merged[i],
    }));
  }, [tasks, routines, today]);

  const togglePriority = (p: number) => {
    setPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      if (next.size === 0) return new Set([1, 2, 3]);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkComplete = async () => {
    const ids = [...selected];
    for (const id of ids) {
      const t = tasks.find((x) => x.id === id);
      if (t && t.status !== "DONE") await complete.mutateAsync(id);
    }
    setSelected(new Set());
    setBulk(false);
  };

  const addRecommendation = async (rec: (typeof RECOMMENDATIONS)[number]) => {
    await create.mutateAsync({
      title: rec.title,
      notes: rec.notes,
      priority: defaultTaskPriorityNumber(),
      dueDate: new Date(`${today}T23:59:00`).toISOString(),
      xpReward: rec.xp,
      goldReward: rec.gold,
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.viewTabs}>
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={view === tab.id ? styles.viewTabActive : styles.viewTab}
              onClick={() => switchView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.btnPrimary} onClick={() => setCreating(true)}>
            <Plus size={14} /> 添加任务
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => {
              setBulk((v) => !v);
              setSelected(new Set());
            }}
          >
            {bulk ? "退出批量" : "批量管理"}
          </button>
          {bulk && selected.size > 0 ? (
            <button type="button" className={styles.btnPrimary} onClick={bulkComplete}>
              完成选中 ({selected.size})
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={`${styles.panel} ${styles.leftPanel}`}>
          <h2 className={styles.sectionTitle}>任务类型</h2>
          <ul className={styles.catList}>
            {TYPE_CATEGORIES.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={typeId === c.id ? styles.catBtnActive : styles.catBtn}
                  onClick={() => selectType(c.id)}
                >
                  <span className={styles.catIcon}>{c.icon}</span>
                  <span className={styles.catLabel}>{c.label}</span>
                  <span className={styles.catCount}>{typeCounts[c.id]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.sideHint}>日/周循环请到「日常习惯」</p>

          <div className={styles.divider} />

          <h2 className={styles.sectionTitle}>人生领域</h2>
          <ul className={styles.catList}>
            <li>
              <button
                type="button"
                className={areaFilter === "all" ? styles.catBtnActive : styles.catBtn}
                onClick={() => setAreaFilter("all")}
              >
                <span className={styles.catIcon}>◎</span>
                <span className={styles.catLabel}>全部领域</span>
                <span className={styles.catCount}>{areaCounts.all ?? 0}</span>
              </button>
            </li>
            {activeAreas.map((area) => (
              <li key={area.id}>
                <button
                  type="button"
                  className={areaFilter === area.id ? styles.catBtnActive : styles.catBtn}
                  onClick={() => setAreaFilter(area.id)}
                >
                  <span className={styles.catIcon}>{area.icon || "·"}</span>
                  <span className={styles.catLabel}>{area.name}</span>
                  <span className={styles.catCount}>{areaCounts[area.id] ?? 0}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={areaFilter === "none" ? styles.catBtnActive : styles.catBtn}
                onClick={() => setAreaFilter("none")}
              >
                <span className={styles.catIcon}>—</span>
                <span className={styles.catLabel}>未指定领域</span>
                <span className={styles.catCount}>{areaCounts.none ?? 0}</span>
              </button>
            </li>
          </ul>

          <div className={styles.divider} />

          <h2 className={styles.sectionTitle}>优先级</h2>
          <div className={styles.priorityList}>
            <label className={styles.priorityItem}>
              <input
                type="checkbox"
                checked={priorities.size === 3}
                onChange={() => setPriorities(new Set([1, 2, 3]))}
              />
              <span className={styles.prioDot} style={{ background: "#748078" }} />
              全部
            </label>
            {(
              [
                { p: 1, label: "高", color: "#c5554a" },
                { p: 2, label: "中", color: "#c9a227" },
                { p: 3, label: "低", color: "#249d6d" },
              ] as const
            ).map((item) => (
              <label key={item.p} className={styles.priorityItem}>
                <input
                  type="checkbox"
                  checked={priorities.has(item.p)}
                  onChange={() => togglePriority(item.p)}
                />
                <span className={styles.prioDot} style={{ background: item.color }} />
                {item.label}
              </label>
            ))}
          </div>

          <div className={styles.divider} />

          <h2 className={styles.sectionTitle}>过滤器</h2>
          <div className={styles.filterStack}>
            <label>
              任务状态
              <select
                value={statusFilter}
                onChange={(e) => {
                  const next = e.target.value as StatusFilter;
                  setStatusFilter(next);
                  if (next === "DONE") setTypeId("done");
                  else if (next === "CANCELED") setTypeId("all");
                  else if (typeId === "done") setTypeId("all");
                }}
              >
                <option value="all">全部状态</option>
                <option value="TODO">待开始</option>
                <option value="IN_PROGRESS">进行中</option>
                <option value="DONE">已完成</option>
                <option value="CANCELED">已取消</option>
              </select>
            </label>
            <label>
              截止时间
              <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as DueFilter)}>
                <option value="all">全部时间</option>
                <option value="today">今天到期</option>
                <option value="week">本周到期</option>
                <option value="overdue">已逾期</option>
                <option value="none">无截止日期</option>
              </select>
            </label>
          </div>
        </aside>

        <main className={styles.center}>
          {view === "mine" ? (
            <section className={`${styles.panel} ${styles.overview}`}>
              <div className={styles.statRow}>
                <div className={styles.statCard} data-tone="green">
                  <div className={styles.statLabel}>进行中</div>
                  <div className={styles.statValue}>{overview.inProgress}</div>
                </div>
                <div className={styles.statCard} data-tone="blue">
                  <div className={styles.statLabel}>待开始</div>
                  <div className={styles.statValue}>{overview.todo}</div>
                </div>
                <div className={styles.statCard} data-tone="purple">
                  <div className={styles.statLabel}>本周完成</div>
                  <div className={styles.statValue}>{overview.weekDone}</div>
                </div>
                <div className={styles.statCard} data-tone="red">
                  <div className={styles.statLabel}>已逾期</div>
                  <div className={styles.statValue}>{overview.overdue}</div>
                </div>
              </div>
              <div className={styles.rings}>
                <Ring value={overview.todayRate} label="今日完成度" color="#249d6d" />
                <Ring value={overview.weekRate} label="本周完成度" color="#5b9ec9" />
              </div>
            </section>
          ) : (
            <section className={`${styles.panel} ${styles.viewBar}`}>
              <div className={styles.viewBarNav}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() =>
                    setCursorDate(
                      view === "month"
                        ? shiftMonth(cursorDate, -1)
                        : view === "week"
                          ? addDaysYMD(cursorDate, -7)
                          : addDaysYMD(cursorDate, -1),
                    )
                  }
                  aria-label="上一段"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className={styles.viewBarLabel}>
                  {view === "month"
                    ? `${cursorDate.slice(0, 4)}年${Number(cursorDate.slice(5, 7))}月`
                    : view === "week"
                      ? `${weekStart.slice(5)} — ${weekEnd.slice(5)}`
                      : cursorDate === today
                        ? `今天 · ${cursorDate}`
                        : cursorDate}
                </div>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() =>
                    setCursorDate(
                      view === "month"
                        ? shiftMonth(cursorDate, 1)
                        : view === "week"
                          ? addDaysYMD(cursorDate, 7)
                          : addDaysYMD(cursorDate, 1),
                    )
                  }
                  aria-label="下一段"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button type="button" className={styles.btnGhost} onClick={() => setCursorDate(today)}>
                回到今天
              </button>
            </section>
          )}

          {view === "mine" ? (
            <section className={`${styles.panel} ${styles.listPanel}`}>
              <div className={styles.listHead}>
                <h2 className={styles.listTitle}>
                  {typeId === "done" ? "已完成任务" : "进行中的任务"}
                </h2>
                <div className={styles.listMeta}>
                  {isLoading
                    ? "加载中…"
                    : typeId === "done"
                      ? `已显示 ${visibleCompleted.length} / ${completedHistory.length} 项`
                      : `共 ${listTasks.length} 项`}
                </div>
              </div>
              {typeId === "done" ? (
                <CompletedHistory
                  groups={completedGroups}
                  total={completedHistory.length}
                  visible={visibleCompleted.length}
                  today={today}
                  menuId={menuId}
                  onEdit={setEditing}
                  onMenu={setMenuId}
                  onDelete={(id) => {
                    remove.mutate(id);
                    setMenuId(null);
                  }}
                  onLoadMore={() =>
                    setCompletedVisibleCount((count) => count + COMPLETED_PAGE_SIZE)
                  }
                />
              ) : (
                <>
                  <TaskListBody
                    tasks={listTasks}
                    today={today}
                    bulk={bulk}
                    selected={selected}
                    menuId={menuId}
                    onToggleSelect={toggleSelect}
                    onComplete={(id) => complete.mutate(id)}
                    onEdit={setEditing}
                    onMenu={setMenuId}
                    onDelete={(id) => {
                      remove.mutate(id);
                      setMenuId(null);
                    }}
                  />
                  {todayCompleted.length > 0 ? (
                    <div className={styles.todayCompleted}>
                      <button
                        type="button"
                        className={styles.todayCompletedToggle}
                        aria-expanded={todayDoneOpen}
                        onClick={() => setTodayDoneOpen((open) => !open)}
                      >
                        <span className={styles.todayCompletedTitle}>
                          <span className={styles.todayCompletedCheck}>✓</span>
                          今天已完成 {todayCompleted.length} 项
                        </span>
                        <span className={styles.todayCompletedHint}>
                          {todayDoneOpen ? "收起" : "展开查看"}
                          {todayDoneOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                      </button>
                      {todayDoneOpen ? (
                        <div className={styles.todayCompletedBody}>
                          <TaskListBody
                            tasks={todayCompleted}
                            today={today}
                            bulk={false}
                            selected={selected}
                            menuId={menuId}
                            showHeader={false}
                            emptyMessage="今天还没有完成任务。"
                            dateMode="completed"
                            onToggleSelect={toggleSelect}
                            onComplete={(id) => complete.mutate(id)}
                            onEdit={setEditing}
                            onMenu={setMenuId}
                            onDelete={(id) => {
                              remove.mutate(id);
                              setMenuId(null);
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {view === "schedule" ? (
            <section className={`${styles.panel} ${styles.listPanel}`}>
              <div className={styles.listHead}>
                <h2 className={styles.listTitle}>{viewTitle}</h2>
                <div className={styles.listMeta}>
                  当日 {scheduleDayTasks.dated.length} 项
                  {scheduleDayTasks.undated.length
                    ? ` · 未排期 ${scheduleDayTasks.undated.length}`
                    : ""}
                </div>
              </div>
              <div className={styles.dayAgenda}>
                {TIME_SLOTS.map((slot, idx) => {
                  const task = scheduleDayTasks.dated[idx];
                  return (
                    <div key={slot} className={styles.daySlot}>
                      <div className={styles.daySlotTime}>{slot}</div>
                      <div className={styles.daySlotBody}>
                        {task ? (
                          <div className={styles.daySlotCard}>
                            <button
                              type="button"
                              className={styles.daySlotMain}
                              onClick={() => setEditing(task)}
                            >
                              <span className={styles.daySlotIcon}>{taskIcon(task)}</span>
                              <span className={styles.daySlotText}>
                                <strong>{task.title}</strong>
                                <small>{formatDue(task, today)}</small>
                              </span>
                            </button>
                            {task.status !== "DONE" ? (
                              <button
                                type="button"
                                className={styles.daySlotDone}
                                onClick={() => complete.mutate(task.id)}
                                title="完成"
                              >
                                <Check size={14} />
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className={styles.daySlotEmpty}>空闲</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {scheduleDayTasks.undated.length > 0 ? (
                  <div className={styles.undatedBlock}>
                    <h3 className={styles.undatedTitle}>未排期任务</h3>
                    <TaskListBody
                      tasks={scheduleDayTasks.undated}
                      today={today}
                      bulk={bulk}
                      selected={selected}
                      menuId={menuId}
                      onToggleSelect={toggleSelect}
                      onComplete={(id) => complete.mutate(id)}
                      onEdit={setEditing}
                      onMenu={setMenuId}
                      onDelete={(id) => {
                        remove.mutate(id);
                        setMenuId(null);
                      }}
                    />
                  </div>
                ) : null}
                {scheduleDayTasks.dated.length === 0 && scheduleDayTasks.undated.length === 0 ? (
                  <div className={styles.empty}>这一天还没有到期任务。</div>
                ) : null}
              </div>
            </section>
          ) : null}

          {view === "week" ? (
            <section className={`${styles.panel} ${styles.listPanel}`}>
              <div className={styles.listHead}>
                <h2 className={styles.listTitle}>{viewTitle}</h2>
                <div className={styles.listMeta}>{listTasks.length} 项分布在本周</div>
              </div>
              <div className={styles.weekGrid}>
                {weekDays.map((day) => {
                  const dayTasks = tasksByDay.get(day) ?? [];
                  const isToday = day === today;
                  return (
                    <button
                      key={day}
                      type="button"
                      className={isToday ? styles.weekColToday : styles.weekCol}
                      onClick={() => {
                        setCursorDate(day);
                        setView("schedule");
                      }}
                    >
                      <div className={styles.weekColHead}>
                        <span>{WEEKDAY_LABELS[new Date(day + "T12:00:00").getDay()]}</span>
                        <strong>{day.slice(8)}</strong>
                      </div>
                      <div className={styles.weekColBody}>
                        {dayTasks.length === 0 ? (
                          <span className={styles.weekEmpty}>—</span>
                        ) : (
                          dayTasks.slice(0, 4).map((t) => (
                            <span key={t.id} className={styles.weekChip} data-done={t.status === "DONE"}>
                              {t.title}
                            </span>
                          ))
                        )}
                        {dayTasks.length > 4 ? (
                          <span className={styles.weekMore}>+{dayTasks.length - 4}</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {view === "month" ? (
            <section className={`${styles.panel} ${styles.listPanel}`}>
              <div className={styles.listHead}>
                <h2 className={styles.listTitle}>{viewTitle}</h2>
                <div className={styles.listMeta}>{listTasks.length} 项分布在本月</div>
              </div>
              <div className={styles.monthWeekHead}>
                {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className={styles.monthGrid}>
                {monthCells.map((day) => {
                  const inMonth = day.startsWith(monthPrefix);
                  const dayTasks = tasksByDay.get(day) ?? [];
                  const isToday = day === today;
                  return (
                    <button
                      key={day}
                      type="button"
                      className={[
                        styles.monthCell,
                        !inMonth ? styles.monthCellMuted : "",
                        isToday ? styles.monthCellToday : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        setCursorDate(day);
                        setView("schedule");
                      }}
                    >
                      <span className={styles.monthDayNum}>{Number(day.slice(8))}</span>
                      <div className={styles.monthDots}>
                        {dayTasks.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className={styles.monthDot}
                            data-prio={t.priority}
                            title={t.title}
                          />
                        ))}
                      </div>
                      {dayTasks.length > 0 ? (
                        <span className={styles.monthCount}>{dayTasks.length}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </main>

        <aside className={styles.rightStack}>
          <section className={`${styles.panel} ${styles.rightCard}`}>
            <h2 className={styles.sectionTitle}>今日计划</h2>
            <ul className={styles.timeline}>
              {planItems.map((item) => (
                <li key={item.time} className={styles.timeItem}>
                  <span className={styles.timeLabel}>{item.time}</span>
                  <span className={styles.timeRail}>
                    <span className={styles.timeDot} />
                  </span>
                  <div className={styles.timeBody}>
                    <div className={styles.timeTitle} style={item.empty ? { opacity: 0.45 } : undefined}>
                      {item.title}
                    </div>
                    <div className={styles.timeSub}>{item.sub}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${styles.panel} ${styles.rightCard}`}>
            <h2 className={styles.sectionTitle}>即将到期</h2>
            <div className={styles.upcomingList}>
              {upcoming.length === 0 ? (
                <div className={styles.empty} style={{ padding: 12 }}>
                  近期没有到期任务
                </div>
              ) : (
                upcoming.map((t) => (
                  <div key={t.id} className={styles.upcomingItem}>
                    <div className={styles.upcomingTitle}>{t.title}</div>
                    <div className={styles.upcomingDue}>{formatDue(t, today)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.rightCard}`}>
            <h2 className={styles.sectionTitle}>任务推荐</h2>
            <div className={styles.recoList}>
              {RECOMMENDATIONS.map((rec) => (
                <div key={rec.title} className={styles.recoItem}>
                  <div className={styles.recoBody}>
                    <div className={styles.recoTitle}>{rec.title}</div>
                    <div className={styles.recoReward}>+ EXP {rec.xp}</div>
                  </div>
                  <button
                    type="button"
                    className={styles.recoAdd}
                    disabled={create.isPending}
                    onClick={() => addRecommendation(rec)}
                  >
                    添加
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {creating ? (
        <TaskModal title="添加任务" desc="创建一个带奖励与截止时间的任务。" onClose={() => setCreating(false)}>
          <TaskForm onDone={() => setCreating(false)} />
        </TaskModal>
      ) : null}

      {editing ? (
        <TaskModal title="任务详情" desc="查看并编辑任务内容、奖励与截止时间。" onClose={() => setEditing(null)}>
          <TaskForm task={editing} onDone={() => setEditing(null)} />
        </TaskModal>
      ) : null}
    </div>
  );
}

function TaskListBody({
  tasks,
  today,
  bulk,
  selected,
  menuId,
  showHeader = true,
  emptyMessage = "暂无任务，点击「添加任务」开始冒险。",
  dateMode = "due",
  onToggleSelect,
  onComplete,
  onEdit,
  onMenu,
  onDelete,
}: {
  tasks: TaskDTO[];
  today: string;
  bulk: boolean;
  selected: Set<string>;
  menuId: string | null;
  showHeader?: boolean;
  emptyMessage?: string;
  dateMode?: "due" | "completed";
  onToggleSelect: (id: string) => void;
  onComplete: (id: string) => void;
  onEdit: (task: TaskDTO) => void;
  onMenu: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }

  return (
    <>
      {showHeader ? <TaskTableHead dateLabel={dateMode === "completed" ? "完成时间" : "截止时间"} /> : null}
      {tasks.map((task) => {
        const tags = taskTags(task);
        const pct = progressOf(task);
        const urgent = isOverdue(task, today) || dueYmd(task) === today;
        return (
          <div key={task.id} className={styles.taskRow}>
            <div className={styles.taskMain}>
              {bulk ? (
                <input
                  type="checkbox"
                  checked={selected.has(task.id)}
                  onChange={() => onToggleSelect(task.id)}
                  style={{ accentColor: "#249d6d" }}
                />
              ) : null}
              <button
                type="button"
                className={styles.taskOpen}
                onClick={() => onEdit(task)}
                title="打开任务详情"
              >
                <div className={styles.taskIcon}>{taskIcon(task)}</div>
                <div className={styles.taskText}>
                  <div className={styles.taskTitleRow}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    <div className={styles.taskTags}>
                      {tags.map((tag) => (
                        <span key={tag.label} className={styles.taskTag} data-tone={tag.tone}>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {task.notes ? <p className={styles.taskNotes}>{task.notes}</p> : null}
                </div>
              </button>
            </div>

            <div>
              <span className={styles.prioBadge} data-level={task.priority}>
                {priorityLabel(task.priority)}
              </span>
            </div>

            <div className={styles.progressCell}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
              </div>
              <div className={styles.progressText}>{pct}%</div>
            </div>

            <div
              className={
                dateMode === "due" && urgent ? styles.dueTextUrgent : styles.dueText
              }
            >
              {dateMode === "completed"
                ? formatCompletedAt(task, today)
                : formatDue(task, today)}
            </div>

            <div className={styles.rowActions}>
              {task.status !== "DONE" ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="完成"
                  onClick={() => onComplete(task.id)}
                >
                  <Check size={14} />
                </button>
              ) : null}
              <button
                type="button"
                className={styles.iconBtn}
                title="编辑"
                onClick={() => onEdit(task)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="更多"
                onClick={() => onMenu(menuId === task.id ? null : task.id)}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuId === task.id ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="删除"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

function TaskTableHead({ dateLabel = "截止时间" }: { dateLabel?: string }) {
  return (
    <div className={styles.tableHead}>
      <span>任务</span>
      <span>优先级</span>
      <span>进度</span>
      <span>{dateLabel}</span>
      <span style={{ textAlign: "right" }}>操作</span>
    </div>
  );
}

function CompletedHistory({
  groups,
  total,
  visible,
  today,
  menuId,
  onEdit,
  onMenu,
  onDelete,
  onLoadMore,
}: {
  groups: Record<CompletedGroupKey, TaskDTO[]>;
  total: number;
  visible: number;
  today: string;
  menuId: string | null;
  onEdit: (task: TaskDTO) => void;
  onMenu: (id: string | null) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
}) {
  if (total === 0) {
    return <div className={styles.empty}>还没有完成记录，完成任务后会自动保存在这里。</div>;
  }

  const sections: Array<{ key: CompletedGroupKey; label: string }> = [
    { key: "today", label: "今天" },
    { key: "week", label: "本周" },
    { key: "month", label: "本月" },
    { key: "earlier", label: "更早" },
  ];

  return (
    <div className={styles.completedHistory}>
      <TaskTableHead dateLabel="完成时间" />
      {sections.map((section) => {
        const sectionTasks = groups[section.key];
        if (sectionTasks.length === 0) return null;
        return (
          <section key={section.key} className={styles.completedGroup}>
            <div className={styles.completedGroupHead}>
              <h3>{section.label}</h3>
              <span>{sectionTasks.length} 项</span>
            </div>
            <TaskListBody
              tasks={sectionTasks}
              today={today}
              bulk={false}
              selected={new Set<string>()}
              menuId={menuId}
              showHeader={false}
              dateMode="completed"
              onToggleSelect={() => undefined}
              onComplete={() => undefined}
              onEdit={onEdit}
              onMenu={onMenu}
              onDelete={onDelete}
            />
          </section>
        );
      })}
      {visible < total ? (
        <div className={styles.loadMoreWrap}>
          <button type="button" className={styles.loadMore} onClick={onLoadMore}>
            再加载 {Math.min(COMPLETED_PAGE_SIZE, total - visible)} 项
          </button>
          <span>每次仅展示 20 项，避免列表过长</span>
        </div>
      ) : (
        <div className={styles.historyEnd}>已显示全部 {total} 项完成记录</div>
      )}
    </div>
  );
}

function TaskModal({
  title,
  desc,
  onClose,
  children,
}: {
  title: string;
  desc: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <p className={styles.modalDesc}>{desc}</p>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function TaskForm({ task, onDone }: { task?: TaskDTO; onDone: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [areaId, setAreaId] = useState<string | null>(task?.area?.id ?? null);
  const [projectId, setProjectId] = useState<string | null>(task?.projectId ?? null);
  const [priority, setPriority] = useState(
    task?.priority ?? defaultTaskPriorityNumber(),
  );
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 10);
  const [goldReward, setGoldReward] = useState(task?.goldReward ?? 5);

  const create = useCreateTask();
  const update = useUpdateTask();
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    if (!title.trim()) return;
    const body = {
      title: title.trim(),
      notes: notes.trim() || null,
      areaId,
      projectId,
      priority,
      dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null,
      xpReward,
      goldReward,
    };
    if (task) await update.mutateAsync({ id: task.id, ...body });
    else await create.mutateAsync(body);
    onDone();
  };

  return (
    <>
      <div className={styles.modalBody}>
        <div className={styles.formGrid}>
          <label>
            标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成周报"
              autoFocus
            />
          </label>
          <label>
            备注
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="可选说明" />
          </label>
          <label>
            挂载项目（主线）
            <ProjectSelect value={projectId} onChange={setProjectId} />
          </label>
          <div className={styles.formRow}>
            <label>
              人生领域
              <AreaSelect value={areaId} onChange={setAreaId} />
            </label>
            <label>
              优先级
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                <option value={1}>高</option>
                <option value={2}>中</option>
                <option value={3}>低</option>
              </select>
            </label>
          </div>
          <div className={styles.formRow3}>
            <label>
              截止日期
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label>
              XP
              <input
                type="number"
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value))}
              />
            </label>
            <label>
              Gold
              <input
                type="number"
                min={0}
                value={goldReward}
                onChange={(e) => setGoldReward(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className={styles.btnGhost} onClick={onDone}>
          取消
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={pending || !title.trim()}
          onClick={submit}
        >
          {pending ? "保存中…" : task ? "保存" : "创建"}
        </button>
      </div>
    </>
  );
}
