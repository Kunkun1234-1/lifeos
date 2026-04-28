"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Check, Trash2, List, Grid2x2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AreaSelect } from "@/components/area-select";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "@/hooks/queries";
import type { TaskDTO } from "@/lib/types";

type View = "list" | "matrix";

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "TODO" | "DONE">("TODO");
  const [view, setView] = useState<View>("list");
  const { data: tasks, isLoading } = useTasks(filter === "all" ? undefined : filter);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-[var(--fg-muted)]">One-shot items with a clear finish line.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-sm border border-[var(--border)]">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === "list" ? "bg-[var(--gold-tint)] text-[var(--gold-deep)]" : "text-[var(--fg-muted)] hover:bg-[var(--bg-raised)]"
              }`}
            >
              <List size={12} /> 列表
            </button>
            <button
              onClick={() => setView("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === "matrix" ? "bg-[var(--gold-tint)] text-[var(--gold-deep)]" : "text-[var(--fg-muted)] hover:bg-[var(--bg-raised)]"
              }`}
            >
              <Grid2x2 size={12} /> Eisenhower
            </button>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {showForm ? "Close" : "New Task"}
          </Button>
        </div>
      </div>

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

      {view === "list" && (
        <div className="flex gap-2">
          {(["TODO", "DONE", "all"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "primary" : "ghost"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "TODO" ? "Open" : "Done"}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : view === "matrix" ? (
        <EisenhowerMatrix tasks={(tasks ?? []).filter((t) => t.status === "TODO")} />
      ) : (
        <Card>
          <CardContent className="pt-5">
            {(tasks?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--fg-muted)]">
                No tasks. Create one above.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {tasks!.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- Eisenhower Matrix ---------- */

type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";

function classify(t: TaskDTO): Quadrant {
  const important = t.priority === 1;
  const urgent = isUrgent(t.dueDate);
  if (important && urgent) return "Q1";
  if (important && !urgent) return "Q2";
  if (!important && urgent) return "Q3";
  return "Q4";
}

function isUrgent(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return due - now <= threeDays;
}

const QUADRANT_META: Record<Quadrant, { cn: string; en: string; verb: string; tone: string; chip: string }> = {
  Q1: { cn: "立即做", en: "Q1 · Crisis",   verb: "Do First",  tone: "border-[var(--danger)]/60 bg-[var(--danger)]/8", chip: "bg-[var(--danger)]/15 text-[var(--danger)]" },
  Q2: { cn: "排时间", en: "Q2 · Strategy", verb: "Schedule",  tone: "border-[var(--gold)] bg-[var(--gold-tint)]/30",   chip: "bg-[var(--gold-tint)] text-[var(--gold-deep)]" },
  Q3: { cn: "委托",   en: "Q3 · Noise",    verb: "Delegate",  tone: "border-[#3a6b8e]/40 bg-[#3a6b8e]/5",              chip: "bg-[#3a6b8e]/15 text-[#3a6b8e]" },
  Q4: { cn: "舍弃",   en: "Q4 · Waste",    verb: "Eliminate", tone: "border-[var(--border)] bg-[var(--bg-page)]",      chip: "bg-[var(--bg-elevated)] text-[var(--fg-muted)]" },
};

function EisenhowerMatrix({ tasks }: { tasks: TaskDTO[] }) {
  const grouped = useMemo(() => {
    const buckets: Record<Quadrant, TaskDTO[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    for (const t of tasks) buckets[classify(t)].push(t);
    return buckets;
  }, [tasks]);

  return (
    <div>
      {/* Axis labels */}
      <div className="mb-2 grid grid-cols-[120px_1fr_1fr] gap-3 text-[10px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
        <div></div>
        <div className="text-center">▲ 紧急 · Urgent</div>
        <div className="text-center">不紧急 · Not Urgent</div>
      </div>
      <div className="grid grid-cols-[120px_1fr_1fr] gap-3">
        <div className="flex items-center justify-end pr-2 text-[10px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
          重要 · Important ▶
        </div>
        <Quadrant tasks={grouped.Q1} q="Q1" />
        <Quadrant tasks={grouped.Q2} q="Q2" />

        <div className="flex items-center justify-end pr-2 text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
          不重要 · Not Important ▶
        </div>
        <Quadrant tasks={grouped.Q3} q="Q3" />
        <Quadrant tasks={grouped.Q4} q="Q4" />
      </div>
      <p className="mt-3 text-center text-[10px] text-[var(--fg-subtle)]">
        紧急 = 截止日期在 3 天内 (含逾期) · 重要 = 优先级 = High
      </p>
    </div>
  );
}

function Quadrant({ tasks, q }: { tasks: TaskDTO[]; q: Quadrant }) {
  const meta = QUADRANT_META[q];
  return (
    <div className={`min-h-[200px] rounded-sm border-2 p-3 ${meta.tone}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="font-display text-sm font-bold text-[var(--fg-strong)]">
            {meta.cn} <span className="text-[10px] font-normal text-[var(--fg-muted)]">· {meta.verb}</span>
          </div>
          <div className="font-display-en text-[9px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            {meta.en}
          </div>
        </div>
        <span className={`rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${meta.chip}`}>
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-[12px] italic text-[var(--fg-subtle)]">— empty —</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <MatrixRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MatrixRow({ task }: { task: TaskDTO }) {
  const complete = useCompleteTask();
  return (
    <li className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/80 p-2 text-[12px]">
      <button
        onClick={() => complete.mutate(task.id)}
        disabled={complete.isPending}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--border-strong)] hover:border-[var(--gold)]"
        title="Mark done"
      >
        <Check size={11} />
      </button>
      <span className="min-w-0 flex-1 truncate font-display text-[var(--fg-strong)]">{task.title}</span>
      {task.dueDate && (
        <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
          {new Date(task.dueDate).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
        </span>
      )}
      {task.area && <span className="text-[12px]">{task.area.icon}</span>}
    </li>
  );
}

function TaskForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
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
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      xpReward,
      goldReward,
    });
    onDone();
  };

  return (
    <Card>
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
            {create.isPending ? "Saving…" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const PRIORITY_LABEL = ["", "High", "Normal", "Low"];

function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    status: string;
    priority: number;
    dueDate: string | null;
    xpReward: number;
    goldReward: number;
    area: { name: string; icon: string } | null;
  };
}) {
  const done = task.status === "DONE";
  const complete = useCompleteTask();
  const remove = useDeleteTask();

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 px-4 py-3 transition-all ${
        done ? "opacity-60" : "hover:border-[var(--accent)]"
      }`}
    >
      <Button
        size="icon"
        variant={done ? "secondary" : "outline"}
        disabled={done || complete.isPending}
        onClick={() => complete.mutate(task.id)}
        title="Mark done"
      >
        <Check size={14} />
      </Button>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${done ? "line-through" : ""}`}>
          {task.title}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-subtle)]">
          {task.area && (
            <span>
              {task.area.icon} {task.area.name}
            </span>
          )}
          <Badge tone={task.priority === 1 ? "danger" : "default"} className="text-[10px]">
            {PRIORITY_LABEL[task.priority]}
          </Badge>
          {task.dueDate && <span>due {new Date(task.dueDate).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-[var(--accent-glow)]">+{task.xpReward}xp</span>
        <span className="font-mono text-[var(--attr-gold)]">+{task.goldReward}⭐</span>
      </div>
      <Button size="icon" variant="ghost" onClick={() => remove.mutate(task.id)} title="Delete">
        <Trash2 size={14} />
      </Button>
    </li>
  );
}
