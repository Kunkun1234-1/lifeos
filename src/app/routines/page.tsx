"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Focus,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompleteRoutine,
  useCompleteTask,
  useDeleteRoutine,
  useRoutines,
  useTasks,
} from "@/hooks/queries";
import { addDaysYMD, dayOfWeek, todayYMD } from "@/lib/date";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { RoutineDTO, TaskDTO } from "@/lib/types";
import { ScheduleFormPanel } from "./components/schedule-form-panel";
import {
  DAY_LABELS,
  DAY_SHORT,
  GRID_HEIGHT,
  HOUR_HEIGHT,
  IDEAL_BLOCKS,
  areaBreakdown,
  blockStyle,
  buildEntries,
  calendarDates,
  completionSummary,
  conflictIds,
  dateStrip,
  formatFullDate,
  formatMonthDay,
  formatTime,
  hasScheduleOnDate,
  hourMarks,
  isTimed,
  minutesToTop,
  shiftMonth,
  tasksForDate,
  timeToMinutes,
  type AiScheduleSuggestion,
  type ScheduleEntry,
  type ScheduleView,
} from "./schedule-model";

type ScheduleCoachResponse = {
  summary: string;
  suggestions: AiScheduleSuggestion[];
  cost: number;
};

const VIEW_TABS: Array<{ id: ScheduleView; label: string }> = [
  { id: "timeline", label: "时间轴" },
  { id: "ideal", label: "理想安排" },
  { id: "actual", label: "具体安排" },
];

export default function RoutinesPage() {
  const [selectedDate, setSelectedDate] = useState(() => todayYMD());
  const [view, setView] = useState<ScheduleView>("timeline");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineDTO | null>(null);
  const [coach, setCoach] = useState<ScheduleCoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const { data: routines = [], isLoading: routinesLoading } = useRoutines();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const today = todayYMD();

  const entries = useMemo(() => buildEntries(routines, selectedDate), [routines, selectedDate]);
  const datedTasks = useMemo(() => tasksForDate(tasks, selectedDate), [tasks, selectedDate]);
  const timedEntries = entries.filter(isTimed);
  const unscheduledEntries = entries.filter((entry) => !isTimed(entry));
  const conflicts = useMemo(() => conflictIds(entries), [entries]);
  const summary = completionSummary(entries, selectedDate, today);
  const areas = areaBreakdown(entries);

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setCoach(null);
    setCoachError(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (routine: RoutineDTO) => {
    setEditing(routine);
    setFormOpen(true);
  };

  const askCoach = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const result = await api<ScheduleCoachResponse>("/api/ai/schedule-coach", {
        method: "POST",
        json: {
          date: selectedDate,
          schedules: entries.map((entry) => ({
            title: entry.routine.title,
            startTime: entry.meta?.startTime ?? null,
            endTime: entry.meta?.endTime ?? null,
            area: entry.routine.area?.name ?? null,
            completed: selectedDate === today && entry.routine.completedToday,
          })),
          tasks: datedTasks.map((task) => ({
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            area: task.area?.name ?? null,
          })),
        },
      });
      setCoach(result);
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : "AI 建议生成失败");
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-4 lg:px-6">
      <section className="overflow-hidden rounded-sm border border-[var(--gold)]/48 bg-[rgba(255,252,242,0.78)] shadow-[0_24px_70px_-42px_rgba(4,12,24,0.92)] backdrop-blur-xl">
        <div className="min-[1200px]:grid min-[1200px]:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[var(--border)] bg-[rgba(250,243,226,0.72)] p-3 min-[1200px]:block">
            <div className="sticky top-[98px] grid gap-3">
              <MonthCalendar selectedDate={selectedDate} today={today} routines={routines} onSelect={selectDate} />
              <OverviewPanel summary={summary} isToday={selectedDate === today} />
              <AreaPanel areas={areas} />
              <FocusPanel entries={entries} onCreate={openCreate} />
            </div>
          </aside>

          <div className="min-w-0">
            <ScheduleHeader selectedDate={selectedDate} today={today} onSelect={selectDate} onCreate={openCreate} />

            <div className="border-b border-[var(--border)] px-3 py-3 min-[1200px]:hidden">
              <OverviewInline summary={summary} />
            </div>

            <div className="grid min-w-0 min-[1540px]:grid-cols-[minmax(0,1fr)_310px]">
              <div className="min-w-0 p-3 sm:p-4">
                <div className="border-b border-[var(--border)]">
                  <div className="flex min-w-max gap-7" role="tablist" aria-label="日程视图">
                    {VIEW_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={view === tab.id}
                        onClick={() => setView(tab.id)}
                        className={cn(
                          "relative h-11 px-1 font-display text-sm font-bold transition-colors",
                          view === tab.id ? "text-[var(--accent-strong)]" : "text-[var(--fg-muted)] hover:text-[var(--fg-strong)]",
                        )}
                      >
                        {tab.label}
                        {view === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent)]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {unscheduledEntries.length > 0 && view !== "ideal" && (
                  <UnscheduledRow entries={unscheduledEntries} onEdit={openEdit} />
                )}

                <Timeline
                  view={view}
                  entries={timedEntries}
                  selectedDate={selectedDate}
                  loading={routinesLoading}
                  conflicts={conflicts}
                  onEdit={openEdit}
                  onCreate={openCreate}
                />

                <div className="mt-4 grid gap-3 min-[760px]:grid-cols-2 min-[1540px]:hidden">
                  <AiCoachPanel
                    coach={coach}
                    loading={coachLoading}
                    error={coachError}
                    onGenerate={askCoach}
                  />
                  <TodayGoalsPanel tasks={datedTasks} selectedDate={selectedDate} today={today} loading={tasksLoading} />
                  <MonthStatsPanel routines={routines} summary={summary} />
                </div>
              </div>

              <aside className="hidden border-l border-[var(--border)] bg-[rgba(237,245,255,0.34)] p-3 min-[1540px]:block">
                <div className="sticky top-[98px] grid gap-3">
                  <AiCoachPanel coach={coach} loading={coachLoading} error={coachError} onGenerate={askCoach} />
                  <TodayGoalsPanel tasks={datedTasks} selectedDate={selectedDate} today={today} loading={tasksLoading} />
                  <MonthStatsPanel routines={routines} summary={summary} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <ScheduleFormPanel
        open={formOpen}
        initial={editing}
        selectedDate={selectedDate}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      />
    </div>
  );
}

