"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEquipment, useEquipFrame } from "@/hooks/queries";
import { AvatarFrame } from "@/components/avatar-frame";
import type { EquipmentItemDTO } from "@/lib/types";

const TIER_ORDER: EquipmentItemDTO["tier"][] = ["common", "rare", "epic", "legendary"];
const TIER_LABEL: Record<string, string> = {
  common: "凡品",
  rare: "稀品",
  epic: "史诗",
  legendary: "传说",
};
const TIER_COLOR: Record<string, string> = {
  common: "#9aa1ad",
  rare: "#3a6b8e",
  epic: "#9b6bc1",
  legendary: "var(--gold-deep)",
};

const SOURCE_LABEL: Record<string, string> = {
  seed: "默认",
  achievement: "成就",
  event: "活动",
  gacha: "抽卡",
};

export default function EquipmentPage() {
  const { data, isLoading } = useEquipment();
  const equip = useEquipFrame();
  const items = data?.items ?? [];
  const equipped = items.find((i) => i.equipped) ?? null;

  const grouped: Record<string, EquipmentItemDTO[]> = {};
  for (const i of items) (grouped[i.tier] ??= []).push(i);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">装备</span>
            <span className="en text-[11px]">Equipment · Avatar Frames</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            收藏向饰品 · 解锁后可装备到顶部头像 · 每次只能戴 1 个相框。
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

      {/* Equipped preview */}
      <div className="panel-ink ornate rounded-sm p-5">
        <div className="font-display-en text-[10px] uppercase tracking-[0.25em] text-[var(--gold-pale)]">
          Currently Equipped
        </div>
        {equipped ? (
          <div className="mt-3 flex items-center gap-4">
            <AvatarFrame size={56} style={equipped.style} />
            <div className="flex-1">
              <div className="font-display text-xl font-bold text-[var(--fg-on-ink)]">
                {equipped.name}
              </div>
              <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]/80">
                {TIER_LABEL[equipped.tier]} · {equipped.tier} · {SOURCE_LABEL[equipped.source]}
              </div>
              <p className="mt-1 text-[12px] text-[var(--fg-on-ink)]/70">
                {equipped.description}
              </p>
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
          <div className="mt-2 text-[var(--fg-on-ink)]/70">
            尚未装备相框 · 从下方选一个解锁的装备
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : (
        TIER_ORDER.filter((t) => grouped[t]?.length).map((tier) => (
          <section key={tier}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="diamond-gold" />
              <h3
                className="font-display text-lg font-bold"
                style={{ color: TIER_COLOR[tier] }}
              >
                {TIER_LABEL[tier]}
              </h3>
              <span
                className="font-display-en text-[10px] uppercase tracking-[0.25em]"
                style={{ color: TIER_COLOR[tier] }}
              >
                · {tier} · {grouped[tier].filter((x) => x.unlocked).length}/{grouped[tier].length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/30 to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[tier].map((it) => (
                <FrameCard
                  key={it.key}
                  item={it}
                  onEquip={() => equip.mutate(it.key)}
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

function FrameCard({
  item,
  onEquip,
  busy,
}: {
  item: EquipmentItemDTO;
  onEquip: () => void;
  busy: boolean;
}) {
  const locked = !item.unlocked;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`panel-cream framed relative rounded-sm p-4 ${locked ? "opacity-60" : ""} ${
        item.equipped ? "shadow-[0_0_0_2px_var(--gold)]" : ""
      }`}
    >
      {item.equipped && (
        <span className="absolute -top-2 right-3 chip-gold flex items-center gap-1">
          <Check size={10} /> Equipped
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="grid place-items-center">
          {locked ? (
            <div className="grid h-12 w-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-page)] grayscale">
              <Lock size={16} className="text-[var(--fg-muted)]" />
            </div>
          ) : (
            <AvatarFrame size={36} style={item.style} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-bold leading-snug text-[var(--fg-strong)]">
            {locked ? `??? · ${item.tier}` : item.name}
          </div>
          <div className="mt-0.5 font-display-en text-[9px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
            {TIER_LABEL[item.tier]} · {SOURCE_LABEL[item.source]}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-muted)]">
        {item.description}
      </p>
      <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-2 text-[10px]">
        <span className="font-display-en uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          来源
        </span>
        {locked ? (
          <span className="text-[var(--fg-subtle)]">??? · {SOURCE_LABEL[item.source]}</span>
        ) : item.source === "achievement" && item.sourceAchievement ? (
          <Link
            href="/achievements"
            className="flex items-center gap-1 text-[var(--gold-deep)] hover:underline"
          >
            <span>{item.sourceAchievement.emoji}</span>
            <span>{item.sourceAchievement.name}</span>
          </Link>
        ) : item.source === "event" ? (
          <Link href="/events" className="text-[var(--gold-deep)] hover:underline">
            {SOURCE_LABEL[item.source]}
          </Link>
        ) : (
          <span className="text-[var(--fg-muted)]">{SOURCE_LABEL[item.source]}</span>
        )}
        {item.unlockedAt && (
          <span className="ml-auto font-mono text-[var(--fg-subtle)]">
            {new Date(item.unlockedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {!locked && !item.equipped && (
        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={onEquip} disabled={busy}>
          装备
        </Button>
      )}
    </motion.div>
  );
}
