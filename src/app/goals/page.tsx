"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Check, Edit3, Target, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useUpdateKR,
} from "@/hooks/queries";
import type { GoalDTO, KeyResultDTO } from "@/lib/types";

const STATUS_LABEL: Record<GoalDTO["status"], string> = {
  active: "进行中",
  done: "已完成",
  paused: "暂停",
  archived: "归档",
};

const TIMEFRAME_PRESETS = (() => {
  const y = new Date().getFullYear();
  const q = Math.floor(new Date().getMonth() / 3) + 1;
  return [
    `Q${q}-${y}`,
    `Q${(q % 4) + 1}-${q === 4 ? y + 1 : y}`,
    `Year-${y}`,
    `Year-${y + 1}`,
  ];
})();

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"active" | "done" | "all">("active");

  const filtered = (goals ?? []).filter((g) =>
    filter === "all" ? true : g.status === filter
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">人生目标</span>
            <span className="en text-[11px]">Goals · OKR</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-xl text-sm text-[var(--fg-muted)]">
            Objective + Key Results · 季度/年度长程目标。完成 OKR 解锁大额奖励。
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "New Goal"}
        </Button>
      </div>

      <div className="flex gap-2">
        {(["active", "done", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "outline"}
            onClick={() => setFilter(f)}
          >
            {STATUS_LABEL[f as GoalDTO["status"]] ?? "全部"}
          </Button>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NewGoalForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          尚无目标。<Link href="#" onClick={() => setShowForm(true)} className="link-gold">立即创建一个 →</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewGoalForm({ onDone }: { onDone: () => void }) {
  const create = useCreateGoal();
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(TIMEFRAME_PRESETS[0]);
  const [krs, setKrs] = useState<{ description: string; target: number; unit: string }[]>([
    { description: "", target: 1, unit: "次" },
  ]);

  const submit = async () => {
    if (!objective.trim()) return;
    const validKRs = krs
      .filter((k) => k.description.trim())
      .map((k) => ({
        description: k.description.trim(),
        target: k.target,
        unit: k.unit,
        current: 0,
      }));
    await create.mutateAsync({
      objective: objective.trim(),
      notes: notes.trim() || null,
      areaId,
      timeframe,
      keyResults: validKRs,
    });
    onDone();
  };

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">创建目标</span>
        <span className="en text-[10px]">New OKR</span>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Objective</Label>
          <Input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g. 成为一名能独立发布产品的全栈开发者"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Life Area</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className="grid gap-1.5">
            <Label>Timeframe</Label>
            <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              {TIMEFRAME_PRESETS.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why this matters · 关联的身份陈述"
            rows={2}
          />
        </div>
        <div>
          <Label>Key Results</Label>
          <div className="mt-2 space-y-2">
            {krs.map((kr, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-display-en text-[10px] text-[var(--gold-deep)]">
                  KR{i + 1}
                </span>
                <Input
                  value={kr.description}
                  onChange={(e) => {
                    const next = [...krs];
                    next[i] = { ...next[i], description: e.target.value };
                    setKrs(next);
                  }}
                  placeholder="e.g. 完成 1 个上线的全栈项目"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  value={kr.target}
                  onChange={(e) => {
                    const next = [...krs];
                    next[i] = { ...next[i], target: Number(e.target.value) };
                    setKrs(next);
                  }}
                  className="w-20"
                />
                <Input
                  value={kr.unit}
                  onChange={(e) => {
                    const next = [...krs];
                    next[i] = { ...next[i], unit: e.target.value };
                    setKrs(next);
                  }}
                  placeholder="次/篇/小时"
                  className="w-20"
                />
                {krs.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setKrs(krs.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
            {krs.length < 5 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setKrs([...krs, { description: "", target: 1, unit: "次" }])
                }
              >
                <Plus size={14} /> Add KR
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !objective.trim()}>
            {create.isPending ? "Saving…" : "Create Goal"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalDTO }) {
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const updateKR = useUpdateKR();
  const [editing, setEditing] = useState(false);

  const totalProgress =
    goal.keyResults.length > 0
      ? goal.keyResults.reduce(
          (s, k) => s + Math.min(1, k.target > 0 ? k.current / k.target : 0),
          0
        ) / goal.keyResults.length
      : 0;
  const isDone = goal.status === "done";
  const isActive = goal.status === "active";

  if (editing) {
    return (
      <div className="panel-cream framed rounded-sm p-5 ring-2 ring-[var(--gold)]/40">
        <GoalEditForm goal={goal} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={`panel-cream framed group rounded-sm p-5 ${isDone ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Target size={14} className="shrink-0 text-[var(--gold-deep)]" />
            <span className="chip-gold">{goal.timeframe}</span>
            {goal.area && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                {goal.area.icon} {goal.area.name}
              </span>
            )}
            <span
              className={`rounded-sm px-1.5 text-[10px] uppercase tracking-widest ${
                isDone
                  ? "bg-[var(--success)]/15 text-[var(--success)]"
                  : isActive
                  ? "bg-[var(--gold-tint)] text-[var(--gold-deep)]"
                  : "bg-[var(--bg-elevated)] text-[var(--fg-muted)]"
              }`}
            >
              {STATUS_LABEL[goal.status]}
            </span>
          </div>
          <h3 className={`mt-2 font-display text-[17px] font-bold leading-snug ${isDone ? "line-through" : "text-[var(--fg-strong)]"}`}>
            {goal.objective}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isDone && (
            <Button
              size="icon"
              variant="primary"
              title="Mark complete"
              onClick={() => update.mutate({ id: goal.id, body: { status: "done" } })}
              disabled={update.isPending}
            >
              <Check size={14} />
            </Button>
          )}
          {!isDone && (
            <Button
              size="icon"
              variant="ghost"
              title="Edit"
              onClick={() => setEditing(true)}
            >
              <Edit3 size={14} />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            onClick={() => {
              if (confirm("Delete this goal?")) remove.mutate(goal.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[10px]">
          <span className="font-display-en uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            Progress
          </span>
          <span className="font-mono text-[var(--gold-deep)]">
            {Math.round(totalProgress * 100)}%
          </span>
        </div>
        <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${totalProgress * 100}%`,
              background: "linear-gradient(90deg, var(--gold-deep), var(--gold-bright))",
            }}
          />
        </div>
      </div>

      {/* KRs */}
      <ul className="mt-3 space-y-2">
        {goal.keyResults.map((kr, i) => (
          <KRRow
            key={kr.id}
            kr={kr}
            label={`KR${i + 1}`}
            onUpdate={(current) =>
              updateKR.mutate({ goalId: goal.id, krId: kr.id, body: { current } })
            }
            disabled={isDone}
          />
        ))}
      </ul>

      {/* Confidence slider */}
      {!isDone && (
        <div className="mt-3 flex items-center gap-3 border-t border-[var(--border)] pt-3">
          <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            Confidence
          </span>
          <input
            type="range"
            min={1}
            max={10}
            value={goal.confidence}
            onChange={(e) =>
              update.mutate({
                id: goal.id,
                body: { confidence: Number(e.target.value) },
              })
            }
            className="flex-1 accent-[var(--gold)]"
          />
          <span className="font-mono text-sm font-bold text-[var(--gold-deep)]">{goal.confidence}/10</span>
        </div>
      )}

      {/* Linked projects */}
      {goal.projects.length > 0 && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            Linked Projects · {goal.projects.length}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {goal.projects.map((p) => (
              <Link
                key={p.id}
                href="/projects"
                className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] px-2 py-0.5 text-[11px] hover:border-[var(--gold)]"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KRRow({
  kr,
  label,
  onUpdate,
  disabled,
}: {
  kr: KeyResultDTO;
  label: string;
  onUpdate: (current: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(kr.current);
  const progress = kr.target > 0 ? Math.min(1, kr.current / kr.target) : 0;

  return (
    <li className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] p-2.5">
      <div className="flex items-center gap-2">
        <span className="font-display-en text-[10px] font-bold text-[var(--gold-deep)]">
          {label}
        </span>
        <span className="flex-1 font-display text-[13px] text-[var(--fg-strong)]">
          {kr.description}
        </span>
        {editing ? (
          <>
            <Input
              type="number"
              min={0}
              max={kr.target}
              value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              className="w-16 text-xs"
            />
            <Button
              size="icon"
              variant="primary"
              onClick={() => {
                onUpdate(val);
                setEditing(false);
              }}
            >
              <Check size={12} />
            </Button>
          </>
        ) : (
          <>
            <span className="font-mono text-[11px] text-[var(--fg)]">
              {kr.current}/{kr.target} {kr.unit ?? ""}
            </span>
            {!disabled && (
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)} title="Edit">
                <Edit3 size={12} />
              </Button>
            )}
          </>
        )}
      </div>
      <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, var(--success), #8bc7a4)",
          }}
        />
      </div>
    </li>
  );
}

function GoalEditForm({ goal, onDone }: { goal: GoalDTO; onDone: () => void }) {
  const update = useUpdateGoal();
  const [objective, setObjective] = useState(goal.objective);
  const [notes, setNotes] = useState(goal.notes ?? "");
  const [areaId, setAreaId] = useState<string | null>(goal.areaId ?? null);
  const [timeframe, setTimeframe] = useState(goal.timeframe);
  const [confidence, setConfidence] = useState(goal.confidence ?? 5);

  // Allow user to keep current timeframe even if not in presets
  const timeframeOptions = TIMEFRAME_PRESETS.includes(timeframe)
    ? TIMEFRAME_PRESETS
    : [timeframe, ...TIMEFRAME_PRESETS];

  const submit = async () => {
    if (!objective.trim()) return;
    await update.mutateAsync({
      id: goal.id,
      body: {
        objective: objective.trim(),
        notes: notes.trim() || null,
        areaId,
        timeframe,
        confidence,
      },
    });
    onDone();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="section-label">
          <span className="cn text-sm">编辑目标</span>
          <span className="en text-[10px]">Edit Goal</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onDone} title="Cancel">
          <X size={14} />
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label>Objective</Label>
        <Input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Life Area</Label>
          <AreaSelect value={areaId} onChange={setAreaId} />
        </div>
        <div className="grid gap-1.5">
          <Label>Timeframe</Label>
          <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {timeframeOptions.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="grid gap-1.5">
        <Label>Confidence (1-10): {confidence}</Label>
        <Input
          type="range"
          min={1}
          max={10}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
        />
      </div>
      <p className="text-[11px] text-[var(--fg-subtle)]">
        KR 在卡片里直接点 ✏️ 编辑（这里只改目标本身的字段）。
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={update.isPending || !objective.trim()}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