function ScheduleHeader({ selectedDate, today, onSelect, onCreate }: {
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
  onCreate: () => void;
}) {
  return (
    <header className="border-b border-[var(--border)] bg-[rgba(255,252,242,0.76)] px-3 py-4 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[var(--gold-deep)]">
            <CalendarDays size={18} />
            <span className="font-display-en text-[9px]">Schedule</span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold text-[var(--fg-strong)] sm:text-2xl">
            {formatFullDate(selectedDate)} · {DAY_LABELS[dayOfWeek(selectedDate)]}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onSelect(addDaysYMD(selectedDate, -1))}>
            <ChevronLeft size={15} /><span className="hidden sm:inline">前一天</span>
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onSelect(today)}>今天</Button>
          <Button size="sm" variant="outline" onClick={() => onSelect(addDaysYMD(selectedDate, 1))}>
            <span className="hidden sm:inline">后一天</span><ChevronRight size={15} />
          </Button>
          <Button data-testid="schedule-add-button" size="sm" onClick={onCreate}><Plus size={15} />添加日程</Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {dateStrip(selectedDate).map((date) => {
          const active = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={active}
              className={cn(
                "min-w-[64px] rounded-sm border px-2 py-2 text-center transition-colors sm:min-w-[78px]",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-strong)] text-white shadow-[0_8px_20px_-14px_var(--accent)]"
                  : "border-[var(--border-soft)] bg-white/54 text-[var(--fg)] hover:border-[var(--gold)]",
              )}
            >
              <div className="font-display text-sm font-bold">{formatMonthDay(date)}</div>
              <div className={cn("mt-0.5 text-[10px]", active ? "text-white/76" : "text-[var(--fg-muted)]")}>{DAY_LABELS[dayOfWeek(date)]}</div>
            </button>
          );
        })}
      </div>
    </header>
  );
}

