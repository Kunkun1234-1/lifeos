"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Check,
  CheckSquare2,
  CircleDollarSign,
  Dumbbell,
  Flag,
  FolderKanban,
  HeartHandshake,
  History,
  ListTodo,
  Map,
  Medal,
  Plus,
  Sparkles,
  Sword,
  Target,
} from "lucide-react";
import { useDashboardData } from "@/components/dashboard-data";
import {
  useAchievements,
  useCommissions,
  useCompleteCommission,
  useCompleteTask,
  useGoals,
  useRoutines,
  useTasks,
  useUser,
} from "@/hooks/queries";
import type { CommissionItem } from "@/lib/commissions";
import type { GoalDTO, TaskDTO } from "@/lib/types";
import styles from "./life-game-dashboard.module.css";

const DIMENSIONS = [
  { key: "STR", label: "健康", symbol: "✚" },
  { key: "INT", label: "学习", symbol: "◆" },
  { key: "CHA", label: "关系", symbol: "♥" },
  { key: "WIS", label: "心智", symbol: "✦" },
  { key: "CRE", label: "创造", symbol: "✹" },
  { key: "GOLD", label: "财富", symbol: "●" },
] as const;

const QUICK_ACTIONS = [
  { href: "/tasks", label: "任务", note: "管理待办", icon: ListTodo },
  { href: "/routines", label: "日程", note: "规划今天", icon: Dumbbell },
  { href: "/goals", label: "目标", note: "人生方向", icon: Target },
  { href: "/projects", label: "项目", note: "推进计划", icon: FolderKanban },
  { href: "/review", label: "回顾", note: "总结成长", icon: History },
  { href: "/assets", label: "资产", note: "管理钱包", icon: CircleDollarSign },
] as const;

export function LifeGameDashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.grid}>
        <CharacterProfile />
        <DailyTimeline />
        <QuestList />
        <QuickActions />
        <div className={styles.rightRail}>
          <GoalPanel />
          <AttributeRadar />
          <RecentAchievements />
        </div>
      </div>
    </div>
  );
}

function CharacterProfile() {
  const dashboard = useDashboardData();
  const { data: queryUser } = useUser({ enabled: !dashboard.active });
  const user = dashboard.data?.user ?? queryUser;
  const xp = user?.xpByArea ?? {};
  const statRows = DIMENSIONS.slice(0, 5);

  return (
    <section className={`${styles.panel} ${styles.profile}`} aria-label="角色档案">
      <Image
        className={styles.profileArt}
        src="/life-game/profile-panel-v2.png"
        alt="角色立绘"
        fill
        sizes="270px"
        priority
        unoptimized
      />
      <div className={styles.profileInfo}>
        <div className={styles.profileName}>{user?.name || "旅行者"}</div>
        <div className={styles.profileClass}>{user?.class || "人生探索者"}</div>
        <div className={styles.stats}>
          {statRows.map((item) => (
            <div className={styles.statRow} key={item.key}>
              <span className={styles.statDot}>{item.symbol}</span>
              <span>{item.label}</span>
              <span className={styles.statValue}>{formatNumber(xp[item.key] ?? 0)}</span>
            </div>
          ))}
        </div>
        <div className={styles.profileFoot}>
          人生阶段：<b>探索期</b>
          <span>当前目标：{user?.visionStatement || user?.motto || "持续升级自己"}</span>
        </div>
      </div>
    </section>
  );
}

