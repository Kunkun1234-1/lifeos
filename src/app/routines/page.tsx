"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { useRoutines, useTasks } from "@/hooks/queries";
import { addDaysYMD, dayOfWeek, todayYMD, toYMD } from "@/lib/date";
import type { RoutineDTO, TaskDTO } from "@/lib/types";
import { ScheduleFormPanel } from "./components/schedule-form-panel";
import {
  DAY_LABELS,
  buildEntries,
  calendarDatesMonday,
  decodeNotes,
  formatFullDate,
  shiftMonth,
} from "./schedule-model";
import styles from "./page.module.css";

type CalView = "month" | "week" | "day";

type CalEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  note: string;
  icon: string;
  tone: CategoryTone;
  label: string;
  kind: "routine" | "task";
  routine?: RoutineDTO;
  task?: TaskDTO;
  completed: boolean;
  status: "done" | "active" | "todo";
};

type CategoryTone = "health" | "learn" | "work" | "finance" | "social" | "travel" | "other";

const VIEW_TABS: Array<{ id: CalView; label: string }> = [
  { id: "month", label: "月视图" },
  { id: "week", label: "周视图" },
  { id: "day", label: "日视图" },
];

const WEEK_HEAD = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const LEGEND: Array<{ tone: CategoryTone; label: string }> = [
  { tone: "health", label: "健康" },
  { tone: "learn", label: "学习成长" },
  { tone: "work", label: "工作/学业" },
  { tone: "finance", label: "财务" },
  { tone: "social", label: "社交生活" },
  { tone: "travel", label: "旅行/探索" },
  { tone: "other", label: "其他" },
];

const TONE_STYLE: Record<CategoryTone, { bg: string; fg: string; dot: string }> = {
  health: { bg: "#e7f6ee", fg: "#1f7a54", dot: "#249d6d" },
  learn: { bg: "#f1eaf8", fg: "#6d4f96", dot: "#8b6bb8" },
  work: { bg: "#e8f2fb", fg: "#2f6ea3", dot: "#5b9ec9" },
  finance: { bg: "#fff4d8", fg: "#9a7b14", dot: "#c9a227" },
  social: { bg: "#fbeceb", fg: "#a33d35", dot: "#c5554a" },
  travel: { bg: "#eef6df", fg: "#5a7a28", dot: "#b9ca31" },
  other: { bg: "#eef0e6", fg: "#5b645f", dot: "#8a948c" },
};

const DAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function toneFromArea(attributeKey?: string | null, name?: string | null): CategoryTone {
  const key = `${attributeKey ?? ""} ${name ?? ""}`.toLowerCase();
  if (/str|health|健康|运动|体能/.test(key)) return "health";
  if (/int|learn|学习|成长|读书|阅读|技能/.test(key)) return "learn";
  if (/gold|fin|财富|财务|钱|理财/.test(key)) return "finance";
  if (/cha|社交|关系|约会/.test(key)) return "social";
  if (/cre|旅行|探索|创意|hobby|兴趣/.test(key)) return "travel";
  if (/wis|工作|学业|项目|career/.test(key)) return "work";
  if (/work|job|课|作业/.test(key)) return "work";
  return "other";
}

function mondayWeekStart(ymd: string) {
  const dow = dayOfWeek(ymd); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDaysYMD(ymd, offset);
}

function eventsForDate(events: CalEvent[], date: string) {
  return events
    .filter((e) => e.date === date)
    .sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
}

function durationLabel(start: string | null, end: string | null) {
  if (!start || !end) return "全天";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return "全天";
  if (mins < 60) return `${mins}分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}小时${m}分` : `${h}小时`;
}

function relativeDue(ymd: string, today: string) {
  const diff =
    (new Date(ymd + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime()) /
    (24 * 60 * 60 * 1000);
  const days = Math.round(diff);
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days > 1) return `${days}天后`;
  return `${Math.abs(days)}天前`;
}

function formatMonthLabel(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  return `${y}年${m}月`;
}

