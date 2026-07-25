"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ClipboardList,
  Edit3,
  FolderKanban,
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
  useUpdateGoal,
  useDeleteGoal,
  useUpdateKR,
  useUser,
} from "@/hooks/queries";
import type { GoalDTO, GoalType, KeyResultDTO } from "@/lib/types";
import styles from "./page.module.css";

type StatusFilter = "active" | "done" | "all";
type CategoryFilter = "all" | "main" | "none" | string;
type PanelAction = "create" | "add-kr" | null;

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

const AREA_COLORS = ["#249d6d", "#c9a227", "#5b9ec9", "#8a9a3a", "#d4784a", "#6b8f71"];

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

  const list = goals ?? [];
  const stats = useMemo(() => deriveGoalStats(list), [list]);
  const areas = useMemo(() => collectAreas(list), [list]);
  const milestones = useMemo(() => buildMilestones(list), [list]);
  const areaDist = useMemo(() => buildAreaDistribution(list), [list]);
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

      <div className={styles.layout}>
        <aside className={styles.profile} aria-label="目标愿景卡">
          <div className={styles.profileArtWrap}>
            <Image
              className={styles.profileArt}
              src="/life-game/profile-panel-v2.png"
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
              <div className={styles.metricLabel}>本周推进</div>
              <div className={styles.metricValue}>{stats.weekProxy}%</div>
              <div className={styles.metricHint}>
                占位：活跃目标均进度（无 KR 周更字段）
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

          <section className={styles.actions} aria-label="快捷操作">
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="create"
              data-active={action === "create"}
              onClick={() => openCreate("create")}
            >
              <Plus size={16} />
              新建目标
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="kr"
              data-active={action === "add-kr"}
              onClick={() => openCreate("add-kr")}
            >
              <Target size={16} />
              添加关键结果
            </button>
            <Link href="/review" className={styles.actionBtn} data-kind="review">
              <ClipboardList size={16} />
              回顾进度
            </Link>
          </section>

          {action ? (
            <section className={styles.actionPanel}>
              <NewGoalForm
                mode={action}
                onDone={() => setAction(null)}
              />
            </section>
          ) : null}

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>目标列表</h2>
              <span className={styles.panelMeta}>{filtered.length} 项</span>
            </div>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                暂无符合条件的目标。{" "}
                <button type="button" onClick={() => setAction("create")}>
                  立即创建一个 →
                </button>
              </div>
            ) : (
              <div className={styles.goalGrid}>
                {filtered.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className={styles.rightRail} aria-label="目标洞察">
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>近期里程碑</h2>
            </div>
            {milestones.length === 0 ? (
              <div className={styles.empty}>暂无即将到期的目标</div>
            ) : (
              <div className={styles.milestoneList}>
                {milestones.map((item) => (
                  <div key={item.id} className={styles.milestoneItem}>
                    <div className={styles.milestoneTop}>
                      <span className={styles.milestoneName}>{item.title}</span>
                      <span
                        className={styles.milestoneDate}
                        data-soon={item.daysLeft <= 14}
                      >
                        {item.dateLabel}
                      </span>
                    </div>
                    <div className={styles.milestoneSub}>{item.subtitle}</div>
                    <div className={styles.milestoneTrack}>
                      <div
                        className={styles.milestoneFill}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>领域分布</h2>
            </div>
            {areaDist.length === 0 ? (
              <div className={styles.empty}>还没有带领域的目标</div>
            ) : (
              <div className={styles.usageList}>
                {areaDist.map((item) => (
                  <div key={item.key} className={styles.usageRow}>
                    <div className={styles.usageTop}>
                      <span className={styles.usageName}>{item.label}</span>
                      <span className={styles.usagePct}>
                        {item.count} · {item.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className={styles.usageTrack}>
                      <div
                        className={styles.usageFill}
                        style={{
                          width: `${item.pct}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>快捷入口</h2>
            </div>
            <div className={styles.quickLinks}>
              <Link href="/projects" className={styles.quickLink}>
                <span>
                  <FolderKanban size={14} style={{ display: "inline", marginRight: 6 }} />
                  项目管理
                </span>
                <span className={styles.quickHint}>关联交付 ›</span>
              </Link>
              <Link href="/review" className={styles.quickLink}>
                <span>
                  <ClipboardList size={14} style={{ display: "inline", marginRight: 6 }} />
                  复盘回顾
                </span>
                <span className={styles.quickHint}>周/季复盘 ›</span>
              </Link>
              <Link href="/strategy" className={styles.quickLink}>
                <span>
                  <Target size={14} style={{ display: "inline", marginRight: 6 }} />
                  战略地图
                </span>
                <span className={styles.quickHint}>愿景对齐 ›</span>
              </Link>
            </div>
          </article>
        </aside>

        <aside className={styles.tip}>
          <Image
            className={styles.tipMascot}
            src="/life-game/pixel-dragon-v1.png"
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

function NewGoalForm({
  mode,
  onDone,
}: {
  mode: Exclude<PanelAction, null>;
  onDone: () => void;
}) {
  const create = useCreateGoal();
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("okr");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(TIMEFRAME_PRESETS[0]);
  const [krs, setKrs] = useState<{ description: string; target: number; unit: string }[]>([
    { description: "", target: 1, unit: "次" },
  ]);

  const isKrFocus = mode === "add-kr";

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
    if (isKrFocus && validKRs.length === 0) return;
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
          <h2 className={styles.formTitle}>
            {isKrFocus ? "新建目标并添加关键结果" : "新建目标"}
          </h2>
          <p className={styles.formDetail}>
            {isKrFocus
              ? "现有 API 仅支持创建时写入 KR；将一并创建 Objective。"
              : "Objective + Key Results · 季度/年度长程目标"}
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
              create.isPending ||
              !objective.trim() ||
              (isKrFocus && !krs.some((k) => k.description.trim()))
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
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const updateKR = useUpdateKR();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const totalProgress = goalProgress(goal);
  const isDone = goal.status === "done";

  if (editing) {
    return (
      <div className={styles.goalCard}>
        <GoalEditForm goal={goal} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={styles.goalCard} data-done={isDone}>
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
        <div className={styles.goalActions}>
          {!isDone ? (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
              title="标记完成"
              onClick={() => update.mutate({ id: goal.id, body: { status: "done" } })}
              disabled={update.isPending}
            >
              <Check size={14} />
            </button>
          ) : null}
          {!isDone ? (
            <button
              type="button"
              className={styles.iconBtn}
              title="编辑"
              onClick={() => setEditing(true)}
            >
              <Edit3 size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className={styles.iconBtn}
            title="删除"
            onClick={() => {
              if (confirm("删除这个目标？")) remove.mutate(goal.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className={styles.goalObjective} data-done={isDone}>
        {goal.objective}
      </h3>

      <div className={styles.progressBlock}>
        <div className={styles.progressTop}>
          <span className={styles.progressLabel}>整体进度</span>
          <span className={styles.progressValue}>{totalProgress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      {goal.keyResults.length > 0 ? (
        <div className={styles.krSummary}>
          {goal.keyResults.slice(0, 3).map((kr, i) => (
            <span key={kr.id} className={styles.krPill}>
              <span className={styles.krPillName}>
                KR{i + 1} {kr.description}
              </span>
              <span className={styles.krPillVal}>
                {kr.current}/{kr.target}
                {kr.unit ? ` ${kr.unit}` : ""}
              </span>
            </span>
          ))}
          {goal.keyResults.length > 3 ? (
            <span className={styles.krPill}>+{goal.keyResults.length - 3}</span>
          ) : null}
        </div>
      ) : (
        <div className={styles.metricHint} style={{ marginTop: 10 }}>
          尚未设置关键结果
        </div>
      )}

      <button
        type="button"
        className={styles.tabBtn}
        style={{ marginTop: 10 }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "收起关键结果" : "展开更新进度"}
      </button>

      {expanded ? (
        <ul className={styles.krList}>
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
      ) : null}

      {!isDone ? (
        <div className={styles.confidenceRow}>
          <span>信心</span>
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
          />
          <span className={styles.confidenceVal}>{goal.confidence}/10</span>
        </div>
      ) : null}

      {goal.projects.length > 0 ? (
        <div className={styles.linkedProjects}>
          <div className={styles.linkedLabel}>关联项目 · {goal.projects.length}</div>
          <div className={styles.linkedList}>
            {goal.projects.map((p) => (
              <Link key={p.id} href="/projects" className={styles.linkedLink}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
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
  const progress = kr.target > 0 ? Math.min(100, (kr.current / kr.target) * 100) : 0;

  return (
    <li className={styles.krRow}>
      <div className={styles.krRowTop}>
        <span className={styles.krLabel}>{label}</span>
        <span className={styles.krDesc}>{kr.description}</span>
        <div className={styles.krMeta}>
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
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
                onClick={() => {
                  onUpdate(val);
                  setEditing(false);
                }}
              >
                <Check size={12} />
              </button>
            </>
          ) : (
            <>
              <span className={styles.krNums}>
                {kr.current}/{kr.target} {kr.unit ?? ""}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setEditing(true)}
                  title="更新进度"
                >
                  <Edit3 size={12} />
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className={styles.krTrack}>
        <div className={styles.krFill} style={{ width: `${progress}%` }} />
      </div>
    </li>
  );
}

function GoalEditForm({ goal, onDone }: { goal: GoalDTO; onDone: () => void }) {
  const update = useUpdateGoal();
  const [objective, setObjective] = useState(goal.objective);
  const [notes, setNotes] = useState(goal.notes ?? "");
  const [goalType, setGoalType] = useState<GoalType>(
    goal.type === "main" || goal.type === "milestone" || goal.type === "okr"
      ? goal.type
      : "okr",
  );
  const [areaId, setAreaId] = useState<string | null>(goal.areaId ?? null);
  const [timeframe, setTimeframe] = useState(goal.timeframe);
  const [confidence, setConfidence] = useState(goal.confidence ?? 5);

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
        type: goalType,
        areaId,
        timeframe,
        confidence,
      },
    });
    onDone();
  };

  return (
    <div className={styles.formShell}>
      <div className={styles.formHead}>
        <div>
          <h2 className={styles.formTitle}>编辑目标</h2>
          <p className={styles.formDetail}>KR 进度在卡片内展开更新</p>
        </div>
        <button type="button" className={styles.iconBtn} onClick={onDone} title="取消">
          <X size={14} />
        </button>
      </div>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <Label>目标陈述</Label>
          <Input value={objective} onChange={(e) => setObjective(e.target.value)} autoFocus />
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
            {timeframeOptions.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.field}>
          <Label>备注</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <div className={styles.field}>
          <Label>信心 (1-10)：{confidence}</Label>
          <Input
            type="range"
            min={1}
            max={10}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
          />
        </div>
        <p className={styles.formNote}>KR 请在卡片里点「展开更新进度」编辑当前值。</p>
        <div className={styles.formFooter}>
          <Button variant="ghost" onClick={onDone}>
            取消
          </Button>
          <Button onClick={submit} disabled={update.isPending || !objective.trim()}>
            {update.isPending ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>
    </div>
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

function buildMilestones(goals: GoalDTO[]) {
  const now = Date.now();
  return goals
    .filter((g) => g.status === "active" && g.endDate)
    .map((g) => {
      const end = new Date(g.endDate);
      const daysLeft = Math.ceil((end.getTime() - now) / (1000 * 60 * 60 * 24));
      const incompleteKr = g.keyResults.find((kr) => kr.current < kr.target);
      return {
        id: g.id,
        title: g.objective,
        subtitle: incompleteKr
          ? `待推进 · ${incompleteKr.description}`
          : g.keyResults.length > 0
            ? "关键结果已满进度"
            : "暂无关键结果",
        dateLabel: formatShortDate(g.endDate),
        daysLeft,
        progress: goalProgress(g),
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);
}

function buildAreaDistribution(goals: GoalDTO[]) {
  const counts = new Map<string, { label: string; count: number }>();
  const mainGoals = goals.filter((goal) => goal.type === "main");
  if (mainGoals.length > 0) {
    counts.set("main", { label: "主线", count: mainGoals.length });
  }
  for (const goal of goals) {
    if (goal.type === "main") continue;
    const key = goal.area?.id ?? "none";
    const label = goal.area ? `${goal.area.icon} ${goal.area.name}` : "未分类";
    const prev = counts.get(key);
    counts.set(key, { label, count: (prev?.count ?? 0) + 1 });
  }
  const total = Math.max(1, goals.length);
  return [...counts.entries()]
    .map(([key, value], index) => ({
      key,
      label: value.label,
      count: value.count,
      pct: (value.count / total) * 100,
      color:
        key === "main" ? "#c9a227" : AREA_COLORS[index % AREA_COLORS.length],
    }))
    .sort((a, b) => {
      if (a.key === "main") return -1;
      if (b.key === "main") return 1;
      return b.count - a.count;
    });
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
