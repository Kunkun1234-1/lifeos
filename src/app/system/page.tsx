"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  Backpack,
  BookOpen,
  CalendarDays,
  CalendarHeart,
  CheckSquare,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Frame,
  Gift,
  GitBranch,
  Hammer,
  LayoutGrid,
  Library,
  List,
  Search,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { FEATURE_ART } from "@/lib/art-assets";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

type SystemModule = {
  href: string;
  cn: string;
  en: string;
  desc: string;
  group: string;
  icon: LucideIcon;
  tone: string;
  art?: string;
};

const MAIN_MODULES: SystemModule[] = [
  {
    href: "/tasks",
    cn: "待办事项",
    en: "Tasks",
    desc: "任务条、看板与完成记录",
    group: "执行",
    icon: CheckSquare,
    tone: "#d9b963",
    art: FEATURE_ART.tasks,
  },
  {
    href: "/habits",
    cn: "习惯追踪",
    en: "Habits",
    desc: "正负向行为与连击",
    group: "执行",
    icon: Flame,
    tone: "#c9725e",
    art: FEATURE_ART.habits,
  },
  {
    href: "/routines",
    cn: "今日安排",
    en: "Schedule",
    desc: "理想日程与具体事项",
    group: "执行",
    icon: CalendarDays,
    tone: "#76b6d3",
    art: FEATURE_ART.routines,
  },
  {
    href: "/review",
    cn: "每日复盘",
    en: "Review",
    desc: "三问、心情与 Fate",
    group: "执行",
    icon: BookOpen,
    tone: "#b9d58a",
    art: FEATURE_ART.review,
  },
  {
    href: "/goals",
    cn: "目标清单",
    en: "Goals",
    desc: "OKR 与长期方向",
    group: "战略",
    icon: Target,
    tone: "#e2c878",
    art: FEATURE_ART.goals,
  },
  {
    href: "/projects",
    cn: "项目工坊",
    en: "Projects",
    desc: "阶段性产出与推进",
    group: "战略",
    icon: Hammer,
    tone: "#d3a06f",
    art: FEATURE_ART.projects,
  },
  {
    href: "/strategy",
    cn: "人生全景",
    en: "Strategy",
    desc: "Vision 到项目的系统树",
    group: "战略",
    icon: GitBranch,
    tone: "#8ac6b1",
    art: FEATURE_ART.strategy,
  },
  {
    href: "/notes",
    cn: "知识库",
    en: "Notes",
    desc: "笔记、收藏与灵感归档",
    group: "知识",
    icon: Library,
    tone: "#cbb7ef",
    art: FEATURE_ART.notes,
  },
  {
    href: "/analytics",
    cn: "数据中心",
    en: "Analytics",
    desc: "热力图、属性与趋势",
    group: "洞察",
    icon: Activity,
    tone: "#79c1ef",
    art: FEATURE_ART.analytics,
  },
  {
    href: "/rewards",
    cn: "奖励商店",
    en: "Rewards",
    desc: "金币兑换真实奖品",
    group: "奖励",
    icon: Gift,
    tone: "#e1bd67",
    art: FEATURE_ART.rewards,
  },
  {
    href: "/gacha",
    cn: "祈愿召唤",
    en: "Wish",
    desc: "Fate 抽卡与保底",
    group: "奖励",
    icon: Sparkles,
    tone: "#d9a3e8",
    art: FEATURE_ART.gacha,
  },
  {
    href: "/inventory",
    cn: "背包终端",
    en: "Inventory",
    desc: "资源、装备与奖品归档",
    group: "奖励",
    icon: Backpack,
    tone: "#d4a94d",
    art: FEATURE_ART.inventory,
  },
];

