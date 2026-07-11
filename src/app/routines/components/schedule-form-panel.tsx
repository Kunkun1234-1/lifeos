"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Repeat, X } from "lucide-react";
import { AreaSelect } from "@/components/area-select";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useCreateRoutine, useUpdateRoutine } from "@/hooks/queries";
import { dayOfWeek } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { RoutineDTO } from "@/lib/types";
import {
  DAY_SHORT,
  SCHEDULE_META_KEY,
  TIME_OPTIONS,
  decodeNotes,
  encodeNotes,
  parseRoutineDays,
  timeToMinutes,
  type ScheduleKind,
  type ScheduleMeta,
} from "../schedule-model";

type Props = {
  open: boolean;
  initial: RoutineDTO | null;
  selectedDate: string;
  onOpenChange: (open: boolean) => void;
};

export function ScheduleFormPanel({ open, initial, selectedDate, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#071426]/48 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] overflow-y-auto border-l border-[var(--gold)]/55 bg-[rgba(250,243,226,0.98)] p-5 shadow-[-24px_0_70px_-36px_rgba(4,12,24,0.9)] focus:outline-none sm:p-6">
          <ScheduleForm
            key={initial?.id ?? `new-${selectedDate}`}
            initial={initial}
            selectedDate={selectedDate}
            onDone={() => onOpenChange(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ScheduleForm({ initial, selectedDate, onDone }: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const decoded = decodeNotes(initial?.notes ?? null);
  const initialMeta = decoded.meta;
  const [kind, setKind] = useState<ScheduleKind>(initialMeta?.kind ?? "recurring");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(decoded.note);
  const [date, setDate] = useState(initialMeta?.date ?? selectedDate);
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
    setDays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort((a, b) => a - b));
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

    if (initial) await update.mutateAsync({ id: initial.id, body: payload });
    else await create.mutateAsync(payload);
    onDone();
  };

  const pending = create.isPending || update.isPending;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <Dialog.Title className="font-display text-xl font-bold text-[var(--fg-strong)]">
            {editing ? "编辑日程" : "添加日程"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--fg-muted)]">
            安排会同步到时间轴，并保留现有 XP 与 Gold 奖励规则。
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button size="icon" variant="ghost" aria-label="关闭日程表单">
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>

      <div className="grid gap-5">
        <Field label="标题">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：高数课 / 晚间跑步" autoFocus />
        </Field>
        <Field label="备注">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="地点、准备材料、提醒事项..." className="min-h-24" />
        </Field>

        <Field label="安排类型">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKind("recurring")} className={kindButtonClass(kind === "recurring")}>
              <Repeat size={15} />固定周期
            </button>
            <button type="button" onClick={() => setKind("single")} className={kindButtonClass(kind === "single")}>
              <CalendarDays size={15} />单次事项
            </button>
          </div>
        </Field>

        {kind === "single" ? (
          <Field label="日期">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        ) : (
          <Field label="重复星期">
            <div className="grid grid-cols-7 gap-1">
              {DAY_SHORT.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(index)}
                  aria-pressed={days.includes(index)}
                  className={cn(
                    "h-9 rounded-sm border text-xs transition-colors",
                    days.includes(index)
                      ? "border-[var(--accent)] bg-[var(--accent-strong)] text-white"
                      : "border-[var(--border)] bg-white/60 text-[var(--fg-muted)] hover:border-[var(--gold)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="开始">
            <Select value={startTime} onChange={(event) => setStartTime(event.target.value)}>
              {TIME_OPTIONS.slice(0, -1).map((time) => <option key={time}>{time}</option>)}
            </Select>
          </Field>
          <Field label="结束">
            <Select value={endTime} onChange={(event) => setEndTime(event.target.value)}>
              {TIME_OPTIONS.slice(1).map((time) => <option key={time}>{time}</option>)}
            </Select>
          </Field>
        </div>
        {!validTime && <p className="text-xs text-[var(--danger)]">结束时间必须晚于开始时间。</p>}

        <Field label="领域"><AreaSelect value={areaId} onChange={setAreaId} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="XP"><Input type="number" min={0} value={xpReward} onChange={(event) => setXpReward(Number(event.target.value))} /></Field>
          <Field label="Gold"><Input type="number" min={0} value={goldReward} onChange={(event) => setGoldReward(Number(event.target.value))} /></Field>
        </div>

        <div className="sticky bottom-0 mt-2 flex gap-2 border-t border-[var(--border)] bg-[rgba(250,243,226,0.96)] pt-4">
          <Button variant="outline" className="flex-1" onClick={onDone}>取消</Button>
          <Button className="flex-[1.4]" onClick={submit} disabled={pending || !title.trim() || !validTime || !validDays}>
            {pending ? "保存中..." : editing ? "保存修改" : "创建日程"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function kindButtonClass(active: boolean) {
  return cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-sm border text-sm transition-colors",
    active
      ? "border-[var(--accent)] bg-[var(--accent-strong)] text-white"
      : "border-[var(--border)] bg-white/60 text-[var(--fg-muted)] hover:border-[var(--gold)]",
  );
}
