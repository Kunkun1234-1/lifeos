"use client";

import { motion } from "framer-motion";
import { Sparkles, Coins, Gem, Ticket, Lock, Check, Trophy } from "lucide-react";
import { useBattlePass, useClaimBPLevel } from "@/hooks/queries";
import type { BPMissionDTO, BPLevelReward } from "@/lib/types";

/**
 * Weekly Battle Pass — Genshin-style. Per design doc §4.4.
 * Top: hero header showing current week, BP level, weekly XP / cap.
 * Center: 9 missions grid with progress.
 * Bottom: Level reward track (1..20) — claim each as level threshold met.
 */
export default function BattlePassPage() {
  const { data: bp } = useBattlePass();

  if (!bp) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-8 text-sm text-[var(--fg-muted)]">
        Loading…
      </div>
    );
  }

  const weekDisplay = `${formatDate(bp.weekStart)} – ${formatDate(bp.weekEnd)}`;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">本周战令</span>
            <span className="en text-[11px]">Battle Pass</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            {weekDisplay} · 周累计 XP 进入战令等级，完成 9 项周任务可大幅提速。
            每周 cap {bp.cap} XP（约 20 级）防止过度透支。
          </p>
        </div>
      </div>

      {/* Hero panel */}
      <BPHero bp={bp} />

      {/* Missions */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="diamond-gold" />
          <span className="section-label">
            <span className="cn text-base">本周任务</span>
            <span className="en text-[10px]">Weekly Missions</span>
          </span>
          <span className="ml-auto chip-gold">
            {bp.missions.filter((m) => m.done).length} / {bp.missions.length}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {bp.missions.map((m) => (
            <MissionCard key={m.key} m={m} />
          ))}
        </div>
      </section>

      {/* Reward track */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="diamond-gold" />
          <span className="section-label">
            <span className="cn text-base">奖励进度</span>
            <span className="en text-[10px]">Reward Track</span>
          </span>
          <span className="ml-auto text-[10px] text-[var(--fg-muted)]">
            已领取 {bp.claimedLevels.length} / {bp.rewards.length}
          </span>
        </div>
        <RewardTrack bp={bp} />
      </section>
    </div>
  );
}

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${m}/${d}`;
}

function BPHero({ bp }: { bp: ReturnType<typeof useBattlePass>["data"] & {} }) {
  const pct = Math.min(1, bp.cappedXp / bp.cap);
  return (
    <div className="panel-cream framed relative overflow-hidden rounded-sm p-6">
      <div className="pointer-events-none absolute -top-16 right-10 h-48 w-48 rounded-full bg-[var(--gold)]/10 blur-3xl" />

      <div className="relative grid gap-6 md:grid-cols-[180px_1fr]">
        {/* Level orb */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative grid h-32 w-32 place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="3" />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#bp-grad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="bp-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fff4c2" />
                  <stop offset="50%" stopColor="#f4d876" />
                  <stop offset="100%" stopColor="#d4a94d" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center">
              <div className="font-display-en text-[9px] uppercase tracking-[0.3em] text-[var(--gold-deep)]">
                BP Lv.
              </div>
              <div className="hero-title text-5xl font-bold leading-none">
                {bp.level}
              </div>
              <div className="font-display-en text-[8px] tracking-[0.25em] text-[var(--fg-subtle)]">
                / 20
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-display-en uppercase tracking-[0.18em] text-[var(--gold-deep)]">
              Weekly XP
            </span>
            <span className="font-mono text-sm font-bold text-[var(--fg-strong)]">
              {bp.cappedXp.toLocaleString()} / {bp.cap.toLocaleString()}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-sm border border-[var(--border-strong)] bg-[var(--bg-panel-ink)]/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full"
              style={{
                background: "linear-gradient(90deg, var(--gold-deep), var(--gold-bright), var(--gold-pale))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            />
          </div>
          <div className="text-[11px] text-[var(--fg-muted)]">
            距离 Lv.{bp.level + 1} 还差 <span className="font-bold text-[var(--gold-deep)]">{bp.xpForNext - bp.xpIntoLevel}</span> XP
            {bp.totalXp > bp.cap && (
              <span className="ml-2 text-[var(--warning)]">
                · 已超 cap （{bp.totalXp - bp.cap} XP 不计入战令）
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionCard({ m }: { m: BPMissionDTO }) {
  const pct = Math.min(1, m.target > 0 ? m.current / m.target : 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel-cream framed rounded-sm p-4 transition-all ${
        m.done ? "border-[var(--success)]/60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border text-xl"
          style={{
            borderColor: m.done ? "var(--success)" : "var(--gold)",
            background: m.done ? "rgba(76,138,116,0.12)" : "var(--gold-tint)",
          }}
        >
          {m.done ? <Check size={18} className="text-[var(--success)]" /> : m.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-display text-[14px] font-bold ${m.done ? "line-through text-[var(--fg-muted)]" : "text-[var(--fg-strong)]"}`}>
            {m.title}
          </div>
          <div className="mt-0.5 flex items-baseline justify-between text-[10px]">
            <span className="font-display-en uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              {m.metric.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-[var(--fg)]">
              {m.current} / {m.target}
            </span>
          </div>
          <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct * 100}%`,
                background: m.done
                  ? "linear-gradient(90deg, var(--success), #8bc7a4)"
                  : "linear-gradient(90deg, var(--gold-deep), var(--gold-bright))",
              }}
            />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="font-mono text-[var(--accent-glow)]">+{m.xp} XP</span>
        {m.done && (
          <span className="font-display-en text-[9px] uppercase tracking-[0.2em] text-[var(--success)]">
            ✓ Complete
          </span>
        )}
      </div>
    </motion.div>
  );
}

function RewardTrack({ bp }: { bp: ReturnType<typeof useBattlePass>["data"] & {} }) {
  const claim = useClaimBPLevel();

  return (
    <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
      {bp.rewards.map((r) => (
        <RewardTile
          key={r.level}
          reward={r}
          state={
            bp.claimedLevels.includes(r.level)
              ? "claimed"
              : bp.level >= r.level
              ? "ready"
              : "locked"
          }
          onClaim={() => claim.mutate(r.level)}
          disabled={claim.isPending}
        />
      ))}
    </div>
  );
}

function RewardTile({
  reward,
  state,
  onClaim,
  disabled,
}: {
  reward: BPLevelReward;
  state: "claimed" | "ready" | "locked";
  onClaim: () => void;
  disabled?: boolean;
}) {
  const major = reward.gems > 0 || reward.fate > 0;
  return (
    <button
      type="button"
      onClick={state === "ready" ? onClaim : undefined}
      disabled={state !== "ready" || disabled}
      className={`relative flex flex-col items-center gap-1 rounded-sm border-2 p-2.5 transition-all ${
        state === "claimed"
          ? "border-[var(--success)]/50 bg-[var(--success)]/5 opacity-60"
          : state === "ready"
          ? "border-[var(--gold)] bg-[var(--gold-tint)] shadow-[0_0_16px_-6px_var(--gold)] hover:scale-105"
          : "border-[var(--border)] bg-[var(--bg-page)] opacity-70"
      } ${major && state !== "claimed" ? "ring-1 ring-[var(--gold-bright)]" : ""}`}
    >
      <div className="font-display-en text-[9px] tracking-[0.2em] text-[var(--fg-subtle)]">
        Lv.{reward.level}
      </div>

      <div className="grid h-10 w-10 place-items-center">
        {state === "claimed" ? (
          <Check size={20} className="text-[var(--success)]" />
        ) : state === "locked" ? (
          <Lock size={16} className="text-[var(--fg-subtle)]" />
        ) : major ? (
          <Trophy size={20} className="text-[var(--gold-deep)]" />
        ) : (
          <Sparkles size={20} className="text-[var(--gold-deep)]" />
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5 text-[10px] font-mono">
        {reward.gold > 0 && (
          <span className="flex items-center gap-0.5 text-[var(--attr-gold)]">
            <Coins size={9} /> {reward.gold}
          </span>
        )}
        {reward.gems > 0 && (
          <span className="flex items-center gap-0.5 text-[var(--attr-cha)]">
            <Gem size={9} /> {reward.gems}
          </span>
        )}
        {reward.fate > 0 && (
          <span className="flex items-center gap-0.5 text-[var(--attr-cre)]">
            <Ticket size={9} /> {reward.fate}
          </span>
        )}
      </div>

      {state === "ready" && (
        <span className="font-display-en text-[8px] uppercase tracking-[0.2em] text-[var(--gold-deep)]">
          Claim
        </span>
      )}
    </button>
  );
}