function MonthCalendar({ selectedDate, today, routines, onSelect }: {
  selectedDate: string;
  today: string;
  routines: RoutineDTO[];
  onSelect: (date: string) => void;
}) {
  const [year, month] = selectedDate.split("-").map(Number);
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <PanelTitle>{year}年{month}月</PanelTitle>
        <div className="flex gap-1">
          <IconButton label="上个月" onClick={() => onSelect(shiftMonth(selectedDate, -1))}><ChevronLeft size={15} /></IconButton>
          <IconButton label="下个月" onClick={() => onSelect(shiftMonth(selectedDate, 1))}><ChevronRight size={15} /></IconButton>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-[var(--fg-subtle)]">
        {DAY_SHORT.map((day) => <span key={day} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {calendarDates(selectedDate).map((date) => {
          const inMonth = Number(date.slice(5, 7)) === month;
          const active = date === selectedDate;
          const current = date === today;
          const scheduled = hasScheduleOnDate(routines, date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={date}
              className={cn(
                "relative mx-auto grid h-7 w-7 place-items-center rounded-sm text-[11px] transition-colors",
                !inMonth && "text-[var(--fg-subtle)]/45",
                inMonth && !active && "text-[var(--fg)] hover:bg-[var(--gold-tint)]",
                active && "bg-[var(--accent-strong)] text-white",
                current && !active && "font-bold text-[var(--accent-strong)] ring-1 ring-[var(--accent)]/45",
              )}
            >
              {Number(date.slice(8, 10))}
              {scheduled && <span className={cn("absolute bottom-0.5 h-0.5 w-0.5 rounded-full", active ? "bg-white" : "bg-[var(--gold)]")} />}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function OverviewPanel({ summary, isToday }: { summary: ReturnType<typeof completionSummary>; isToday: boolean }) {
  return (
    <Panel>
      <PanelTitle>今日概览</PanelTitle>
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--border-soft)] bg-[var(--border-soft)]">
        <Metric value={summary.done} label="已完成" tone="success" />
        <Metric value={summary.active} label={isToday ? "进行中" : "已安排"} tone="warning" />
        <Metric value={summary.pending} label="待完成" tone="danger" />
        <Metric value={`${summary.rate}%`} label="完成度" tone="accent" />
      </div>
    </Panel>
  );
}

function OverviewInline({ summary }: { summary: ReturnType<typeof completionSummary> }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <CompactMetric value={summary.done} label="完成" />
      <CompactMetric value={summary.active} label="进行" />
      <CompactMetric value={summary.pending} label="待办" />
      <CompactMetric value={`${summary.rate}%`} label="进度" />
    </div>
  );
}

function AreaPanel({ areas }: { areas: ReturnType<typeof areaBreakdown> }) {
  return (
    <Panel>
      <PanelTitle>日程类型</PanelTitle>
      <div className="mt-3 grid gap-2.5">
        {areas.length ? areas.map((area) => (
          <div key={area.name} className="flex items-center gap-2 text-xs">
            <span className="grid h-6 w-6 place-items-center rounded-sm text-[11px] text-white" style={{ backgroundColor: area.color }}>{area.icon}</span>
            <span className="min-w-0 flex-1 truncate text-[var(--fg)]">{area.name}</span>
            <span className="font-mono text-[var(--fg-muted)]">{area.count}</span>
          </div>
        )) : <EmptyLine>当天还没有领域分布</EmptyLine>}
      </div>
    </Panel>
  );
}

function FocusPanel({ entries, onCreate }: { entries: ScheduleEntry[]; onCreate: () => void }) {
  const longest = entries.filter(isTimed).sort((a, b) => ((b.end ?? 0) - (b.start ?? 0)) - ((a.end ?? 0) - (a.start ?? 0)))[0];
  return (
    <Panel>
      <div className="flex items-center gap-2 text-[var(--accent-strong)]"><Focus size={16} /><PanelTitle>专注建议</PanelTitle></div>
      <p className="mt-3 text-sm font-semibold text-[var(--fg-strong)]">{longest ? longest.routine.title : "给今天留出一个专注时段"}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--fg-muted)]">
        {longest?.meta ? `${longest.meta.startTime}-${longest.meta.endTime} 是当天最长的连续安排。` : "先添加最重要的一件事，再围绕它组织其余时间。"}
      </p>
      <Button className="mt-3 w-full" size="sm" variant="outline" onClick={onCreate}><Plus size={14} />添加安排</Button>
    </Panel>
  );
}

function Timeline({ view, entries, selectedDate, loading, conflicts, onEdit, onCreate }: {
  view: ScheduleView;
  entries: ScheduleEntry[];
  selectedDate: string;
  loading: boolean;
  conflicts: Set<string>;
  onEdit: (routine: RoutineDTO) => void;
  onCreate: () => void;
}) {
  const showIdeal = view === "timeline" || view === "ideal";
  const showActual = view === "timeline" || view === "actual";
  return (
    <div className="mt-3 h-[720px] min-h-[520px] overflow-auto border border-[var(--border-soft)] bg-[rgba(255,255,255,0.46)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] sm:min-w-[560px] sm:grid-cols-[72px_minmax(0,1fr)]" style={{ height: GRID_HEIGHT }}>
        <div className="relative border-r border-[var(--border-soft)] bg-[rgba(250,243,226,0.54)]">
          {hourMarks().map((minutes) => (
            <div key={minutes} className="absolute right-3 -translate-y-2 font-mono text-[11px] text-[var(--fg-subtle)]" style={{ top: minutesToTop(minutes) }}>
              {formatTime(minutes)}
            </div>
          ))}
        </div>
        <div
          className="relative bg-[linear-gradient(180deg,rgba(58,107,142,0.1)_1px,transparent_1px)]"
          style={{ backgroundSize: `100% ${HOUR_HEIGHT}px` }}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(107,100,88,0.05)_1px,transparent_1px)]"
            style={{ backgroundSize: `100% ${HOUR_HEIGHT / 2}px` }}
          />
          {showIdeal && IDEAL_BLOCKS.map((block) => <IdealBlock key={`${block.startTime}-${block.title}`} block={block} background={view === "timeline"} />)}
          {showActual && entries.map((entry) => (
            <ActualBlock key={entry.routine.id} entry={entry} selectedDate={selectedDate} conflict={conflicts.has(entry.routine.id)} onEdit={() => onEdit(entry.routine)} />
          ))}
          {!loading && showActual && entries.length === 0 && (
            <div className="absolute inset-x-6 top-8 border border-dashed border-[var(--border)] bg-white/52 px-4 py-10 text-center">
              <CalendarDays className="mx-auto text-[var(--gold)]" size={24} />
              <p className="mt-3 text-sm font-semibold text-[var(--fg-strong)]">这一天还没有具体安排</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={onCreate}><Plus size={14} />添加日程</Button>
            </div>
          )}
          {loading && (
            <div className="absolute inset-x-6 top-8 flex items-center justify-center gap-2 border border-[var(--border-soft)] bg-white/56 py-8 text-sm text-[var(--fg-muted)]">
              <LoaderCircle className="animate-spin" size={16} />加载日程...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IdealBlock({ block, background }: { block: (typeof IDEAL_BLOCKS)[number]; background: boolean }) {
  const toneClass = {
    success: "border-l-[var(--success)] bg-[rgba(76,138,116,0.12)] text-[var(--success)]",
    accent: "border-l-[var(--accent)] bg-[rgba(58,107,142,0.12)] text-[var(--accent-strong)]",
    creative: "border-l-[var(--attr-cre)] bg-[rgba(155,107,193,0.11)] text-[var(--attr-cre)]",
    strength: "border-l-[var(--attr-str)] bg-[rgba(197,85,74,0.1)] text-[var(--attr-str)]",
    neutral: "border-l-[var(--fg-subtle)] bg-[rgba(107,100,88,0.08)] text-[var(--fg-muted)]",
  }[block.tone];
  return (
    <div
      className={cn(
        "absolute left-3 right-3 overflow-hidden border border-[var(--border-soft)] border-l-[3px] px-3 py-2",
        toneClass,
        background && "opacity-45",
      )}
      style={blockStyle(timeToMinutes(block.startTime), timeToMinutes(block.endTime))}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="truncate font-display text-sm font-bold">{block.title}</span>
        <span className="shrink-0 font-mono text-[10px] opacity-80">{block.startTime}-{block.endTime}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--fg-muted)]">{block.detail}</p>
    </div>
  );
}

function ActualBlock({ entry, selectedDate, conflict, onEdit }: {
  entry: ScheduleEntry;
  selectedDate: string;
  conflict: boolean;
  onEdit: () => void;
}) {
  const complete = useCompleteRoutine();
  const remove = useDeleteRoutine();
  const isToday = selectedDate === todayYMD();
  const done = isToday && entry.routine.completedToday;
  const color = entry.routine.area?.color ?? "var(--accent)";
  return (
    <article
      id={`schedule-${entry.routine.id}`}
      tabIndex={0}
      onKeyDown={(event) => event.key === "Enter" && onEdit()}
      className={cn(
        "group absolute left-5 right-5 overflow-hidden border border-l-[4px] px-3 py-2.5 shadow-[0_12px_28px_-24px_rgba(4,12,24,0.9)] outline-none transition-shadow focus:ring-2 focus:ring-[var(--accent)]/55",
        done ? "bg-[rgba(76,138,116,0.2)]" : "bg-[rgba(255,252,242,0.92)]",
        conflict ? "border-[var(--warning)]" : "border-[var(--border)]",
      )}
      style={{ ...blockStyle(entry.start, entry.end), borderLeftColor: color }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-display text-sm font-bold text-[var(--fg-strong)]">{entry.routine.title}</span>
            {conflict && <AlertTriangle className="shrink-0 text-[var(--warning)]" size={13} aria-label="时间冲突" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--fg-muted)]">
            <span className="inline-flex items-center gap-1"><Clock3 size={11} />{entry.meta?.startTime}-{entry.meta?.endTime}</span>
            {entry.routine.area && <span>{entry.routine.area.icon} {entry.routine.area.name}</span>}
            <span className="inline-flex items-center gap-1"><Flame size={11} />{entry.routine.streakCurrent}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <IconButton label="编辑日程" onClick={onEdit}><Pencil size={13} /></IconButton>
          <IconButton
            label="归档日程"
            danger
            onClick={() => {
              if (window.confirm(`归档安排「${entry.routine.title}」？`)) remove.mutate(entry.routine.id);
            }}
          ><Trash2 size={13} /></IconButton>
        </div>
      </div>
      {entry.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--fg-muted)]">{entry.note}</p>}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--fg-subtle)]">+{entry.routine.xpReward} XP · +{entry.routine.goldReward} Gold</span>
        <button
          type="button"
          disabled={!isToday || done || complete.isPending}
          onClick={() => complete.mutate(entry.routine.id)}
          className={cn(
            "inline-flex h-6 items-center gap-1 border px-2 text-[10px] transition-colors",
            done ? "border-[var(--success)] text-[var(--success)]" : "border-[var(--border)] bg-white/60 text-[var(--fg)] hover:border-[var(--success)]",
            (!isToday || complete.isPending) && "opacity-50",
          )}
          title={isToday ? "完成今日安排" : "只能完成今天的安排"}
        ><Check size={11} />{done ? "已完成" : "完成"}</button>
      </div>
    </article>
  );
}

function UnscheduledRow({ entries, onEdit }: { entries: ScheduleEntry[]; onEdit: (routine: RoutineDTO) => void }) {
  return (
    <div className="mt-3 border border-dashed border-[var(--border)] bg-[rgba(250,243,226,0.5)] p-2.5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--fg-muted)]"><MoreHorizontal size={14} />未定时间</div>
      <div className="flex gap-2 overflow-x-auto">
        {entries.map((entry) => (
          <button key={entry.routine.id} type="button" onClick={() => onEdit(entry.routine)} className="min-w-[180px] border border-[var(--border-soft)] bg-white/60 px-3 py-2 text-left hover:border-[var(--gold)]">
            <div className="truncate text-xs font-semibold text-[var(--fg-strong)]">{entry.routine.title}</div>
            <div className="mt-0.5 truncate text-[10px] text-[var(--fg-muted)]">{entry.note || "点击补充时间"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AiCoachPanel({ coach, loading, error, onGenerate }: {
  coach: ScheduleCoachResponse | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const iconByKind = { focus: Focus, rest: Clock3, balance: BrainCircuit };
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--accent-strong)]"><Sparkles size={16} /><PanelTitle>AI 智能建议</PanelTitle></div>
        <IconButton label={coach ? "重新生成 AI 建议" : "生成 AI 建议"} onClick={onGenerate} disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCw size={14} />}
        </IconButton>
      </div>
      {coach?.summary && <p className="mt-3 text-xs leading-5 text-[var(--fg-muted)]">{coach.summary}</p>}
      <div className="mt-3 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {coach?.suggestions.length ? coach.suggestions.map((suggestion, index) => {
          const Icon = iconByKind[suggestion.kind];
          return (
            <div key={`${suggestion.title}-${index}`} className="py-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg-strong)]"><Icon size={14} className="text-[var(--accent)]" />{suggestion.title}</div>
              <p className="mt-1 pl-[22px] text-[11px] leading-5 text-[var(--fg-muted)]">{suggestion.detail}</p>
            </div>
          );
        }) : (
          <div className="py-4 text-center">
            <BrainCircuit className="mx-auto text-[var(--gold)]" size={22} />
            <p className="mt-2 text-xs text-[var(--fg-muted)]">结合当日日程和任务生成建议</p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs leading-5 text-[var(--danger)]">{error}</p>}
      <Button className="mt-3 w-full" size="sm" variant={coach ? "outline" : "primary"} onClick={onGenerate} disabled={loading}>
        <Sparkles size={14} />{loading ? "分析中..." : coach ? "重新分析 · 10 精力" : "生成建议 · 10 精力"}
      </Button>
    </Panel>
  );
}

function TodayGoalsPanel({ tasks, selectedDate, today, loading }: {
  tasks: TaskDTO[];
  selectedDate: string;
  today: string;
  loading: boolean;
}) {
  const complete = useCompleteTask();
  const visible = tasks.slice(0, 5);
  const done = tasks.filter((task) => task.status === "DONE").length;
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--accent-strong)]"><Target size={16} /><PanelTitle>今日目标</PanelTitle></div>
        <Link href="/tasks" className="text-[10px] text-[var(--gold-deep)] hover:underline">全部任务</Link>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--fg-muted)]"><span>{done}/{tasks.length} 已完成</span><span>任务模块</span></div>
      <div className="mt-2 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {loading ? <div className="py-4 text-center text-xs text-[var(--fg-muted)]">加载任务...</div> : visible.length ? visible.map((task) => {
          const taskDone = task.status === "DONE";
          return (
            <div key={task.id} className="flex items-center gap-2 py-2.5">
              <button
                type="button"
                aria-label={`完成任务：${task.title}`}
                disabled={taskDone || selectedDate !== today || complete.isPending}
                onClick={() => complete.mutate(task.id)}
                className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", taskDone ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border)] text-transparent hover:border-[var(--success)]", selectedDate !== today && "opacity-55")}
              ><Check size={11} /></button>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-xs text-[var(--fg-strong)]", taskDone && "text-[var(--fg-subtle)] line-through")}>{task.title}</div>
                <div className="mt-0.5 truncate text-[9px] text-[var(--fg-subtle)]">{task.area ? `${task.area.icon} ${task.area.name}` : `优先级 ${task.priority}`}</div>
              </div>
            </div>
          );
        }) : <div className="py-4 text-center text-xs text-[var(--fg-muted)]">当天没有到期或完成的任务</div>}
      </div>
    </Panel>
  );
}

