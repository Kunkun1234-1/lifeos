"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Check, Pause, Play, Hammer, Pencil, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useGoals,
} from "@/hooks/queries";
import type { ProjectDTO } from "@/lib/types";

const STATUS_LABEL: Record<ProjectDTO["status"], string> = {
  idea: "构想",
  active: "进行中",
  paused: "暂停",
  done: "完成",
  archived: "归档",
};

const STATUS_TONE: Record<ProjectDTO["status"], string> = {
  idea: "bg-[var(--bg-elevated)] text-[var(--fg-muted)]",
  active: "bg-[var(--gold-tint)] text-[var(--gold-deep)]",
  paused: "bg-[var(--warning)]/15 text-[var(--warning)]",
  done: "bg-[var(--success)]/15 text-[var(--success)]",
  archived: "bg-[var(--bg-elevated)] text-[var(--fg-subtle)]",
};

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"active" | "all" | "done">("active");

  const filtered = (projects ?? []).filter((p) =>
    filter === "all" ? true : p.status === filter
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">项目</span>
            <span className="en text-[11px]">Projects · PARA-P</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-xl text-sm text-[var(--fg-muted)]">
            有终点、有产出的短期努力。挂接到 Area / Goal，下挂多个 Task。
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "New Project"}
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
            {f === "all" ? "全部" : STATUS_LABEL[f]}
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
            <NewProjectForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          尚无项目。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const create = useCreateProject();
  const { data: goals } = useGoals();
  const [title, setTitle] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [xpReward, setXpReward] = useState(100);
  const [goldReward, setGoldReward] = useState(40);
  const [gemsReward, setGemsReward] = useState(1);

  const submit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      deliverable: deliverable.trim() || null,
      areaId,
      goalId,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      xpReward,
      goldReward,
      gemsReward,
    });
    onDone();
  };

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">新项目</span>
        <span className="en text-[10px]">New Project</span>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 写完个人技术博客 v1"
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Deliverable</Label>
          <Textarea
            value={deliverable}
            onChange={(e) => setDeliverable(e.target.value)}
            placeholder="What's done when done? · 交付物定义"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Area</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className="grid gap-1.5">
            <Label>Linked Goal</Label>
            <Select value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value || null)}>
              <option value="">— No goal —</option>
              {goals?.filter((g) => g.status === "active").map((g) => (
                <option key={g.id} value={g.id}>
                  {g.timeframe} · {g.objective}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Deadline (optional)</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5">
              <Label>XP</Label>
              <Input type="number" min={0} value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Gold</Label>
              <Input type="number" min={0} value={goldReward} onChange={(e) => setGoldReward(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Gems</Label>
              <Input type="number" min={0} value={gemsReward} onChange={(e) => setGemsReward(Number(e.target.value))} />
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
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectDTO }) {
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const [editing, setEditing] = useState(false);

  const isDone = project.status === "done";
  const isPaused = project.status === "paused";
  const taskProgress =
    project.taskCount > 0 ? project.taskDoneCount / project.taskCount : 0;

  if (editing) {
    return (
      <div className="panel-cream framed rounded-sm p-5 ring-2 ring-[var(--gold)]/40">
        <ProjectEditForm project={project} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={`panel-cream framed rounded-sm p-5 ${isDone ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Hammer size={14} className="shrink-0 text-[var(--gold-deep)]" />
            <span className={`rounded-sm px-1.5 text-[10px] uppercase tracking-widest ${STATUS_TONE[project.status]}`}>
              {STATUS_LABEL[project.status]}
            </span>
            {project.area && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                {project.area.icon} {project.area.name}
              </span>
            )}
          </div>
          <h3 className={`mt-2 font-display text-[16px] font-bold leading-snug ${isDone ? "line-through" : "text-[var(--fg-strong)]"}`}>
            {project.title}
          </h3>
          {project.deliverable && (
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              交付：{project.deliverable}
            </p>
          )}
          {project.goal && (
            <Link
              href="/goals"
              className="mt-1 inline-block link-gold text-[11px]"
            >
              ◇ {project.goal.objective}
            </Link>
          )}
        </div>
      </div>

      {project.taskCount > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="font-display-en uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              Tasks
            </span>
            <span className="font-mono text-[var(--fg)]">
              {project.taskDoneCount}/{project.taskCount}
            </span>
          </div>
          <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${taskProgress * 100}%`,
                background: "linear-gradient(90deg, var(--success), #8bc7a4)",
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
        <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5 text-[var(--gold-deep)]">
          +{project.xpReward}XP
        </span>
        <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5 text-[var(--attr-gold)]">
          +{project.goldReward}⭐
        </span>
        <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5 text-[var(--attr-cha)]">
          +{project.gemsReward}💎
        </span>
        {project.deadline && (
          <span className="ml-auto text-[var(--fg-muted)]">
            截至 {new Date(project.deadline).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="mt-3 flex justify-end gap-1.5 border-t border-[var(--border)] pt-3">
        {!isDone && !isPaused && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => update.mutate({ id: project.id, body: { status: "paused" } })}
          >
            <Pause size={12} /> Pause
          </Button>
        )}
        {isPaused && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => update.mutate({ id: project.id, body: { status: "active" } })}
          >
            <Play size={12} /> Resume
          </Button>
        )}
        {!isDone && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => update.mutate({ id: project.id, body: { status: "done" } })}
            disabled={update.isPending}
          >
            <Check size={12} /> Complete
          </Button>
        )}
        {!isDone && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            title="Edit"
          >
            <Pencil size={12} />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm("Delete this project?")) remove.mutate(project.id);
          }}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

function ProjectEditForm({
  project,
  onDone,
}: {
  project: ProjectDTO;
  onDone: () => void;
}) {
  const update = useUpdateProject();
  const { data: goals } = useGoals();
  const [title, setTitle] = useState(project.title);
  const [deliverable, setDeliverable] = useState(project.deliverable ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [areaId, setAreaId] = useState<string | null>(project.areaId ?? null);
  const [goalId, setGoalId] = useState<string | null>(project.goalId ?? null);
  const [deadline, setDeadline] = useState(
    project.deadline ? project.deadline.slice(0, 10) : "",
  );
  const [xpReward, setXpReward] = useState(project.xpReward);
  const [goldReward, setGoldReward] = useState(project.goldReward);
  const [gemsReward, setGemsReward] = useState(project.gemsReward);

  const submit = async () => {
    if (!title.trim()) return;
    await update.mutateAsync({
      id: project.id,
      body: {
        title: title.trim(),
        deliverable: deliverable.trim() || null,
        notes: notes.trim() || null,
        areaId,
        goalId,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        xpReward,
        goldReward,
        gemsReward,
      },
    });
    onDone();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="section-label">
          <span className="cn text-sm">编辑项目</span>
          <span className="en text-[10px]">Edit Project</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onDone} title="Cancel">
          <X size={14} />
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label>Deliverable</Label>
        <Textarea
          value={deliverable}
          onChange={(e) => setDeliverable(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Area</Label>
          <AreaSelect value={areaId} onChange={setAreaId} />
        </div>
        <div className="grid gap-1.5">
          <Label>Linked Goal</Label>
          <Select value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value || null)}>
            <option value="">— No goal —</option>
            {goals?.filter((g) => g.status === "active" || g.id === goalId).map((g) => (
              <option key={g.id} value={g.id}>
                {g.timeframe} · {g.objective}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Deadline</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1.5">
            <Label>XP</Label>
            <Input type="number" min={0} value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Gold</Label>
            <Input type="number" min={0} value={goldReward} onChange={(e) => setGoldReward(Number(e.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Gems</Label>
            <Input type="number" min={0} value={gemsReward} onChange={(e) => setGemsReward(Number(e.target.value))} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={update.isPending || !title.trim()}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
