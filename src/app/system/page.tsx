"use client";

import Link from "next/link";
import {
  CheckSquare,
  Flame,
  Repeat,
  BookOpen,
  Target,
  Hammer,
  GitBranch,
  Gift,
  Trophy,
  Sparkles,
  Award,
  ScrollText,
  Compass,
  Crown,
  Activity,
  Library,
  CalendarHeart,
  Frame,
} from "lucide-react";

const SECTIONS = [
  {
    title: "执行 · Execution",
    en: "What you do every day",
    items: [
      { href: "/tasks",     cn: "任务",     en: "Tasks",        desc: "一次性行动 · 有终点有产出",    icon: CheckSquare },
      { href: "/habits",    cn: "习惯",     en: "Habits",       desc: "正负向追踪 · Atomic Habits",  icon: Flame },
      { href: "/routines",  cn: "日程",     en: "Routines",     desc: "每日必做 · 连击增长",          icon: Repeat },
      { href: "/review",    cn: "复盘",     en: "Review",       desc: "每日 3 问 + 累积 Fate 券",     icon: BookOpen },
    ],
  },
  {
    title: "战略 · Strategy",
    en: "What you're building toward",
    items: [
      { href: "/goals",     cn: "目标",     en: "Goals · OKR",  desc: "Objective + Key Results",       icon: Target },
      { href: "/projects",  cn: "项目",     en: "Projects",     desc: "有终点的中期努力 · PARA-P",     icon: Hammer },
      { href: "/strategy",  cn: "全景",     en: "Strategy",     desc: "Vision→Area→Goal→Project 树",    icon: GitBranch },
    ],
  },
  {
    title: "决策 · Decision Engine",
    en: "How you choose · Dalio + WRAP",
    items: [
      { href: "/principles", cn: "原则库",   en: "Principles",   desc: "Dalio 风格原则集合 · 决策锚点",  icon: ScrollText },
      { href: "/decisions",  cn: "决策日志", en: "Journal · EV", desc: "EV 计算器 + Pre/Post-mortem + AI 教练",   icon: Compass },
    ],
  },
  {
    title: "知识 · Knowledge",
    en: "Second brain · PARA-R",
    items: [
      { href: "/notes", cn: "知识库", en: "Notes · 5 kinds", desc: "笔记 · 高亮 · 语录 · 链接 · 灵感 (+15 XP)", icon: Library },
    ],
  },
  {
    title: "数据 · Insight",
    en: "See your rhythm",
    items: [
      { href: "/analytics", cn: "数据洞察", en: "Analytics", desc: "热力图 · 属性分布 · 心情趋势 · 决策评分", icon: Activity },
    ],
  },
  {
    title: "奖励 · Rewards",
    en: "Real-world payoff",
    items: [
      { href: "/rewards",      cn: "商店",     en: "Rewards",      desc: "Mora/Gems 兑换真实奖品",     icon: Gift },
      { href: "/gacha",        cn: "祈愿",     en: "Wish · Gacha", desc: "Fate 抽卡 · 软/硬保底",       icon: Sparkles },
      { href: "/achievements", cn: "成就",     en: "Achievements", desc: "32 项徽章 · 自动解锁",         icon: Trophy },
      { href: "/titles",       cn: "称号",     en: "Titles",       desc: "20 称号 · 装备显示在导航",      icon: Crown },
      { href: "/battle-pass",  cn: "战令",     en: "Battle Pass",  desc: "本周 9 任务 · 20 级奖励轨",   icon: Award },
      { href: "/events",       cn: "活动",     en: "Events",       desc: "限时活动 · 大奖 + 限定相框",   icon: CalendarHeart },
      { href: "/equipment",    cn: "装备",     en: "Frames",       desc: "10 个相框 · 装在头像上",        icon: Frame },
    ],
  },
];

export default function SystemPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">系统</span>
          <span className="en text-[11px]">System Modules</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/50 to-transparent" />
        <p className="mt-3 max-w-2xl font-display text-sm text-[var(--fg-muted)]">
          十八个模块组成你的人生操作系统：执行 · 战略 · 决策 · 知识 · 数据 · 奖励六部分。
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="mb-3 flex items-baseline gap-2">
            <span className="diamond-gold" />
            <h3 className="font-display text-lg font-bold text-[var(--fg-strong)]">
              {section.title}
            </h3>
            <span className="font-display-en text-[10px] uppercase tracking-[0.25em] text-[var(--gold-deep)]">
              · {section.en}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/40 to-transparent" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {section.items.map(({ href, cn, en, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="panel-cream framed group flex flex-col gap-2 rounded-sm p-5 transition-all hover:shadow-[0_0_0_1px_var(--gold),0_12px_28px_-12px_rgba(0,0,0,0.2)]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-display text-base font-bold text-[var(--fg-strong)]">
                      {cn}
                    </div>
                    <div className="font-display-en text-[9px] tracking-[0.22em] text-[var(--gold-deep)]">
                      {en}
                    </div>
                  </div>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
                  {desc}
                </p>
                <div className="mt-auto text-right font-display-en text-[10px] tracking-[0.2em] text-[var(--gold-deep)] group-hover:text-[var(--gold)]">
                  进入 →
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