const QUICK_MODULES: SystemModule[] = [
  {
    href: "/achievements",
    cn: "成就",
    en: "Achievements",
    desc: "徽章与里程碑",
    group: "奖励",
    icon: Trophy,
    tone: "#e8c977",
  },
  {
    href: "/titles",
    cn: "称号",
    en: "Titles",
    desc: "身份头衔装备",
    group: "奖励",
    icon: Crown,
    tone: "#e0bc59",
  },
  {
    href: "/battle-pass",
    cn: "战令",
    en: "Battle Pass",
    desc: "周任务与等级奖励",
    group: "奖励",
    icon: Award,
    tone: "#d8b15a",
  },
  {
    href: "/events",
    cn: "周期任务",
    en: "Periodic Tasks",
    desc: "每日、每周、每月打卡",
    group: "奖励",
    icon: CalendarHeart,
    tone: "#d88a8a",
  },
  {
    href: "/equipment",
    cn: "装备",
    en: "Frames",
    desc: "头像框与外观",
    group: "奖励",
    icon: Frame,
    tone: "#87bed4",
  },
  {
    href: "/principles",
    cn: "原则库",
    en: "Principles",
    desc: "决策锚点",
    group: "决策",
    icon: ScrollText,
    tone: "#b9d58a",
  },
  {
    href: "/decisions",
    cn: "决策日志",
    en: "Journal",
    desc: "EV 与复盘",
    group: "决策",
    icon: Compass,
    tone: "#cbb7ef",
  },
];

export default function SystemPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const query = search.trim().toLocaleLowerCase();
  const matches = (item: SystemModule) =>
    `${item.cn} ${item.en} ${item.desc} ${item.group}`
      .toLocaleLowerCase()
      .includes(query);
  const modules = MAIN_MODULES.filter(matches);
  const quickModules = QUICK_MODULES.filter(matches);

  return (
    <div className={styles.page}>
      <section className={styles.catalog} aria-labelledby="system-catalog-title">
        <div className={styles.catalogHead}>
          <div className={styles.catalogIntro}>
            <span className={styles.catalogMark} aria-hidden="true">
              <LayoutGrid size={29} strokeWidth={2} />
            </span>
            <div>
              <h2 id="system-catalog-title">全部功能</h2>
              <p>在这里找到任务、知识、成长和奖励等全部模块，选择你想进入的功能，开始今天的成长之旅。</p>
            </div>
          </div>
          <div className={styles.controls}>
            <label className={styles.searchField}>
              <Search size={19} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索功能模块…"
                aria-label="搜索功能模块"
              />
            </label>
            <div className={styles.viewSwitch} role="group" aria-label="显示方式">
              <button
                type="button"
                className={cn(styles.viewButton, view === "grid" && styles.viewButtonActive)}
                aria-label="网格视图"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                type="button"
                className={cn(styles.viewButton, view === "list" && styles.viewButtonActive)}
                aria-label="列表视图"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={19} />
              </button>
            </div>
          </div>
        </div>

        {modules.length > 0 ? (
          <div className={cn(styles.moduleGrid, view === "list" && styles.moduleList)}>
            {modules.map((item) => (
              <ModuleCard key={item.href} item={item} list={view === "list"} />
            ))}
          </div>
        ) : null}

        {quickModules.length > 0 ? (
          <section className={styles.moreSection} aria-labelledby="more-features-title">
            <div className={styles.moreHead}>
              <h3 id="more-features-title">更多功能</h3>
              <span>继续探索你的成长工具</span>
            </div>
            <div className={styles.moreGrid}>
              {quickModules.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={styles.moreCard}>
                    <span className={styles.moreIcon} style={{ color: item.tone }}>
                      <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className={styles.moreCopy}>
                      <strong>{item.cn}</strong>
                      <small>{item.desc}</small>
                    </span>
                    <ChevronRight size={16} className={styles.moreArrow} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {modules.length === 0 && quickModules.length === 0 ? (
          <div className={styles.emptyState}>
            <p>没有找到相关功能。</p>
            <button type="button" onClick={() => setSearch("")}>清除搜索</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ModuleCard({ item, list }: { item: SystemModule; list: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(styles.moduleCard, list && styles.moduleCardList)}
      style={{ "--module-tone": item.tone } as CSSProperties}
    >
      {item.art ? (
        <Image
          src={item.art}
          alt=""
          width={128}
          height={128}
          className={styles.moduleArt}
        />
      ) : null}
      <span className={styles.moduleIcon} aria-hidden="true"><Icon size={25} strokeWidth={1.9} /></span>
      <span className={styles.moduleCopy}>
        <strong>{item.cn}</strong>
        <span className={styles.moduleEnglish}>{item.en}</span>
        <span className={styles.moduleDescription}>{item.desc}</span>
      </span>
      <span className={styles.moduleArrow} aria-hidden="true"><ChevronRight size={21} strokeWidth={2.1} /></span>
    </Link>
  );
}
