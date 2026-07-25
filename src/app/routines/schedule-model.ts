import type { CSSProperties } from "react";
import { addDaysYMD, dayOfWeek } from "@/lib/date";
import type { RoutineDTO, TaskDTO } from "@/lib/types";

export const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export const DAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"];
export const SCHEDULE_META_KEY = "__lifeosSchedule";
export const TIME_START = 6 * 60;
export const TIME_END = 24 * 60;
export const HOUR_HEIGHT = 112;
export const TIMELINE_TOP_PADDING = 16;
export const GRID_HEIGHT = ((TIME_END - TIME_START) / 60) * HOUR_HEIGHT + TIMELINE_TOP_PADDING + 8;

export type ScheduleKind = "recurring" | "single";
export type ScheduleView = "timeline" | "ideal" | "actual";

export type ScheduleMeta = {
  [SCHEDULE_META_KEY]: true;
  kind: ScheduleKind;
  startTime: string;
  endTime: string;
  date?: string;
  note?: string;
};

export type DecodedNotes = { meta: ScheduleMeta | null; note: string };

export type ScheduleEntry = {
  routine: RoutineDTO;
  meta: ScheduleMeta | null;
  note: string;
  start: number | null;
  end: number | null;
};

export type AiScheduleSuggestion = {
  title: string;
  detail: string;
  kind: "focus" | "rest" | "balance";
};

export const IDEAL_BLOCKS = [
  { startTime: "06:00", endTime: "06:30", title: "美美起床", detail: "固定起床时间，先稳定身体状态和一天的能量。", tone: "success" },
  { startTime: "08:30", endTime: "09:30", title: "早餐与咖啡", detail: "补充能量，给一天留出平缓的启动时间。", tone: "success" },
  { startTime: "09:30", endTime: "10:00", title: "每日计划", detail: "梳理今天必须完成和真正重要的事情。", tone: "accent" },
  { startTime: "10:00", endTime: "12:00", title: "早晨黄金时间", detail: "处理重要且对未来有复利效应的困难任务。", tone: "accent" },
  { startTime: "12:00", endTime: "14:00", title: "午餐与午休", detail: "简单饮食，让身体和注意力都得到恢复。", tone: "creative" },
  { startTime: "14:00", endTime: "16:00", title: "下午黄金时间", detail: "处理复杂、有难度，需要持续投入的事项。", tone: "accent" },
  { startTime: "16:30", endTime: "17:30", title: "运动健身", detail: "保持身体健康，释放压力。", tone: "strength" },
  { startTime: "18:00", endTime: "19:30", title: "晚餐与散步", detail: "享受晚餐，散步放松。", tone: "success" },
  { startTime: "19:30", endTime: "21:00", title: "阅读学习", detail: "拓展知识，保持稳定输入。", tone: "creative" },
  { startTime: "21:00", endTime: "22:30", title: "自由时间", detail: "做自己喜欢的事情，给一天留出弹性。", tone: "neutral" },
  { startTime: "22:30", endTime: "23:30", title: "睡前准备", detail: "洗漱、阅读、冥想，准备睡觉。", tone: "neutral" },
] as const;

export const TIME_OPTIONS = Array.from({ length: ((24 - 6) * 2) + 1 }, (_, index) =>
  formatTime(6 * 60 + index * 30),
);

export function decodeNotes(raw: string | null | undefined): DecodedNotes {
  if (!raw) return { meta: null, note: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<ScheduleMeta>;
    if (
      parsed &&
      parsed[SCHEDULE_META_KEY] === true &&
      (parsed.kind === "recurring" || parsed.kind === "single") &&
      typeof parsed.startTime === "string" &&
      typeof parsed.endTime === "string"
    ) {
      return {
        meta: {
          [SCHEDULE_META_KEY]: true,
          kind: parsed.kind,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          ...(typeof parsed.date === "string" ? { date: parsed.date } : {}),
          ...(typeof parsed.note === "string" ? { note: parsed.note } : {}),
        },
        note: typeof parsed.note === "string" ? parsed.note : "",
      };
    }
  } catch {}
  return { meta: null, note: raw };
}

export function encodeNotes(meta: ScheduleMeta) {
  return JSON.stringify(meta);
}

export function parseRoutineDays(raw?: string) {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (Array.isArray(parsed) && parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
      return parsed as number[];
    }
  } catch {}
  return [0, 1, 2, 3, 4, 5, 6];
}

export function routineMatchesDate(routine: RoutineDTO, selectedDate: string) {
  const decoded = decodeNotes(routine.notes);
  if (decoded.meta?.kind === "single") return decoded.meta.date === selectedDate;
  return parseRoutineDays(routine.daysOfWeek).includes(dayOfWeek(selectedDate));
}

