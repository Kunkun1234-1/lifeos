"use client";

import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[960px] space-y-6 px-8 py-10">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">帮助</span>
          <span className="en text-[11px]">Help &amp; Guide</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/50 to-transparent" />
      </div>

      <div className="panel-cream framed rounded-sm p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]">
            <HelpCircle size={24} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--fg-strong)]">
              LifeOS · 人生管理系统
            </h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              一份把 PARA / GTD / OKR / Atomic Habits / 二游节奏 糅合起来的个人操作系统。
            </p>
          </div>
        </div>

        <div className="space-y-4 text-[14px] leading-relaxed text-[var(--fg)]">
          <FaqItem q="如何开始？">
            顶栏 <b>首页</b> 是每日面板；<b>系统</b> 管理任务、习惯、日程、复盘；
            <b>设置</b> 填写你的愿景与身份陈述。第一次使用建议 2 分钟走一遍引导。
          </FaqItem>
          <FaqItem q="日委托（今日安排）怎么生成？">
            系统每日凌晨从你当前的 Routines / Habits / Tasks 里挑选 4 项作为委托。
            完成 4/4 解锁凯瑟琳奖励（+50 XP / +20 Gold / +2 Gems）。
          </FaqItem>
          <FaqItem q="什么是 Fate 券？">
            每次完成「复盘」积累 1 张。用于将来在 Phase 3 的「祈愿/抽卡」模块兑换真实世界奖励（按你在设置里预设的奖励池）。
          </FaqItem>
          <FaqItem q="6 个属性（STR/INT/CHA/WIS/CRE/GOLD）对应什么？">
            分别映射到 健康、学习、关系、心智、创造、财富 六大领域——
            完成关联到该领域的任务/习惯/日程，会累积对应属性 XP。
          </FaqItem>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="diamond-gold" />
        <h3 className="font-display text-[15px] font-bold text-[var(--fg-strong)]">
          {q}
        </h3>
      </div>
      <p className="mt-1 pl-5 text-[13px] text-[var(--fg-muted)]">{children}</p>
    </div>
  );
}
