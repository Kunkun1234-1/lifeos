"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import {
  useCompleteRoutine,
  useCreateRoutine,
  useDeleteRoutine,
  useRoutines,
  useUpdateRoutine,
} from "@/hooks/queries";
import { addDaysYMD, dayOfWeek, todayYMD } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { RoutineDTO } from "@/lib/types";

const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const DAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"];
const SCHEDULE_META_KEY = "__lifeosSchedule";
const TIME_START = 6 * 60;
const TIME_END = 24 * 60;
const HOUR_HEIGHT = 74;
const GRID_HEIGHT = ((TIME_END - TIME_START) / 60) * HOUR_HEIGHT;

type ScheduleKind = "recurring" | "single";

type ScheduleMeta = {
  [SCHEDULE_META_KEY]: true;
  kind: ScheduleKind;
  startTime: string;
  endTime: string;
  date?: string;
  note?: string;
};

type DecodedNotes = {
  meta: ScheduleMeta | null;
  note: string;
};

type ScheduleEntry = {
  routine: RoutineDTO;
  meta: ScheduleMeta | null;
  note: string;
  start: number | null;
  end: number | null;
};

const IDEAL_BLOCKS = [
  {
    startTime: "08:00",
    endTime: "08:30",
    title: "美美起床",
    detail: "固定起床时间，先稳定身体状态和一天的能量。",
  },
  {
    startTime: "08:30",
    endTime: "09:30",
    title: "早餐与咖啡",
    detail: "早餐冥想，坚果、香蕉、面包、鸡蛋可随机搭配。",
  },
  {
    startTime: "09:30",
    endTime: "10:00",
    title: "每日计划",
    detail: "梳理今天有趣、必须、开心、学习或工作相关的事情。",
  },
  {
    startTime: "10:00",
    endTime: "12:00",
    title: "早晨黄金时间",
    detail: "处理重要且对未来有复利效应的困难任务。",
  },
  {
    startTime: "12:00",
    endTime: "14:00",
    title: "午餐与午休",
    detail: "简单饮食，冥想训练，从身体到内心放松。",
  },
  {
    startTime: "14:00",
    endTime: "18:00",
    title: "下午黄金时间",
    detail: "处理复杂、有难度，但不必全程高度紧绷的事项。",
  },
  {
    startTime: "18:00",
    endTime: "19:30",
    title: "晚餐与散步",
    detail: "吃好一点，散步、回邮件、查邮件或阅读。",
  },
  {
    startTime: "19:30",
    endTime: "22:00",
    title: "杂活与自由时间",
    detail: "健身、跑步、游泳、读书、遛狗、加班或杂活。",
  },
  {
    startTime: "22:00",
    endTime: "23:00",
    title: "自由时间",
    detail: "不纠结具体内容，给一天留出弹性。",
  },
  {
    startTime: "23:00",
    endTime: "24:00",
    title: "睡前准备",
    detail: "洗漱、洗澡、聊天、听有声书，进入适合入睡的环境。",
  },
];

const TIME_OPTIONS = Array.from({ length: ((24 - 6) * 2) + 1 }, (_, index) =>
  formatTime(6 * 60 + index * 30),
);