function formatSideDate(ymd: string) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}月${d}日 ${DAY_LABELS[dayOfWeek(ymd)]}`;
}

function buildCalEvents(routines: RoutineDTO[], tasks: TaskDTO[], rangeDates: string[], today: string): CalEvent[] {
  const events: CalEvent[] = [];
  const dateSet = new Set(rangeDates);

  for (const date of rangeDates) {
    const entries = buildEntries(routines, date);
    for (const entry of entries) {
      const tone = toneFromArea(entry.routine.area?.attributeKey, entry.routine.area?.name);
      const completed = date === today && entry.routine.completedToday;
      events.push({
        id: `r-${entry.routine.id}-${date}`,
        title: entry.routine.title,
        date,
        startTime: entry.meta?.startTime ?? null,
        endTime: entry.meta?.endTime ?? null,
        note: entry.note || entry.routine.notes || "",
        icon: entry.routine.area?.icon || "📅",
        tone,
        label: entry.routine.area?.name || "日程",
        kind: "routine",
        routine: entry.routine,
        completed,
        status: completed ? "done" : "todo",
      });
    }
  }

  for (const task of tasks) {
    if (task.status === "CANCELED") continue;
    const due = task.dueDate ? toYMD(new Date(task.dueDate)) : null;
    if (!due || !dateSet.has(due)) continue;
    const tone = task.projectId
      ? "work"
      : toneFromArea(task.area?.attributeKey, task.area?.name);
    let startTime: string | null = null;
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      if (d.getHours() || d.getMinutes()) {
        startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    events.push({
      id: `t-${task.id}`,
      title: task.title,
      date: due,
      startTime,
      endTime: null,
      note: task.notes ?? "",
      icon: task.area?.icon || (task.projectId ? "⚔" : "📜"),
      tone,
      label: task.project?.title || task.area?.name || (task.projectId ? "主线" : "任务"),
      kind: "task",
      task,
      completed: task.status === "DONE",
      status: task.status === "DONE" ? "done" : task.status === "IN_PROGRESS" ? "active" : "todo",
    });
  }

  return events;
}

export default function RoutinesPage() {
  const today = todayYMD();
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toneFilter, setToneFilter] = useState<Set<CategoryTone> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineDTO | null>(null);

  const { data: routines = [] } = useRoutines();
  const { data: tasks = [] } = useTasks();

  const monthDates = useMemo(() => calendarDatesMonday(cursor), [cursor]);
  const weekStart = mondayWeekStart(view === "week" ? cursor : selectedDate);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysYMD(weekStart, i)),
    [weekStart],
  );

  const rangeDates = useMemo(() => {
    if (view === "day") return [selectedDate];
    if (view === "week") return weekDates;
    return monthDates;
  }, [view, selectedDate, weekDates, monthDates]);

  const allEvents = useMemo(
    () => buildCalEvents(routines, tasks, rangeDates, today),
    [routines, tasks, rangeDates, today],
  );

  const events = useMemo(() => {
    if (!toneFilter) return allEvents;
    return allEvents.filter((e) => toneFilter.has(e.tone));
  }, [allEvents, toneFilter]);

  const selectedEvents = useMemo(
    () => eventsForDate(events, selectedDate),
    [events, selectedDate],
  );

  const monthStats = useMemo(() => {
    const prefix = cursor.slice(0, 7);
    const monthRange = monthDates.filter((d) => d.startsWith(prefix));
    const monthEvents = buildCalEvents(routines, tasks, monthRange, today);
    const done = monthEvents.filter((e) => e.status === "done").length;
    const active = monthEvents.filter((e) => e.status === "active").length;
    const todo = monthEvents.filter((e) => e.status === "todo").length;
    const total = monthEvents.length;
    return { done, active, todo, total };
  }, [routines, tasks, monthDates, cursor, today]);

  const upcoming = useMemo(() => {
    const list: CalEvent[] = [];
    for (let i = 1; i <= 21; i += 1) {
      const d = addDaysYMD(today, i);
      for (const e of buildCalEvents(routines, tasks, [d], today)) {
        if (e.status !== "done") list.push(e);
      }
      if (list.length >= 5) break;
    }
    return list.slice(0, 5);
  }, [routines, tasks, today]);

  const trendPoints = useMemo(() => {
    // Completion rate over last ~5 weeks in current month window
    const points: number[] = [];
    for (let i = 4; i >= 0; i -= 1) {
      const day = addDaysYMD(today, -i * 7);
      const start = mondayWeekStart(day);
      const days = Array.from({ length: 7 }, (_, j) => addDaysYMD(start, j));
      const weekEvents = buildCalEvents(routines, tasks, days, today);
      const rate = weekEvents.length
        ? Math.round((weekEvents.filter((e) => e.status === "done").length / weekEvents.length) * 100)
        : 0;
      points.push(rate);
    }
    return points;
  }, [routines, tasks, today]);

  const openCreate = (date = selectedDate) => {
    setSelectedDate(date);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event: CalEvent) => {
    if (event.kind === "routine" && event.routine) {
      setSelectedDate(event.date);
      setEditing(event.routine);
      setFormOpen(true);
    }
  };

  const shiftCursor = (dir: -1 | 1) => {
    if (view === "month") {
      const next = shiftMonth(cursor, dir);
      setCursor(next);
      setSelectedDate(next);
      return;
    }
    if (view === "week") {
      const next = addDaysYMD(cursor, dir * 7);
      setCursor(next);
      setSelectedDate(next);
      return;
    }
    const next = addDaysYMD(selectedDate, dir);
    setSelectedDate(next);
    setCursor(next);
  };

  const goToday = () => {
    setCursor(today);
    setSelectedDate(today);
  };

  const toggleTone = (tone: CategoryTone) => {
    setToneFilter((prev) => {
      if (!prev) return new Set([tone]);
      const next = new Set(prev);
      if (next.has(tone)) next.delete(tone);
      else next.add(tone);
      if (next.size === 0 || next.size === LEGEND.length) return null;
      return next;
    });
  };

  const dateNavLabel =
    view === "month"
      ? formatMonthLabel(cursor)
      : view === "week"
        ? `${weekDates[0].slice(5).replace("-", "/")} — ${weekDates[6].slice(5).replace("-", "/")}`
        : formatFullDate(selectedDate);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.seg}>
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={view === tab.id ? styles.segBtnActive : styles.segBtn}
                    onClick={() => {
                      setView(tab.id);
                      if (tab.id === "week") setCursor(selectedDate);
                      if (tab.id === "month") setCursor(selectedDate);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.ghostBtn} onClick={goToday}>
                今天
              </button>
            </div>

            <div className={styles.dateNav}>
              <button type="button" className={styles.iconBtn} onClick={() => shiftCursor(-1)} aria-label="上一段">
                <ChevronLeft size={16} />
              </button>
              <div className={styles.dateLabel}>{dateNavLabel}</div>
              <button type="button" className={styles.iconBtn} onClick={() => shiftCursor(1)} aria-label="下一段">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className={styles.toolbarRight}>
              <button
                type="button"
                className={styles.filterBtn}
                onClick={() => setFilterOpen((v) => !v)}
              >
                <SlidersHorizontal size={14} /> 筛选
              </button>
            </div>
          </div>

          {filterOpen ? (
            <div className={styles.filterPanel}>
              <button
                type="button"
                className={!toneFilter ? styles.filterChipActive : styles.filterChip}
                onClick={() => setToneFilter(null)}
              >
                全部
              </button>
              {LEGEND.map((item) => (
                <button
                  key={item.tone}
                  type="button"
                  className={
                    toneFilter?.has(item.tone) ? styles.filterChipActive : styles.filterChip
                  }
                  onClick={() => toggleTone(item.tone)}
                >
                  <span
                    className={styles.legendDot}
                    style={{ background: TONE_STYLE[item.tone].dot }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {view === "month" ? (
            <div className={styles.monthTable}>
              <div className={styles.weekHead}>
                {WEEK_HEAD.map((d) => (
                  <span key={d} className={styles.weekHeadCell}>
                    {d}
                  </span>
                ))}
              </div>
              <div className={styles.monthGrid}>
                {monthDates.map((date) => {
                  const inMonth = date.startsWith(cursor.slice(0, 7));
                  const dayEvents = eventsForDate(events, date);
                  const selected = date === selectedDate;
                  const isToday = date === today;
                  const cls = [
                    styles.cell,
                    !inMonth ? styles.cellMuted : "",
                    isToday ? styles.cellToday : "",
                    selected ? styles.cellSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={date}
                      type="button"
                      className={cls}
                      onClick={() => setSelectedDate(date)}
                      onDoubleClick={() => openCreate(date)}
                    >
                      <span className={styles.dayNum}>{Number(date.slice(8))}</span>
                      <div className={styles.pills}>
                        {dayEvents.slice(0, 3).map((ev) => {
                          const tone = TONE_STYLE[ev.tone];
                          return (
                            <span
                              key={ev.id}
                              className={styles.pill}
                              style={{ background: tone.bg, color: tone.fg }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(date);
                                openEdit(ev);
                              }}
                            >
                              <span className={styles.pillIcon}>{ev.icon}</span>
                              <span className={styles.pillTitle}>{ev.title}</span>
                              <span className={styles.pillTime}>{ev.startTime ?? "全天"}</span>
                            </span>
                          );
                        })}
                        {dayEvents.length > 3 ? (
                          <span className={styles.pillMore}>+{dayEvents.length - 3}</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {view === "week" ? (
            <div className={styles.weekGrid}>
              {weekDates.map((date) => {
                const dayEvents = eventsForDate(events, date);
                const selected = date === selectedDate;
                return (
                  <button
                    key={date}
                    type="button"
                    className={selected ? styles.weekColSelected : styles.weekCol}
                    onClick={() => setSelectedDate(date)}
                    onDoubleClick={() => openCreate(date)}
                  >
                    <div className={styles.weekColHead}>
                      <span>{WEEK_HEAD[(dayOfWeek(date) + 6) % 7]}</span>
                      <strong>{Number(date.slice(8))}</strong>
                    </div>
                    <div className={styles.weekColBody}>
                      {dayEvents.length === 0 ? (
                        <div className={styles.empty}>空闲</div>
                      ) : (
                        dayEvents.map((ev) => {
                          const tone = TONE_STYLE[ev.tone];
                          return (
                            <span
                              key={ev.id}
                              className={styles.pill}
                              style={{ background: tone.bg, color: tone.fg }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(ev);
                              }}
                            >
                              <span className={styles.pillIcon}>{ev.icon}</span>
                              <span className={styles.pillTitle}>{ev.title}</span>
                              <span className={styles.pillTime}>{ev.startTime ?? "全天"}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {view === "day" ? (
            <div className={styles.dayView}>
              {DAY_HOURS.map((hour) => {
                const label = `${String(hour).padStart(2, "0")}:00`;
                const hourEvents = selectedEvents.filter((ev) => {
                  if (!ev.startTime) return hour === 8;
                  return Number(ev.startTime.slice(0, 2)) === hour;
                });
                return (
                  <div key={hour} className={styles.dayHourRow}>
                    <div className={styles.dayHourLabel}>{label}</div>
                    <div className={styles.dayHourTrack}>
                      {hourEvents.map((ev) => {
                        const tone = TONE_STYLE[ev.tone];
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            className={styles.dayEvent}
                            style={{ background: tone.bg, color: tone.fg, borderColor: tone.dot }}
                            onClick={() => openEdit(ev)}
                          >
                            <span>{ev.icon}</span>
                            <strong>{ev.title}</strong>
                            <span style={{ marginLeft: "auto", opacity: 0.75 }}>
                              {ev.startTime ?? "全天"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className={styles.legend}>
            <div className={styles.legendItems}>
              {LEGEND.map((item) => (
                <span key={item.tone} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ background: TONE_STYLE[item.tone].dot }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
            <div className={styles.legendHint}>点击日期可选中 · 双击可创建事件</div>
          </div>
        </section>

        <aside className={styles.side}>
          <section className={styles.sideCard}>
            <div className={styles.sideHead}>
              <h2 className={styles.sideTitle}>{formatSideDate(selectedDate)}</h2>
              <span className={styles.sideMeta}>
                {selectedDate === today ? "今天" : relativeDue(selectedDate, today)}
              </span>
            </div>

            {selectedEvents.length === 0 ? (
              <div className={styles.empty}>这一天还没有安排</div>
            ) : (
              <ul className={styles.timeline}>
                {selectedEvents.map((ev) => {
                  const tone = TONE_STYLE[ev.tone];
                  return (
                    <li key={ev.id} className={styles.tlItem}>
                      <span className={styles.tlTime}>{ev.startTime ?? "全天"}</span>
                      <span className={styles.tlRail}>
                        <span className={styles.tlDot} style={{ background: tone.dot }} />
                      </span>
                      <button
                        type="button"
                        className={styles.tlBody}
                        style={{ background: "transparent", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }}
                        onClick={() => openEdit(ev)}
                      >
                        <div className={styles.tlTitleRow}>
                          <span className={styles.tlTitle}>{ev.title}</span>
                          <span
                            className={styles.tlTag}
                            style={{ background: tone.bg, color: tone.fg }}
                          >
                            {ev.label}
                          </span>
                        </div>
                        {ev.note ? <p className={styles.tlDesc}>{stripMetaNote(ev.note)}</p> : null}
                        <div className={styles.tlDur}>{durationLabel(ev.startTime, ev.endTime)}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <button type="button" className={styles.addEvent} onClick={() => openCreate(selectedDate)}>
              <Plus size={14} /> 添加事件
            </button>
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideHead}>
              <h2 className={styles.sideTitle}>本月统计</h2>
              <span className={styles.sideMeta}>{formatMonthLabel(cursor)}</span>
            </div>
            <div className={styles.statsRow}>
              <Donut
                done={monthStats.done}
                active={monthStats.active}
                todo={monthStats.todo}
                total={monthStats.total}
              />
              <div className={styles.statLegend}>
                <div className={styles.statLegendItem}>
                  <span className={styles.statLegendLeft}>
                    <span className={styles.legendDot} style={{ background: "#249d6d" }} />
                    已完成
                  </span>
                  <span>
                    {monthStats.done}
                    {monthStats.total
                      ? ` (${Math.round((monthStats.done / monthStats.total) * 100)}%)`
                      : ""}
                  </span>
                </div>
                <div className={styles.statLegendItem}>
                  <span className={styles.statLegendLeft}>
                    <span className={styles.legendDot} style={{ background: "#c9a227" }} />
                    进行中
                  </span>
                  <span>
                    {monthStats.active}
                    {monthStats.total
                      ? ` (${Math.round((monthStats.active / monthStats.total) * 100)}%)`
                      : ""}
                  </span>
                </div>
                <div className={styles.statLegendItem}>
                  <span className={styles.statLegendLeft}>
                    <span className={styles.legendDot} style={{ background: "#e09a4a" }} />
                    未开始
                  </span>
                  <span>
                    {monthStats.todo}
                    {monthStats.total
                      ? ` (${Math.round((monthStats.todo / monthStats.total) * 100)}%)`
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.trendBox}>
              <div className={styles.trendHead}>
                <span>完成率趋势</span>
                <span className={styles.trendUp}>近5周</span>
              </div>
              <TrendLine points={trendPoints} />
            </div>
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideHead}>
              <h2 className={styles.sideTitle}>即将到来</h2>
            </div>
            <div className={styles.upcomingList}>
              {upcoming.length === 0 ? (
                <div className={styles.empty}>近期没有新安排</div>
              ) : (
                upcoming.map((ev) => {
                  const tone = TONE_STYLE[ev.tone];
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className={styles.upcomingItem}
                      onClick={() => {
                        setSelectedDate(ev.date);
                        setCursor(ev.date);
                        openEdit(ev);
                      }}
                    >
                      <span
                        className={styles.upcomingIcon}
                        style={{ background: tone.bg }}
                      >
                        {ev.icon}
                      </span>
                      <span>
                        <div className={styles.upcomingTitle}>{ev.title}</div>
                        <div className={styles.upcomingSub}>
                          {relativeDue(ev.date, today)} · {ev.date.slice(5).replace("-", "月")}日
                        </div>
                      </span>
                      <Star size={14} className={styles.upcomingAction} />
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>

      <ScheduleFormPanel
        open={formOpen}
        initial={editing}
        selectedDate={selectedDate}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}

function stripMetaNote(note: string) {
  const decoded = decodeNotes(note);
  if (decoded.meta) return decoded.note || "";
  // raw may be JSON meta string from event.note already decoded in build — keep short
  if (note.trim().startsWith("{")) return "";
  return note;
}

function Donut({
  done,
  active,
  todo,
  total,
}: {
  done: number;
  active: number;
  todo: number;
  total: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const safe = total || 1;
  const segs = [
    { value: done, color: "#249d6d" },
    { value: active, color: "#c9a227" },
    { value: todo, color: "#e09a4a" },
  ];
  let offset = 0;
  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e6e8d8" strokeWidth="12" />
        {segs.map((seg) => {
          const len = (seg.value / safe) * c;
          const el = (
            <circle
              key={seg.color}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeLinecap="butt"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className={styles.donutCenter}>
        <strong>{total}</strong>
        <span>总事件</span>
      </div>
    </div>
  );
}

function TrendLine({ points }: { points: number[] }) {
  const w = 240;
  const h = 56;
  const max = Math.max(100, ...points, 1);
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4;
    const y = h - 8 - (p / max) * (h - 16);
    return `${x},${y}`;
  });
  const polyline = coords.join(" ");
  return (
    <svg className={styles.trendSvg} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="#249d6d"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polyline}
      />
      {points.map((p, i) => {
        const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4;
        const y = h - 8 - (p / max) * (h - 16);
        return <circle key={i} cx={x} cy={y} r="3" fill="#249d6d" />;
      })}
    </svg>
  );
}
