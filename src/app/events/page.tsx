"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Sparkles, Hourglass, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEvents, useClaimEventMission } from "@/hooks/queries";
import type { EventSnapshotDTO, EventStatus } from "@/lib/types";

const STATUS_ORDER: EventStatus[] = ["active", "upcoming", "ended"];
const STATUS_LABEL: Record<EventStatus, string> = {
  active: "进行中",
  upcoming: "即将开启",
  ended: "已结束",
};

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();
  const grouped = useMemo(() => {
    const out: Record<EventStatus, EventSnapshotDTO[]> = { active: [], upcoming: [], ended: [] };
    for (const e of events ?? []) out[e.status].push(e);
    return out;
  }, [events]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-6 md:px-8 md:py-8">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">限时活动</span>
          <span className="en text-[11px]">Events · Genshin 5-layer rhythm</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
        <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
          每个活动有 4-5 个任务 + 一个最终大奖（XP/Gems/Fate 包，可能附赠限定相框）。错过会过期。
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : (events ?? []).length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          目前没有活动。
        </div>
      ) : (
        STATUS_ORDER.filter((s) => grouped[s].length > 0).map((status) => (
          <section key={status}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="diamond-gold" />
              <h3 className="font-display text-lg font-bold text-[var(--fg-strong)]">
                {STATUS_LABEL[status]}
              </h3>
              <span className="font-display-en text-[10px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
                · {status} · {grouped[status].length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/30 to-transparent" />
            </div>
            <div className="grid gap-5">
              {grouped[status].map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventSnapshotDTO }) {
  const claim = useClaimEventMission();
  const isUpcoming = event.status === "upcoming";
  const isEnded = event.status === "ended";
  const themeBg = `linear-gradient(140deg, ${event.themeColor}22, ${event.themeColor}05 60%)`;

  const claimedCount = event.missions.filter((m) => m.claimed).length;

  return (
    <div
      className="panel-cream framed relative overflow-hidden rounded-sm"
      style={{ background: themeBg }}
    >
      {/* Hero */}
      <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div
            className="font-display-en text-[10px] uppercase tracking-[0.25em]"
            style={{ color: event.themeColor }}
          >
            EVENT · {STATUS_LABEL[event.status]}
          </div>
          <h2 className="mt-1 flex items-baseline gap-2 font-display text-2xl font-bold text-[var(--fg-strong)]">
            <span>{event.emoji}</span>
            <span>{event.name}</span>
          </h2>
          <p className="mt-2 text-[13px] text-[var(--fg)]">{event.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
            <span className="font-mono text-[var(--fg-muted)]">
              {fmtDate(event.startsAt)} → {fmtDate(event.endsAt)}
            </span>
            {event.status === "active" && event.msToEnd !== null && (
              <span className="chip-gold flex items-center gap-1">
                <Hourglass size={11} /> 剩 {fmtDuration(event.msToEnd)}
              </span>
            )}
            {event.status === "upcoming" && event.msToStart !== null && (
              <span className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] px-2 py-0.5 text-[var(--fg-muted)]">
                <Lock size={10} className="mr-1 inline" />
                {fmtDuration(event.msToStart)} 后开始
              </span>
            )}
          </div>
        </div>

        {/* Bonus pill */}
        <BonusPill event={event} onClaim={() => claim.mutate({ eventId: event.id, missionKey: "__bonus__" })} disabled={!event.allMissionsClaimed || event.bonusClaimed || claim.isPending || isEnded} />
      </div>

      {/* Missions track */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-page)]/40 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
            Missions · {claimedCount}/{event.missions.length}
          </div>
          {isUpcoming && (
            <span className="text-[11px] text-[var(--fg-muted)]">活动开始后自动计数</span>
          )}
        </div>
        <ul className="grid gap-2.5 md:grid-cols-2">
          {event.missions.map((m) => (
            <li
              key={m.key}
              className={`rounded-sm border p-3 ${
                m.claimed
                  ? "border-[var(--success,#3a7d56)]/40 bg-[var(--success,#3a7d56)]/8"
                  : m.done
                  ? "border-[var(--gold)] bg-[var(--gold-tint)]/40 shadow-[0_0_0_1px_var(--gold)]"
                  : "border-[var(--border)] bg-[var(--bg-card)]/70"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-baseline gap-1.5">
                  <span>{m.emoji}</span>
                  <span className="font-display text-[13px] font-bold text-[var(--fg-strong)]">
                    {m.title}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-[var(--fg-muted)]">
                  {m.current}/{m.target}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${m.progress * 100}%`,
                    background: m.claimed ? "var(--success,#3a7d56)" : event.themeColor,
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <span className="text-[var(--fg-muted)]">
                  {m.xpReward > 0 && <span>+{m.xpReward} XP </span>}
                  {m.goldReward > 0 && <span>+{m.goldReward}⭐ </span>}
                  {m.gemsReward > 0 && <span>+{m.gemsReward}💎 </span>}
                  {m.fateReward > 0 && <span>+{m.fateReward}🎫</span>}
                </span>
                {m.claimed ? (
                  <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--success,#3a7d56)]">
                    ✓ 已领取
                  </span>
                ) : m.done && !isEnded ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => claim.mutate({ eventId: event.id, missionKey: m.key })}
                    disabled={claim.isPending}
                  >
                    领取
                  </Button>
                ) : isEnded && m.done ? (
                  <span className="text-[10px] text-[var(--fg-subtle)]">活动已结束</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BonusPill({
  event,
  onClaim,
  disabled,
}: {
  event: EventSnapshotDTO;
  onClaim: () => void;
  disabled: boolean;
}) {
  const hasFrame = !!event.bonus.equipmentKey;
  return (
    <div className="panel-ink ornate min-w-[220px] rounded-sm p-4">
      <div className="font-display-en text-[10px] uppercase tracking-[0.22em] text-[var(--gold-pale)]">
        Bonus Reward
      </div>
      <div className="mt-1 flex items-center gap-2 text-[var(--fg-on-ink)]">
        <Trophy size={16} className="text-[var(--gold-pale)]" />
        <span className="font-display text-[14px] font-bold">完成全部任务</span>
      </div>
      <ul className="mt-2 space-y-0.5 font-mono text-[12px] text-[var(--fg-on-ink)]/90">
        {event.bonus.xp > 0 && <li>+{event.bonus.xp} XP</li>}
        {event.bonus.gold > 0 && <li>+{event.bonus.gold}⭐</li>}
        {event.bonus.gems > 0 && <li>+{event.bonus.gems}💎</li>}
        {event.bonus.fate > 0 && <li>+{event.bonus.fate}🎫</li>}
        {hasFrame && <li>+ 限定相框</li>}
      </ul>
      {event.bonusClaimed ? (
        <div className="mt-3 rounded-sm border border-[var(--gold-pale)]/40 px-2 py-1 text-center text-[11px] text-[var(--gold-pale)]">
          ✓ 已领取
        </div>
      ) : event.status === "ended" ? (
        <div className="mt-3 rounded-sm border border-[var(--border)]/30 px-2 py-1 text-center text-[11px] text-[var(--gold-pale)]/70">
          活动已结束
        </div>
      ) : (
        <Button
          size="sm"
          variant="primary"
          onClick={onClaim}
          disabled={disabled}
          className="mt-3 w-full"
        >
          <Sparkles size={14} />
          {event.allMissionsClaimed ? "领取大奖" : "完成全部任务后解锁"}
        </Button>
      )}
      {hasFrame && (
        <Link
          href="/equipment"
          className="mt-2 block text-center text-[10px] text-[var(--gold-pale)]/80 hover:underline"
        >
          查看相框 →
        </Link>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "0";
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
