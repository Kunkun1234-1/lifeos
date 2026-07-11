"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  Flame,
  Grid2X2,
  List,
  LockKeyhole,
  Medal,
  Search,
  Settings2,
  Star,
  Target,
} from "lucide-react";
import { useAchievements } from "@/hooks/queries";
import type { AchievementDTO } from "@/lib/types";
import styles from "./page.module.css";

type Filter = "all" | "unlocked" | "progress" | "hidden";
type SortMode = "default" | "progress" | "reward";

const TIERS = ["bronze", "silver", "gold", "legendary"] as const;
const EMPTY_ACHIEVEMENTS: AchievementDTO[] = [];

const TIER_META = {
  bronze: { cn: "铜牌", en: "BRONZE", visible: 5 },
  silver: { cn: "银牌", en: "SILVER", visible: 4 },
  gold: { cn: "金牌", en: "GOLD", visible: 4 },
  legendary: { cn: "传说", en: "LEGENDARY", visible: 4 },
} as const;

const CATEGORY_LABEL: Record<string, string> = {
  streak: "普通",
  cumulative: "稀有",
  milestone: "普通",
  hidden: "传说",
  custom: "稀有",
};

function isHidden(a: AchievementDTO) {
  return a.hidden && !a.unlocked;
}

function rewardScore(a: AchievementDTO) {
  return a.reward.gold + a.reward.gems * 40 + a.reward.fate * 60;
}

export default function AchievementsPage() {
  const { data: items } = useAchievements();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [gridView, setGridView] = useState(true);
  const list = items ?? EMPTY_ACHIEVEMENTS;

  const counts = useMemo(
    () => ({
      all: list.length,
      unlocked: list.filter((a) => a.unlocked).length,
      progress: list.filter((a) => !a.unlocked && !a.hidden).length,
      hidden: list.filter(isHidden).length,
    }),
    [list],
  );

  const dashboard = useMemo(() => {
    const unlocked = list.filter((achievement) => achievement.unlocked);
    const recent = unlocked
      .filter((achievement) => achievement.unlockedAt)
      .sort((a, b) => Date.parse(b.unlockedAt ?? "") - Date.parse(a.unlockedAt ?? ""))
      .slice(0, 3);
    const nextTarget = list
      .filter((achievement) => !achievement.unlocked && !achievement.hidden)
      .sort((a, b) => b.progress - a.progress)[0] ?? null;
    const totalProgress = list.length
      ? Math.round((list.reduce((sum, achievement) => sum + achievement.progress, 0) / list.length) * 100)
      : 0;

    return {
      points: unlocked.reduce((sum, achievement) => sum + rewardScore(achievement), 0),
      streak: Math.max(0, ...list.filter((achievement) => achievement.category === "streak").map((achievement) => achievement.current)),
      totalProgress,
      recent,
      nextTarget,
    };
  }, [list]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const next = list.filter((a) => {
      const filterMatches =
        filter === "all" ||
        (filter === "unlocked" && a.unlocked) ||
        (filter === "progress" && !a.unlocked && !a.hidden) ||
        (filter === "hidden" && isHidden(a));
      const queryMatches =
        !normalizedQuery ||
        a.name.toLocaleLowerCase("zh-CN").includes(normalizedQuery) ||
        a.description.toLocaleLowerCase("zh-CN").includes(normalizedQuery);
      return filterMatches && queryMatches;
    });

    if (sortMode === "progress") return [...next].sort((a, b) => b.progress - a.progress);
    if (sortMode === "reward") return [...next].sort((a, b) => rewardScore(b) - rewardScore(a));
    return next;
  }, [filter, list, query, sortMode]);

  return (
    <div className={`achievements-page ${styles.page}`}>
      <div className={styles.shell}>
        <section className={styles.overview}>
          <div className={styles.overviewTitle}>
            <span className={styles.compassMark}><Compass size={45} strokeWidth={1.4} /></span>
            <div>
              <div className={styles.titleLine}>
                <h1>成就</h1>
                <span>ACHIEVEMENTS</span>
              </div>
              <p>完成任务、习惯、日程、复盘等各项挑战，解锁成就，收藏荣誉，见证你的成长与蜕变。</p>
            </div>
          </div>
          <div className={styles.overviewStats}>
            <OverviewStat icon={<Award size={25} />} label="已解锁" value={`${counts.unlocked} / ${counts.all}`} />
            <OverviewStat icon={<Medal size={25} />} label="成就点数" value={dashboard.points.toLocaleString()} />
            <OverviewStat icon={<Flame size={25} />} label="连续记录" value={`${dashboard.streak} 天`} />
            <button
              type="button"
              className={styles.manageButton}
              onClick={() => document.getElementById("achievement-search")?.focus()}
            >
              <Settings2 size={17} />
              管理成就
            </button>
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.collection} id="achievement-board">
            <AchievementToolbar
              counts={counts}
              filter={filter}
              onFilter={setFilter}
              query={query}
              onQuery={setQuery}
              sortMode={sortMode}
              onSort={setSortMode}
              gridView={gridView}
              onGridView={setGridView}
            />

            <div className={styles.content}>
              {TIERS.map((tier) => {
                const allTierItems = list.filter((a) => a.tier === tier);
                const tierItems = visibleItems.filter((a) => a.tier === tier);
                if (tierItems.length === 0) return null;
                const unlockedCount = allTierItems.filter((a) => a.unlocked).length;
                return (
                  <section className={`${styles.tier} ${styles[tier]}`} key={tier}>
                    <div className={styles.tierHeading}>
                      <div className={styles.tierTitleGroup}>
                        <span className={styles.tierSeal} aria-hidden="true">
                          <Award size={17} strokeWidth={1.7} />
                        </span>
                        <h2>{TIER_META[tier].cn}</h2>
                        <span className={styles.tierEnglish}>{TIER_META[tier].en}</span>
                      </div>
                      <div className={styles.tierCount}>
                        <strong>{unlockedCount}/{allTierItems.length}</strong> 已解锁
                        <ChevronDown size={12} aria-hidden="true" />
                      </div>
                    </div>

                    <div className={gridView ? styles.cardGrid : styles.cardList} data-tier={tier}>
                      {tierItems.slice(0, gridView ? TIER_META[tier].visible : undefined).map((achievement) => (
                        <AchievementCard key={achievement.id} achievement={achievement} />
                      ))}
                    </div>
                  </section>
                );
              })}

              {visibleItems.length === 0 && (
                <div className={styles.empty}>没有找到符合条件的成就</div>
              )}
            </div>
          </section>

          <AchievementSidebar
            progress={dashboard.totalProgress}
            unlocked={counts.unlocked}
            total={counts.all}
            points={dashboard.points}
            streak={dashboard.streak}
            recent={dashboard.recent}
            nextTarget={dashboard.nextTarget}
          />
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={styles.overviewStat}>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}

