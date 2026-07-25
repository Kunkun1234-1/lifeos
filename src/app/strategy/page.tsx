"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Compass,
  Flag,
  FolderKanban,
  GitBranch,
  Hammer,
  Layers,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { useAreas, useGoals, useProjects, useTasks, useUser } from "@/hooks/queries";
import type { AreaDTO, GoalDTO, ProjectDTO, TaskDTO } from "@/lib/types";
import styles from "./page.module.css";

const STATUS_GOAL: Record<GoalDTO["status"], string> = {
  active: "进行中",
  done: "已完成",
  paused: "暂停",
  archived: "归档",
};

const STATUS_PROJECT: Record<ProjectDTO["status"], string> = {
  idea: "构思",
  active: "推进中",
  paused: "暂停",
  done: "完成",
  archived: "归档",
};

export default function StrategyPage() {
  const { data: user } = useUser();
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();

  const activeAreas = useMemo(
    () => [...areas].filter((a) => !a.archived).sort((a, b) => a.order - b.order),
    [areas],
  );

  const overview = useMemo(() => {
    const activeGoals = goals.filter((g) => g.status === "active");
    const mainGoals = goals.filter((g) => g.type === "main" && g.status === "active");
    const activeProjects = projects.filter((p) => p.status === "active" || p.status === "idea");
    const openTasks = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
    const doneTasks = tasks.filter((t) => t.status === "DONE");
    const avgGoalProgress =
      activeGoals.length > 0
        ? Math.round(
            activeGoals.reduce((sum, g) => sum + goalProgress(g), 0) / activeGoals.length,
          )
        : 0;
    return {
      areas: activeAreas.length,
      activeGoals: activeGoals.length,
      mainGoals: mainGoals.length,
      activeProjects: activeProjects.length,
      openTasks: openTasks.length,
      doneTasks: doneTasks.length,
      avgGoalProgress,
    };
  }, [activeAreas.length, goals, projects, tasks]);

  const unassignedGoals = useMemo(
    () => goals.filter((g) => !g.areaId && g.status !== "archived"),
    [goals],
  );
  const unassignedProjects = useMemo(
    () => projects.filter((p) => !p.areaId && p.status !== "archived"),
    [projects],
  );

  const name = user?.name || "旅行者";
  const title = user?.equippedTitle?.name || user?.class || "人生探索者";
  const vision =
    user?.visionStatement?.trim() ||
    user?.motto?.trim() ||
    "尚未设定愿景，可在设置中填写十年愿景与身份声明。";
  const levelProgress =
    user && user.xpForNext > 0 ? Math.min(1, user.xpIntoLevel / user.xpForNext) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>战略全景</h1>
          <p className={styles.pageDesc}>
            愿景 → 领域 → 目标 → 项目 → 任务 · 一眼看清人生系统树
          </p>
        </div>
        <div className={styles.headLinks}>
          <Link href="/goals" className={styles.headLink}>
            <Target size={14} /> 目标
          </Link>
          <Link href="/projects" className={styles.headLink}>
            <Hammer size={14} /> 项目
          </Link>
          <Link href="/tasks" className={styles.headLink}>
            <CheckSquare size={14} /> 任务
          </Link>
          <Link href="/settings" className={styles.headLink}>
            <Compass size={14} /> 愿景设置
          </Link>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.side}>
          <div className={styles.profile}>
            <div className={styles.profileArtWrap}>
              <Image
                className={styles.profileArt}
                src="/life-game/profile-panel-v2.png"
                alt=""
                fill
                sizes="260px"
                unoptimized
              />
            </div>
            <div className={styles.profileBody}>
              <div className={styles.profileName}>{name}</div>
              <div className={styles.profileTitle}>{title}</div>
              <div className={styles.levelBlock}>
                <div className={styles.levelRow}>
                  <span>探索等级</span>
                  <strong>Lv.{user?.level ?? 1}</strong>
                </div>
                <div className={styles.xpTrack}>
                  <div
                    className={styles.xpFill}
                    style={{ width: `${levelProgress * 100}%` }}
                  />
                </div>
                <div className={styles.xpMeta}>
                  {user?.xpIntoLevel ?? 0} / {user?.xpForNext ?? 100} XP
                </div>
              </div>
            </div>
          </div>

          <section className={styles.sideCard}>
            <div className={styles.sideCardHead}>
              <Layers size={14} />
              领域健康
            </div>
            {activeAreas.length === 0 ? (
              <p className={styles.sideEmpty}>暂无领域</p>
            ) : (
              <ul className={styles.areaHealthList}>
                {activeAreas.map((area) => {
                  const gCount = goals.filter((g) => g.areaId === area.id).length;
                  const pCount = projects.filter((p) => p.areaId === area.id).length;
                  return (
                    <li key={area.id} className={styles.areaHealthItem}>
                      <span
                        className={styles.areaHealthIcon}
                        style={{ background: `${area.color}22`, borderColor: `${area.color}55` }}
                      >
                        {area.icon}
                      </span>
                      <div className={styles.areaHealthMain}>
                        <div className={styles.areaHealthTop}>
                          <span className={styles.areaHealthName}>{area.name}</span>
                          <span className={styles.areaHealthXp}>
                            <Zap size={10} /> {area.attributeXp}
                          </span>
                        </div>
                        <div className={styles.healthTrack}>
                          <div
                            className={styles.healthFill}
                            style={{
                              width: `${Math.min(100, area.healthScore)}%`,
                              background: area.color || "#249d6d",
                            }}
                          />
                        </div>
                        <div className={styles.areaHealthMeta}>
                          健康 {Math.round(area.healthScore)} · {gCount} 目标 · {pCount} 项目
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideCardHead}>
              <GitBranch size={14} />
              快捷跳转
            </div>
            <div className={styles.quickList}>
              <Link href="/goals" className={styles.quickLink}>
                <Target size={14} />
                <span>人生目标</span>
                <ChevronRight size={14} />
              </Link>
              <Link href="/projects" className={styles.quickLink}>
                <FolderKanban size={14} />
                <span>项目管理</span>
                <ChevronRight size={14} />
              </Link>
              <Link href="/habits" className={styles.quickLink}>
                <Activity size={14} />
                <span>习惯打卡</span>
                <ChevronRight size={14} />
              </Link>
              <Link href="/review" className={styles.quickLink}>
                <BookOpen size={14} />
                <span>成长反思</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          <aside className={styles.tip}>
            <Image
              src="/life-game/pixel-dragon-v1.png"
              alt=""
              width={56}
              height={48}
              unoptimized
            />
            <div>
              <div className={styles.tipLabel}>战略小贴士</div>
              <p className={styles.tipText}>
                先稳住主线目标，再让项目与任务挂到同一条树上，推进才会同向。
              </p>
            </div>
          </aside>
        </aside>

        <div className={styles.main}>
          <div className={styles.statsRow}>
            <StatCard icon={Layers} label="人生领域" value={overview.areas} tone="#249d6d" />
            <StatCard
              icon={Flag}
              label="主线目标"
              value={overview.mainGoals}
              tone="#c9a227"
            />
            <StatCard
              icon={Target}
              label="进行中目标"
              value={overview.activeGoals}
              tone="#5b9ec9"
            />
            <StatCard
              icon={Hammer}
              label="活跃项目"
              value={overview.activeProjects}
              tone="#8a9a3a"
            />
            <StatCard
              icon={CheckSquare}
              label="待办任务"
              value={overview.openTasks}
              tone="#6b8f71"
            />
            <StatCard
              icon={Sparkles}
              label="目标均进度"
              value={`${overview.avgGoalProgress}%`}
              tone="#d4784a"
            />
          </div>

          <section className={styles.vision}>
            <div className={styles.visionTop}>
              <div className={styles.visionBadge}>
                <Compass size={14} />
                愿景与身份
              </div>
              <Link href="/settings" className={styles.visionEdit}>
                编辑资料 <ChevronRight size={13} />
              </Link>
            </div>
            <blockquote className={styles.visionQuote}>{vision}</blockquote>

            <div className={styles.visionGrid}>
              <div className={styles.visionBlock}>
                <div className={styles.visionBlockHead}>
                  <UserRound size={13} />
                  身份声明
                </div>
                {user?.identityStatements?.length ? (
                  <ul className={styles.chipList}>
                    {user.identityStatements.map((s, i) => (
                      <li key={`${s}-${i}`} className={styles.chip}>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.visionEmpty}>尚未填写身份声明</p>
                )}
              </div>
              <div className={styles.visionBlock}>
                <div className={styles.visionBlockHead}>
                  <Sparkles size={13} />
                  核心价值观
                </div>
                {user?.coreValues?.length ? (
                  <ul className={styles.chipList}>
                    {user.coreValues.map((s, i) => (
                      <li key={`${s}-${i}`} className={`${styles.chip} ${styles.chipGold}`}>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.visionEmpty}>尚未填写核心价值观</p>
                )}
              </div>
            </div>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <Layers size={12} /> 领域
              </span>
              <span className={styles.legendItem}>
                <Target size={12} /> 目标
              </span>
              <span className={styles.legendItem}>
                <Hammer size={12} /> 项目
              </span>
              <span className={styles.legendItem}>
                <CheckSquare size={12} /> 任务
              </span>
            </div>
          </section>

          <section className={styles.treeSection}>
            <div className={styles.treeHead}>
              <h2 className={styles.treeTitle}>
                <GitBranch size={16} />
                系统树
              </h2>
              <span className={styles.treeMeta}>
                {activeAreas.length} 个领域节点
              </span>
            </div>

            <div className={styles.tree}>
              {activeAreas.length === 0 ? (
                <div className={styles.empty}>
                  还没有人生领域。请先完成引导，或前往相关页面创建领域。
                </div>
              ) : (
                activeAreas.map((area) => (
                  <AreaTreeNode
                    key={area.id}
                    area={area}
                    goals={goals.filter((g) => g.areaId === area.id)}
                    projects={projects.filter((p) => p.areaId === area.id)}
                    tasks={tasks.filter((t) => t.area?.id === area.id)}
                  />
                ))
              )}

              {unassignedGoals.length > 0 || unassignedProjects.length > 0 ? (
                <article className={styles.areaCard} data-orphan>
                  <div className={styles.areaToggleStatic}>
                    <span className={styles.areaIconBox}>?</span>
                    <div className={styles.areaMain}>
                      <div className={styles.areaName}>未归类节点</div>
                      <div className={styles.areaSub}>尚未挂到人生领域的目标 / 项目</div>
                    </div>
                    <span className={styles.areaMeta}>
                      {unassignedGoals.length} 目标 · {unassignedProjects.length} 项目
                    </span>
                  </div>
                  <div className={styles.areaBody}>
                    <ul className={styles.nodeList}>
                      {unassignedGoals.map((goal) => (
                        <li key={goal.id}>
                          <GoalNode
                            goal={goal}
                            projects={projects.filter((p) => p.goalId === goal.id)}
                            tasks={tasks}
                          />
                        </li>
                      ))}
                    </ul>
                    {unassignedProjects.filter((p) => !p.goalId).length > 0 ? (
                      <>
                        <div className={styles.sectionLabel}>未挂目标的项目</div>
                        <ul className={styles.projectList}>
                          {unassignedProjects
                            .filter((p) => !p.goalId)
                            .map((project) => (
                              <li key={project.id}>
                                <ProjectNode
                                  project={project}
                                  tasks={tasksForProject(tasks, project.id)}
                                />
                              </li>
                            ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className={styles.statCard} style={{ "--tone": tone } as CSSProperties}>
      <span className={styles.statIcon}>
        <Icon size={15} />
      </span>
      <div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
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
  const openTasks = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <article
      className={styles.areaCard}
      style={{ "--area-tone": area.color || "#249d6d" } as CSSProperties}
    >
      <button type="button" className={styles.areaToggle} onClick={() => setOpen((v) => !v)}>
        <span className={styles.chev}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={styles.areaIconBox}>{area.icon}</span>
        <div className={styles.areaMain}>
          <div className={styles.areaNameRow}>
            <span className={styles.areaName}>{area.name}</span>
            <span className={styles.areaKey}>{area.attributeKey}</span>
          </div>
          <div className={styles.areaSub}>
            <span>
              <Zap size={11} /> {area.attributeXp} XP
            </span>
            <span>健康 {Math.round(area.healthScore)}</span>
            <span>{activeGoals.length} 进行中目标</span>
            <span>{openTasks.length} 待办</span>
          </div>
        </div>
        <span className={styles.areaMeta}>
          {goals.length} 目标 · {projects.length} 项目 · {tasks.length} 任务
        </span>
      </button>

      {open ? (
        <div className={styles.areaBody}>
          <div className={styles.areaProgress}>
            <div className={styles.areaProgressLabel}>领域健康度</div>
            <div className={styles.healthTrackWide}>
              <div
                className={styles.healthFill}
                style={{
                  width: `${Math.min(100, area.healthScore)}%`,
                  background: area.color || "#249d6d",
                }}
              />
            </div>
          </div>

          {goals.length === 0 && orphanProjects.length === 0 ? (
            <div className={styles.empty}>
              此领域暂无目标或项目。<Link href="/goals">去创建目标 →</Link>
            </div>
          ) : (
            <ul className={styles.nodeList}>
              {goals.map((goal) => (
                <li key={goal.id}>
                  <GoalNode
                    goal={goal}
                    projects={projects.filter((p) => p.goalId === goal.id)}
                    tasks={tasks}
                  />
                </li>
              ))}
            </ul>
          )}

          {orphanProjects.length > 0 ? (
            <>
              <div className={styles.sectionLabel}>未挂目标的项目</div>
              <ul className={styles.projectList}>
                {orphanProjects.map((project) => (
                  <li key={project.id}>
                    <ProjectNode project={project} tasks={tasksForProject(tasks, project.id)} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
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
  const [open, setOpen] = useState(goal.status === "active");
  const progress = goalProgress(goal);

  return (
    <div className={styles.goalCard} data-status={goal.status}>
      <button type="button" className={styles.goalToggle} onClick={() => setOpen((v) => !v)}>
        <span className={styles.chev}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={styles.goalIcon} data-main={goal.type === "main"}>
          {goal.type === "main" ? <Flag size={14} /> : <Target size={14} />}
        </span>
        <div className={styles.goalMain}>
          <div className={styles.goalTags}>
            {goal.type === "main" ? (
              <span className={`${styles.tag} ${styles.tagMain}`}>主线</span>
            ) : null}
            <span className={styles.tag}>{goal.timeframe}</span>
            <span className={`${styles.tag} ${styles.tagMuted}`}>
              {STATUS_GOAL[goal.status]}
            </span>
            <span className={`${styles.tag} ${styles.tagMuted}`}>
              信心 {goal.confidence}/10
            </span>
          </div>
          <div className={styles.goalTitle}>{goal.objective}</div>
          <div className={styles.miniProgress}>
            <div className={styles.miniTrack}>
              <div className={styles.miniFill} style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>
        </div>
        <span className={styles.goalCount}>
          {projects.length} 项目 · {goal.keyResults.length} KR
        </span>
      </button>

      {open ? (
        <div className={styles.goalBody}>
          {goal.keyResults.length > 0 ? (
            <ul className={styles.krList}>
              {goal.keyResults.map((kr, i) => {
                const pct =
                  kr.target > 0
                    ? Math.min(100, Math.round((kr.current / kr.target) * 100))
                    : 0;
                return (
                  <li key={kr.id} className={styles.krItem}>
                    <span className={styles.krLabel}>KR{i + 1}</span>
                    <div className={styles.krMain}>
                      <span className={styles.krText}>{kr.description}</span>
                      <div className={styles.miniTrack}>
                        <div className={styles.miniFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className={styles.krValue}>
                      {kr.current}/{kr.target}
                      {kr.unit ? ` ${kr.unit}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptySoft}>尚未设置关键结果</div>
          )}

          {projects.length > 0 ? (
            <ul className={styles.projectList}>
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectNode project={project} tasks={tasksForProject(tasks, project.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptySoft}>
              该目标下还没有项目。<Link href="/projects">去创建 →</Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProjectNode({ project, tasks }: { project: ProjectDTO; tasks: TaskDTO[] }) {
  const [open, setOpen] = useState(false);
  const pct =
    project.taskCount > 0
      ? Math.round((project.taskDoneCount / project.taskCount) * 100)
      : 0;

  return (
    <div className={styles.projectBlock}>
      <div className={styles.projectItem}>
        <button
          type="button"
          className={styles.projectExpand}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={open ? "收起任务" : "展开任务"}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <span className={styles.projectIconBox}>
          <Hammer size={13} />
        </span>
        <Link href="/projects" className={styles.projectLink}>
          <span className={styles.projectTitle}>{project.title}</span>
          <span className={`${styles.tag} ${styles.tagMuted}`}>
            {STATUS_PROJECT[project.status]}
          </span>
        </Link>
        <div className={styles.projectProgress}>
          <div className={styles.miniTrack}>
            <div className={styles.miniFill} style={{ width: `${pct}%` }} />
          </div>
          <span>
            {project.taskDoneCount}/{project.taskCount}
          </span>
        </div>
      </div>
      {open ? (
        tasks.length > 0 ? (
          <ul className={styles.taskList}>
            {tasks.slice(0, 8).map((task) => (
              <li
                key={task.id}
                className={`${styles.taskItem} ${task.status === "DONE" ? styles.taskDone : ""}`}
              >
                <CheckSquare size={12} />
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.taskMeta}>
                  {task.priority === 1 ? "高" : task.priority === 3 ? "低" : "中"}
                  {task.dueDate ? ` · ${formatShort(task.dueDate)}` : ""}
                </span>
              </li>
            ))}
            {tasks.length > 8 ? (
              <li className={styles.taskItem}>还有 {tasks.length - 8} 项任务…</li>
            ) : null}
          </ul>
        ) : (
          <div className={styles.emptySoft}>项目下暂无任务</div>
        )
      ) : null}
    </div>
  );
}

function tasksForProject(tasks: TaskDTO[], projectId: string) {
  return tasks.filter((t) => t.projectId === projectId);
}

function goalProgress(goal: GoalDTO) {
  if (goal.keyResults.length === 0) return 0;
  const total = goal.keyResults.reduce((sum, result) => {
    if (result.target <= 0) return sum;
    return sum + Math.min(1, Math.max(0, result.current / result.target));
  }, 0);
  return Math.round((total / goal.keyResults.length) * 100);
}

function formatShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