export default function RoutinesPage() {
  const [selectedDate, setSelectedDate] = useState(() => todayYMD());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoutineDTO | null>(null);
  const { data: routines, isLoading } = useRoutines();

  const selectedDow = dayOfWeek(selectedDate);
  const today = todayYMD();
  const dateStrip = useMemo(
    () => Array.from({ length: 15 }, (_, index) => addDaysYMD(selectedDate, index - 7)),
    [selectedDate],
  );

  const entries = useMemo(() => {
    return (routines ?? [])
      .filter((routine) => routineMatchesDate(routine, selectedDate))
      .map((routine): ScheduleEntry => {
        const decoded = decodeNotes(routine.notes);
        const start = decoded.meta ? timeToMinutes(decoded.meta.startTime) : null;
        const end = decoded.meta ? timeToMinutes(decoded.meta.endTime) : null;
        return {
          routine,
          meta: decoded.meta,
          note: decoded.note,
          start,
          end,
        };
      })
      .sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999));
  }, [routines, selectedDate]);

  const timedEntries = entries.filter((entry) => isTimed(entry.start, entry.end));
  const unscheduledEntries = entries.filter((entry) => !isTimed(entry.start, entry.end));

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-8">
      <section className="relative overflow-hidden rounded-sm border border-[var(--gold)]/55 bg-[rgba(255,252,242,0.36)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_24px_70px_-42px_rgba(4,12,24,0.9)] backdrop-blur-xl">
        <header className="border-b border-[var(--gold)]/36 bg-[rgba(255,252,242,0.48)] px-4 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-[var(--gold)]/60 bg-[rgba(24,38,58,0.88)] text-[var(--gold-pale)]">
                <CalendarDays size={23} />
              </div>
              <div>
                <div className="section-label">
                  <span className="cn text-2xl">日程</span>
                  <span className="en text-[11px]">Schedule</span>
                </div>
                <div className="mt-1 text-sm text-[var(--fg-muted)]">
                  {formatFullDate(selectedDate)} · {DAY_LABELS[selectedDow]}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedDate(addDaysYMD(selectedDate, -1))}>
                <ChevronLeft size={15} />
                前一天
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSelectedDate(today)}>
                今天
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedDate(addDaysYMD(selectedDate, 1))}>
                后一天
                <ChevronRight size={15} />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setShowForm((value) => !value);
                }}
              >
                <Plus size={15} />
                {showForm ? "收起" : "写安排"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {dateStrip.map((date) => {
              const active = date === selectedDate;
              const current = date === today;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "min-w-[74px] rounded-sm border px-3 py-2 text-left transition-all",
                    active
                      ? "border-[var(--gold)] bg-[rgba(24,38,58,0.86)] text-[var(--fg-on-ink)] shadow-[0_0_0_2px_rgba(232,201,119,0.2)]"
                      : "border-[var(--gold)]/24 bg-[rgba(255,252,242,0.56)] text-[var(--fg)] hover:border-[var(--gold)]/55",
                  )}
                >
                  <div className={cn("font-display text-[13px]", active ? "text-[var(--gold-pale)]" : "text-[var(--fg-strong)]")}>
                    {formatMonthDay(date)}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between font-display-en text-[8px]">
                    <span>{DAY_SHORT[dayOfWeek(date)]}</span>
                    {current && <span className="text-[var(--gold-bright)]">TODAY</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </header>

        {showForm && (
          <div className="border-b border-[var(--gold)]/28 bg-[rgba(10,24,42,0.16)] p-4">
            <ScheduleForm
              key={editing?.id ?? `new-${selectedDate}`}
              initial={editing}
              selectedDate={selectedDate}
              onDone={() => {
                setEditing(null);
                setShowForm(false);
              }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="mb-3 grid grid-cols-[72px_minmax(300px,1fr)_minmax(340px,1.1fr)] gap-3 overflow-x-auto text-sm">
            <ColumnHeader label="时间轴" subLabel="Time" />
            <ColumnHeader label="理想日程安排" subLabel="Ideal day" />
            <ColumnHeader label="具体时间安排" subLabel={isLoading ? "Loading" : `${entries.length} items`} />
          </div>

          <div className="max-h-[calc(100vh-310px)] min-h-[520px] overflow-auto rounded-sm border border-[var(--gold)]/36 bg-[rgba(10,24,42,0.24)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-md">
            <div
              className="grid min-w-[820px] grid-cols-[72px_minmax(300px,1fr)_minmax(340px,1.1fr)] gap-3 p-3"
              style={{ height: GRID_HEIGHT + 24 }}
            >
              <TimeRail />
              <TimelineColumn>
                {IDEAL_BLOCKS.map((block) => (
                  <IdealBlock key={`${block.startTime}-${block.title}`} block={block} />
                ))}
              </TimelineColumn>
              <TimelineColumn>
                {isLoading ? (
                  <div className="absolute inset-x-3 top-6 rounded-sm border border-dashed border-white/35 bg-white/10 py-10 text-center text-sm text-[var(--fg-on-ink)]/75">
                    Loading...
                  </div>
                ) : timedEntries.length === 0 && unscheduledEntries.length === 0 ? (
                  <div className="absolute inset-x-3 top-6 rounded-sm border border-dashed border-white/35 bg-white/10 py-10 text-center text-sm text-[var(--fg-on-ink)]/75">
                    这一天还没有具体安排。
                  </div>
                ) : (
                  timedEntries.map((entry) => (
                    <ActualBlock
                      key={entry.routine.id}
                      entry={entry}
                      selectedDate={selectedDate}
                      onEdit={() => {
                        setEditing(entry.routine);
                        setShowForm(true);
                      }}
                    />
                  ))
                )}
              </TimelineColumn>
            </div>
          </div>

          {unscheduledEntries.length > 0 && (
            <section className="mt-4 rounded-sm border border-[var(--gold)]/32 bg-[rgba(255,252,242,0.52)] p-3 backdrop-blur-xl">
              <div className="mb-2 font-display text-sm font-bold text-[var(--fg-strong)]">未定时间</div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {unscheduledEntries.map((entry) => (
                  <button
                    key={entry.routine.id}
                    type="button"
                    onClick={() => {
                      setEditing(entry.routine);
                      setShowForm(true);
                    }}
                    className="rounded-sm border border-[var(--gold)]/28 bg-[rgba(255,252,242,0.72)] p-3 text-left text-sm hover:border-[var(--gold)]"
                  >
                    <div className="font-display font-bold text-[var(--fg-strong)]">{entry.routine.title}</div>
                    <div className="mt-1 text-xs text-[var(--fg-muted)]">
                      {entry.note || "没有写具体时间，可编辑补全。"}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function ColumnHeader({ label, subLabel }: { label: string; subLabel: string }) {
  return (
    <div className="rounded-sm border border-[var(--gold)]/28 bg-[rgba(255,252,242,0.5)] px-3 py-2 backdrop-blur-xl">
      <div className="font-display text-[14px] font-bold text-[var(--fg-strong)]">{label}</div>
      <div className="font-display-en text-[8px] text-[var(--gold-deep)]">{subLabel}</div>
    </div>
  );
}

function TimeRail() {
  return (
    <div className="relative border-r border-white/26 text-right">
      {hourMarks().map((minutes) => (
        <div
          key={minutes}
          className="absolute right-3 -translate-y-2 font-mono text-[11px] text-[var(--fg-on-ink)]/78"
          style={{ top: minutesToTop(minutes) }}
        >
          {formatTime(minutes)}
        </div>
      ))}
    </div>
  );
}

function TimelineColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full overflow-hidden rounded-sm border border-white/24 bg-[rgba(255,255,255,0.08)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_1px,transparent_1px)] bg-[length:100%_74px] opacity-36" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(232,201,119,0.08)_1px,transparent_1px)] bg-[length:48px_100%] opacity-40" />
      {children}
    </div>
  );
}

function IdealBlock({ block }: { block: (typeof IDEAL_BLOCKS)[number] }) {
  return (
    <div
      className="absolute left-3 right-3 rounded-sm border border-[var(--gold)]/38 bg-[rgba(255,252,242,0.74)] p-3 text-[var(--fg)] shadow-[0_14px_30px_-24px_rgba(4,12,24,0.8)] backdrop-blur-xl"
      style={blockStyle(timeToMinutes(block.startTime), timeToMinutes(block.endTime))}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 font-display text-[14px] font-bold text-[var(--fg-strong)]">
          {block.title}
        </div>
        <div className="shrink-0 font-mono text-[10px] text-[var(--gold-deep)]">
          {block.startTime}-{block.endTime}
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--fg-muted)]">{block.detail}</p>
    </div>
  );
}

function ActualBlock({
  entry,
  selectedDate,
  onEdit,
}: {
  entry: ScheduleEntry;
  selectedDate: string;
  onEdit: () => void;
}) {
  const complete = useCompleteRoutine();
  const remove = useDeleteRoutine();
  const today = todayYMD();
  const isToday = selectedDate === today;
  const done = isToday && entry.routine.completedToday;
  const kind = entry.meta?.kind ?? "recurring";

  return (
    <article
      className={cn(
        "absolute left-3 right-3 rounded-sm border p-3 shadow-[0_16px_34px_-24px_rgba(4,12,24,0.9)] backdrop-blur-xl",
        done
          ? "border-[var(--success)]/55 bg-[rgba(76,138,116,0.28)]"
          : kind === "single"
            ? "border-[var(--gold)]/50 bg-[rgba(255,252,242,0.72)]"
            : "border-[#88a9d4]/46 bg-[rgba(221,235,255,0.68)]",
      )}
      style={blockStyle(entry.start, entry.end)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[14px] font-bold text-[var(--fg-strong)]">
              {entry.routine.title}
            </span>
            <span className="shrink-0 rounded-sm border border-[var(--gold)]/24 bg-white/55 px-1.5 py-0.5 text-[10px] text-[var(--gold-deep)]">
              {kind === "single" ? "单次" : "周期"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {entry.meta?.startTime ?? "未设"}-{entry.meta?.endTime ?? "未设"}
            </span>
            {entry.routine.area && <span>{entry.routine.area.icon} {entry.routine.area.name}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-white/45 hover:text-[var(--fg-strong)]"
            title="编辑"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`归档安排「${entry.routine.title}」？`)) remove.mutate(entry.routine.id);
            }}
            className="grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-white/45 hover:text-[var(--danger)]"
            title="归档"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {entry.note && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--fg-muted)]">{entry.note}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-[var(--fg-subtle)]">
          <span className="inline-flex items-center gap-1">
            <Flame size={12} />
            {entry.routine.streakCurrent}
          </span>
          <span>+{entry.routine.xpReward} XP</span>
          <span>+{entry.routine.goldReward} Gold</span>
        </div>
        <button
          type="button"
          disabled={!isToday || done || complete.isPending}
          onClick={() => complete.mutate(entry.routine.id)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-[11px] transition-all",
            done
              ? "border-[var(--success)] bg-[var(--success)]/18 text-[var(--success)]"
              : "border-[var(--gold)]/44 bg-white/48 text-[var(--fg-strong)] hover:border-[var(--gold)]",
            (!isToday || complete.isPending) && "opacity-55",
          )}
          title={isToday ? "完成今日安排" : "只能完成今天的安排"}
        >
          <Check size={12} />
          {done ? "已完成" : "完成"}
        </button>
      </div>
    </article>
  );
}

function ScheduleForm({
  initial,
  selectedDate,
  onDone,
}: {
  initial: RoutineDTO | null;
  selectedDate: string;
  onDone: () => void;
}) {
  const decoded = decodeNotes(initial?.notes ?? null);
  const initialMeta = decoded.meta;
  const initialKind = initialMeta?.kind ?? "recurring";
  const initialDate = initialMeta?.date ?? selectedDate;
  const [kind, setKind] = useState<ScheduleKind>(initialKind);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(decoded.note);
  const [date, setDate] = useState(initialDate);
  const [days, setDays] = useState<number[]>(parseRoutineDays(initial?.daysOfWeek));
  const [startTime, setStartTime] = useState(initialMeta?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initialMeta?.endTime ?? "10:00");
  const [areaId, setAreaId] = useState<string | null>(initial?.areaId ?? null);
  const [xpReward, setXpReward] = useState(initial?.xpReward ?? 10);
  const [goldReward, setGoldReward] = useState(initial?.goldReward ?? 5);

  const create = useCreateRoutine();
  const update = useUpdateRoutine();
  const editing = Boolean(initial);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const validTime = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
  const validDays = kind === "single" || days.length > 0;

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const submit = async () => {
    if (!title.trim() || !validTime || !validDays) return;

    const meta: ScheduleMeta = {
      [SCHEDULE_META_KEY]: true,
      kind,
      startTime,
      endTime,
      ...(kind === "single" ? { date } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    const payload = {
      title: title.trim(),
      notes: encodeNotes(meta),
      areaId,
      daysOfWeek: kind === "single" ? [dayOfWeek(date)] : days,
      xpReward,
      goldReward,
    };

    if (initial) {
      await update.mutateAsync({ id: initial.id, body: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onDone();
  };

  return (
    <div className="rounded-sm border border-[var(--gold)]/34 bg-[rgba(255,252,242,0.7)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg font-bold text-[var(--fg-strong)]">
            {editing ? "编辑安排" : "写一个安排"}
          </div>
          <div className="mt-1 text-xs text-[var(--fg-muted)]">
            支持固定周期，也支持某一天的上课、考试、约定或其他具体事项。
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDone}>
          取消
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>标题</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：高数课 / 期末考试 / 晚间跑步" />
          </div>
          <div className="grid gap-1.5">
            <Label>备注</Label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="地点、准备材料、提醒事项..." />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>安排类型</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("recurring")}
                className={kindButtonClass(kind === "recurring")}
              >
                <Repeat size={14} />
                固定周期
              </button>
              <button
                type="button"
                onClick={() => setKind("single")}
                className={kindButtonClass(kind === "single")}
              >
                <CalendarDays size={14} />
                单次事项
              </button>
            </div>
          </div>

          {kind === "single" ? (
            <div className="grid gap-1.5">
              <Label>日期</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label>重复星期</Label>
              <div className="grid grid-cols-7 gap-1">
                {DAY_SHORT.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={cn(
                      "h-8 rounded-sm border text-xs transition-all",
                      days.includes(index)
                        ? "border-[var(--gold)] bg-[rgba(24,38,58,0.86)] text-[var(--gold-pale)]"
                        : "border-[var(--gold)]/25 bg-white/44 text-[var(--fg-muted)] hover:border-[var(--gold)]/55",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>开始</Label>
              <Select value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                {TIME_OPTIONS.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>结束</Label>
              <Select value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                {TIME_OPTIONS.slice(1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {!validTime && <div className="text-xs text-[var(--danger)]">结束时间必须晚于开始时间。</div>}
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>领域</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label>XP</Label>
              <Input type="number" min={0} value={xpReward} onChange={(event) => setXpReward(Number(event.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Gold</Label>
              <Input type="number" min={0} value={goldReward} onChange={(event) => setGoldReward(Number(event.target.value))} />
            </div>
          </div>
          <Button
            className="mt-auto"
            onClick={submit}
            disabled={create.isPending || update.isPending || !title.trim() || !validTime || !validDays}
          >
            {create.isPending || update.isPending ? "保存中..." : editing ? "保存修改" : "创建安排"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function kindButtonClass(active: boolean) {
  return cn(
    "inline-flex h-9 items-center justify-center gap-2 rounded-sm border text-sm transition-all",
    active
      ? "border-[var(--gold)] bg-[rgba(24,38,58,0.86)] text-[var(--gold-pale)]"
      : "border-[var(--gold)]/28 bg-white/48 text-[var(--fg-muted)] hover:border-[var(--gold)]/55 hover:text-[var(--fg-strong)]",
  );
}

function parseRoutineDays(raw?: string) {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (
      Array.isArray(parsed) &&
      parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    ) {
      return parsed as number[];
    }
  } catch {}
  return [0, 1, 2, 3, 4, 5, 6];
}

function decodeNotes(raw: string | null | undefined): DecodedNotes {
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

function encodeNotes(meta: ScheduleMeta) {
  return JSON.stringify(meta);
}

function routineMatchesDate(routine: RoutineDTO, selectedDate: string) {
  const decoded = decodeNotes(routine.notes);
  if (decoded.meta?.kind === "single") return decoded.meta.date === selectedDate;
  return parseRoutineDays(routine.daysOfWeek).includes(dayOfWeek(selectedDate));
}

function isTimed(start: number | null, end: number | null) {
  return start !== null && end !== null && end > start;
}

function blockStyle(start: number | null, end: number | null): CSSProperties {
  const safeStart = clamp(start ?? TIME_START, TIME_START, TIME_END - 30);
  const safeEnd = clamp(end ?? safeStart + 60, safeStart + 30, TIME_END);
  return {
    top: minutesToTop(safeStart),
    minHeight: 54,
    height: Math.max(54, ((safeEnd - safeStart) / 60) * HOUR_HEIGHT - 8),
  };
}

function minutesToTop(minutes: number) {
  return ((minutes - TIME_START) / 60) * HOUR_HEIGHT;
}

function timeToMinutes(value: string | undefined) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function hourMarks() {
  return Array.from({ length: ((TIME_END - TIME_START) / 60) + 1 }, (_, index) => TIME_START + index * 60);
}

function formatMonthDay(ymd: string) {
  const [, month, day] = ymd.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatFullDate(ymd: string) {
  const [year, month, day] = ymd.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