export function buildEntries(routines: RoutineDTO[], selectedDate: string): ScheduleEntry[] {
  return routines
    .filter((routine) => routineMatchesDate(routine, selectedDate))
    .map((routine) => {
      const decoded = decodeNotes(routine.notes);
      return {
        routine,
        meta: decoded.meta,
        note: decoded.note,
        start: decoded.meta ? timeToMinutes(decoded.meta.startTime) : null,
        end: decoded.meta ? timeToMinutes(decoded.meta.endTime) : null,
      };
    })
    .sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999));
}

export function tasksForDate(tasks: TaskDTO[], selectedDate: string) {
  return tasks
    .filter((task) => datePart(task.dueDate) === selectedDate || datePart(task.completedAt) === selectedDate)
    .sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || b.priority - a.priority);
}

export function dateStrip(selectedDate: string) {
  return Array.from({ length: 7 }, (_, index) => addDaysYMD(selectedDate, index - 3));
}

export function calendarDates(selectedDate: string) {
  const [year, month] = selectedDate.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const offset = dayOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDaysYMD(first, index - offset));
}

/** Monday-first month grid (周一 … 周日), matching the cream calendar UI. */
export function calendarDatesMonday(selectedDate: string) {
  const [year, month] = selectedDate.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const dow = dayOfWeek(first); // 0=Sun..6=Sat
  const offset = dow === 0 ? 6 : dow - 1;
  return Array.from({ length: 42 }, (_, index) => addDaysYMD(first, index - offset));
}

export function shiftMonth(selectedDate: string, delta: number) {
  const [year, month, day] = selectedDate.split("-").map(Number);
  const target = new Date(year, month - 1 + delta, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
}

export function hasScheduleOnDate(routines: RoutineDTO[], date: string) {
  return routines.some((routine) => routineMatchesDate(routine, date));
}

export function isTimed(entry: Pick<ScheduleEntry, "start" | "end">) {
  return entry.start !== null && entry.end !== null && entry.end > entry.start;
}

export function blockStyle(start: number | null, end: number | null): CSSProperties {
  const safeStart = clamp(start ?? TIME_START, TIME_START, TIME_END - 30);
  const safeEnd = clamp(end ?? safeStart + 60, safeStart + 30, TIME_END);
  return {
    top: minutesToTop(safeStart),
    minHeight: 48,
    height: Math.max(48, ((safeEnd - safeStart) / 60) * HOUR_HEIGHT - 6),
  };
}

export function minutesToTop(minutes: number) {
  return TIMELINE_TOP_PADDING + ((minutes - TIME_START) / 60) * HOUR_HEIGHT;
}

export function timeToMinutes(value: string | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function hourMarks() {
  return Array.from({ length: 18 }, (_, index) => TIME_START + index * 60);
}

export function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatFullDate(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

export function formatMonthDay(ymd: string) {
  const [, month, day] = ymd.split("-").map(Number);
  return `${month}/${day}`;
}

export function areaBreakdown(entries: ScheduleEntry[]) {
  const counts = new Map<string, { name: string; icon: string; color: string; count: number }>();
  for (const entry of entries) {
    const area = entry.routine.area;
    const key = area?.id ?? "other";
    const current = counts.get(key);
    counts.set(key, {
      name: area?.name ?? "其他",
      icon: area?.icon ?? "·",
      color: area?.color ?? "var(--fg-subtle)",
      count: (current?.count ?? 0) + 1,
    });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
}

export function completionSummary(entries: ScheduleEntry[], selectedDate: string, today: string, now = new Date()) {
  const isToday = selectedDate === today;
  const done = isToday ? entries.filter((entry) => entry.routine.completedToday).length : 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const active = isToday
    ? entries.filter((entry) => !entry.routine.completedToday && entry.start !== null && entry.end !== null && entry.start <= nowMinutes && entry.end > nowMinutes).length
    : entries.length;
  const pending = Math.max(0, entries.length - done - (isToday ? active : 0));
  return { done, active, pending, rate: entries.length ? Math.round((done / entries.length) * 100) : 0 };
}

export function conflictIds(entries: ScheduleEntry[]) {
  const timed = entries.filter(isTimed);
  const ids = new Set<string>();
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      if ((timed[j].start ?? TIME_END) >= (timed[i].end ?? TIME_START)) break;
      ids.add(timed[i].routine.id);
      ids.add(timed[j].routine.id);
    }
  }
  return ids;
}

export function rangesOverlap(
  firstStart: number | null,
  firstEnd: number | null,
  secondStart: number | null,
  secondEnd: number | null,
) {
  if (firstStart === null || firstEnd === null || secondStart === null || secondEnd === null) return false;
  return firstStart < secondEnd && firstEnd > secondStart;
}

function datePart(value: string | null | undefined) {
  return value?.slice(0, 10) ?? null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
