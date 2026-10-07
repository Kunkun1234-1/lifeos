"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import {
  useGoals,
  useCreateGoal,
  useUser,
} from "@/hooks/queries";
import type { GoalDTO, GoalType } from "@/lib/types";
import styles from "./page.module.css";

type StatusFilter = "active" | "done" | "all";
type CategoryFilter = "all" | "main" | "none" | string;
type PanelAction = "create" | null;

const STATUS_LABEL: Record<GoalDTO["status"], string> = {
  active: "进行中",
  done: "已完成",
  paused: "暂停",
  archived: "归档",
};

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  main: "主线",
  okr: "OKR",
  milestone: "里程碑",
};

const TIPS = [
  "一个季度只盯少数 Objective，关键结果要可量化、可验证，进度才看得见。",
  "每周只更新关键结果数字，比反复改目标陈述更能积累推进感。",
  "领域分布过于偏科时，不妨从较弱领域补一个小目标，平衡人生属性。",
];

const EMPTY_GOALS: GoalDTO[] = [];

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
  const { data: goals, isLoading, error } = useGoals();
  const { data: user } = useUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [action, setAction] = useState<PanelAction>(null);

  const list = goals ?? EMPTY_GOALS;
  const stats = useMemo(() => deriveGoalStats(list), [list]);
  const areas = useMemo(() => collectAreas(list), [list]);
  const mainCount = useMemo(
    () => list.filter((goal) => goal.type === "main").length,
    [list],
  );

  const filtered = list
    .filter((goal) => {
      if (statusFilter !== "all" && goal.status !== statusFilter) return false;
      if (categoryFilter !== "all") {
        if (categoryFilter === "main") return goal.type === "main";
        if (categoryFilter === "none") return !goal.areaId && goal.type !== "main";
        return goal.areaId === categoryFilter;
      }
      return true;
    })
    .sort((a, b) => Number(b.type === "main") - Number(a.type === "main"));

  const name = user?.name || "旅行者";
  const title = user?.equippedTitle?.name || user?.class || "人生探索者";
  const vision =
    user?.visionStatement?.trim() ||
    user?.motto?.trim() ||
    "尚未设定愿景，可在设置中填写 Vision & Identity。";
  const tip = TIPS[stats.active % TIPS.length];
  const levelProgress =
    user && user.xpForNext > 0 ? Math.min(1, user.xpIntoLevel / user.xpForNext) : 0;

  if (isLoading) {
    return <PageMessage title="正在整理目标" detail="正在读取 OKR 与关键结果..." />;
  }
  if (error) {
    return <PageMessage title="目标页暂时无法打开" detail={error.message} danger />;
  }

  const openCreate = (mode: Exclude<PanelAction, null>) => {
    setAction((current) => (current === mode ? null : mode));
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>人生目标</h1>
        <p className={styles.pageDesc}>Objective · Key Results · 把愿景拆成可推进的里程碑</p>
      </header>

      <div className={styles.layout} data-empty={list.length === 0}>
        <aside className={styles.profile} aria-label="目标愿景卡">
          <div className={styles.profileArtWrap}>
            <Image
              className={styles.profileArt}
              src="/art-packs/legacy-lifeos/life-game/profile-panel-v2.png"
              alt="角色立绘"
              fill
              sizes="260px"
              priority
              unoptimized
            />
          </div>
          <div className={styles.profileBody}>
            <div className={styles.profileCard}>
              <div className={styles.profileName}>{name}</div>
              <div className={styles.profileTitle}>{title}</div>

              <div className={styles.levelBlock}>
                <div className={styles.levelRow}>
                  <span className={styles.levelLabel}>探索等级</span>
                  <span className={styles.levelValue}>Lv.{user?.level ?? 1}</span>
                </div>
                <div className={styles.xpTrack} aria-hidden>
                  <div
                    className={styles.xpFill}
                    style={{ width: `${levelProgress * 100}%` }}
                  />
                </div>
                <div className={styles.xpMeta}>
                  {user?.xpIntoLevel ?? 0} / {user?.xpForNext ?? 100} XP
                </div>
              </div>

              <div className={styles.statList}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>进行中</span>
                  <span className={styles.statValue}>{stats.active}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>已完成</span>
                  <span className={styles.statValue}>{stats.done}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>本季关键结果</span>
                  <span className={styles.statValue}>{stats.quarterKrCount}</span>
                </div>
              </div>
            </div>

            <div className={styles.styleBlock}>
              <div className={styles.styleBadge}>
                <Sparkles size={12} />
                愿景一句
              </div>
              <p className={styles.styleDesc}>{vision}</p>
            </div>
          </div>
          <div className={styles.profileFoot} aria-hidden />
        </aside>

        <div className={styles.center}>
          <section className={styles.metrics} aria-label="目标概览">
            <article className={styles.metricCard} data-tone="green">
              <div className={styles.metricLabel}>目标总数</div>
              <div className={styles.metricValue}>{stats.total}</div>
              <div className={styles.metricDelta}>含暂停/归档 {stats.other}</div>
            </article>
            <article className={styles.metricCard} data-tone="active">
              <div className={styles.metricLabel}>进行中</div>
              <div className={styles.metricValue}>{stats.active}</div>
              <div className={styles.metricDelta}>已完成 {stats.done}</div>
            </article>
            <article className={styles.metricCard} data-tone="rate">
              <div className={styles.metricLabel}>完成率</div>
              <div className={styles.metricBalanceRow}>
                <div>
                  <div className={styles.metricValue}>{stats.completionRate.toFixed(0)}%</div>
                  <div className={styles.metricHint}>已完成 /（进行中+已完成）</div>
                </div>
                <div className={styles.ringWrap} aria-hidden>
                  <svg className={styles.ringSvg} viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="17" fill="none" stroke="#e8ead8" strokeWidth="5" />
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="none"
                      stroke="#249d6d"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(stats.completionRate / 100) * 106.76} 106.76`}
                    />
                  </svg>
                  <div className={styles.ringLabel}>{Math.round(stats.completionRate)}%</div>
                </div>
              </div>
            </article>
            <article className={styles.metricCard} data-tone="week">
              <div className={styles.metricLabel}>当前进度</div>
              <div className={styles.metricValue}>{stats.weekProxy}%</div>
              <div className={styles.metricHint}>
                进行中目标的平均进度
              </div>
            </article>
          </section>

          <div className={styles.tabs} role="tablist" aria-label="状态筛选">
            {(["active", "done", "all"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={styles.tabBtn}
                data-active={statusFilter === key}
                onClick={() => setStatusFilter(key)}
              >
                {key === "all" ? "全部" : STATUS_LABEL[key]}
              </button>
            ))}
          </div>

          <div className={styles.segToggle} aria-label="目标分类筛选">
            <button
              type="button"
              className={styles.segBtn}
              data-active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              全部
            </button>
            <button
              type="button"
              className={styles.segBtn}
              data-active={categoryFilter === "main"}
              onClick={() => setCategoryFilter("main")}
            >
              主线{mainCount > 0 ? ` · ${mainCount}` : ""}
            </button>
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                className={styles.segBtn}
                data-active={categoryFilter === area.id}
                onClick={() => setCategoryFilter(area.id)}
              >
                {area.icon} {area.name}
              </button>
            ))}
            <button
              type="button"
              className={styles.segBtn}
              data-active={categoryFilter === "none"}
              onClick={() => setCategoryFilter("none")}
            >
              未分类
            </button>
          </div>

          <section className={styles.actions} aria-label="目标操作">
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="create"
              data-active={action === "create"}
              data-testid="new-goal-trigger"
              onClick={() => openCreate("create")}
            >
              <Plus size={16} />
              新建目标
            </button>
          </section>

          {action ? (
            <section className={styles.actionPanel}>
              <NewGoalForm onDone={() => setAction(null)} />
            </section>
          ) : null}

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>目标列表</h2>
              <span className={styles.panelMeta}>{filtered.length} 项</span>
            </div>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                {list.length === 0 ? (
                  <>
                    <strong>从第一个目标开始</strong>
                    <span>写下想推进的方向，再逐步拆成可完成的关键结果。</span>
                  </>
                ) : (
                  <span>当前筛选下没有目标。</span>
                )}
                <button type="button" onClick={() => setAction("create")}>
                  {list.length === 0 ? "建立第一个目标 →" : "新建目标 →"}
                </button>
              </div>
            ) : (
              <div className={styles.goalGrid} data-testid="goal-grid">
                {filtered.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className={styles.tip}>
          <Image
            className={styles.tipMascot}
            src="/art-packs/legacy-lifeos/life-game/pixel-dragon-v1.png"
            alt=""
            width={56}
            height={48}
            unoptimized
          />
          <div>
            <div className={styles.tipLabel}>目标小贴士</div>
            <p className={styles.tipText}>{tip}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NewGoalForm({ onDone }: { onDone: () => void }) {
  const create = useCreateGoal();
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("okr");
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
      type: goalType,
      areaId,
      timeframe,
      keyResults: validKRs,
    });
    onDone();
  };

  return (
    <div className={styles.formShell}>
      <div className={styles.formHead}>
        <div>
          <h2 className={styles.formTitle}>新建目标</h2>
          <p className={styles.formDetail}>
            Objective + Key Results · 季度/年度长程目标
          </p>
        </div>
        <button type="button" className={styles.iconBtn} onClick={onDone} title="关闭">
          <X size={14} />
        </button>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <Label>目标陈述</Label>
          <Input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="例如：成为一名能独立发布产品的全栈开发者"
            autoFocus
          />
        </div>
        <div className={styles.formRow2}>
          <div className={styles.field}>
            <Label>目标分类</Label>
            <Select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
            >
              <option value="main">主线目标</option>
              <option value="okr">季度 / 年度 OKR</option>
              <option value="milestone">里程碑</option>
            </Select>
          </div>
          <div className={styles.field}>
            <Label>人生领域</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
        </div>
        <div className={styles.field}>
          <Label>时间框</Label>
          <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            {TIMEFRAME_PRESETS.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.field}>
          <Label>备注（可选）</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="为什么重要 · 关联的身份陈述"
            rows={2}
          />
        </div>
        <div className={styles.field}>
          <Label>关键结果</Label>
          <div className={styles.krList}>
            {krs.map((kr, i) => (
              <div key={i} className={styles.krEditRow}>
                <span className={styles.krEditTag}>KR{i + 1}</span>
                <Input
                  value={kr.description}
                  onChange={(e) => {
                    const next = [...krs];
                    next[i] = { ...next[i], description: e.target.value };
                    setKrs(next);
                  }}
                  placeholder="例如：完成 1 个上线的全栈项目"
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
                  placeholder="次/篇"
                  className="w-20"
                />
                {krs.length > 1 ? (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setKrs(krs.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            ))}
            {krs.length < 5 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setKrs([...krs, { description: "", target: 1, unit: "次" }])}
              >
                <Plus size={14} /> 添加 KR
              </Button>
            ) : null}
          </div>
        </div>
        <div className={styles.formFooter}>
          <Button variant="ghost" onClick={onDone}>
            取消
          </Button>
          <Button
            onClick={submit}
            disabled={
              create.isPending || !objective.trim()
            }
          >
            {create.isPending ? "保存中…" : "创建目标"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalDTO }) {
  const totalProgress = goalProgress(goal);
  const isDone = goal.status === "done";
  const completedKrs = goal.keyResults.filter(
    (result) => result.target > 0 && result.current >= result.target,
  ).length;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className={styles.goalCard}
      data-done={isDone}
      data-testid={`goal-card-${goal.id}`}
      aria-label={`打开目标：${goal.objective}`}
    >
      <div className={styles.goalTop}>
        <div className={styles.goalBadges}>
          {goal.type === "main" ? (
            <span className={`${styles.chip} ${styles.chipMain}`}>主线</span>
          ) : goal.type === "milestone" ? (
            <span className={styles.chip}>{GOAL_TYPE_LABEL.milestone}</span>
          ) : null}
          <span className={styles.chip}>{goal.timeframe}</span>
          {goal.area ? (
            <span className={`${styles.chip} ${styles.chipArea}`}>
              {goal.area.icon} {goal.area.name}
            </span>
          ) : null}
          <span className={`${styles.chip} ${styles.chipStatus}`} data-status={goal.status}>
            {STATUS_LABEL[goal.status]}
          </span>
        </div>
        <ArrowUpRight className={styles.goalArrow} size={18} aria-hidden />
      </div>

      <h3 className={styles.goalObjective}>{goal.objective}</h3>
      <p className={styles.goalDescription}>
        {goal.notes?.trim() || "打开规划地图，继续拆解项目与里程碑。"}
      </p>

      <div className={styles.progressBlock}>
        <div className={styles.progressTop}>
          <span className={styles.progressLabel}>
            关键结果 {completedKrs}/{goal.keyResults.length}
          </span>
          <span className={styles.progressValue}>{totalProgress}%</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={`${goal.objective}关键结果进度`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={totalProgress}
        >
          <div className={styles.progressFill} style={{ width: `${totalProgress}%` }} />
        </div>
      </div>
      <span className={styles.goalCta}>进入规划地图</span>
    </Link>
  );
}

function PageMessage({
  title,
  detail,
  danger = false,
}: {
  title: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className={styles.message}>
      <Target size={28} className={danger ? "mx-auto text-[var(--danger)]" : "mx-auto text-[#096149]"} />
      <h1>{title}</h1>
      <p>{detail}</p>
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

function currentQuarterKey() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q}-${now.getFullYear()}`;
}

