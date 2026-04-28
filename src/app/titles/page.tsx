"use client";

import { motion } from "framer-motion";
import { Crown, Lock, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTitles, useEquipTitle } from "@/hooks/queries";
import type { TitleDTO } from "@/lib/types";

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
const TIERS: TitleDTO["tier"][] = ["bronze", "silver", "gold", "legendary"];

export default function TitlesPage() {
  const { data, isLoading } = useTitles();
  const equip = useEquipTitle();
  const items = data?.items ?? [];
  const equippedKey = data?.equippedKey ?? null;
  const equipped = items.find((t) => t.equipped) ?? null;

  const grouped: Record<string, TitleDTO[]> = {};
  for (const t of items) {
    (grouped[t.tier] ??= []).push(t);
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">称号</span>
            <span className="en text-[11px]">Titles · Equip · Cosmetic</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            完成成就解锁称号 · 同时只能装备 1 个 · 显示在顶部导航的玩家徽章上。
          </p>
        </div>
        <div className="rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] px-4 py-2 text-center">
          <div className="font-mono text-2xl font-bold text-[var(--gold-deep)]">
            {data?.unlockedCount ?? 0}
            <span className="text-base">/{data?.totalCount ?? 0}</span>
          </div>
          <div className="font-display-en text-[9px] tracking-[0.25em] text-[var(--gold-deep)]">
            UNLOCKED
          </div>
        </div>
      </div>

      {/* Currently equipped */}
      <div className="panel-ink ornate rounded-sm p-5">
        <div className="font-display-en text-[10px] uppercase tracking-[0.25em] text-[var(--gold-pale)]">
          Currently Equipped
        </div>
        {equipped ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{equipped.emoji}</div>
              <div>
                <div className="font-display text-xl font-bold text-[var(--fg-on-ink)]">
                  {equipped.name}
                </div>
                <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]/80">
                  {TIER_LABEL[equipped.tier]} TIER · {equipped.tier}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => equip.mutate(null)}
              disabled={equip.isPending}
            >
              卸下
            </Button>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-3 text-[var(--fg-on-ink)]/70">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-[var(--gold-pale)]/60" />
              <span>尚未装备称号 · 解锁后从下方选一个装备</span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          没有称号定义。
        </div>
      ) : (
        TIERS.filter((t) => grouped[t]?.length).map((tier) => (
          <section key={tier}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="diamond-gold" />
              <h3
                className="font-display text-lg font-bold"
                style={{ color: TIER_COLOR[tier] }}
              >
                {TIER_LABEL[tier]}阶
              </h3>
              <span
                className="font-display-en text-[10px] uppercase tracking-[0.25em]"
                style={{ color: TIER_COLOR[tier] }}
              >
                · {tier} · {grouped[tier].filter((x) => x.unlocked).length}/{grouped[tier].length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/40 to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[tier].map((t) => (
                <TitleCard
                  key={t.key}
                  title={t}
                  isEquipped={equippedKey === t.key}
                  onEquip={() => equip.mutate(t.key)}
                  busy={equip.isPending}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function TitleCard({
  title,
  isEquipped,
  onEquip,
  busy,
}: {
  title: TitleDTO;
  isEquipped: boolean;
  onEquip: () => void;
  busy: boolean;
}) {
  const locked = !title.unlocked;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`panel-cream framed relative rounded-sm p-4 ${
        locked ? "opacity-60" : ""
      } ${isEquipped ? "shadow-[0_0_0_2px_var(--gold)]" : ""}`}
    >
      {isEquipped && (
        <span className="absolute -top-2 right-3 chip-gold flex items-center gap-1">
          <Check size={10} /> Equipped
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-sm border text-2xl ${
            locked
              ? "border-[var(--border)] bg-[var(--bg-page)] grayscale"
              : "border-[var(--gold)] bg-[var(--gold-tint)]"
          }`}
        >
          {locked ? <Lock size={18} className="text-[var(--fg-muted)]" /> : title.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-bold leading-snug text-[var(--fg-strong)]">
            {locked ? "??? · " + title.tier : title.name}
          </div>
          <div className="mt-0.5 font-display-en text-[9px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
            {TIER_LABEL[title.tier]} · {title.tier}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-muted)]">
        {title.description}
      </p>
      <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-2 text-[10px]">
        <span className="font-display-en uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          来自成就
        </span>
        {locked ? (
          <span className="text-[var(--fg-subtle)]">??? · {title.sourceAchievement.tier}</span>
        ) : (
          <Link
            href="/achievements"
            className="flex items-center gap-1 text-[var(--gold-deep)] hover:underline"
          >
            <span>{title.sourceAchievement.emoji}</span>
            <span>{title.sourceAchievement.name}</span>
          </Link>
        )}
        {title.unlockedAt && (
          <span className="ml-auto font-mono text-[var(--fg-subtle)]">
            {new Date(title.unlockedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {!locked && !isEquipped && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={onEquip}
          disabled={busy}
        >
          装备
        </Button>
      )}
    </motion.div>
  );
}
