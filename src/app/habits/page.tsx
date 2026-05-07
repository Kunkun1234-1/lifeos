"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Flame, Minus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AreaSelect } from "@/components/area-select";
import { useHabits, useCreateHabit, useTickHabit, useDeleteHabit } from "@/hooks/queries";

export default function HabitsPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: habits, isLoading } = useHabits();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Behaviors to cultivate (+) or cut (−). Tap to track.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "New Habit"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <HabitForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
          ) : (habits?.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--fg-muted)]">
              No habits yet. Create one above.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits!.map((h) => (
                <HabitRow key={h.id} habit={h} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HabitForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"positive" | "negative" | "both">("positive");
  const [xpPerTick, setXpPerTick] = useState(5);
  const [goldPerTick, setGoldPerTick] = useState(2);

  const create = useCreateHabit();

  const submit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      notes: notes.trim() || null,
      areaId,
      direction,
      xpPerTick,
      goldPerTick,
    });
    onDone();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Habit</CardTitle>
        <CardDescription>
          Positive (to cultivate), Negative (to cut), or Both (two-way toggle).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Drink 2L water"
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
            <Label>Direction</Label>
            <Select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "positive" | "negative" | "both")}
            >
              <option value="positive">Positive — cultivate (+)</option>
              <option value="negative">Negative — cut (−)</option>
              <option value="both">Both — toggleable</option>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>XP per tick</Label>
            <Input
              type="number"
              min={0}
              value={xpPerTick}
              onChange={(e) => setXpPerTick(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Gold per tick</Label>
            <Input
              type="number"
              min={0}
              value={goldPerTick}
              onChange={(e) => setGoldPerTick(Number(e.target.value))}
            />
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

function HabitRow({
  habit,
}: {
  habit: {
    id: string;
    title: string;
    direction: "positive" | "negative" | "both";
    positiveCount: number;
    negativeCount: number;
    xpPerTick: number;
    goldPerTick: number;
    area: { name: string; icon: string } | null;
  };
}) {
  const tick = useTickHabit();
  const remove = useDeleteHabit();
  const canPlus = habit.direction !== "negative";
  const canMinus = habit.direction !== "positive";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 px-4 py-3 hover:border-[var(--accent)]/60 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{habit.title}</span>
          <Badge tone="accent">
            <Flame size={10} /> {habit.positiveCount}
            {habit.negativeCount > 0 ? ` · −${habit.negativeCount}` : ""}
          </Badge>
        </div>
        <div className="text-xs text-[var(--fg-subtle)]">
          {habit.area ? `${habit.area.icon} ${habit.area.name}` : "No area"} ·
          +{habit.xpPerTick}xp / +{habit.goldPerTick}⭐
        </div>
      </div>
      <div className="flex items-center gap-1">
        {canMinus && (
          <Button
            size="icon"
            variant="outline"
            disabled={tick.isPending}
            onClick={() => tick.mutate({ id: habit.id, direction: "-" })}
            title="Negative tick"
            className="border-[var(--danger)]/40 text-[var(--danger)]"
          >
            <Minus size={16} />
          </Button>
        )}
        {canPlus && (
          <Button
            size="icon"
            variant="primary"
            disabled={tick.isPending}
            onClick={() => tick.mutate({ id: habit.id, direction: "+" })}
            title="Positive tick"
          >
            <Plus size={16} />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (confirm(`Archive habit "${habit.title}"? History will be kept.`)) remove.mutate(habit.id);
          }}
          title="Archive"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </li>
  );
}
