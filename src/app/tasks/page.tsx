"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Check, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AreaSelect } from "@/components/area-select";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "@/hooks/queries";

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "TODO" | "DONE">("TODO");
  const { data: tasks, isLoading } = useTasks(filter === "all" ? undefined : filter);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-[var(--fg-muted)]">One-shot items with a clear finish line.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "New Task"}
        </Button>
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

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
          ) : (tasks?.length ?? 0) === 0 ? (
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
    </div>
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
