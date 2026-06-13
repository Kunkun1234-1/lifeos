"use client";

import { useMemo, useState, type CSSProperties } from "react";
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
  Library,
  PenLine,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AvatarFrame } from "@/components/avatar-frame";
import { useUser } from "@/hooks/queries";
import { cn } from "@/lib/utils";

type SystemModule = {
  href: string;
  cn: string;
  en: string;
  desc: string;
  group: string;
  icon: LucideIcon;
  tone: string;
  signal?: boolean;
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
    signal: true,
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
    signal: true,
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
    signal: true,
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
    signal: true,
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

const PROFILE_ROWS = [
  { label: "职业", key: "class" },
  { label: "生日", key: "birthday" },
  { label: "地区", key: "region" },
] as const;

export default function SystemPage() {
  const { data: user } = useUser();
  const [activeModule, setActiveModule] = useState<SystemModule>(MAIN_MODULES[0]);

  const xpProgress = Math.max(
    0,
    Math.min(100, Math.round((user?.levelProgress ?? 0) * 100)),
  );

  const profileValues = useMemo(
    () => ({
      class: user?.class || "Scholar",
      birthday: formatBirthday(user?.birthday),
      region: user?.region || "未设置",
    }),
    [user?.birthday, user?.class, user?.region],
  );

  const motto =
    user?.motto ||
    "旅行的意义不在于终点，而在于沿途的选择与风景。";

  return (
    <div className="relative mx-auto min-h-[calc(100vh-82px)] max-w-[1800px] px-4 py-3 md:px-8">
      <section className="system-terminal-shell grid min-h-[calc(100vh-106px)] grid-cols-1 gap-4 p-3 lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="system-profile-card min-h-0 p-5">
          <div className="flex items-center justify-between border-b border-[#d8c593]/30 pb-4">
            <div>
              <div className="font-display text-[22px] font-bold tracking-[0.12em] text-[#fff5cb]">
                个人终端
              </div>
              <div className="font-display-en text-[10px] tracking-[0.32em] text-[#d8c593]/70">
                Personal Terminal
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center border border-[#d8c593]/45 bg-[#d8c593]/10 text-[#e8d9a8]">
              <ShieldCheck size={20} />
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center text-center">
            <div className="system-avatar-ring">
              <AvatarFrame
                size={96}
                src={user?.avatarUrl || "/lifeos/profile_avatar.png"}
                style={user?.equippedFrame?.style ?? null}
                alt={user?.name ?? "Dev Player"}
              />
              <div className="absolute bottom-2 right-1 rounded-sm border border-[#d8c593]/70 bg-[#172437] px-2 py-1 font-display text-[14px] font-bold text-[#ffe7a0] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.9)]">
                Lv.{user?.level ?? 1}
              </div>
            </div>

            <div className="mt-3 font-display text-[25px] font-bold text-[#fff1c3]">
              {user?.name ?? "Dev Player"}
            </div>
            <div className="mt-1 flex items-center gap-2 font-display text-[13px] text-[#d8c593]/80">
              <Sparkles size={14} />
              <span>{user?.equippedTitle?.name ?? "星海守望者"}</span>
              <Sparkles size={14} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="font-display text-[13px] text-[#d8c593]/80">等级经验</span>
                <span className="font-mono text-[12px] text-[#efe2b6]">
                  {(user?.xpIntoLevel ?? 0).toLocaleString()} / {(user?.xpForNext ?? 100).toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden bg-white/12 shadow-[inset_0_0_0_1px_rgba(216,197,147,0.24)]">
                <div
                  className="h-full bg-gradient-to-r from-[#d4a94d] via-[#fff1a8] to-[#76b6d3] shadow-[0_0_18px_rgba(212,169,77,0.45)]"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {PROFILE_ROWS.map(({ label, key }) => (
                <div
                  key={key}
                  className="flex items-center justify-between border-b border-[#d8c593]/14 pb-2 font-display text-[13px]"
                >
                  <span className="text-[#d8c593]/72">{label}</span>
                  <span className="max-w-[190px] truncate text-[#f7ebc3]">
                    {profileValues[key]}
                  </span>
                </div>
              ))}
            </div>

            <blockquote className="relative border-l border-[#d8c593]/55 pl-4 font-display text-[13px] leading-7 text-[#f3e8c4]">
              <span className="absolute -left-1.5 top-2 h-2.5 w-2.5 rotate-45 bg-[#d8c593]" />
              “{motto}”
            </blockquote>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <CurrencyChip
                label="Gold"
                value={user?.currency.gold ?? 0}
                imageSrc="/lifeos/inventory/resource-gold.png"
              />
              <CurrencyChip
                label="Fate"
                value={user?.currency.fate ?? 0}
                imageSrc="/lifeos/inventory/resource-fate.png"
              />
              <CurrencyChip
                label="Gems"
                value={user?.currency.gems ?? 0}
                imageSrc="/lifeos/inventory/resource-gems.png"
              />
            </div>
          </div>

          <Link
            href="/settings"
            className="mt-6 flex items-center justify-between border border-[#d8c593]/35 bg-white/8 px-3 py-3 font-display text-[13px] text-[#f7ebc3] transition hover:border-[#e8c977]/75 hover:bg-[#e8c977]/10"
          >
            <span>编辑个人终端</span>
            <PenLine size={15} className="text-[#e8c977]" />
          </Link>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center text-[#e8d9a8]">
                  <CompassMark />
                </span>
                <div>
                  <h1 className="font-display text-[26px] font-bold tracking-[0.16em] text-[#fff5cb] md:text-[30px]">
                    系统模块
                  </h1>
                  <div className="font-display-en text-[10px] tracking-[0.35em] text-[#d8c593]/68">
                    System Modules
                  </div>
                </div>
              </div>
              <p className="mt-2 max-w-2xl font-display text-[12px] leading-6 text-[#f4e8c8]/74">
                将任务、日程、战略、知识、奖励和数据收束到同一个终端视图。选择任意模块进入对应系统。
              </p>
            </div>

            <div className="flex items-center gap-2 self-start border border-[#d8c593]/30 bg-[#081727]/35 px-3 py-2 font-display-en text-[10px] tracking-[0.22em] text-[#d8c593]/80 md:self-auto">
              <span className="h-2 w-2 rounded-full bg-[#8ac6b1] shadow-[0_0_12px_rgba(138,198,177,0.7)]" />
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
            <div className="hidden min-w-[150px] border-r border-[#d8c593]/20 pr-5 md:block">
              <div className="font-display text-[16px] font-bold tracking-[0.14em] text-[#fff1c3]">
                快捷入口
              </div>
              <div className="font-display-en text-[9px] tracking-[0.24em] text-[#d8c593]/60">
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
                    className="group flex min-w-0 flex-col items-center gap-2 border border-transparent px-2 py-2 text-center transition hover:border-[#d8c593]/36 hover:bg-white/8 focus:outline-none focus-visible:border-[#e8c977]"
                  >
                    <Icon
                      size={24}
                      className="text-[#f1e4bb] transition group-hover:-translate-y-0.5 group-hover:text-[#fff1a8]"
                      strokeWidth={1.7}
                    />
                    <span className="w-full truncate font-display text-[12px] text-[#f4e8c8]/82">
                      {item.cn}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="hidden w-[260px] border-l border-[#d8c593]/20 pl-5 xl:block">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-[14px] font-bold text-[#fff1c3]">
                    {activeModule.cn}
                  </div>
                  <div className="truncate text-[12px] text-[#d8c593]/68">
                    {activeModule.desc}
                  </div>
                </div>
                <Link
                  href={activeModule.href}
                  className="grid h-9 w-9 shrink-0 place-items-center border border-[#d8c593]/36 bg-white/8 text-[#e8c977] transition hover:border-[#e8c977] hover:bg-[#e8c977]/10"
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
        "system-module-card group min-h-[128px] p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c977]/70 md:min-h-[138px] xl:min-h-[150px]",
        active && "is-active",
      )}
      style={{ "--module-tone": item.tone } as CSSProperties}
    >
      {item.signal && <span className="system-signal" />}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        <div className="system-module-orbit">
          <Icon size={36} strokeWidth={1.45} />
        </div>
        <div className="mt-3 font-display text-[17px] font-bold tracking-[0.1em] text-[#fff1c3] md:text-[19px]">
          {item.cn}
        </div>
        <div className="mt-1 font-display-en text-[9px] tracking-[0.24em] text-[#d8c593]/58">
          {item.en}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[#f4e8c8]/68">
          {item.desc}
        </p>
      </div>
    </Link>
  );
}

function CurrencyChip({
  label,
  value,
  imageSrc,
}: {
  label: string;
  value: number;
  imageSrc: string;
}) {
  return (
    <Link
      href="/inventory"
      className="group flex min-w-0 flex-col items-center justify-center gap-1 border border-[#d8c593]/24 bg-white/7 px-2 py-2 text-center transition hover:border-[#e8c977]/70 hover:bg-[#e8c977]/10"
    >
      <Image
        src={imageSrc}
        alt={label}
        width={34}
        height={34}
        className="h-8 w-8 object-contain transition group-hover:scale-105"
      />
      <span className="font-display-en text-[8px] tracking-[0.24em] text-[#d8c593]/70">
        {label}
      </span>
      <span className="font-mono text-[17px] font-bold text-[#fff1a8]">
        {value.toLocaleString()}
      </span>
    </Link>
  );
}

function formatBirthday(value?: string | null) {
  if (!value) return "未设置";
  const [, month, day] = value.slice(0, 10).split("-");
  if (!month || !day) return value;
  return `${Number(month)}月${Number(day)}日`;
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
