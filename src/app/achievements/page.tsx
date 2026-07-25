"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
  Unlock,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  useAchievements,
  useCreateCustomAchievement,
  useDeleteCustomAchievement,
  useTitles,
  useUnlockAchievement,
  useUser,
} from "@/hooks/queries";
import type { AchievementDTO, TitleDTO } from "@/lib/types";
import styles from "./page.module.css";

type UiCategory =
  | "all"
  | "learning"
  | "tasks"
  | "wealth"
  | "habits"
  | "explore"
  | "hidden";

type SortMode = "default" | "progress" | "reward";
type Tier = "bronze" | "silver" | "gold" | "legendary";

const EMPTY_ACHIEVEMENTS: AchievementDTO[] = [];
const EMPTY_TITLES: TitleDTO[] = [];

const TIERS = ["bronze", "silver", "gold", "legendary"] as const;

const TIER_META = {
  bronze: { cn: "铜牌" },
  silver: { cn: "银牌" },
  gold: { cn: "金牌" },
  legendary: { cn: "传说" },
} as const;

const CATEGORY_TABS: Array<{ key: UiCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "learning", label: "学习成长" },
  { key: "tasks", label: "任务执行" },
  { key: "wealth", label: "财富管理" },
  { key: "habits", label: "生活习惯" },
  { key: "explore", label: "探索收藏" },
  { key: "hidden", label: "隐藏成就" },
];

const MILESTONES = [
  { key: "start", label: "起步", threshold: 10, reward: 100 },
  { key: "steady", label: "稳步", threshold: 25, reward: 150 },
  { key: "bloom", label: "初成", threshold: 50, reward: 200 },
  { key: "excel", label: "卓越", threshold: 75, reward: 300 },
  { key: "legend", label: "传奇人生", threshold: 100, reward: 500 },
] as const;

const GRID_PREVIEW = 8;

function achievementPoints(a: AchievementDTO) {
  return a.reward.gold + a.reward.gems * 40 + a.reward.fate * 60;
}

function isHiddenLocked(a: AchievementDTO) {
  return a.hidden && !a.unlocked;
}

function uiCategory(a: AchievementDTO): Exclude<UiCategory, "all"> {
  if (a.hidden) return "hidden";
  const key = a.key.toLowerCase();
  if (/note|principle|decision|review|postmortem|dalio/.test(key)) return "learning";
  if (/task/.test(key)) return "tasks";
  if (/wallet|asset|money|wealth|gold_earn|finance/.test(key)) return "wealth";
  if (/streak|routine|habit/.test(key)) return "habits";
  return "explore";
}

function cardStatus(a: AchievementDTO): "unlocked" | "progress" | "locked" {
  if (a.unlocked) return "unlocked";
  if (a.current > 0 && !isHiddenLocked(a)) return "progress";
  return "locked";
}

function levelFromPoints(points: number) {
  const step = 350;
  const level = Math.max(1, Math.floor(points / step) + 1);
  const into = points % step;
  const next = step;
  return { level, into, next, progress: into / next };
}

