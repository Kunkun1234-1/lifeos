"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Circle,
  FolderKanban,
  Gauge,
  ListChecks,
  Repeat,
  Target,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAreas,
  useGoals,
  useHabits,
  useProjects,
  useRoutines,
  useTasks,
  useUser,
} from "@/hooks/queries";
import { AREA_META, type AreaName } from "@/lib/area-meta";
import { deriveLevel } from "@/lib/gamification";
import type { AreaDTO, GoalDTO, HabitDTO, ProjectDTO, RoutineDTO, TaskDTO } from "@/lib/types";

const GOAL_STATUS_LABEL: Record<GoalDTO["status"], string> = {
  active: "进行中",
  done: "已完成",
  paused: "暂停",
  archived: "归档",
};

const PROJECT_STATUS_LABEL: Record<ProjectDTO["status"], string> = {
  idea: "构想",
  active: "进行中",
  paused: "暂停",
  done: "完成",
  archived: "归档",
};

const TASK_STATUS_LABEL: Record<TaskDTO["status"], string> = {
  TODO: "待处理",
  DONE: "完成",
  CANCELED: "取消",
};

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export default function AreaDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: user } = useUser();
  const { data: areas, isLoading: areasLoading } = useAreas();
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: habits, isLoading: habitsLoading } = useHabits();
  const { data: routines, isLoading: routinesLoading } = useRoutines();

  if (areasLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-12 text-center text-sm text-[var(--fg-muted)]">
        Loading area...
      </div>
    );
  }

  const area = areas?.find((item) => item.id === id);
  if (!area) {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-12">
        <div className="panel-cream framed rounded-sm p-8 text-center">
          <div className="section-label">
            <span className="cn text-xl">领域不存在</span>
            <span className="en text-[10px]">Area Not Found</span>
          </div>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">没有找到对应的人生领域。</p>
          <Button asChild className="mt-5">
            <Link href="/">回到首页</Link>
          </Button>
        </div>
      </div>
    );
  }

  const meta = getAreaMeta(area);
  const xp = user?.xpByArea?.[area.attributeKey] ?? area.attributeXp ?? 0;
  const levelInfo = deriveLevel(xp);
  const areaGoals = (goals ?? []).filter((goal) => goal.areaId === area.id);
  const areaProjects = (projects ?? []).filter((project) => project.areaId === area.id);
  const areaTasks = (tasks ?? []).filter(
    (task) => task.areaId === area.id || task.area?.id === area.id,
  );
  const areaHabits = (habits ?? []).filter(
    (habit) => habit.areaId === area.id || habit.area?.id === area.id,
  );
  const areaRoutines = (routines ?? []).filter(
    (routine) => routine.areaId === area.id || routine.area?.id === area.id,
  );

  const activeGoals = areaGoals.filter((goal) => goal.status === "active");
  const activeProjects = areaProjects.filter((project) =>
    ["idea", "active", "paused"].includes(project.status),
  );
  const doneProjects = areaProjects.filter((project) => project.status === "done");
  const openTasks = areaTasks.filter((task) => task.status === "TODO");
  const doneTasks = areaTasks.filter((task) => task.status === "DONE");
  const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate));
  const dueSoonTasks = openTasks.filter((task) => isDueSoon(task.dueDate));
  const completedRoutines = areaRoutines.filter((routine) => routine.completedToday);
  const projectTaskTotal = areaProjects.reduce((sum, project) => sum + project.taskCount, 0);
  const projectTaskDone = areaProjects.reduce((sum, project) => sum + project.taskDoneCount, 0);
  const projectProgress = projectTaskTotal > 0 ? projectTaskDone / projectTaskTotal : 0;
  const taskCompletion =
    doneTasks.length + openTasks.length > 0 ? doneTasks.length / (doneTasks.length + openTasks.length) : 0;
  const isFinance = area.name === "Finance";
  const isLoading =
    goalsLoading || projectsLoading || tasksLoading || habitsLoading || routinesLoading;

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 px-6 py-8 xl:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[12px] font-display text-[var(--fg-muted)] transition-colors hover:text-[var(--gold-deep)]"
      >
        <ArrowLeft size={14} />
        返回首页
      </Link>

      <section className="panel-cream framed overflow-hidden rounded-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] text-2xl">
                {area.icon}
              </span>
              <div>
                <div className="section-label">
                  <span className="cn text-2xl">{meta.cn}领域</span>
                  <span className="en text-[11px]">{meta.en} Area</span>
                </div>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{meta.label} · {meta.focus}</p>
              </div>
              <span
                className="ml-auto rounded-sm border px-2.5 py-1 font-display-en text-[10px]"
                style={{ borderColor: meta.accentVar, color: meta.accentVar }}
              >
                {area.attributeKey}
              </span>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <ScoreBlock
                label="领域状态"
                value={`${area.healthScore}/100`}
                caption="Health Score"
                progress={area.healthScore / 100}
                accent={meta.accentVar}
              />
              <ScoreBlock
                label="属性等级"
                value={`Lv.${levelInfo.level}`}
                caption={`${levelInfo.xpIntoLevel}/${levelInfo.xpForNext} XP`}
                progress={levelInfo.progress}
                accent={meta.accentVar}
              />
              <ScoreBlock
                label="项目表现"
                value={`${projectTaskDone}/${projectTaskTotal}`}
                caption="Project Tasks"
                progress={projectProgress}
                accent={meta.accentVar}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/goals">
                  <Target size={14} />
                  管理目标
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/projects">
                  <FolderKanban size={14} />
                  管理项目
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/tasks">
                  <ListChecks size={14} />
                  管理任务
                </Link>
              </Button>
              {isFinance && (
                <Button asChild size="sm">
                  <Link href="/assets">
                    <WalletCards size={14} />
                    打开资产账本
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="relative min-h-[240px] border-t border-[var(--border)] lg:border-l lg:border-t-0">
            <Image
              src={meta.art}
              alt={`${meta.cn}领域`}
              fill
              sizes="(min-width: 1024px) 380px, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(252,247,234,0.86)] via-transparent to-transparent lg:bg-gradient-to-l" />
            <div className="absolute bottom-5 left-5 right-5 rounded-sm border border-[var(--gold)] bg-[rgba(252,247,234,0.9)] px-4 py-3">
              <div className="font-display text-[14px] text-[var(--fg-strong)]">领域工作台</div>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                当前页只展示 {meta.cn} 领域下挂接的目标、项目、任务、习惯和日程。
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<Gauge size={18} />}
          label="状态表现"
          value={`${Math.round(area.healthScore)}%`}
          caption={area.healthScore >= 70 ? "运行良好" : area.healthScore >= 40 ? "需要维护" : "优先修复"}
        />
        <MetricTile
          icon={<Target size={18} />}
          label="目标"
          value={`${activeGoals.length}/${areaGoals.length}`}
          caption="进行中 / 全部"
        />
        <MetricTile
          icon={<FolderKanban size={18} />}
          label="项目"
          value={`${activeProjects.length}/${areaProjects.length}`}
          caption={`${doneProjects.length} 个已完成`}
        />
        <MetricTile
          icon={<ListChecks size={18} />}
          label="任务"
          value={`${openTasks.length}`}
          caption={`${dueSoonTasks.length} 个临近 · ${overdueTasks.length} 个逾期`}
        />
      </div>

      {isLoading && (
        <div className="text-right text-[11px] text-[var(--fg-subtle)]">正在同步领域数据...</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-5">
          <AreaSection
            title="目标与关键结果"
            en="Goals"
            href="/goals"
            action="管理目标"
            empty="这个领域还没有目标。"
          >
            {goalsLoading ? (
              <SectionLoading />
            ) : (
              areaGoals.length > 0 && (
                <div className="space-y-3">
                  {areaGoals.map((goal) => (
                    <GoalItem key={goal.id} goal={goal} />
                  ))}
                </div>
              )
            )}
          </AreaSection>

          <AreaSection
            title="项目推进"
            en="Projects"
            href="/projects"
            action="管理项目"
            empty="这个领域还没有项目。"
          >
            {projectsLoading ? (
              <SectionLoading />
            ) : (
              areaProjects.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {areaProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      tasks={areaTasks.filter((task) => task.projectId === project.id)}
                    />
                  ))}
                </div>
              )
            )}
          </AreaSection>
        </div>

        <div className="space-y-5">
          <AreaSection
            title="任务队列"
            en="Tasks"
            href="/tasks"
            action="管理任务"
            empty="这个领域还没有任务。"
          >
            {tasksLoading ? (
              <SectionLoading />
            ) : (
              areaTasks.length > 0 && (
                <div className="space-y-2">
                  <ProgressSummary
                    label="任务完成率"
                    value={`${doneTasks.length}/${doneTasks.length + openTasks.length}`}
                    progress={taskCompletion}
                  />
                  <div className="space-y-2">
                    {openTasks.slice(0, 8).map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                    {openTasks.length === 0 && (
                      <p className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-[12px] text-[var(--fg-muted)]">
                        当前没有待处理任务。
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </AreaSection>

          <AreaSection
            title="习惯表现"
            en="Habits"
            href="/habits"
            action="管理习惯"
            empty="这个领域还没有习惯。"
          >
            {habitsLoading ? (
              <SectionLoading />
            ) : (
              areaHabits.length > 0 && (
                <div className="space-y-2">
                  {areaHabits.map((habit) => (
                    <HabitItem key={habit.id} habit={habit} />
                  ))}
                </div>
              )
            )}
          </AreaSection>

          <AreaSection
            title="日程节奏"
            en="Routines"
            href="/routines"
            action="管理日程"
            empty="这个领域还没有日程。"
          >
            {routinesLoading ? (
              <SectionLoading />
            ) : (
              areaRoutines.length > 0 && (
                <div className="space-y-2">
                  <ProgressSummary
                    label="今日日程"
                    value={`${completedRoutines.length}/${areaRoutines.length}`}
                    progress={areaRoutines.length ? completedRoutines.length / areaRoutines.length : 0}
                  />
                  {areaRoutines.map((routine) => (
                    <RoutineItem key={routine.id} routine={routine} />
                  ))}
                </div>
              )
            )}
          </AreaSection>
        </div>
      </div>
    </div>
  );
}

function getAreaMeta(area: AreaDTO) {
  if (area.name in AREA_META) return AREA_META[area.name as AreaName];
  return {
    cn: area.name,
    en: area.name,
    label: "自定义领域",
    focus: "当前领域下的目标、项目、任务与行为记录",
    art: "/lifeos/module_academics.png",
    accentVar: "var(--gold)",
  };
}

function ScoreBlock({
  label,
  value,
  caption,
  progress,
  accent,
}: {
  label: string;
  value: string;
  caption: string;
  progress: number;
  accent: string;
}) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/65 p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[13px] text-[var(--fg-muted)]">{label}</span>
        <span className="font-display text-[22px] text-[var(--fg-strong)]">{value}</span>
      </div>
      <ProgressBar progress={progress} accent={accent} className="mt-3" />
      <div className="mt-2 font-display-en text-[9px] text-[var(--fg-subtle)]">{caption}</div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="panel-cream framed rounded-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]">
          {icon}
        </div>
        <span className="font-display text-[26px] text-[var(--fg-strong)]">{value}</span>
      </div>
      <div className="mt-3 font-display text-[13px] text-[var(--fg-strong)]">{label}</div>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{caption}</p>
    </div>
  );
}

function AreaSection({
  title,
  en,
  href,
  action,
  empty,
  children,
}: {
  title: string;
  en: string;
  href: string;
  action: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasContent = Boolean(children);
  return (
    <section className="panel-cream framed rounded-sm p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-3">
        <div className="section-label">
          <span className="cn text-[16px]">{title}</span>
          <span className="en text-[10px]">{en}</span>
        </div>
        <Link href={href} className="ml-auto link-gold text-[12px]">
          {action} →
        </Link>
      </div>
      {hasContent ? (
        children
      ) : (
        <div className="rounded-sm border border-dashed border-[var(--gold)]/60 bg-[var(--gold-tint)]/30 px-4 py-5 text-center text-[12px] text-[var(--fg-muted)]">
          {empty}
        </div>
      )}
    </section>
  );
}

function SectionLoading() {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/70 px-4 py-5 text-center text-[12px] text-[var(--fg-muted)]">
      Loading...
    </div>
  );
}

function GoalItem({ goal }: { goal: GoalDTO }) {
  const total = goal.keyResults.length;
  const done = goal.keyResults.filter((kr) => kr.current >= kr.target).length;
  const progress =
    total > 0
      ? goal.keyResults.reduce((sum, kr) => sum + Math.min(1, kr.target > 0 ? kr.current / kr.target : 0), 0) / total
      : 0;

  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Target size={14} className="text-[var(--gold-deep)]" />
        <StatusPill label={GOAL_STATUS_LABEL[goal.status]} />
        <span className="chip-gold">{goal.timeframe}</span>
        <span className="text-[11px] text-[var(--fg-subtle)]">信心 {goal.confidence}/10</span>
      </div>
      <h3 className="mt-2 font-display text-[15px] leading-snug text-[var(--fg-strong)]">
        {goal.objective}
      </h3>
      <div className="mt-3">
        <ProgressSummary label="关键结果" value={`${done}/${total}`} progress={progress} />
        {goal.keyResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {goal.keyResults.map((kr, index) => (
              <div key={kr.id} className="flex items-center gap-2 text-[12px]">
                <span className="font-display-en text-[9px] text-[var(--gold-deep)]">
                  KR{index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--fg)]">{kr.description}</span>
                <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                  {kr.current}/{kr.target}{kr.unit ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectItem({ project, tasks }: { project: ProjectDTO; tasks: TaskDTO[] }) {
  const taskProgress =
    project.taskCount > 0 ? project.taskDoneCount / project.taskCount : 0;
  const nextTasks = tasks.filter((task) => task.status === "TODO").slice(0, 3);

  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/70 p-4">
      <div className="flex items-center gap-2">
        <FolderKanban size={14} className="text-[var(--gold-deep)]" />
        <StatusPill label={PROJECT_STATUS_LABEL[project.status]} />
        {project.deadline && (
          <span className="ml-auto text-[10px] text-[var(--fg-muted)]">
            截至 {formatDate(project.deadline)}
          </span>
        )}
      </div>
      <h3 className="mt-2 font-display text-[15px] leading-snug text-[var(--fg-strong)]">
        {project.title}
      </h3>
      {project.deliverable && (
        <p className="mt-1 line-clamp-2 text-[12px] text-[var(--fg-muted)]">
          交付：{project.deliverable}
        </p>
      )}
      <div className="mt-3">
        <ProgressSummary
          label="项目任务"
          value={`${project.taskDoneCount}/${project.taskCount}`}
          progress={taskProgress}
        />
      </div>
      {nextTasks.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {nextTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
              <Circle size={9} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task }: { task: TaskDTO }) {
  const overdue = isOverdue(task.dueDate);
  const dueSoon = isDueSoon(task.dueDate);
  return (
    <div className="flex items-start gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/70 px-3 py-3">
      <Circle size={15} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate font-display text-[13px] text-[var(--fg-strong)]">
            {task.title}
          </span>
          <StatusPill label={TASK_STATUS_LABEL[task.status]} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-muted)]">
          {task.project && <span>项目：{task.project.title}</span>}
          <span>奖励 +{task.xpReward}XP / +{task.goldReward} Gold</span>
          {task.dueDate && (
            <span className={overdue ? "text-[var(--danger)]" : dueSoon ? "text-[var(--warning)]" : ""}>
              截止 {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitItem({ habit }: { habit: HabitDTO }) {
  const net = habit.positiveCount - habit.negativeCount;
  return (
    <div className="flex items-center gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/70 px-3 py-3">
      <BarChart3 size={15} className="shrink-0 text-[var(--gold-deep)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[13px] text-[var(--fg-strong)]">{habit.title}</div>
        <div className="mt-1 text-[11px] text-[var(--fg-muted)]">
          +{habit.xpPerTick}XP / +{habit.goldPerTick} Gold · 净表现 {net}
        </div>
      </div>
      <div className="text-right font-mono text-[11px] text-[var(--fg-muted)]">
        +{habit.positiveCount}
        {habit.negativeCount > 0 ? ` / -${habit.negativeCount}` : ""}
      </div>
    </div>
  );
}

function RoutineItem({ routine }: { routine: RoutineDTO }) {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-card)]/70 px-3 py-3">
      {routine.completedToday ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
      ) : (
        <Repeat size={16} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[13px] text-[var(--fg-strong)]">{routine.title}</div>
        {routine.notes?.trim() && (
          <div className="mt-1 truncate text-[11px] text-[var(--fg-muted)]">
            {routine.notes}
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--fg-muted)]">
          <span>连击 {routine.streakCurrent}</span>
          <span>最佳 {routine.streakBest}</span>
          <span>
            <CalendarDays size={11} className="mr-1 inline" />
            {routineDaysLabel(routine.daysOfWeek)}
          </span>
        </div>
      </div>
      <StatusPill label={routine.completedToday ? "今日完成" : "待完成"} />
    </div>
  );
}

function ProgressSummary({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-display-en text-[var(--fg-muted)]">{label}</span>
        <span className="font-mono text-[var(--fg)]">{value}</span>
      </div>
      <ProgressBar progress={progress} className="mt-1.5" />
    </div>
  );
}

function ProgressBar({
  progress,
  accent = "var(--success)",
  className = "",
}: {
  progress: number;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={`h-[6px] overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-panel-ink)]/15 ${className}`}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, progress * 100))}%`,
          background: `linear-gradient(90deg, ${accent}, var(--gold-pale))`,
        }}
      />
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-sm border border-[var(--border)] bg-[var(--bg-raised)] px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)]">
      {label}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "未设定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未设定";
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function isOverdue(value: string | null) {
  if (!value) return false;
  const due = new Date(value).getTime();
  if (Number.isNaN(due)) return false;
  return due < Date.now();
}

function isDueSoon(value: string | null) {
  if (!value) return false;
  const due = new Date(value).getTime();
  if (Number.isNaN(due)) return false;
  const diff = due - Date.now();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function routineDaysLabel(raw: string) {
  try {
    const days = JSON.parse(raw) as number[];
    if (!Array.isArray(days) || days.length === 0) return "未设置";
    return days.map((day) => `周${DAY_LABELS[day] ?? day}`).join(" ");
  } catch {
    return "未设置";
  }
}