function AchievementSidebar({
  progress,
  unlocked,
  total,
  points,
  streak,
  recent,
  nextTarget,
}: {
  progress: number;
  unlocked: number;
  total: number;
  points: number;
  streak: number;
  recent: AchievementDTO[];
  nextTarget: AchievementDTO | null;
}) {
  return (
    <aside className={styles.sidebar}>
      <section className={styles.sidePanel}>
        <div className={styles.sideHeading}>
          <h2>本周进度</h2>
          <span><CalendarDays size={12} /> 本周</span>
        </div>
        <div className={styles.weeklyProgress}>
          <div className={styles.progressRing} style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
            <div><strong>{progress}%</strong><span>本周达成率</span></div>
          </div>
          <div className={styles.weeklyStats}>
            <span><Target size={13} /> 已完成 <b>{unlocked}/{total}</b></span>
            <span><Star size={13} /> 成就点 <b>+{points}</b></span>
            <span><Flame size={13} /> 连续记录 <b>{streak} 天</b></span>
          </div>
        </div>

        <div className={styles.recentHeader}><h3>最近解锁</h3><span>查看更多 <ArrowRight size={12} /></span></div>
        <div className={styles.recentList}>
          {recent.length ? recent.map((achievement) => (
            <div className={styles.recentItem} key={achievement.id}>
              <span className={styles.miniBadge}>{achievement.emoji}</span>
              <div><strong>{achievement.name}</strong><small>{achievement.description}</small></div>
              <b>+{achievement.reward.gold}</b>
            </div>
          )) : <p className={styles.noRecent}>继续挑战，解锁第一枚成就。</p>}
        </div>
      </section>

      {nextTarget && (
        <section className={styles.sidePanel}>
          <div className={styles.sideHeading}><h2>下一目标</h2></div>
          <div className={styles.nextTarget}>
            <span className={styles.nextBadge}>{nextTarget.emoji}</span>
            <div><strong>{nextTarget.name}</strong><small>{nextTarget.description}</small></div>
            <div className={styles.nextProgress}>
              <span style={{ width: `${Math.max(4, nextTarget.progress * 100)}%` }} />
            </div>
            <p>{nextTarget.current} / {nextTarget.threshold}</p>
            <div className={styles.nextReward}>奖励 <Star size={13} fill="currentColor" /> +{nextTarget.reward.gold}</div>
          </div>
          <button type="button" className={styles.allAchievements} onClick={() => document.getElementById("achievement-board")?.scrollIntoView({ behavior: "smooth" })}>
            查看所有成就 <ArrowRight size={14} />
          </button>
        </section>
      )}
    </aside>
  );
}

