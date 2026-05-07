"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2 } from "lucide-react";
import {
  useAchievements,
  useCreateCustomAchievement,
  useDeleteCustomAchievement,
  useUnlockAchievement,
} from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePicker } from "@/components/image-picker";
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
  custom: "自定义",
};

export default function AchievementsPage() {
  const { data: items } = useAchievements();
  const [showForm, setShowForm] = useState(false);
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
            完成任务、习惯、日程、复盘的过程会自动解锁成就。隐藏成就只在解锁后展示。自定义成就由你手动标记完成。
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] px-4 py-2 text-center">
            <div className="font-mono text-2xl font-bold text-[var(--gold-deep)]">
              {totalUnlocked}<span className="text-base">/{list.length}</span>
            </div>
            <div className="font-display-en text-[9px] tracking-[0.25em] text-[var(--gold-deep)]">
              UNLOCKED
            </div>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {showForm ? "Close" : "新增成就"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CustomAchievementForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

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

function CustomAchievementForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🏆");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tier, setTier] = useState<"bronze" | "silver" | "gold" | "legendary">("bronze");
  const [rewardGold, setRewardGold] = useState(0);
  const [rewardGems, setRewardGems] = useState(0);
  const [rewardFate, setRewardFate] = useState(0);
  const create = useCreateCustomAchievement();

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({
      name: name.trim(),
      description: description.trim(),
      emoji: emoji || "🏆",
      imageUrl,
      tier,
      rewardGold,
      rewardGems,
      rewardFate,
    });
    onDone();
  };

  return (
    <Card>
      <CardContent className="grid gap-4 pt-5">
        <div className="grid gap-1.5">
          <Label>图标</Label>
          <ImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            fallbackEmoji={emoji || "🏆"}
            label="上传徽章图片"
            hint="留空则使用 emoji"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：跑完第一个半马" maxLength={60} />
          </div>
          <div className="grid gap-1.5">
            <Label>Emoji（可作为图标 fallback）</Label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="解锁条件 / 你想纪念的瞬间"
              rows={2}
              maxLength={280}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>等级 Tier</Label>
            <Select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
              <option value="bronze">铜牌 · Bronze</option>
              <option value="silver">银牌 · Silver</option>
              <option value="gold">金牌 · Gold</option>
              <option value="legendary">传说 · Legendary</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:col-span-1">
            <div className="grid gap-1.5">
              <Label>⭐ Mora</Label>
              <Input
                type="number"
                min={0}
                value={rewardGold}
                onChange={(e) => setRewardGold(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>💎 Gems</Label>
              <Input
                type="number"
                min={0}
                value={rewardGems}
                onChange={(e) => setRewardGems(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>🎫 Fate</Label>
              <Input
                type="number"
                min={0}
                value={rewardFate}
                onChange={(e) => setRewardFate(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            {create.isPending ? "保存中…" : "创建"}
          </Button>
        </div>
        <p className="text-[10px] text-[var(--fg-subtle)]">
          自定义成就由你手动标记完成，完成时会一次性发放奖励。
        </p>
      </CardContent>
    </Card>
  );
}

function AchievementCard({ a, index }: { a: AchievementDTO; index: number }) {
  const showHidden = a.hidden && !a.unlocked;
  const unlock = useUnlockAchievement();
  const remove = useDeleteCustomAchievement();
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
          className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 text-2xl"
          style={{
            borderColor: a.unlocked ? TIER_COLOR[a.tier] : "var(--border)",
            background: a.unlocked
              ? `radial-gradient(${TIER_COLOR[a.tier]}33, transparent 70%)`
              : "var(--bg-elevated)",
            color: a.unlocked ? "inherit" : "var(--fg-subtle)",
          }}
        >
          {showHidden ? (
            <span>?</span>
          ) : a.imageUrl ? (
            <Image src={a.imageUrl} alt={a.name} fill sizes="48px" className="object-cover" unoptimized />
          ) : (
            <span>{a.emoji}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <div className="font-display text-[14px] font-bold text-[var(--fg-strong)]">
              {showHidden ? "??? · 隐藏成就" : a.name}
            </div>
            {a.isCustom && (
              <span className="rounded-sm border border-[var(--gold)]/50 px-1 text-[8px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Custom
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] leading-snug text-[var(--fg-muted)]">
            {showHidden ? "完成特殊条件后解锁" : a.description || "—"}
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

      {/* Manual unlock + delete (custom only, not unlocked) */}
      {a.isCustom && a.isManual && !a.unlocked && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => unlock.mutate(a.id)}
            disabled={unlock.isPending}
            className="flex-1"
          >
            <Check size={14} /> 标记完成
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            onClick={() => {
              if (confirm(`Delete custom achievement "${a.name}"?`)) remove.mutate(a.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}
      {a.isCustom && a.unlocked && (
        <div className="mt-2 flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            onClick={() => {
              if (confirm(`Delete custom achievement "${a.name}"?`)) remove.mutate(a.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}

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