function DailyTimeline() {
  const dashboard = useDashboardData();
  const { data: queryRoutines } = useRoutines({ enabled: !dashboard.active });
  const { data: queryCommissions } = useCommissions({ enabled: !dashboard.active });
  const routines = dashboard.data?.routines ?? queryRoutines;
  const commissions = dashboard.data?.commissions ?? queryCommissions;
  const complete = useCompleteCommission();

  const scheduleItems = useMemo(() => {
    const times = ["08:00", "10:00", "14:00", "18:00", "20:00"];
    const result: Array<{
      id: string;
      title: string;
      reward: number;
      done: boolean;
      time: string;
      commissionId?: string;
      empty?: boolean;
    }> = [];

    (commissions?.items ?? [])
      .filter((item: CommissionItem) => item.sourceType === "routine")
      .slice(0, 5)
      .forEach((item: CommissionItem, index: number) => {
        result.push({
          id: item.id,
          title: item.title,
          reward: item.xp,
          done: item.done,
          time: times[index],
          commissionId: item.id,
        });
      });

    for (const routine of routines ?? []) {
      if (result.length >= 5) break;
      if (result.some((item) => item.title === routine.title)) continue;
      result.push({
        id: routine.id,
        title: routine.title,
        reward: routine.xpReward,
        done: routine.completedToday,
        time: times[result.length],
      });
    }

    return times.map((time, index) => {
      const item = result[index];
      if (item) return { ...item, time };
      return {
        id: `empty-${time}`,
        title: "空闲",
        reward: 0,
        done: false,
        time,
        empty: true,
      };
    });
  }, [commissions, routines]);

  return (
    <section className={`${styles.panel} ${styles.schedule}`}>
      <PanelHeader
        icon={<CheckSquare2 size={17} />}
        title="今日计划"
        suffix={new Date().toLocaleDateString("zh-CN", {
          month: "long",
          day: "numeric",
          weekday: "short",
        })}
        href="/routines"
      />
      <div className={styles.timeline} role="list">
        {scheduleItems.map((item) => (
          <div
            className={styles.timeBlock}
            key={item.id}
            role="listitem"
          >
            <span className={styles.time}>{item.time}</span>
            {item.empty ? (
              <Link href="/routines" className={`${styles.scheduleItem} ${styles.scheduleEmpty}`}>
                <span className={styles.scheduleName}>尚未安排</span>
                <span className={styles.scheduleReward}>去安排</span>
              </Link>
            ) : item.commissionId && !item.done ? (
              <button
                type="button"
                className={styles.scheduleItem}
                onClick={() => complete.mutate(item.commissionId!)}
                disabled={complete.isPending}
                title="完成此日程"
              >
                <span className={styles.scheduleName}>{item.title}</span>
                <span className={styles.scheduleReward}>+{item.reward} XP</span>
              </button>
            ) : (
              <Link
                href="/routines"
                className={`${styles.scheduleItem} ${item.done ? styles.scheduleDone : ""}`}
              >
                <span className={styles.scheduleName}>{item.title}</span>
                <span className={styles.scheduleReward}>
                  {item.done ? "已完成" : `+${item.reward} XP`}
                </span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function QuestList() {
  const dashboard = useDashboardData();
  const { data: queryTodo } = useTasks("TODO", { enabled: !dashboard.active });
  const { data: queryDone } = useTasks("DONE", { enabled: !dashboard.active });
  const complete = useCompleteTask();
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const todo = dashboard.data?.tasksTodo ?? queryTodo ?? [];
  const done = dashboard.data?.tasksDone ?? queryDone ?? [];
  const items = (tab === "todo" ? todo : done).slice(0, 4);

  return (
    <section className={`${styles.panel} ${styles.tasks}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Sword size={18} />
          <span>任务列表</span>
          <div className={styles.taskTabs}>
            <button
              type="button"
              className={`${styles.taskTab} ${tab === "todo" ? styles.taskTabActive : ""}`}
              onClick={() => setTab("todo")}
            >
              进行中 ({todo.length})
            </button>
            <button
              type="button"
              className={`${styles.taskTab} ${tab === "done" ? styles.taskTabActive : ""}`}
              onClick={() => setTab("done")}
            >
              已完成 ({done.length})
            </button>
          </div>
        </div>
        <Link href="/tasks" className={styles.addTask}>
          <Plus size={13} />
          添加任务
        </Link>
      </div>

      {items.length === 0 ? (
        <Link href="/tasks" className={styles.empty}>
          <Sparkles size={25} />
          <span>{tab === "todo" ? "当前没有待办任务" : "还没有已完成任务"}</span>
        </Link>
      ) : (
        <div className={styles.taskList}>
          {items.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              done={tab === "done"}
              onComplete={() => complete.mutate(task.id)}
              disabled={complete.isPending}
            />
          ))}
        </div>
      )}

      <div className={styles.taskFooter}>
        <Link href="/tasks" className={styles.primaryButton}>
          查看全部任务
        </Link>
      </div>
    </section>
  );
}

function TaskRow({
  task,
  index,
  done,
  onComplete,
  disabled,
}: {
  task: TaskDTO;
  index: number;
  done: boolean;
  onComplete: () => void;
  disabled: boolean;
}) {
  const icons = [Sword, BookOpen, Map, HeartHandshake];
  const Icon = icons[index % icons.length];
  const due = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
    : "未设期限";

  return (
    <div className={styles.taskRow}>
      <div className={styles.taskIcon}>
        <span className={styles.taskIconBox}>
          <Icon size={21} />
        </span>
      </div>
      <div className={styles.taskMain}>
        <span className={styles.taskTitle}>{task.title}</span>
        <div className={styles.taskNotes}>
          {task.notes || task.area?.name || task.project?.title || "完成它，继续你的旅程"}
        </div>
      </div>
      <div className={styles.taskMeta}>
        <span>奖励</span>
        <span className={styles.reward}>EXP {task.xpReward} · G {task.goldReward}</span>
      </div>
      <div className={styles.taskMeta}>
        <span>{done ? "完成时间" : "截止"}</span>
        <span>{done && task.completedAt ? formatShortDate(task.completedAt) : due}</span>
      </div>
      <button
        type="button"
        className={styles.completeButton}
        onClick={onComplete}
        disabled={done || disabled}
        aria-label={done ? "任务已完成" : `完成任务：${task.title}`}
      >
        <Check size={17} />
      </button>
    </div>
  );
}

function QuickActions() {
  return (
    <section className={`${styles.panel} ${styles.quick}`}>
      <div className={styles.quickLayout}>
        <div className={styles.quickTitle}>快捷行动</div>
        {QUICK_ACTIONS.map(({ href, label, note, icon: Icon }) => (
          <Link className={styles.quickAction} href={href} key={href}>
            <Icon size={22} />
            <strong>{label}</strong>
            <span>{note}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function GoalPanel() {
  const { data: goals } = useGoals();
  const goal = goals?.find((item) => item.status === "active");
  const progress = goal ? goalProgress(goal) : 0;

  return (
    <section className={`${styles.panel} ${styles.rightPanel}`}>
      <PanelHeader icon={<Flag size={17} />} title="人生目标" href="/goals" />
      <div className={styles.goalBody}>
        <div className={styles.goalEyebrow}>主要目标</div>
        <div className={styles.goalCard}>
          <div className={styles.goalTitle}>{goal?.objective || "还没有设定人生目标"}</div>
          <div className={styles.goalNotes}>
            {goal?.notes || "前往目标页面，写下你想抵达的方向。"}
          </div>
          <div className={styles.goalProgress}>
            <div className={styles.goalTrack}>
              <div className={styles.goalFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.goalPercent}>{progress}%</span>
          </div>
        </div>

        <div className={styles.keyResults}>
          {(goal?.keyResults ?? []).slice(0, 3).map((result) => {
            const complete = result.target > 0 && result.current >= result.target;
            return (
              <div className={styles.keyResult} key={result.id}>
                <span className={styles.keyResultCheck}>{complete ? <Check size={9} /> : ""}</span>
                <span>{result.description}</span>
                <span className={styles.keyResultValue}>
                  {result.current}/{result.target}
                </span>
              </div>
            );
          })}
          {!goal && (
            <Link href="/goals" className={styles.keyResult}>
              <span className={styles.keyResultCheck}>+</span>
              <span>创建第一个目标</span>
              <span className={styles.keyResultValue}>开始</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function AttributeRadar() {
  const dashboard = useDashboardData();
  const { data: queryUser } = useUser({ enabled: !dashboard.active });
  const user = dashboard.data?.user ?? queryUser;
  const xp = user?.xpByArea ?? {};
  const raw = DIMENSIONS.map((item) => Math.max(0, xp[item.key] ?? 0));
  const max = Math.max(1, ...raw);
  const values = raw.map((value) => Math.max(16, Math.round((value / max) * 100)));
  const geometry = radarGeometry(values);

  return (
    <section className={`${styles.panel} ${styles.rightPanel}`}>
      <PanelHeader icon={<Sparkles size={17} />} title="属性成长" href="/analytics" />
      <Link href="/analytics" className={styles.radarWrap}>
        <div className={styles.radar}>
          <svg viewBox="0 0 190 163" aria-label="六维属性雷达图">
            {[0.25, 0.5, 0.75, 1].map((level) => (
              <polygon
                key={level}
                points={radarGeometry(DIMENSIONS.map(() => level * 100)).points}
                fill="none"
                stroke="#d6d8c8"
                strokeWidth="1"
              />
            ))}
            {geometry.axes.map(([x, y], index) => (
              <line key={index} x1="95" y1="81.5" x2={x} y2={y} stroke="#dedfd1" />
            ))}
            <polygon points={geometry.points} fill="rgba(57, 179, 113, .34)" stroke="#199b68" strokeWidth="2" />
          </svg>
          {geometry.labels.map(([x, y], index) => (
            <span className={styles.radarLabel} style={{ left: x, top: y }} key={DIMENSIONS[index].key}>
              {DIMENSIONS[index].label}
              <em>{formatNumber(raw[index])}</em>
            </span>
          ))}
        </div>
      </Link>
    </section>
  );
}

function RecentAchievements() {
  const { data: achievements } = useAchievements();
  const unlocked = (achievements ?? [])
    .filter((item) => item.unlocked)
    .sort((a, b) => (b.unlockedAt || "").localeCompare(a.unlockedAt || ""))
    .slice(0, 2);

  return (
    <section className={`${styles.panel} ${styles.rightPanel}`}>
      <PanelHeader icon={<Medal size={17} />} title="最近成就" href="/achievements" />
      <div className={styles.achievements}>
        {unlocked.map((item) => (
          <Link href="/achievements" className={styles.achievement} key={item.id}>
            <span className={styles.medal}>{item.emoji || "✦"}</span>
            <span>
              <strong>{item.name}</strong>
              <span>{item.description}</span>
            </span>
          </Link>
        ))}
        {unlocked.length === 0 && (
          <Link href="/achievements" className={styles.achievement}>
            <span className={styles.medal}>✦</span>
            <span>
              <strong>等待第一枚勋章</strong>
              <span>完成任务后会在这里点亮</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}

function PanelHeader({
  icon,
  title,
  suffix,
  href,
}: {
  icon: ReactNode;
  title: string;
  suffix?: string;
  href: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitle}>
        {icon}
        <span>{title}</span>
        {suffix && <span className={styles.dateLabel}>{suffix}</span>}
      </div>
      <Link href={href} className={styles.sectionLink}>
        查看全部
      </Link>
    </div>
  );
}

function goalProgress(goal: GoalDTO) {
  if (goal.keyResults.length === 0) return 0;
  const total = goal.keyResults.reduce((sum, result) => {
    if (result.target <= 0) return sum;
    return sum + Math.min(1, Math.max(0, result.current / result.target));
  }, 0);
  return Math.round((total / goal.keyResults.length) * 100);
}

function radarGeometry(values: number[]) {
  const cx = 95;
  const cy = 81.5;
  const radius = 55;
  const labelRadius = 74;
  const axes = values.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
  });
  const points = values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
      const r = radius * (value / 100);
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    })
    .join(" ");
  const labels = values.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / values.length;
    return [
      `${((cx + Math.cos(angle) * labelRadius) / 190) * 100}%`,
      `${((cy + Math.sin(angle) * labelRadius) / 163) * 100}%`,
    ] as const;
  });
  return { axes, points, labels };
}

function formatNumber(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString("zh-CN");
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}