function MonthStatsPanel({ routines, summary }: { routines: RoutineDTO[]; summary: ReturnType<typeof completionSummary> }) {
  const bestStreak = Math.max(0, ...routines.map((routine) => routine.streakBest));
  return (
    <Panel>
      <div className="flex items-center gap-2 text-[var(--accent-strong)]"><BarChart3 size={16} /><PanelTitle>本月统计</PanelTitle></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat value={routines.length} label="日程模板" />
        <Stat value={`${summary.rate}%`} label="今日完成" />
        <Stat value={bestStreak} label="最佳连续" />
      </div>
      <div className="mt-4 h-2 overflow-hidden bg-[var(--border-soft)]">
        <div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${summary.rate}%` }} />
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="border border-[var(--border)] bg-[rgba(255,252,242,0.7)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">{children}</section>;
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-sm font-bold text-[var(--fg-strong)]">{children}</h2>;
}

function IconButton({ label, children, onClick, danger = false, disabled = false }: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cn("grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--gold-tint)] hover:text-[var(--fg-strong)] disabled:opacity-45", danger && "hover:text-[var(--danger)]")}>{children}</button>
  );
}

function Metric({ value, label, tone }: { value: string | number; label: string; tone: "success" | "warning" | "danger" | "accent" }) {
  const color = { success: "var(--success)", warning: "var(--warning)", danger: "var(--danger)", accent: "var(--accent)" }[tone];
  return <div className="bg-white/64 px-2 py-3 text-center"><div className="font-display text-xl font-bold" style={{ color }}>{value}</div><div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{label}</div></div>;
}

function CompactMetric({ value, label }: { value: string | number; label: string }) {
  return <div className="border border-[var(--border-soft)] bg-white/52 px-2 py-2 text-center"><div className="font-display text-base font-bold text-[var(--accent-strong)]">{value}</div><div className="text-[9px] text-[var(--fg-muted)]">{label}</div></div>;
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return <div><div className="font-display text-lg font-bold text-[var(--accent)]">{value}</div><div className="mt-1 text-[9px] text-[var(--fg-muted)]">{label}</div></div>;
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="py-2 text-center text-[11px] text-[var(--fg-subtle)]">{children}</div>;
}
