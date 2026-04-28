"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Coins, Gem, Gift, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import {
  useRewards,
  useCreateReward,
  useDeleteReward,
  useRedeemReward,
  useUser,
} from "@/hooks/queries";
import type { RewardItemDTO } from "@/lib/types";

const TIERS = ["common", "rare", "epic", "legendary"] as const;
type Tier = typeof TIERS[number];

const TIER_LABEL: Record<Tier, string> = {
  common: "通常",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};
const TIER_COLOR: Record<Tier, string> = {
  common: "var(--fg-muted)",
  rare: "var(--accent)",
  epic: "#9b6bc1",
  legendary: "var(--gold)",
};
const TIER_BG: Record<Tier, string> = {
  common: "bg-[var(--bg-elevated)]",
  rare: "bg-[var(--accent-glow)]",
  epic: "bg-[#9b6bc1]/20",
  legendary: "bg-gradient-to-br from-[var(--gold-tint)] via-[var(--bg-card)] to-[var(--gold-tint)]",
};

export default function RewardsPage() {
  const { data: rewards } = useRewards();
  const { data: user } = useUser();
  const [showForm, setShowForm] = useState(false);

  const grouped: Record<Tier, RewardItemDTO[]> = {
    common: [],
    rare: [],
    epic: [],
    legendary: [],
  };
  rewards?.forEach((r) => {
    grouped[r.tier].push(r);
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">奖励商店</span>
            <span className="en text-[11px]">Rewards Store</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            真实世界的兑换券。
            <span className="text-[var(--gold-deep)]"> Mora ⭐ </span>
            和
            <span className="text-[var(--attr-cha)]"> Gems 💎 </span>
            才有了出口；这些奖品也是抽卡奖池的内容。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencyDisplay icon={<Coins size={14} />} value={user?.currency.gold ?? 0} color="var(--attr-gold)" />
          <CurrencyDisplay icon={<Gem size={14} />} value={user?.currency.gems ?? 0} color="var(--attr-cha)" />
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> {showForm ? "Close" : "New Reward"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NewRewardForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {TIERS.map((tier) => (
          <TierSection key={tier} tier={tier} items={grouped[tier]} />
        ))}
      </div>
    </div>
  );
}

function CurrencyDisplay({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-sm border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-semibold"
      style={{ color }}
    >
      {icon}
      <span className="font-mono">{value.toLocaleString()}</span>
    </div>
  );
}

function TierSection({ tier, items }: { tier: Tier; items: RewardItemDTO[] }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="diamond-gold" />
        <h3 className="font-display text-lg font-bold" style={{ color: TIER_COLOR[tier] }}>
          {TIER_LABEL[tier]}
        </h3>
        <span className="font-display-en text-[10px] uppercase tracking-[0.25em]" style={{ color: TIER_COLOR[tier] }}>
          {tier} · {items.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/40 to-transparent" />
      </div>

      {items.length === 0 ? (
        <div className="panel-cream rounded-sm py-6 text-center text-sm text-[var(--fg-subtle)]">
          此档暂无奖励。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <RewardCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </section>
  );
}

function RewardCard({ item }: { item: RewardItemDTO }) {
  const redeem = useRedeemReward();
  const remove = useDeleteReward();
  const { data: user } = useUser();

  const canAfford =
    (user?.currency.gold ?? 0) >= item.costGold &&
    (user?.currency.gems ?? 0) >= item.costGems;

  return (
    <div className={`relative panel-cream framed rounded-sm p-4 ${TIER_BG[item.tier]}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-[var(--gold)] bg-[var(--bg-card)] text-2xl">
          {item.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-bold text-[var(--fg-strong)]">
            {item.name}
          </div>
          {item.description && (
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--fg-muted)]">{item.description}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--gold)]/30 pt-2">
        <div className="flex items-center gap-2 text-[11px]">
          {item.costGold > 0 && (
            <span className="font-mono text-[var(--attr-gold)]">⭐{item.costGold}</span>
          )}
          {item.costGems > 0 && (
            <span className="font-mono text-[var(--attr-cha)]">💎{item.costGems}</span>
          )}
          {item.redeemedCount > 0 && (
            <span className="text-[10px] text-[var(--fg-subtle)]">×{item.redeemedCount} 已兑</span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="primary"
            disabled={!canAfford || redeem.isPending}
            onClick={() => redeem.mutate(item.id)}
            title={canAfford ? "Redeem" : "Not enough"}
          >
            <Gift size={12} /> 兑换
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (confirm("Archive this reward?")) remove.mutate(item.id);
            }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewRewardForm({ onDone }: { onDone: () => void }) {
  const create = useCreateReward();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎁");
  const [tier, setTier] = useState<Tier>("common");
  const [costGold, setCostGold] = useState(50);
  const [costGems, setCostGems] = useState(0);
  const [inGachaPool, setInGachaPool] = useState(true);

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      emoji: emoji || "🎁",
      tier,
      costGold,
      costGems,
      inGachaPool,
    });
    onDone();
  };

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">添加奖励</span>
        <span className="en text-[10px]">New Reward</span>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-[60px_1fr] gap-3">
          <div className="grid gap-1.5">
            <Label>Emoji</Label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
          </div>
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 一杯精品咖啡" autoFocus />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="grid gap-1.5">
            <Label>Tier</Label>
            <Select value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]} · {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Cost Gold</Label>
            <Input type="number" min={0} value={costGold} onChange={(e) => setCostGold(Number(e.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Cost Gems</Label>
            <Input type="number" min={0} value={costGems} onChange={(e) => setCostGems(Number(e.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label>In Gacha?</Label>
            <Select value={inGachaPool ? "1" : "0"} onChange={(e) => setInGachaPool(e.target.value === "1")}>
              <option value="1">是</option>
              <option value="0">否</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            {create.isPending ? "Saving…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