function deriveGoalStats(goals: GoalDTO[]) {
  const active = goals.filter((g) => g.status === "active").length;
  const done = goals.filter((g) => g.status === "done").length;
  const other = goals.filter((g) => g.status === "paused" || g.status === "archived").length;
  const total = goals.length;
  const denom = active + done;
  const completionRate = denom > 0 ? (done / denom) * 100 : 0;

  const quarter = currentQuarterKey();
  const quarterKrCount = goals
    .filter((g) => g.timeframe === quarter)
    .reduce((sum, g) => sum + g.keyResults.length, 0);

  const activeGoals = goals.filter((g) => g.status === "active");
  const weekProxy =
    activeGoals.length > 0
      ? Math.round(
          activeGoals.reduce((sum, g) => sum + goalProgress(g), 0) / activeGoals.length,
        )
      : 0;

  return {
    total,
    active,
    done,
    other,
    completionRate,
    quarterKrCount,
    weekProxy,
  };
}

function collectAreas(goals: GoalDTO[]) {
  const map = new Map<string, { id: string; name: string; icon: string }>();
  for (const goal of goals) {
    if (goal.area) {
      map.set(goal.area.id, {
        id: goal.area.id,
        name: goal.area.name,
        icon: goal.area.icon,
      });
    }
  }
  return [...map.values()];
}
