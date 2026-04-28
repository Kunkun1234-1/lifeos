"use client";

import { motion } from "framer-motion";
import { useAchievements } from "@/hooks/queries";
import type { AchievementDTO } from "@/lib/types";

const TIER_COLOR: Record<string, string> = {
  bronze: "#a87034",
  silver: "#9aa1ad",
  gold: "var(--gold-deep)",
  legendary: "#9b6bc1",
};

const TIER_LABEL: Record<string, string> = {
  bronze: "铜",
  silver: "银",
  gold: "金",
  legendary: "传说",
};

const CATEGORY_LABEL: Record<string, string> = {
  streak: "连击",
  cumulative: "累积",
  milestone: "里程碑",
  hidden: "隐藏",
};

export default function AchievementsPage() {
  const { data: items } = useAchievements();
  const list = items ?? [];
  const totalUnlocked = list.filter((a) => a.unlocked).length;

  // Group by tier
  const grouped: Record<string, AchievementDTO[]> = {};
  for (const a of list) {
    grouped[a.tier] = grouped[a.tier] ?? [];
    grouped[a.tier].push(a);
  }
  const TIERS = ["bronze", "silver", "gold", "legendary"];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">成就</span>
            <span className="en text-[11px]">Achievements</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            完成任务、习惯、日程、复盘的过程会自动解锁成就。隐藏成就只在解锁后展示。
          </p>
        </div>
        <div className="rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] px-4 py-2 text-center">
          <div className="font-mono text-2xl font-bold text-[var(--gold-deep)]">
            {totalUnlocked}<span className="text-base">/{list.length}</span>
          </div>
          <div className="font-display-en text-[9px] tracking-[0.25em] text-[var(--gold-deep)]">
            UNLOCKED
          </div>
        </div>
      </div>

      {TIERS.map((tier) => {
        const tierItems = grouped[tier] ?? [];
        if (tierItems.length === 0) return null;
        return (
          <section key={tier}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="diamond-gold" />
              <h3
                className="font-display text-lg font-bold"
                style={{ color: TIER_COLOR[tier] }}
              >
                {TIER_LABEL[tier]}牌
              </h3>
              <span
                className="font-display-en text-[10px] uppercase tracking-[0.25em]"
                style={{ color: TIER_COLOR[tier] }}
              >
                {tier} · {tierItems.filter((a) => a.unlocked).length}/{tierItems.length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/40 to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tierItems.map((a, i) => (
                <AchievementCard key={a.id} a={a} index={i} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AchievementCard({ a, index }: { a: AchievementDTO; index: number }) {
  const showHidden = a.hidden && !a.unlocked;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`relative panel-cream framed rounded-sm p-4 ${
        a.unlocked ? "" : "opacity-65 grayscale-[0.4]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-2xl"
          style={{
            borderColor: a.unlocked ? TIER_COLOR[a.tier] : "var(--border)",
            background: a.unlocked
              ? `radial-gradient(${TIER_COLOR[a.tier]}33, transparent 70%)`
              : "var(--bg-elevated)",
            color: a.unlocked ? "inherit" : "var(--fg-subtle)",
          }}
        >
          {showHidden ? "?" : a.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-bold text-[var(--fg-strong)]">
            {showHidden ? "??? · 隐藏成就" : a.name}
          </div>
          <div className="mt-0.5 text-[11px] leading-snug text-[var(--fg-muted)]">
            {showHidden ? "完成特殊条件后解锁" : a.description}
          </div>
        </div>
        {a.unlocked && (
          <span
            className="font-display-en text-[9px] uppercase tracking-[0.18em]"
            style={{ color: TIER_COLOR[a.tier] }}
          >
            ✓ Unlocked
          </span>
        )}
      </div>

      {/* Progress bar (when not unlocked) */}
      {!a.unlocked && !showHidden && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="font-display-en uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              {CATEGORY_LABEL[a.category] ?? a.category}
            </span>
            <span className="font-mono text-[var(--fg)]">
              {a.current}/{a.threshold}
            </span>
          </div>
          <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${a.progress * 100}%`,
                background: TIER_COLOR[a.tier],
              }}
            />
          </div>
        </div>
      )}

      {/* Reward chips */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
        {a.reward.gold > 0 && (
          <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 text-[var(--attr-gold)]">
            ⭐{a.reward.gold}
          </span>
        )}
        {a.reward.gems > 0 && (
          <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 text-[var(--attr-cha)]">
            💎{a.reward.gems}
          </span>
        )}
        {a.reward.fate > 0 && (
          <span className="rounded-sm bg-[var(--gold-tint)] px-1.5 text-[var(--attr-cre)]">
            🎫{a.reward.fate}
          </span>
        )}
        {a.unlockedAt && (
          <span className="ml-auto text-[var(--fg-subtle)]">
            {new Date(a.unlockedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </motion.div>
  );
}
