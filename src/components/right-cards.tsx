"use client";

import Link from "next/link";
import Image from "next/image";
import { useAssets, useCommissions, useRoutines, useTasks, useCompleteCommission } from "@/hooks/queries";
import type { CommissionItem } from "@/lib/commissions";
import { Footprints, BookOpen, Sparkles, Dumbbell, Coffee, Trophy, Check, Loader2, ScrollText } from "lucide-react";

/**
 * 4 right-side cards per reference: Schedule / Tasks / Assets / Achievements.
 * Section header shared style — cn title + en subtitle + 查看更多 link.
 */

function SectionHeader({ cn, en, more }: { cn: string; en: string; more?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--gold)]/40 pb-2">
      <div className="section-label">
        <span className="cn text-sm">{cn}</span>
        <span className="en text-[9px]">{en}</span>
      </div>
      {more && (
        <Link href={more} className="font-display-en text-[9px] tracking-[0.2em] text-[var(--gold-deep)] hover:text-[var(--gold)]">
          查看更多 →
        </Link>
      )}
    </div>
  );
}

/* ---------- Schedule Card (time-blocked routines/commissions) ---------- */
export function ScheduleCard() {
  const { data: routines } = useRoutines();
  const { data: commissions } = useCommissions();
  const complete = useCompleteCommission();

  // Use today's commissions that are routine-sourced as the "schedule"
  const scheduleItems: Array<{
    id: string;
    title: string;
    time: string;
    tag: string;
    tagColor: string;
    done: boolean;
    icon: React.ReactNode;
    commissionItemId?: string;
  }> = [];

  const TIMES = ["07:00-08:30", "09:30-11:30", "13:30-15:30", "16:00-17:00", "19:30-21:00"];
  const ICONS = [<Footprints size={14} key="run" />, <BookOpen size={14} key="book" />, <ScrollText size={14} key="scroll" />, <Dumbbell size={14} key="d" />, <Coffee size={14} key="c" />];

  const routineCommissions = (commissions?.items ?? []).filter((x: CommissionItem) => x.sourceType === "routine");
  routineCommissions.slice(0, 5).forEach((c: CommissionItem, i: number) => {
    scheduleItems.push({
      id: c.id,
      title: c.title,
      time: TIMES[i] ?? "",
      tag: `+${c.xp}xp`,
      tagColor: "var(--attr-int)",
      done: c.done,
      icon: ICONS[i % ICONS.length],
      commissionItemId: c.id,
    });
  });

  // Fill with generic routines that aren't in commissions
  if (scheduleItems.length < 5 && routines) {
    routines.slice(0, 5 - scheduleItems.length).forEach((r, i) => {
      if (!scheduleItems.find((x) => x.title === r.title)) {
        scheduleItems.push({
          id: r.id,
          title: r.title,
          time: TIMES[scheduleItems.length + i] ?? "",
          tag: `+${r.xpReward}xp`,
          tagColor: r.area?.attributeKey ? colorFor(r.area.attributeKey) : "var(--attr-int)",
          done: r.completedToday,
          icon: ICONS[(scheduleItems.length + i) % ICONS.length],
        });
      }
    });
  }

  return (
    <div className="panel-cream framed rounded-sm p-4 space-y-3">
      <SectionHeader cn="今日安排" en="Schedule" more="/routines" />

      {scheduleItems.length === 0 ? (
        <EmptyHint text="尚未设定日程。去添加日常。" href="/routines" />
      ) : (
        <ul className="space-y-2">
          {scheduleItems.map((it) => (
            <li key={it.id} className="group flex items-center gap-2 text-sm">
              <button
                disabled={it.done || !it.commissionItemId || complete.isPending}
                onClick={() => it.commissionItemId && complete.mutate(it.commissionItemId)}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all ${
                  it.done
                    ? "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]"
                    : "border-[var(--border-strong)] bg-[var(--bg-page)] text-[var(--fg-muted)] group-hover:border-[var(--gold)]"
                }`}
                title={it.done ? "Done" : "Mark done"}
              >
                {it.done ? <Check size={14} /> : it.icon}
              </button>
              <div className={`flex-1 ${it.done ? "opacity-55" : ""}`}>
                <div className="font-mono text-[10px] text-[var(--fg-muted)]">{it.time}</div>
                <div className={`font-display text-[12px] text-[var(--fg-strong)] ${it.done ? "line-through" : ""}`}>
                  {it.title}
                </div>
              </div>
              <span
                className="font-display-en text-[10px] font-bold"
                style={{ color: it.tagColor }}
              >
                {it.tag}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Tasks Card ---------- */
export function TasksCard() {
  const { data: tasks } = useTasks("TODO");
  const top = (tasks ?? []).slice(0, 4);

  return (
    <div className="panel-cream framed rounded-sm p-4 space-y-3">
      <SectionHeader cn="待办事项" en="Tasks" more="/tasks" />
      {top.length === 0 ? (
        <EmptyHint text="暂无待办。" href="/tasks" />
      ) : (
        <ul className="space-y-2">
          {top.map((t) => (
            <li key={t.id} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--gold)]" />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[13px] leading-tight text-[var(--fg-strong)]">
                  {t.title}
                </div>
                {t.area && (
                  <div className="font-display-en text-[9px] tracking-[0.2em] text-[var(--gold-deep)]">
                    {t.area.name}
                  </div>
                )}
              </div>
              <span className="shrink-0 font-display-en text-[10px] text-[var(--fg-muted)]">
                {t.priority === 1 ? "HIGH" : t.priority === 2 ? "进行中" : "LOW"}
              </span>
              <Check size={14} className="text-[var(--gold-deep)]/70 shrink-0" />
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/tasks"
        className="mt-2 block rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] py-1.5 text-center font-display text-[12px] text-[var(--fg-strong)] hover:bg-[var(--gold)]/30"
      >
        查看全部 · View All
      </Link>
    </div>
  );
}

/* ---------- Assets Card ---------- */
export function AssetsCard() {
  const { data: assets } = useAssets();
  const netWorth = assets?.summary.netWorthCents ?? 0;
  const gold = assets?.currency.gold ?? 0;
  const gems = assets?.currency.gems ?? 0;
  const fate = assets?.currency.fate ?? 0;

  return (
    <div className="panel-cream framed relative rounded-sm p-4 space-y-3 overflow-hidden">
      <SectionHeader cn="人生资产" en="Assets" more="/assets" />

      <div className="relative flex items-end gap-3">
        {/* Treasure chest from asset sheet */}
        <div className="relative h-[76px] w-[92px] shrink-0">
          <Image
            src="/lifeos/assets_card.png"
            alt="treasure"
            fill
            className="object-contain object-center"
            sizes="92px"
          />
        </div>
        <div className="flex-1 space-y-1 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-[11px] text-[var(--fg-muted)]">总资产</span>
            <span className="font-display text-lg font-bold text-[var(--gold-deep)]">
              {formatCompactMoney(netWorth)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-display-en text-[9px] tracking-[0.2em] text-[var(--fg-subtle)]">GOLD</span>
            <span className="font-mono text-xs text-[var(--attr-gold)]">{gold.toLocaleString()} ⭐</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-display-en text-[9px] tracking-[0.2em] text-[var(--fg-subtle)]">GEMS</span>
            <span className="font-mono text-xs text-[var(--attr-cha)]">{gems} 💎</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-display-en text-[9px] tracking-[0.2em] text-[var(--fg-subtle)]">FATE</span>
            <span className="font-mono text-xs text-[var(--attr-cre)]">{fate} 🎫</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCompactMoney(cents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/* ---------- Achievements Card ---------- */
export function AchievementsCard() {
  // Recent "achievements" derived from the latest completed items — here
  // we use simple placeholders until Phase 3 achievements land.
  const { data: tasks } = useTasks();
  const doneRecent = (tasks ?? []).filter((t) => t.status === "DONE").slice(0, 3);

  const STATIC = [
    { title: "初入学院", subtitle: "完成新生引导" },
    { title: "博学多才", subtitle: "阅读书籍累计 10 本" },
    { title: "跑步爱好者", subtitle: "累计跑步 30 次" },
  ];

  const items =
    doneRecent.length >= 3
      ? doneRecent.map((t) => ({
          title: t.title,
          subtitle: `Area: ${t.area?.name ?? "—"}`,
        }))
      : STATIC;

  return (
    <div className="panel-cream framed rounded-sm p-4 space-y-3">
      <SectionHeader cn="近期成就" en="Recent Achievements" more="/achievements" />
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]">
              <Trophy size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13px] font-bold leading-tight text-[var(--fg-strong)]">
                {it.title}
              </div>
              <div className="text-[11px] text-[var(--fg-muted)]">{it.subtitle}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- helpers ---------- */

function colorFor(key: string): string {
  const map: Record<string, string> = {
    STR: "var(--attr-str)",
    INT: "var(--attr-int)",
    CHA: "var(--attr-cha)",
    WIS: "var(--attr-wis)",
    CRE: "var(--attr-cre)",
    GOLD: "var(--attr-gold)",
  };
  return map[key] ?? "var(--attr-int)";
}

function EmptyHint({ text, href }: { text: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-sm border border-dashed border-[var(--border-strong)] py-4 text-center text-xs text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--fg)]"
    >
      {text}
    </Link>
  );
}

/** Tiny loader chip for async states */
export function LoaderChip() {
  return (
    <div className="flex items-center gap-1 text-xs text-[var(--fg-muted)]">
      <Loader2 size={12} className="animate-spin" />
      <Sparkles size={12} />
    </div>
  );
}