function AchievementToolbar({
  counts,
  filter,
  onFilter,
  query,
  onQuery,
  sortMode,
  onSort,
  gridView,
  onGridView,
}: {
  counts: Record<Filter, number>;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  query: string;
  onQuery: (query: string) => void;
  sortMode: SortMode;
  onSort: (sortMode: SortMode) => void;
  gridView: boolean;
  onGridView: (gridView: boolean) => void;
}) {
  const tabs: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "全部" },
    { key: "unlocked", label: "已解锁" },
    { key: "progress", label: "进行中" },
    { key: "hidden", label: "隐藏" },
  ];

  return (
    <header className={styles.toolbar}>
      <div className={styles.tabs} role="tablist" aria-label="成就筛选">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            className={filter === tab.key ? styles.activeTab : styles.tab}
            onClick={() => onFilter(tab.key)}
            key={tab.key}
          >
            <span>{tab.label}</span>
            <b>{counts[tab.key]}</b>
          </button>
        ))}
      </div>

      <div className={styles.toolbarActions}>
        <label className={styles.searchBox}>
          <span className="sr-only">搜索成就</span>
          <input
            id="achievement-search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="搜索成就名称或描述..."
          />
          <Search size={22} strokeWidth={2} aria-hidden="true" />
        </label>
        <label className={styles.sortBox}>
          <span className="sr-only">成就排序</span>
          <select value={sortMode} onChange={(event) => onSort(event.target.value as SortMode)}>
            <option value="default">默认排序</option>
            <option value="progress">完成进度</option>
            <option value="reward">奖励数量</option>
          </select>
          <ChevronDown size={19} aria-hidden="true" />
        </label>
        <div className={styles.viewToggle} aria-label="视图切换">
          <button
            type="button"
            title="网格视图"
            aria-pressed={gridView}
            className={gridView ? styles.selectedView : undefined}
            onClick={() => onGridView(true)}
          >
            <Grid2X2 size={22} />
          </button>
          <button
            type="button"
            title="列表视图"
            aria-pressed={!gridView}
            className={!gridView ? styles.selectedView : undefined}
            onClick={() => onGridView(false)}
          >
            <List size={25} />
          </button>
        </div>
      </div>
    </header>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDTO }) {
  const locked = !achievement.unlocked;
  const hidden = isHidden(achievement);
  const progress = Math.max(0, Math.min(100, achievement.progress * 100));
  const rarity = hidden ? "传说" : CATEGORY_LABEL[achievement.category] ?? "普通";

  return (
    <article className={`${styles.card} ${locked ? styles.locked : styles.unlocked}`}>
      <span className={styles.corner} aria-hidden="true" />
      {achievement.unlocked ? (
        <span className={styles.unlockMark} title="已解锁">
          <Check size={19} strokeWidth={3} />
        </span>
      ) : hidden ? (
        <LockKeyhole className={styles.lockIcon} size={18} aria-label="未解锁" />
      ) : null}

      <div className={styles.cardTop}>
        <div className={styles.medallion}>
          <div className={styles.medallionInner}>
            {hidden ? (
              <span className={styles.hiddenGlyph}>✧</span>
            ) : achievement.imageUrl ? (
              <Image
                src={achievement.imageUrl}
                alt=""
                fill
                sizes="74px"
                className={styles.badgeImage}
                unoptimized
              />
            ) : (
              <span className={styles.emoji} role="img" aria-label={achievement.name}>
                {achievement.emoji}
              </span>
            )}
          </div>
        </div>
        <div className={styles.cardCopy}>
          <h3>{hidden ? achievement.name : achievement.name}</h3>
          <p>{hidden ? achievement.description : achievement.description}</p>
        </div>
      </div>

      {locked && (
        <div className={styles.progressBlock}>
          <div className={styles.progressNumbers}>
            <span />
            <b>{achievement.current} / {achievement.threshold}</b>
          </div>
          <div className={styles.progressTrack}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <footer className={styles.cardFooter}>
        <div className={styles.reward}>
          <Star size={22} fill="currentColor" strokeWidth={1.5} />
          <b>+{achievement.reward.gold}</b>
        </div>
        <span className={`${styles.rarity} ${styles[`rarity${rarity}`] ?? ""}`}>{rarity}</span>
        {achievement.unlockedAt && (
          <time dateTime={achievement.unlockedAt}>{formatDate(achievement.unlockedAt)}</time>
        )}
      </footer>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}
