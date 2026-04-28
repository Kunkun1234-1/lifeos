"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Target, Hammer, CheckSquare, Compass } from "lucide-react";
import { useUser, useAreas, useGoals, useProjects, useTasks } from "@/hooks/queries";
import type { GoalDTO, ProjectDTO, TaskDTO, AreaDTO } from "@/lib/types";

/**
 * Strategy view — Vision → Areas → Goals → Projects → Tasks (hierarchical tree).
 * Per design doc §7.1.
 */
export default function StrategyPage() {
  const { data: user } = useUser();
  const { data: areas } = useAreas();
  const { data: goals } = useGoals();
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">战略全景</span>
          <span className="en text-[11px]">Strategy</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          身份愿景 → 领域 → OKR 目标 → 项目 → 任务，自上而下的因果链。
        </p>
      </div>

      {/* Vision */}
      <div className="panel-cream framed rounded-sm p-5">
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-[var(--gold-deep)]" />
          <span className="section-label">
            <span className="cn text-base">愿景与身份</span>
            <span className="en text-[10px]">Vision &amp; Identity</span>
          </span>
        </div>
        <blockquote className="mt-3 border-l-2 border-[var(--gold)] pl-4 font-display text-[15px] leading-relaxed text-[var(--fg-strong)]">
          {user?.visionStatement ?? "（尚未设定愿景，前往 设置 → Vision &amp; Identity 填写）"}
        </blockquote>
        {user?.identityStatements && user.identityStatements.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.identityStatements.map((s, i) => (
              <li
                key={i}
                className="rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] px-2 py-0.5 font-display text-[11px] text-[var(--gold-deep)]"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tree */}
      <div className="space-y-3">
        {areas?.map((area) => {
          const areaGoals = goals?.filter((g) => g.areaId === area.id) ?? [];
          const areaProjects = projects?.filter((p) => p.areaId === area.id) ?? [];
          const areaTasks = tasks?.filter((t) => t.area?.id === area.id) ?? [];
          return (
            <AreaTreeNode
              key={area.id}
              area={area}
              goals={areaGoals}
              projects={areaProjects}
              tasks={areaTasks}
            />
          );
        })}
      </div>
    </div>
  );
}

function AreaTreeNode({
  area,
  goals,
  projects,
  tasks,
}: {
  area: AreaDTO;
  goals: GoalDTO[];
  projects: ProjectDTO[];
  tasks: TaskDTO[];
}) {
  const [open, setOpen] = useState(true);
  const orphanProjects = projects.filter((p) => !p.goalId);
  const orphanTasks = tasks.filter((t) => !t.area || !goals.some((g) => g.projects.some((pg) => false)));

  return (
    <div className="panel-cream framed rounded-sm p-4">
      <button
        type="button"
        className="flex w-full items-center gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="text-xl">{area.icon}</span>
        <span className="font-display text-[15px] font-bold text-[var(--fg-strong)]">
          {area.name}
        </span>
        <span className="font-display-en text-[9px] tracking-[0.2em] text-[var(--gold-deep)]">
          {area.attributeKey}
        </span>
        <span className="ml-auto text-[10px] text-[var(--fg-muted)]">
          {goals.length} 目标 · {projects.length} 项目 · {tasks.length} 任务
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-l border-[var(--gold)]/40 pl-4">
          {goals.map((g) => (
            <GoalNode key={g.id} goal={g} projects={projects.filter((p) => p.goalId === g.id)} tasks={tasks} />
          ))}

          {orphanProjects.length > 0 && (
            <div>
              <div className="font-display-en text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                · Projects without Goal
              </div>
              <div className="mt-1 space-y-1">
                {orphanProjects.map((p) => (
                  <ProjectNode key={p.id} project={p} tasks={tasks.filter((t) => false)} />
                ))}
              </div>
            </div>
          )}

          {goals.length === 0 && orphanProjects.length === 0 && (
            <div className="text-[12px] text-[var(--fg-subtle)]">
              此领域暂无目标或项目。<Link href="/goals" className="link-gold">创建一个 OKR →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalNode({
  goal,
  projects,
  tasks,
}: {
  goal: GoalDTO;
  projects: ProjectDTO[];
  tasks: TaskDTO[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-start gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Target size={14} className="mt-0.5 text-[var(--gold-deep)]" />
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="chip-gold">{goal.timeframe}</span>
            <span className="text-[var(--fg-subtle)]">Confidence {goal.confidence}/10</span>
          </div>
          <div className="font-display text-[13px] font-semibold text-[var(--fg-strong)]">
            {goal.objective}
          </div>
        </div>
      </button>
      {open && (
        <div className="ml-5 mt-1.5 space-y-1 border-l border-[var(--border)] pl-3">
          {goal.keyResults.map((kr, i) => (
            <div key={kr.id} className="flex items-center gap-2 text-[12px]">
              <span className="font-display-en text-[10px] text-[var(--gold-deep)]">
                KR{i + 1}
              </span>
              <span className="flex-1 text-[var(--fg)]">{kr.description}</span>
              <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                {kr.current}/{kr.target}
              </span>
            </div>
          ))}
          {projects.map((p) => (
            <ProjectNode
              key={p.id}
              project={p}
              tasks={tasks.filter((t) => false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectNode({ project }: { project: ProjectDTO; tasks: TaskDTO[] }) {
  return (
    <div className="ml-2 flex items-center gap-2 text-[12px]">
      <Hammer size={12} className="text-[var(--gold-deep)]" />
      <Link href="/projects" className="font-display text-[var(--fg-strong)] hover:text-[var(--gold-deep)]">
        {project.title}
      </Link>
      <span className="text-[10px] text-[var(--fg-muted)]">
        {project.taskDoneCount}/{project.taskCount}
      </span>
      <CheckSquare size={11} className="text-[var(--fg-subtle)]" />
    </div>
  );
}
