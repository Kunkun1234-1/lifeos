"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Award,
  Check,
  ChevronDown,
  Grid2X2,
  List,
  LockKeyhole,
  Search,
  Star,
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

    if (sortMode === "progress") return next.toSorted((a, b) => b.progress - a.progress);
    if (sortMode === "reward") return next.toSorted((a, b) => rewardScore(b) - rewardScore(a));
    return next;
  }, [filter, list, query, sortMode]);

  return (
    <div className={`achievements-page ${styles.page}`}>
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
                    <Award size={23} strokeWidth={1.7} />
                  </span>
                  <h2>{TIER_META[tier].cn}</h2>
                  <span className={styles.tierEnglish}>{TIER_META[tier].en}</span>
                </div>
                <div className={styles.tierCount}>
                  <strong>{unlockedCount}/{allTierItems.length}</strong> 已解锁
                  <ChevronDown size={14} aria-hidden="true" />
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
    </div>
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
