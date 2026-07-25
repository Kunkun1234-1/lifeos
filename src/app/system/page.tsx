"use client";

import { useState, type CSSProperties } from "react";
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
  Library,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SystemModule = {
  href: string;
  cn: string;
  en: string;
  desc: string;
  group: string;
  icon: LucideIcon;
  tone: string;
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
  },
  {
    href: "/habits",
    cn: "习惯追踪",
    en: "Habits",
    desc: "正负向行为与连击",
    group: "执行",
    icon: Flame,
    tone: "#c9725e",
  },
  {
    href: "/routines",
    cn: "今日安排",
    en: "Schedule",
    desc: "理想日程与具体事项",
    group: "执行",
    icon: CalendarDays,
    tone: "#76b6d3",
  },
  {
    href: "/review",
    cn: "每日复盘",
    en: "Review",
    desc: "三问、心情与 Fate",
    group: "执行",
    icon: BookOpen,
    tone: "#b9d58a",
  },
  {
    href: "/goals",
    cn: "目标清单",
    en: "Goals",
    desc: "OKR 与长期方向",
    group: "战略",
    icon: Target,
    tone: "#e2c878",
  },
  {
    href: "/projects",
    cn: "项目工坊",
    en: "Projects",
    desc: "阶段性产出与推进",
    group: "战略",
    icon: Hammer,
    tone: "#d3a06f",
  },
  {
    href: "/strategy",
    cn: "人生全景",
    en: "Strategy",
    desc: "Vision 到项目的系统树",
    group: "战略",
    icon: GitBranch,
    tone: "#8ac6b1",
  },
  {
    href: "/notes",
    cn: "笔记收藏",
    en: "Notes",
    desc: "知识、灵感与语录",
    group: "知识",
    icon: Library,
    tone: "#cbb7ef",
  },
  {
    href: "/analytics",
    cn: "数据中心",
    en: "Analytics",
    desc: "热力图、属性与趋势",
    group: "洞察",
    icon: Activity,
    tone: "#79c1ef",
  },
  {
    href: "/rewards",
    cn: "奖励商店",
    en: "Rewards",
    desc: "金币兑换真实奖品",
    group: "奖励",
    icon: Gift,
    tone: "#e1bd67",
  },
  {
    href: "/gacha",
    cn: "祈愿召唤",
    en: "Wish",
    desc: "Fate 抽卡与保底",
    group: "奖励",
    icon: Sparkles,
    tone: "#d9a3e8",
  },
  {
    href: "/inventory",
    cn: "背包终端",
    en: "Inventory",
    desc: "资源、装备与奖品归档",
    group: "奖励",
    icon: Backpack,
    tone: "#d4a94d",
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
    cn: "活动",
    en: "Events",
    desc: "限时事件",
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
  const [activeModule, setActiveModule] = useState<SystemModule>(MAIN_MODULES[0]);

  return (
    <div className="relative mx-auto min-h-[calc(100vh-82px)] max-w-[1800px] px-4 py-3 md:px-8">
      <section className="system-terminal-shell grid min-h-[calc(100vh-106px)] grid-cols-1 gap-4 p-3">
        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center text-[#249d6d]">
                  <CompassMark />
                </span>
                <div>
                  <h1 className="font-display text-[26px] font-bold tracking-[0.16em] text-[#15231c] md:text-[30px]">
                    系统模块
                  </h1>
                  <div className="font-display-en text-[10px] tracking-[0.35em] text-[#748078]">
                    System Modules
                  </div>
                </div>
              </div>
              <p className="mt-2 max-w-2xl font-display text-[12px] leading-6 text-[#65736c]">
                将任务、日程、战略、知识、奖励和数据收束到同一个终端视图。选择任意模块进入对应系统。
              </p>
            </div>

            <div className="flex items-center gap-2 self-start border border-[#9db887] bg-[#d7e5c2]/85 px-3 py-2 font-display-en text-[10px] tracking-[0.22em] text-[#2f4a3b] md:self-auto">
              <span className="h-2 w-2 rounded-full bg-[#249d6d] shadow-[0_0_10px_rgba(36,157,109,0.45)]" />
              System Online
            </div>
          </header>

          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {MAIN_MODULES.map((item) => (
              <ModuleCard
                key={item.href}
                item={item}
                active={activeModule.href === item.href}
                onActivate={() => setActiveModule(item)}
              />
            ))}
          </div>

          <footer className="system-quickdock">
            <div className="hidden min-w-[150px] border-r border-[#b7c9a0] pr-5 md:block">
              <div className="font-display text-[16px] font-bold tracking-[0.14em] text-[#15231c]">
                快捷入口
              </div>
              <div className="font-display-en text-[9px] tracking-[0.24em] text-[#5f7166]">
                Quick Access
              </div>
            </div>

            <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-7">
              {QUICK_MODULES.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onMouseEnter={() => setActiveModule(item)}
                    onFocus={() => setActiveModule(item)}
                    className="group flex min-w-0 flex-col items-center gap-2 border border-transparent px-2 py-2 text-center transition hover:border-[#8faf6a] hover:bg-[#cfe3b8] focus:outline-none focus-visible:border-[#249d6d]"
                  >
                    <Icon
                      size={24}
                      className="text-[#31433a] transition group-hover:-translate-y-0.5 group-hover:text-[#096149]"
                      strokeWidth={1.7}
                    />
                    <span className="w-full truncate font-display text-[12px] text-[#3d5246]">
                      {item.cn}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="hidden w-[260px] border-l border-[#b7c9a0] pl-5 xl:block">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-[14px] font-bold text-[#15231c]">
                    {activeModule.cn}
                  </div>
                  <div className="truncate text-[12px] text-[#4f6357]">
                    {activeModule.desc}
                  </div>
                </div>
                <Link
                  href={activeModule.href}
                  className="grid h-9 w-9 shrink-0 place-items-center border border-[#8faf6a] bg-[#cfe3b8] text-[#096149] transition hover:border-[#249d6d] hover:bg-[#b9d6a4]"
                  title={`进入${activeModule.cn}`}
                >
                  <ChevronRight size={17} />
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

function ModuleCard({
  item,
  active,
  onActivate,
}: {
  item: SystemModule;
  active: boolean;
  onActivate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className={cn(
        "system-module-card group min-h-[128px] p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#249d6d]/50 md:min-h-[138px] xl:min-h-[150px]",
        active && "is-active",
      )}
      style={{ "--module-tone": item.tone } as CSSProperties}
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        <div className="system-module-orbit">
          <Icon size={36} strokeWidth={1.45} />
        </div>
        <div className="mt-3 font-display text-[17px] font-bold tracking-[0.1em] text-[#15231c] md:text-[19px]">
          {item.cn}
        </div>
        <div className="mt-1 font-display-en text-[9px] tracking-[0.24em] text-[#748078]">
          {item.en}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[#65736c]">
          {item.desc}
        </p>
      </div>
    </Link>
  );
}

function CompassMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d="M17 1.8l3.7 11.5L32.2 17l-11.5 3.7L17 32.2l-3.7-11.5L1.8 17l11.5-3.7L17 1.8z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M17 8.4v17.2M8.4 17h17.2" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      <circle cx="17" cy="17" r="12.2" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <circle cx="17" cy="17" r="2" fill="currentColor" />
    </svg>
  );
}
