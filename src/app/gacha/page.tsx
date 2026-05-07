"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Ticket, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGacha, usePullGacha } from "@/hooks/queries";
import type { GachaPullResult, RewardItemDTO } from "@/lib/types";

const TIER_COLOR: Record<string, string> = {
  common: "#9aa1ad",
  rare: "#3a6b8e",
  epic: "#9b6bc1",
  legendary: "#d4a94d",
};

const TIER_GRAD: Record<string, string> = {
  common: "from-[#c8ccd4] to-[#9aa1ad]",
  rare: "from-[#7fc3ff] to-[#3a6b8e]",
  epic: "from-[#c4a4ff] to-[#9b6bc1]",
  legendary: "from-[#fff4c2] via-[#f4d876] to-[#d4a94d]",
};

const TIER_LABEL: Record<string, string> = {
  common: "通常",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

const TIER_STARS: Record<string, number> = {
  common: 3,
  rare: 4,
  epic: 4,
  legendary: 5,
};

export default function GachaPage() {
  const { data: state } = useGacha();
  const pull = usePullGacha();
  const [phase, setPhase] = useState<"idle" | "rolling" | "reveal">("idle");
  const [results, setResults] = useState<GachaPullResult["results"] | null>(null);

  const fate = state?.fate ?? 0;
  const canSingle = fate >= 1 && !pull.isPending;
  const canTen = fate >= 10 && !pull.isPending;

  const doPull = async (count: 1 | 10) => {
    setPhase("rolling");
    try {
      const r = await pull.mutateAsync(count);
      setResults(r.results);
      // Brief stutter to allow rolling animation to play
      setTimeout(() => setPhase("reveal"), 1200);
    } catch (e) {
      setPhase("idle");
      throw e;
    }
  };

  const dismiss = () => {
    setPhase("idle");
    setResults(null);
  };

  const highestTier = results
    ? results.reduce<string>((best, r) => {
        const order = ["common", "rare", "epic", "legendary"];
        return order.indexOf(r.tier) > order.indexOf(best) ? r.tier : best;
      }, "common")
    : "common";

  return (
    <div className="relative mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">命运祈愿</span>
          <span className="en text-[11px]">Wish · Gacha</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
        <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
          每次复盘积累 1 张「命运券」🎫，在此抽取真实奖励。软保底 30 抽必出稀有以上，硬保底 80 抽必出史诗以上。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="panel-cream framed relative overflow-hidden rounded-sm p-8">
          {/* Decorative starlight */}
          <div className="pointer-events-none absolute inset-0 opacity-30">
            {Array.from({ length: 24 }).map((_, i) => {
              const x = (i * 37) % 100;
              const y = (i * 23) % 100;
              const sz = (i % 3) + 1;
              return (
                <span
                  key={i}
                  className="absolute rounded-full bg-[var(--gold)]"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${sz}px`,
                    height: `${sz}px`,
                    boxShadow: `0 0 ${sz * 4}px var(--gold)`,
                  }}
                />
              );
            })}
          </div>

          <div className="relative grid place-items-center gap-6 py-12">
            <div className="text-center">
              <div className="font-display-en text-[10px] uppercase tracking-[0.4em] text-[var(--gold-deep)]">
                Wish Compass
              </div>
              <div className="mt-2 text-7xl">✦</div>
              <div className="mt-2 font-display text-3xl font-bold text-[var(--fg-strong)]">
                命运在等候你
              </div>
              <div className="mt-1 text-xs text-[var(--fg-muted)]">
                Fate ×{fate} · 距离软保底 {Math.max(0, 30 - (state?.pullsSinceRare ?? 0))} 抽 · 距离硬保底 {Math.max(0, 80 - (state?.pullsSinceEpic ?? 0))} 抽
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => doPull(1)}
                disabled={!canSingle}
              >
                <Ticket size={16} />
                单抽 ×1
              </Button>
              <Button size="lg" onClick={() => doPull(10)} disabled={!canTen}>
                <Sparkles size={16} />
                十连 ×10
              </Button>
            </div>
            {fate < 1 && (
              <div className="text-center text-xs text-[var(--fg-muted)]">
                Fate 不足。
                <Link href="/review" className="link-gold">
                  完成今日复盘获得 1 张 →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Pity + Recent */}
        <aside className="space-y-4">
          <div className="panel-cream framed rounded-sm p-4">
            <div className="section-label mb-2">
              <span className="cn text-sm">保底</span>
              <span className="en text-[9px]">Pity</span>
            </div>
            <PityBar
              label="软保底 (Rare+)"
              current={state?.pullsSinceRare ?? 0}
              cap={state?.softPityAt ?? 30}
              color="var(--accent)"
            />
            <PityBar
              label="硬保底 (Epic+)"
              current={state?.pullsSinceEpic ?? 0}
              cap={state?.hardPityAt ?? 80}
              color="#9b6bc1"
            />
            <div className="mt-2 text-[10px] text-[var(--fg-muted)]">
              累计抽取 {state?.totalPulls ?? 0} 次
            </div>
          </div>

          <div className="panel-cream framed rounded-sm p-4">
            <div className="section-label mb-2">
              <span className="cn text-sm">最近抽取</span>
              <span className="en text-[9px]">Recent Pulls</span>
            </div>
            {(state?.recent.length ?? 0) === 0 ? (
              <div className="text-[11px] text-[var(--fg-subtle)]">还没有记录</div>
            ) : (
              <ul className="space-y-1.5 text-[12px]">
                {state!.recent.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-sm border text-xs"
                      style={{
                        borderColor: TIER_COLOR[p.tier],
                        background: `${TIER_COLOR[p.tier]}20`,
                      }}
                    >
                      {p.reward?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.reward.imageUrl}
                          alt={p.reward.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{p.reward?.emoji ?? "✦"}</span>
                      )}
                    </span>
                    <span className="truncate font-display text-[var(--fg-strong)]">
                      {p.reward?.name ?? "(空)"}
                    </span>
                    <span
                      className="ml-auto font-display-en text-[9px] uppercase tracking-widest"
                      style={{ color: TIER_COLOR[p.tier] }}
                    >
                      {TIER_LABEL[p.tier]}
                    </span>
                    {p.pity && (
                      <span className="rounded-sm bg-[var(--gold-tint)] px-1 text-[9px] text-[var(--gold-deep)]">
                        {p.pity}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Animation overlay */}
      <AnimatePresence>
        {phase === "rolling" && <RollingOverlay />}
        {phase === "reveal" && results && (
          <RevealOverlay results={results} highestTier={highestTier} onDismiss={dismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PityBar({
  label,
  current,
  cap,
  color,
}: {
  label: string;
  current: number;
  cap: number;
  color: string;
}) {
  const pct = Math.min(1, current / cap);
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between text-[10px]">
        <span className="text-[var(--fg-muted)]">{label}</span>
        <span className="font-mono text-[var(--fg-strong)]">
          {current}/{cap}
        </span>
      </div>
      <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/* ---------- Rolling animation (1.2s of starbeam ascend) ---------- */
function RollingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-b from-[#0a0a14]/95 to-[#1a1a36]/95"
    >
      {/* Starbeam center */}
      <motion.div
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: [0, 1.2, 1], rotate: 720 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="text-[10rem] text-[var(--gold)]"
        style={{ filter: "drop-shadow(0 0 60px var(--gold))" }}
      >
        ✦
      </motion.div>
      {/* Outward starlight rays */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(angle) * 400,
              y: Math.sin(angle) * 400,
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{ duration: 1.2, delay: i * 0.04 }}
            className="absolute h-3 w-3 rounded-full bg-[var(--gold-pale)]"
            style={{ boxShadow: "0 0 20px var(--gold)" }}
          />
        );
      })}
    </motion.div>
  );
}

/* ---------- Reveal grid + per-card flip ---------- */
function RevealOverlay({
  results,
  highestTier,
  onDismiss,
}: {
  results: GachaPullResult["results"];
  highestTier: string;
  onDismiss: () => void;
}) {
  const [flipAll, setFlipAll] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 grid place-items-center p-8 ${
        highestTier === "legendary"
          ? "bg-gradient-to-br from-[#3a2a05] via-[#1a1100] to-[#1a1a36]"
          : highestTier === "epic"
          ? "bg-gradient-to-br from-[#3a1a55] via-[#1a0f36] to-[#0a0a14]"
          : "bg-[#0a0a14]/95"
      }`}
      onClick={() => flipAll && onDismiss()}
    >
      <button
        onClick={onDismiss}
        className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20"
      >
        <X size={16} />
      </button>

      <div className="relative">
        <div className="mb-6 text-center">
          <div className="font-display-en text-[10px] uppercase tracking-[0.4em] text-[var(--gold-pale)]">
            {results.length === 1 ? "Single Wish · 单抽" : "10× Wish · 十连"}
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-white">
            命运的赠礼
          </div>
        </div>

        <div className={`grid gap-3 ${results.length === 1 ? "grid-cols-1" : "grid-cols-5"}`}>
          {results.map((r, i) => (
            <PullCard
              key={r.pullId}
              tier={r.tier}
              reward={r.reward}
              delay={i * 0.12}
              onAllFlipped={() => i === results.length - 1 && setFlipAll(true)}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {flipAll ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="rounded-sm border border-[var(--gold)]/70 bg-gradient-to-b from-[var(--gold)] to-[var(--gold-deep)] px-8 py-2 font-display text-sm font-semibold tracking-[0.18em] text-[#1a2230] shadow-[0_4px_12px_-4px_rgba(196,167,82,0.6)] hover:brightness-110"
            >
              继续 · CONTINUE
            </button>
          ) : (
            <div className="text-xs text-white/60">翻牌中…</div>
          )}
          {flipAll && (
            <div className="text-[10px] text-white/40">或点击空白处关闭</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PullCard({
  tier,
  reward,
  delay,
  onAllFlipped,
}: {
  tier: string;
  reward: RewardItemDTO | null;
  delay: number;
  onAllFlipped: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const stars = TIER_STARS[tier] ?? 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onAnimationComplete={() => {
        setTimeout(() => {
          setFlipped(true);
          onAllFlipped();
        }, 100);
      }}
      className="relative aspect-[3/4] perspective-[1000px]"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-full w-full"
      >
        {/* Back */}
        <div
          className={`absolute inset-0 grid place-items-center rounded-md border-2 bg-gradient-to-br ${TIER_GRAD[tier]} backface-hidden`}
          style={{
            backfaceVisibility: "hidden",
            borderColor: TIER_COLOR[tier],
            boxShadow: `0 0 30px ${TIER_COLOR[tier]}55`,
          }}
        >
          <span className="text-5xl text-white/80">✦</span>
        </div>
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-between rounded-md border-2 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-page)] p-3"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor: TIER_COLOR[tier],
            boxShadow: `0 0 32px ${TIER_COLOR[tier]}66`,
          }}
        >
          {/* Stars */}
          <div className="flex gap-0.5 text-xs" style={{ color: TIER_COLOR[tier] }}>
            {Array.from({ length: stars }).map((_, j) => (
              <span key={j}>★</span>
            ))}
          </div>
          {/* Emoji or image */}
          <div
            className="grid h-20 w-20 place-items-center overflow-hidden rounded-sm text-5xl"
            style={{ filter: `drop-shadow(0 0 12px ${TIER_COLOR[tier]})` }}
          >
            {reward?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{reward?.emoji ?? "✦"}</span>
            )}
          </div>
          {/* Name */}
          <div className="text-center">
            <div className="font-display text-[12px] font-bold leading-tight text-[var(--fg-strong)]">
              {reward?.name ?? "命运之雾"}
            </div>
            <div
              className="font-display-en text-[8px] uppercase tracking-[0.2em]"
              style={{ color: TIER_COLOR[tier] }}
            >
              {TIER_LABEL[tier]}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sparkle for legendary */}
      {tier === "legendary" && flipped && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 1] }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <Sparkles size={48} className="text-[var(--gold)]" />
        </motion.div>
      )}
    </motion.div>
  );
}
