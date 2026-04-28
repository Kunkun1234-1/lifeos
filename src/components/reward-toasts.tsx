"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useRewardsStore, type RewardEvent } from "@/stores/rewards";
import { ATTRIBUTE_EMOJI, ATTRIBUTE_LABEL, type AttributeKey } from "@/lib/gamification";

const AUTO_DISMISS_MS = 2600;

export function RewardToasts() {
  const events = useRewardsStore((s) => s.events);
  const dismiss = useRewardsStore((s) => s.dismiss);

  useEffect(() => {
    const timers = events.map((e) => setTimeout(() => dismiss(e.id), AUTO_DISMISS_MS));
    return () => timers.forEach(clearTimeout);
  }, [events, dismiss]);

  return (
    <div className="pointer-events-none fixed right-8 bottom-8 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {events.map((e) => (
          <RewardChip key={e.id} event={e} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function RewardChip({ event }: { event: RewardEvent }) {
  const attrKey = event.areaKey as AttributeKey | null;
  const isBonus = !!event.label?.includes("All 4") || event.gems > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.3 } }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`relative flex items-center gap-3 overflow-hidden rounded-md border px-4 py-2.5 backdrop-blur-xl ${
        isBonus
          ? "border-[var(--gold-accent)] bg-gradient-to-r from-[var(--bg-elevated)]/95 via-[var(--gold-accent)]/10 to-[var(--bg-elevated)]/95"
          : "border-[var(--border-strong)] bg-[var(--bg-elevated)]/95"
      }`}
      style={{
        boxShadow: isBonus
          ? "0 0 32px -4px rgba(244, 216, 118, 0.6), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 0 24px -6px var(--accent), 0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      {isBonus && <div className="rarity-sweep" />}

      {/* Sparkle particle burst */}
      <ParticleBurst />

      {event.label && (
        <span className="relative flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          <Sparkles size={12} className="text-[var(--gold-accent)]" />
          {event.label}
        </span>
      )}
      {event.xp !== 0 && (
        <span className={`relative font-mono text-sm font-semibold ${event.xp >= 0 ? "text-[var(--accent-glow)]" : "text-[var(--danger)]"}`}>
          {event.xp >= 0 ? "+" : ""}{event.xp} XP
        </span>
      )}
      {event.gold > 0 && (
        <span className="relative font-mono text-sm font-semibold text-[var(--attr-gold)]">
          +{event.gold} ⭐
        </span>
      )}
      {event.gems > 0 && (
        <span className="relative font-mono text-sm font-semibold text-[var(--attr-cha)]">
          +{event.gems} 💎
        </span>
      )}
      {event.fate > 0 && (
        <span className="relative font-mono text-sm font-semibold text-[var(--attr-cre)]">
          +{event.fate} 🎫
        </span>
      )}
      {attrKey && (
        <span
          className="relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{
            borderColor: `var(--attr-${attrKey.toLowerCase()})`,
            color: `var(--attr-${attrKey.toLowerCase()})`,
          }}
        >
          {ATTRIBUTE_EMOJI[attrKey]} {ATTRIBUTE_LABEL[attrKey]}
        </span>
      )}
    </motion.div>
  );
}

function ParticleBurst() {
  const particles = Array.from({ length: 6 });
  return (
    <div className="pointer-events-none absolute left-0 top-1/2 h-0 w-0">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dx = Math.cos(angle) * 24;
        const dy = Math.sin(angle) * 12;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], x: dx, y: dy, scale: [0, 1, 0.6] }}
            transition={{ duration: 0.9, delay: i * 0.05 }}
            className="absolute h-1 w-1 rounded-full"
            style={{
              background: i % 2 ? "var(--gold-accent)" : "var(--accent-glow)",
              boxShadow: `0 0 6px ${i % 2 ? "var(--gold-accent)" : "var(--accent-glow)"}`,
            }}
          />
        );
      })}
    </div>
  );
}
