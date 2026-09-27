"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Repeat, Trash2, X } from "lucide-react";
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
  onDelete: (routine: RoutineDTO) => Promise<void>;
  deletePending: boolean;
};

export function ScheduleFormPanel({ open, initial, selectedDate, onOpenChange, onDelete, deletePending }: Props) {
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const setDirty = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);
  const setSaving = useCallback((saving: boolean) => { savingRef.current = saving; }, []);
  const requestClose = () => {
    if (savingRef.current || deletePending) return;
    if (dirtyRef.current && !window.confirm("日程还有未保存的修改。要放弃这些修改吗？")) return;
    onOpenChange(false);
  };
  return (
    <Dialog.Root open={open} onOpenChange={(next) => next ? onOpenChange(true) : requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#071426]/48 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] overflow-y-auto border-l border-[var(--gold)]/55 bg-[rgba(250,243,226,0.98)] p-5 shadow-[-24px_0_70px_-36px_rgba(4,12,24,0.9)] focus:outline-none sm:p-6">
          <ScheduleForm
            key={initial?.id ?? `new-${selectedDate}`}
            initial={initial}
            selectedDate={selectedDate}
            onDone={() => onOpenChange(false)}
            onCancel={requestClose}
            onDirtyChange={setDirty}
            onSavingChange={setSaving}
            onDelete={onDelete}
            deletePending={deletePending}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ScheduleForm({
  initial,
  selectedDate,
  onDone,
  onCancel,
  onDirtyChange,
  onSavingChange,
  onDelete,
  deletePending,
}: Omit<Props, "open" | "onOpenChange"> & {
  onDone: () => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const decoded = decodeNotes(initial?.notes ?? null);
  const initialMeta = decoded.meta;
  const [kind, setKind] = useState<ScheduleKind>(initialMeta?.kind ?? "single");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(decoded.note);
  const [date, setDate] = useState(initialMeta?.date ?? selectedDate);
  const [days, setDays] = useState<number[]>(parseRoutineDays(initial?.daysOfWeek));
  const [startTime, setStartTime] = useState(initialMeta?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initialMeta?.endTime ?? "10:00");
  const [areaId, setAreaId] = useState<string | null>(initial?.areaId ?? null);
  const [xpReward, setXpReward] = useState(initial?.xpReward ?? 10);
  const [goldReward, setGoldReward] = useState(initial?.goldReward ?? 5);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateRoutine();
  const update = useUpdateRoutine();
  const editing = Boolean(initial);
  const [moreOpen, setMoreOpen] = useState(editing);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const validTime = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
  const validDays = kind === "single" || days.length > 0;
  const validDate = kind !== "single" || /^\d{4}-\d{2}-\d{2}$/.test(date);
  const pending = create.isPending || update.isPending;
  const dirty = kind !== (initialMeta?.kind ?? "single")
    || title !== (initial?.title ?? "")
    || note !== decoded.note
    || date !== (initialMeta?.date ?? selectedDate)
    || days.join(",") !== parseRoutineDays(initial?.daysOfWeek).join(",")
    || startTime !== (initialMeta?.startTime ?? "09:00")
    || endTime !== (initialMeta?.endTime ?? "10:00")
    || areaId !== (initial?.areaId ?? null)
    || xpReward !== (initial?.xpReward ?? 10)
    || goldReward !== (initial?.goldReward ?? 5);

  useLayoutEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useLayoutEffect(() => {
    onSavingChange(pending);
    return () => onSavingChange(false);
  }, [pending, onSavingChange]);

  const toggleDay = (day: number) => {
    setDays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort((a, b) => a - b));
  };

  const submit = async () => {
    if (!title.trim() || !validTime || !validDays || !validDate || pending) return;
    setError(null);
    const meta: ScheduleMeta = {
      [SCHEDULE_META_KEY]: true,
      purpose: "calendar",
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

    try {
      if (initial) await update.mutateAsync({ id: initial.id, body: payload });
      else await create.mutateAsync(payload);
      onDone();
    } catch {
      setError("保存失败，你填写的内容仍然保留，请检查网络后重试。");
    }
  };

  const remove = async () => {
    if (!initial) return;
    setError(null);
    try {
      await onDelete(initial);
    } catch {
      setError("删除失败，日程仍然保留，请稍后重试。");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <Dialog.Title className="font-display text-xl font-bold text-[var(--fg-strong)]">
            {editing ? "编辑日程" : "添加日程"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--fg-muted)]">
            为课程、会议和重要事项安排时间。每日重复行动可在“习惯追踪”中管理。
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button size="icon" variant="ghost" aria-label="关闭日程表单" disabled={pending || deletePending}>
            <X size={18} />
          </Button>
        </Dialog.Close>
      </div>

      <fieldset className="m-0 grid min-w-0 gap-5 border-0 p-0" disabled={pending || deletePending}>
        <Field label="标题">
          <Input aria-label="日程标题" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：高数课 / 项目答辩 / 论文截止" autoFocus />
        </Field>

        <Field label="安排类型">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={kind === "recurring"} onClick={() => setKind("recurring")} className={kindButtonClass(kind === "recurring")}>
              <Repeat size={15} />固定周期
            </button>
            <button type="button" aria-pressed={kind === "single"} onClick={() => setKind("single")} className={kindButtonClass(kind === "single")}>
              <CalendarDays size={15} />单次事项
            </button>
          </div>
        </Field>

        {kind === "single" ? (
          <Field label="日期">
            <Input aria-label="日程日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
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
            <Select aria-label="开始时间" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
              {TIME_OPTIONS.slice(0, -1).map((time) => <option key={time}>{time}</option>)}
            </Select>
          </Field>
          <Field label="结束">
            <Select aria-label="结束时间" value={endTime} onChange={(event) => setEndTime(event.target.value)}>
              {TIME_OPTIONS.slice(1).map((time) => <option key={time}>{time}</option>)}
            </Select>
          </Field>
        </div>
        {!validTime && <p className="text-xs text-[var(--danger)]">结束时间必须晚于开始时间。</p>}
        {!validDays && <p className="text-xs text-[var(--danger)]">请选择至少一个重复星期。</p>}
        {!validDate && <p className="text-xs text-[var(--danger)]">请选择日程日期。</p>}

        <details className="rounded-lg border border-[var(--border)] p-3" open={moreOpen} onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold text-[var(--fg-strong)]">更多设置 · 备注、领域与奖励</summary>
          <div className="mt-4 grid gap-4">
            <Field label="备注">
              <Textarea aria-label="日程备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder="地点、准备材料、提醒事项..." className="min-h-24" />
            </Field>
            <Field label="领域"><AreaSelect value={areaId} onChange={setAreaId} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="经验值"><Input aria-label="经验值奖励" type="number" min={0} value={xpReward} onChange={(event) => setXpReward(Number(event.target.value))} /></Field>
              <Field label="金币"><Input aria-label="金币奖励" type="number" min={0} value={goldReward} onChange={(event) => setGoldReward(Number(event.target.value))} /></Field>
            </div>
          </div>
        </details>
        {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="sticky bottom-0 mt-2 flex flex-wrap gap-2 border-t border-[var(--border)] bg-[rgba(250,243,226,0.96)] pt-4">
          {initial ? (
            <Button variant="danger" onClick={() => void remove()} disabled={pending || deletePending}>
              <Trash2 size={15} /> {deletePending ? "删除中..." : "删除日程"}
            </Button>
          ) : null}
          <Button variant="outline" className="ml-auto" onClick={onCancel} disabled={pending || deletePending}>取消</Button>
          <Button className="flex-[1.4]" onClick={submit} disabled={pending || deletePending || !title.trim() || !validTime || !validDays || !validDate}>
            {pending ? "保存中..." : editing ? "保存修改" : "创建日程"}
          </Button>
        </div>
      </fieldset>
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