function consecutiveUnlockDays(unlocked: AchievementDTO[]) {
  const days = new Set(
    unlocked
      .map((a) => a.unlockedAt)
      .filter((v): v is string => Boolean(v))
      .map((v) => {
        const d = new Date(v);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
  );
  if (days.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;
  for (;;) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!days.has(key)) {
      if (streak === 0) {
        // allow starting from yesterday if nothing today
        cursor.setDate(cursor.getDate() - 1);
        const yKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!days.has(yKey)) break;
        streak = 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function relativeUnlockLabel(iso: string | null) {
  if (!iso) return "刚刚";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return formatDate(iso);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return formatDate(iso);
}

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export default function AchievementsPage() {
  const { data: items } = useAchievements();
  const { data: user } = useUser();
  const { data: titlesData } = useTitles();
  const [category, setCategory] = useState<UiCategory>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [showAll, setShowAll] = useState(false);
  const [managing, setManaging] = useState(false);
  const [medalIndex, setMedalIndex] = useState(0);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const list = items ?? EMPTY_ACHIEVEMENTS;
  const titles = titlesData?.items ?? EMPTY_TITLES;

  const customItems = useMemo(
    () => list.filter((achievement) => achievement.isCustom),
    [list],
  );

  const dashboard = useMemo(() => {
    const unlocked = list.filter((a) => a.unlocked);
    const points = unlocked.reduce((sum, a) => sum + achievementPoints(a), 0);
    const level = levelFromPoints(points);
    const rate = list.length ? (unlocked.length / list.length) * 100 : 0;
    const rareCount = unlocked.filter(
      (a) => a.tier === "gold" || a.tier === "legendary",
    ).length;
    const streakDays = consecutiveUnlockDays(unlocked);
    const recent = [...unlocked]
      .filter((a) => a.unlockedAt)
      .sort((a, b) => Date.parse(b.unlockedAt ?? "") - Date.parse(a.unlockedAt ?? ""));
    const firstUnlock = [...unlocked]
      .filter((a) => a.unlockedAt)
      .sort((a, b) => Date.parse(a.unlockedAt ?? "") - Date.parse(b.unlockedAt ?? ""))[0];

    const weekStart = startOfWeek().getTime();
    const unlockedThisWeek = unlocked.filter(
      (a) => a.unlockedAt && Date.parse(a.unlockedAt) >= weekStart,
    );
    const pointsThisWeek = unlockedThisWeek.reduce(
      (sum, a) => sum + achievementPoints(a),
      0,
    );
    const streakTarget = Math.max(
      0,
      ...list.filter((a) => a.category === "streak").map((a) => a.current),
    );

    return {
      unlockedCount: unlocked.length,
      totalCount: list.length,
      points,
      level,
      rate,
      rareCount,
      streakDays,
      recent,
      firstUnlockAt: firstUnlock?.unlockedAt ?? null,
      unlockedThisWeek: unlockedThisWeek.length,
      pointsThisWeek,
      streakTarget,
    };
  }, [list]);

  const visibleItems = useMemo(() => {
    const next = list.filter((a) => {
      if (category === "all") return true;
      if (category === "hidden") return a.hidden;
      return uiCategory(a) === category && !isHiddenLocked(a);
    });

    if (sortMode === "progress") return [...next].sort((a, b) => b.progress - a.progress);
    if (sortMode === "reward") {
      return [...next].sort((a, b) => achievementPoints(b) - achievementPoints(a));
    }
    return [...next].sort((a, b) => {
      const rank = { progress: 0, unlocked: 1, locked: 2 } as const;
      const diff = rank[cardStatus(a)] - rank[cardStatus(b)];
      if (diff !== 0) return diff;
      return b.progress - a.progress;
    });
  }, [category, list, sortMode]);

  const gridItems = showAll ? visibleItems : visibleItems.slice(0, GRID_PREVIEW);

  const medals = useMemo(() => {
    const unlockedTitles = titles.filter((t) => t.unlocked);
    if (unlockedTitles.length) return unlockedTitles;
    return dashboard.recent.slice(0, 8).map((a) => ({
      key: a.id,
      name: a.name,
      emoji: a.emoji,
      tier: a.tier,
    }));
  }, [dashboard.recent, titles]);

  const equippedTitle =
    titles.find((t) => t.equipped) ??
    titles.find((t) => t.unlocked) ??
    null;

  const visibleMedals = medals.slice(medalIndex, medalIndex + 4);
  const canMedalPrev = medalIndex > 0;
  const canMedalNext = medalIndex + 4 < medals.length;

  const weeklyGoals = [
    {
      id: "unlock",
      label: "解锁 3 个新成就",
      current: dashboard.unlockedThisWeek,
      target: 3,
      reward: 60,
    },
    {
      id: "streak",
      label: "保持 7 日连击",
      current: Math.min(dashboard.streakTarget || dashboard.streakDays, 7),
      target: 7,
      reward: 40,
      displayCurrent: dashboard.streakTarget || dashboard.streakDays,
    },
    {
      id: "points",
      label: "获得 300 成就点",
      current: dashboard.pointsThisWeek,
      target: 300,
      reward: 80,
    },
  ];

  const avatarSrc =
    user?.avatarUrl ||
    "/life-game/dashboard-hunter-v1.png";

  return (
    <div className={styles.page}>
      <div className={styles.topActions}>
        <button
          type="button"
          className={styles.manageButton}
          onClick={() => setManaging(true)}
        >
          <Settings2 size={15} />
          管理成就
        </button>
      </div>

      {/* 1) 顶栏四卡 */}
      <section className={styles.statRow} aria-label="成就总览">
        <StatCard
          icon={<Trophy size={22} />}
          iconTone="gold"
          label="总成就数"
          value={`${dashboard.unlockedCount} / ${dashboard.totalCount}`}
          footer={
            <div className={styles.statBarWrap}>
              <div className={styles.statBarTrack}>
                <span
                  className={styles.statBarFill}
                  style={{
                    width: `${dashboard.totalCount ? (dashboard.unlockedCount / dashboard.totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <small>已解锁成就</small>
            </div>
          }
        />
        <StatCard
          icon={<Crown size={22} />}
          iconTone="green"
          label="成就等级"
          value={`Lv.${dashboard.level.level}`}
          footer={
            <p className={styles.statFoot}>
              成就点 {dashboard.level.into.toLocaleString()} /{" "}
              {dashboard.level.next.toLocaleString()}
            </p>
          }
        />
        <StatCard
          icon={<Sparkles size={22} />}
          iconTone="amber"
          label="完成率"
          value={`${dashboard.rate.toFixed(1)}%`}
          footer={
            <p className={`${styles.statFoot} ${styles.statFootMuted}`}>
              <BarChart3 size={12} />
              排名数据暂未开放
            </p>
          }
        />
        <StatCard
          icon={<Zap size={22} />}
          iconTone="teal"
          label="连续解锁"
          value={`${dashboard.streakDays} 天`}
          footer={
            <div className={styles.statBarWrap}>
              <small>{dashboard.rareCount} 个稀有成就</small>
              <div className={styles.statBarTrack}>
                <span
                  className={`${styles.statBarFill} ${styles.statBarTeal}`}
                  style={{
                    width: `${Math.min(100, (dashboard.rareCount / Math.max(1, dashboard.unlockedCount || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          }
        />
      </section>

      {/* 2) 主体三列 */}
      <div className={styles.mainGrid}>
        {/* 左列 */}
        <aside className={styles.leftCol}>
          <section className={styles.panel}>
            <div className={styles.profileHero}>
              <div className={styles.portraitFrame}>
                <Image
                  src={avatarSrc}
                  alt=""
                  fill
                  sizes="160px"
                  className={styles.portraitImg}
                  unoptimized
                  priority
                />
              </div>
              <div className={styles.profileMeta}>
                <div className={styles.profileNameRow}>
                  <h2>{user?.name ?? "旅人"}</h2>
                  <Link href="/settings" className={styles.editLink} title="编辑资料">
                    <Pencil size={13} />
                  </Link>
                </div>
                <p>{user?.class || user?.motto || "旅途中的成就猎人"}</p>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>荣誉概览</h3>
            <ul className={styles.honorList}>
              <li>
                <span className={styles.honorIcon}><Star size={14} /></span>
                <span>成就点</span>
                <b>{dashboard.points.toLocaleString()}</b>
              </li>
              <li className={styles.honorMuted}>
                <span className={styles.honorIcon}><BarChart3 size={14} /></span>
                <span>全球排名</span>
                <b>暂未开放</b>
              </li>
              <li className={styles.honorMuted}>
                <span className={styles.honorIcon}><Users size={14} /></span>
                <span>公会</span>
                <b>冒险者联盟</b>
              </li>
              <li>
                <span className={styles.honorIcon}><CalendarDays size={14} /></span>
                <span>首次解锁</span>
                <b>{dashboard.firstUnlockAt ? formatDate(dashboard.firstUnlockAt) : "—"}</b>
              </li>
            </ul>
          </section>

          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>最近动态</h3>
            <div className={styles.timeline}>
              {(activityExpanded ? dashboard.recent : dashboard.recent.slice(0, 4)).map((a) => (
                <div className={styles.timelineItem} key={a.id}>
                  <span className={styles.timelineDot} />
                  <div>
                    <p>
                      <em>{relativeUnlockLabel(a.unlockedAt)}</em>
                      {" 解锁了「"}
                      <strong>{a.name}</strong>
                      {"」"}
                    </p>
                  </div>
                </div>
              ))}
              {dashboard.recent.length === 0 && (
                <p className={styles.emptyHint}>完成挑战后，动态会显示在这里。</p>
              )}
            </div>
            {dashboard.recent.length > 4 && (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setActivityExpanded((v) => !v)}
              >
                {activityExpanded ? "收起动态" : "查看全部动态"}
              </button>
            )}
          </section>
        </aside>

        {/* 中列 */}
        <section className={styles.centerCol} id="achievement-board">
          <div className={styles.centerPanel}>
            <div className={styles.categoryTabs} role="tablist" aria-label="成就分类">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.key}
                  className={category === tab.key ? styles.tabActive : styles.tab}
                  onClick={() => {
                    setCategory(tab.key);
                    setShowAll(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className={styles.sortBox}>
              <span className="sr-only">排序</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="default">默认排序</option>
                <option value="progress">完成进度</option>
                <option value="reward">成就点</option>
              </select>
              <ChevronDown size={14} aria-hidden />
            </label>
          </div>

          <div className={styles.cardGrid}>
            {gridItems.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>

          {visibleItems.length === 0 && (
            <div className={styles.empty}>该分类下暂无成就</div>
          )}

          <button
            type="button"
            className={styles.viewAllBtn}
            onClick={() => {
              setShowAll(true);
              setCategory("all");
              requestAnimationFrame(() => {
                document.getElementById("achievement-board")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              });
            }}
          >
            查看全部成就（{dashboard.totalCount}）
          </button>

          {/* 里程碑 */}
          <section className={styles.milestonePanel}>
            <div className={styles.milestoneHead}>
              <div className={styles.milestoneMascot} aria-hidden>
                <Gift size={18} />
              </div>
              <div>
                <h3>成就里程碑</h3>
                <p>按已解锁数量推进，领取阶段性宝箱奖励</p>
              </div>
            </div>
            <div className={styles.milestoneTrack}>
              <div className={styles.milestoneLine}>
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      (dashboard.unlockedCount / MILESTONES[MILESTONES.length - 1].threshold) * 100,
                    )}%`,
                  }}
                />
              </div>
              {MILESTONES.map((m) => {
                const done = dashboard.unlockedCount >= m.threshold;
                const current =
                  !done &&
                  dashboard.unlockedCount < m.threshold &&
                  (MILESTONES.findIndex((x) => dashboard.unlockedCount < x.threshold) ===
                    MILESTONES.findIndex((x) => x.key === m.key));
                const pct = Math.min(
                  100,
                  Math.round((dashboard.unlockedCount / m.threshold) * 100),
                );
                return (
                  <div
                    key={m.key}
                    className={`${styles.milestoneNode} ${done ? styles.milestoneDone : ""} ${current ? styles.milestoneCurrent : ""}`}
                  >
                    <div className={styles.milestoneChest}>
                      <span>🎁</span>
                      <small>+{m.reward}</small>
                    </div>
                    <div className={styles.milestoneDot} />
                    <strong>{m.label}</strong>
                    <em>{m.threshold} 成就</em>
                    <b>{done ? "已完成" : `${pct}%`}</b>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        {/* 右列 */}
        <aside className={styles.rightCol}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>最近解锁</h3>
              <button
                type="button"
                className={styles.textLink}
                onClick={() => {
                  setCategory("all");
                  setShowAll(true);
                  setSortMode("default");
                }}
              >
                查看全部
              </button>
            </div>
            <div className={styles.recentList}>
              {dashboard.recent.slice(0, 3).map((a) => (
                <div className={styles.recentItem} key={a.id}>
                  <span className={styles.recentBadge}>{a.emoji}</span>
                  <div>
                    <strong>{a.name}</strong>
                    <small>{a.unlockedAt ? formatDate(a.unlockedAt) : "—"}</small>
                  </div>
                </div>
              ))}
              {dashboard.recent.length === 0 && (
                <p className={styles.emptyHint}>还没有解锁记录。</p>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>称号与勋章</h3>
              <Link href="/titles" className={styles.textLink}>
                查看全部
              </Link>
            </div>

            <div className={styles.titleFeature}>
              <span className={styles.titleEmoji}>
                {equippedTitle?.emoji ?? user?.equippedTitle?.emoji ?? "🎖️"}
              </span>
              <div>
                <small>当前称号</small>
                <strong>
                  {equippedTitle?.name ?? user?.equippedTitle?.name ?? "尚无称号"}
                </strong>
              </div>
            </div>

            <div className={styles.medalCarousel}>
              <button
                type="button"
                className={styles.medalNav}
                disabled={!canMedalPrev}
                onClick={() => setMedalIndex((i) => Math.max(0, i - 1))}
                aria-label="上一组勋章"
              >
                <ChevronLeft size={16} />
              </button>
              <div className={styles.medalRow}>
                {visibleMedals.map((m) => (
                  <div className={styles.medal} key={m.key} title={m.name}>
                    <span>{m.emoji}</span>
                  </div>
                ))}
                {visibleMedals.length === 0 && (
                  <p className={styles.emptyHint}>解锁成就后获得勋章</p>
                )}
              </div>
              <button
                type="button"
                className={styles.medalNav}
                disabled={!canMedalNext}
                onClick={() => setMedalIndex((i) => i + 1)}
                aria-label="下一组勋章"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {medals.length > 4 && (
              <div className={styles.medalDots}>
                {Array.from({ length: Math.ceil(medals.length / 4) }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={Math.floor(medalIndex / 4) === i ? styles.dotActive : styles.dot}
                    onClick={() => setMedalIndex(i * 4)}
                    aria-label={`勋章第 ${i + 1} 页`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>本周目标</h3>
              <button type="button" className={styles.textLink} disabled title="目标由系统推导">
                <RefreshCw size={12} />
                刷新
              </button>
            </div>
            <div className={styles.goalList}>
              {weeklyGoals.map((g) => {
                const current = g.displayCurrent ?? g.current;
                const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                return (
                  <div className={styles.goalItem} key={g.id}>
                    <div className={styles.goalTop}>
                      <span>{g.label}</span>
                      <b>
                        {current}/{g.target}
                      </b>
                    </div>
                    <div className={styles.goalBarTrack}>
                      <span
                        className={pct >= 100 ? styles.goalBarDone : styles.goalBarFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className={styles.goalReward}>
                      <Target size={12} />
                      <span>+{g.reward}</span>
                      <small>金币</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      <ManageAchievementsDialog
        open={managing}
        onOpenChange={setManaging}
        customItems={customItems}
      />
    </div>
  );
}

function StatCard({
  icon,
  iconTone,
  label,
  value,
  footer,
}: {
  icon: ReactNode;
  iconTone: "gold" | "green" | "amber" | "teal";
  label: string;
  value: string;
  footer: ReactNode;
}) {
  return (
    <article className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles[`tone_${iconTone}`]}`}>{icon}</div>
      <div className={styles.statBody}>
        <small>{label}</small>
        <strong>{value}</strong>
        {footer}
      </div>
    </article>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDTO }) {
  const status = cardStatus(achievement);
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((achievement.progress || 0) * 100)),
  );
  const points = achievementPoints(achievement);
  const hidden = isHiddenLocked(achievement);

  return (
    <article
      className={`${styles.achCard} ${styles[`status_${status}`]}`}
      data-status={status}
    >
      <span
        className={`${styles.statusTag} ${styles[`tag_${status}`]}`}
      >
        {status === "unlocked" ? "已解锁" : status === "progress" ? "进行中" : "未解锁"}
      </span>

      <div className={styles.achIcon}>
        {hidden ? (
          <span className={styles.hiddenGlyph}>✧</span>
        ) : achievement.imageUrl ? (
          <Image
            src={achievement.imageUrl}
            alt=""
            fill
            sizes="56px"
            className={styles.achImg}
            unoptimized
          />
        ) : (
          <span className={styles.achEmoji}>{achievement.emoji}</span>
        )}
      </div>

      <h4>{achievement.name}</h4>
      <p>{achievement.description}</p>

      <div className={styles.achProgress}>
        <div className={styles.achProgressTop}>
          <span />
          <b>
            {achievement.current} / {achievement.threshold}
          </b>
        </div>
        <div className={styles.achBarTrack}>
          <span style={{ width: `${status === "unlocked" ? 100 : progressPct}%` }} />
        </div>
      </div>

      <footer className={styles.achFooter}>
        <Medal size={13} />
        <span>成就点 +{points}</span>
      </footer>
    </article>
  );
}

function ManageAchievementsDialog({
  open,
  onOpenChange,
  customItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customItems: AchievementDTO[];
}) {
  const create = useCreateCustomAchievement();
  const remove = useDeleteCustomAchievement();
  const unlock = useUnlockAchievement();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🏆");
  const [tier, setTier] = useState<Tier>("bronze");
  const [rewardGold, setRewardGold] = useState(50);
  const [rewardGems, setRewardGems] = useState(0);
  const [rewardFate, setRewardFate] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEmoji("🏆");
    setTier("bronze");
    setRewardGold(50);
    setRewardGems(0);
    setRewardFate(0);
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("请填写成就名称");
      return;
    }
    try {
      setError(null);
      await create.mutateAsync({
        name: trimmed,
        description: description.trim(),
        emoji: emoji.trim() || "🏆",
        tier,
        rewardGold,
        rewardGems,
        rewardFate,
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请稍后重试");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.manageOverlay} />
        <Dialog.Content className={styles.managePanel} aria-describedby={undefined}>
          <div className={styles.manageHeader}>
            <div>
              <Dialog.Title className={styles.manageTitle}>管理成就</Dialog.Title>
              <p className={styles.manageSubtitle}>
                创建自定义成就，手动解锁并发放奖励。系统成就仍由进度自动追踪。
              </p>
            </div>
            <Dialog.Close className={styles.manageClose} aria-label="关闭">
              <X size={18} />
            </Dialog.Close>
          </div>

          <form className={styles.manageForm} onSubmit={submit}>
            <div className={styles.manageFormHeading}>
              <Plus size={15} />
              <span>新建自定义成就</span>
            </div>
            <div className={styles.manageFields}>
              <label className={styles.manageField}>
                <span>名称</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={60}
                  placeholder="例如：清晨第一光"
                />
              </label>
              <label className={styles.manageField}>
                <span>Emoji</span>
                <input
                  value={emoji}
                  onChange={(event) => setEmoji(event.target.value)}
                  maxLength={8}
                />
              </label>
              <label className={`${styles.manageField} ${styles.manageFieldWide}`}>
                <span>描述</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={280}
                  placeholder="写下解锁条件或纪念意义"
                />
              </label>
              <label className={styles.manageField}>
                <span>稀有度</span>
                <select value={tier} onChange={(event) => setTier(event.target.value as Tier)}>
                  {TIERS.map((value) => (
                    <option key={value} value={value}>
                      {TIER_META[value].cn}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.manageField}>
                <span>Gold</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={rewardGold}
                  onChange={(event) => setRewardGold(Number(event.target.value) || 0)}
                />
              </label>
              <label className={styles.manageField}>
                <span>Gems</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={rewardGems}
                  onChange={(event) => setRewardGems(Number(event.target.value) || 0)}
                />
              </label>
              <label className={styles.manageField}>
                <span>Fate</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rewardFate}
                  onChange={(event) => setRewardFate(Number(event.target.value) || 0)}
                />
              </label>
            </div>
            {error && <p className={styles.manageError}>{error}</p>}
            <button type="submit" className={styles.manageSubmit} disabled={create.isPending}>
              <Plus size={15} />
              {create.isPending ? "创建中…" : "创建成就"}
            </button>
          </form>

          <div className={styles.manageListHeading}>
            <span>我的自定义成就</span>
            <b>{customItems.length}</b>
          </div>

          <div className={styles.manageList}>
            {customItems.length === 0 ? (
              <p className={styles.manageEmpty}>还没有自定义成就。创建一条后可在这里手动解锁。</p>
            ) : (
              customItems.map((achievement) => (
                <div className={styles.manageItem} key={achievement.id}>
                  <span className={styles.manageEmoji}>{achievement.emoji}</span>
                  <div className={styles.manageItemCopy}>
                    <strong>{achievement.name}</strong>
                    <small>
                      {TIER_META[achievement.tier].cn}
                      {" · "}
                      +{achievement.reward.gold}G
                      {achievement.reward.gems ? ` · +${achievement.reward.gems} 宝石` : ""}
                      {achievement.reward.fate ? ` · +${achievement.reward.fate} Fate` : ""}
                      {achievement.unlocked ? " · 已解锁" : " · 待解锁"}
                    </small>
                    {achievement.description ? <p>{achievement.description}</p> : null}
                  </div>
                  <div className={styles.manageItemActions}>
                    {!achievement.unlocked && (
                      <button
                        type="button"
                        title="手动解锁并发放奖励"
                        disabled={unlock.isPending}
                        onClick={() => unlock.mutate(achievement.id)}
                      >
                        <Unlock size={14} />
                        解锁
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.manageDanger}
                      title="删除自定义成就"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm(`删除自定义成就「${achievement.name}」？`)) {
                          remove.mutate(achievement.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
