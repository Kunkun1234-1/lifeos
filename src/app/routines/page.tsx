"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Check, Trash2, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AreaSelect } from "@/components/area-select";
import {
  useRoutines,
  useCreateRoutine,
  useCompleteRoutine,
  useDeleteRoutine,
} from "@/hooks/queries";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RoutinesPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: routines, isLoading } = useRoutines();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Daily / weekly recurring — tracks streaks.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "New Routine"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <RoutineForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
          ) : (routines?.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--fg-muted)]">
              No routines yet. Create one above.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {routines!.map((r) => (
                <RoutineRow key={r.id} routine={r} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoutineForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [xpReward, setXpReward] = useState(15);
  const [goldReward, setGoldReward] = useState(8);

  const create = useCreateRoutine();

  const toggleDay = (d: number) =>
    setDays((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()));

  const submit = async () => {
    if (!title.trim() || days.length === 0) return;
    await create.mutateAsync({
      title: title.trim(),
      notes: notes.trim() || null,
      areaId,
      daysOfWeek: days,
      xpReward,
      goldReward,
    });
    onDone();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Routine</CardTitle>
        <CardDescription>A recurring daily beat — builds streaks.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 30min morning reading"
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Days of Week</Label>
          <div className="flex gap-2">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex h-9 w-12 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  days.includes(i)
                    ? "bg-[var(--accent-strong)] text-white shadow-[0_0_12px_-2px_var(--accent)]"
                    : "bg-[var(--bg-raised)] text-[var(--fg-muted)] shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Life Area</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
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
          <Button
            onClick={submit}
            disabled={create.isPending || !title.trim() || days.length === 0}
          >
            {create.isPending ? "Saving…" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function streakEmoji(streak: number) {
  if (streak >= 100) return "👑";
  if (streak >= 30) return "🌟";
  if (streak >= 7) return "🔥🔥";
  if (streak >= 3) return "🔥";
  return "·";
}

function RoutineRow({
  routine,
}: {
  routine: {
    id: string;
    title: string;
    daysOfWeek: string;
    xpReward: number;
    goldReward: number;
    streakCurrent: number;
    streakBest: number;
    completedToday: boolean;
    area: { name: string; icon: string } | null;
  };
}) {
  const complete = useCompleteRoutine();
  const remove = useDeleteRoutine();
  let days: number[] = [0, 1, 2, 3, 4, 5, 6];
  try {
    days = JSON.parse(routine.daysOfWeek) as number[];
  } catch {}

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        routine.completedToday
          ? "border-[var(--success)]/50 bg-[var(--success)]/5"
          : "border-[var(--border)] bg-[var(--bg-raised)]/40 hover:border-[var(--accent)]/60"
      }`}
    >
      <Button
        size="icon"
        variant={routine.completedToday ? "secondary" : "primary"}
        disabled={routine.completedToday || complete.isPending}
        onClick={() => complete.mutate(routine.id)}
        title={routine.completedToday ? "Done today" : "Complete today"}
      >
        <Check size={16} />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{routine.title}</span>
          <Badge tone={routine.streakCurrent > 0 ? "accent" : "default"}>
            <Flame size={10} /> {streakEmoji(routine.streakCurrent)} {routine.streakCurrent}
          </Badge>
        </div>
        <div className="text-xs text-[var(--fg-subtle)]">
          {routine.area ? `${routine.area.icon} ${routine.area.name} · ` : ""}
          {days.map((d) => DAY_LABELS[d]).join(" ")} · Best {routine.streakBest}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono text-[var(--accent-glow)]">+{routine.xpReward}xp</span>
        <span className="font-mono text-[var(--attr-gold)]">+{routine.goldReward}⭐</span>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          if (confirm(`Archive routine "${routine.title}"? Streak history will be kept.`)) remove.mutate(routine.id);
        }}
        title="Archive"
      >
        <Trash2 size={14} />
      </Button>
    </li>
  );
}
