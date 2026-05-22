"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ImagePlus,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ImagePicker } from "@/components/image-picker";
import {
  useCreateReward,
  useDeleteReward,
  useGacha,
  usePullGacha,
  useUpdateReward,
} from "@/hooks/queries";
import { GACHA_PRESET_REWARDS } from "@/lib/gacha-presets";
import type { GachaPullResult, RewardItemDTO } from "@/lib/types";

const TIERS = ["common", "rare", "epic", "legendary"] as const;
type Tier = (typeof TIERS)[number];

const TIER_COLOR: Record<Tier, string> = {
  common: "#8f98a8",
  rare: "#69b8ff",
  epic: "#b889ff",
  legendary: "#f5c85d",
};

const TIER_GRAD: Record<Tier, string> = {
  common: "from-[#dce4ef] via-[#9ba6b8] to-[#566072]",
  rare: "from-[#dff5ff] via-[#70c8ff] to-[#2e6da3]",
  epic: "from-[#f1dcff] via-[#bd8bff] to-[#68479b]",
  legendary: "from-[#fff7c7] via-[#f4c95f] to-[#95661c]",
};

const TIER_LABEL: Record<Tier, string> = {
  common: "三星",
  rare: "四星",
  epic: "四星精选",
  legendary: "五星",
};

const TIER_STARS: Record<Tier, number> = {
  common: 3,
  rare: 4,
  epic: 4,
  legendary: 5,
};

const TIER_ORDER: Tier[] = ["common", "rare", "epic", "legendary"];

type RewardDraft = {
  name: string;
  description: string;
  emoji: string;
  imageUrl: string | null;
  tier: Tier;
  costGold: number;
  costGems: number;
  inGachaPool: boolean;
  weight: number;
};

const emptyDraft: RewardDraft = {
  name: "",
  description: "",
  emoji: "🎁",
  imageUrl: null,
  tier: "common",
  costGold: 50,
  costGems: 0,
  inGachaPool: true,
  weight: 5,
};

export default function GachaPage() {
  const { data: state } = useGacha();
  const pull = usePullGacha();
  const [phase, setPhase] = useState<"idle" | "rolling" | "reveal">("idle");
  const [results, setResults] = useState<GachaPullResult["results"] | null>(null);
  const [rollingTier, setRollingTier] = useState<Tier>("common");
  const [rollingCount, setRollingCount] = useState<1 | 10>(1);
  const [error, setError] = useState<string | null>(null);

  const fate = state?.fate ?? 0;
  const canSingle = fate >= 1 && !pull.isPending;
  const canTen = fate >= 10 && !pull.isPending;
  const pool = state?.pool ?? [];
  const rewards = state?.rewards ?? pool;
  const activePoolCount = pool.length;

  const fourStarLeft = Math.max(0, (state?.fourStarPityAt ?? 10) - (state?.pullsSinceRare ?? 0));
  const fiveStarSoftLeft = Math.max(0, (state?.softPityAt ?? 74) - (state?.pullsSinceEpic ?? 0));
  const fiveStarHardLeft = Math.max(0, (state?.hardPityAt ?? 90) - (state?.pullsSinceEpic ?? 0));

  const doPull = async (count: 1 | 10) => {
    setError(null);
    setRollingTier("common");
    setRollingCount(count);
    try {
      const response = await pull.mutateAsync(count);
      const topTier = getHighestTier(response.results);
      setRollingTier(topTier);
      setResults(response.results);
      setPhase("rolling");
      setTimeout(() => setPhase("reveal"), 6200);
    } catch (e) {
      setPhase("idle");
      setError((e as Error).message);
    }
  };

  const dismiss = () => {
    setPhase("idle");
    setResults(null);
    setRollingTier("common");
    setRollingCount(1);
  };

  const highestTier = results ? getHighestTier(results) : "common";

  return (
    <div className="relative mx-auto max-w-[1280px] space-y-7 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">星轨祈愿</span>
            <span className="en text-[11px]">Astral Wish</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--fg-muted)]">
            命运券投入星轨，抽取你自己设定的现实奖励。五星 0.6% 起步、74 抽后概率上升、90 抽必出；四星 5.1% 起步、10 抽必出。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:w-[420px]">
          <StatTile label="命运券" value={fate} suffix="张" tone="gold" />
          <StatTile label="四星保底" value={fourStarLeft} suffix="抽" tone="blue" />
          <StatTile label="五星保底" value={fiveStarHardLeft} suffix="抽" tone="gold" />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="panel-ink relative min-h-[480px] overflow-hidden rounded-sm">
          <WishSky tier={rollingTier} />

          <div className="relative z-10 grid min-h-[480px] content-between gap-8 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display-en text-[10px] text-[#f6dda0]">Limited Reward Channel</div>
                <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">命轨交响</h1>
              </div>
              <div className="rounded-sm border border-[#f5c85d]/50 bg-[#0f1728]/70 px-3 py-2 text-right">
                <div className="text-[10px] text-[#c7d2eb]">当前奖池</div>
                <div className="font-display text-lg text-[#fff1b8]">{activePoolCount} 件</div>
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-[640px] gap-5 text-center">
              <div className="relative mx-auto grid h-36 w-36 place-items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border border-[#f5c85d]/40"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-5 rounded-full border border-dashed border-[#b7dcff]/45"
                />
                <Sparkles size={54} className="text-[#fff0a7]" />
              </div>
              <div>
                <div className="font-display text-xl text-white">星辉会回应长期投入</div>
                <div className="mt-2 text-xs leading-6 text-[#d8e4ff]/75">
                  距离四星 {fourStarLeft} 抽 · 五星软保底 {fiveStarSoftLeft} 抽 · 五星硬保底 {fiveStarHardLeft} 抽
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => void doPull(1)}
                  disabled={!canSingle}
                  className="border-[#f5c85d]/70 bg-[#101a2c]/60 text-[#fff2bd] hover:bg-[#f5c85d]/15"
                >
                  <Ticket size={16} />
                  祈愿 ×1
                </Button>
                <Button
                  size="lg"
                  onClick={() => void doPull(10)}
                  disabled={!canTen}
                  className="shadow-[0_0_28px_-12px_#f5c85d]"
                >
                  <Wand2 size={16} />
                  祈愿 ×10
                </Button>
              </div>
              {(fate < 1 || activePoolCount === 0 || error) && (
                <div className="mx-auto max-w-lg rounded-sm border border-white/15 bg-black/20 px-3 py-2 text-xs leading-5 text-[#d8e4ff]/75">
                  {error ? (
                    error
                  ) : activePoolCount === 0 ? (
                    "当前没有入池奖励。先在卡池工坊导入预设或创建奖励。"
                  ) : (
                    <>
                      命运券不足。
                      <Link href="/review" className="ml-1 text-[#fff0a7] underline-offset-4 hover:underline">
                        完成复盘获取命运券
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <RateCard label="五星" value="0.6%" detail="74 抽后上升 · 90 抽必出" tier="legendary" />
              <RateCard label="四星" value="5.1%" detail="10 抽必出四星或以上" tier="epic" />
              <RateCard label="三星" value="94.3%" detail="常规奖励 · 权重随机" tier="common" />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="panel-cream framed rounded-sm p-4">
            <div className="section-label mb-3">
              <span className="cn text-sm">保底轨迹</span>
              <span className="en text-[9px]">Pity</span>
            </div>
            <PityBar
              label="四星或以上"
              current={state?.pullsSinceRare ?? 0}
              cap={state?.fourStarPityAt ?? 10}
              color="#69b8ff"
            />
            <PityBar
              label="五星软保底"
              current={state?.pullsSinceEpic ?? 0}
              cap={state?.softPityAt ?? 74}
              color="#b889ff"
            />
            <PityBar
              label="五星硬保底"
              current={state?.pullsSinceEpic ?? 0}
              cap={state?.hardPityAt ?? 90}
              color="#f5c85d"
            />
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <MiniStat label="累计祈愿" value={`${state?.totalPulls ?? 0}`} />
              <MiniStat label="入池奖励" value={`${activePoolCount}`} />
            </div>
          </div>

          <div className="panel-cream framed rounded-sm p-4">
            <div className="section-label mb-3">
              <span className="cn text-sm">最近抽取</span>
              <span className="en text-[9px]">Recent</span>
            </div>
            {(state?.recent.length ?? 0) === 0 ? (
              <div className="rounded-sm border border-dashed border-[var(--border)] py-6 text-center text-[11px] text-[var(--fg-subtle)]">
                暂无记录
              </div>
            ) : (
              <ul className="space-y-2 text-[12px]">
                {state!.recent.slice(0, 9).map((pullItem) => (
                  <li key={pullItem.id} className="flex items-center gap-2">
                    <RewardIcon reward={pullItem.reward} tier={pullItem.tier} size={34} />
                    <span className="min-w-0 flex-1 truncate font-display text-[var(--fg-strong)]">
                      {pullItem.reward?.name ?? "星尘"}
                    </span>
                    <span
                      className="font-display-en text-[9px]"
                      style={{ color: TIER_COLOR[pullItem.tier] }}
                    >
                      {TIER_LABEL[pullItem.tier]}
                    </span>
                    {pullItem.pity && <PityBadge pity={pullItem.pity} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <PoolWorkshop rewards={rewards} pool={pool} />

      <AnimatePresence>
        {phase === "rolling" && <RollingOverlay tier={rollingTier} count={rollingCount} />}
        {phase === "reveal" && results && (
          <RevealOverlay results={results} highestTier={highestTier} onDismiss={dismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: "gold" | "blue";
}) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
      <div className="text-[10px] text-[var(--fg-muted)]">{label}</div>
      <div
        className="mt-1 font-mono text-lg font-semibold"
        style={{ color: tone === "gold" ? "var(--gold-deep)" : "var(--accent)" }}
      >
        {value}
        <span className="ml-0.5 text-[10px] font-normal">{suffix}</span>
      </div>
    </div>
  );
}

function WishSky({ tier }: { tier: Tier }) {
  const starColor = TIER_COLOR[tier];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a1020]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b1530_0%,#111936_48%,#1b1f34_100%)]" />
      <div className="absolute inset-0 opacity-70">
        {Array.from({ length: 52 }).map((_, index) => {
          const left = (index * 37) % 100;
          const top = (index * 61) % 100;
          const size = 1 + (index % 3);
          return (
            <span
              key={index}
              className="absolute rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                opacity: 0.25 + (index % 5) * 0.12,
                boxShadow: `0 0 ${size * 5}px #fff4c2`,
              }}
            />
          );
        })}
      </div>
      <motion.div
        animate={{ x: ["-18%", "118%"], y: ["22%", "54%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 top-0 h-1 w-40 rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${starColor}, #ffffff)`,
          boxShadow: `0 0 24px ${starColor}`,
        }}
      />
      <motion.div
        animate={{ x: ["105%", "-16%"], y: ["10%", "68%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
        className="absolute left-0 top-0 h-[2px] w-28 rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, #b7dcff, #ffffff)",
          boxShadow: "0 0 16px #b7dcff",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(0deg,rgba(245,200,93,0.22),transparent)]" />
    </div>
  );
}

function RateCard({
  label,
  value,
  detail,
  tier,
}: {
  label: string;
  value: string;
  detail: string;
  tier: Tier;
}) {
  return (
    <div className="rounded-sm border border-white/15 bg-[#101a2c]/72 p-3">
      <div className="flex items-center gap-1.5 text-xs text-[#d8e4ff]">
        <Star size={13} style={{ color: TIER_COLOR[tier] }} />
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-[#d8e4ff]/70">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-raised)] px-2 py-1.5">
      <div className="text-[9px] text-[var(--fg-subtle)]">{label}</div>
      <div className="font-mono text-sm text-[var(--fg-strong)]">{value}</div>
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
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[10px]">
        <span className="text-[var(--fg-muted)]">{label}</span>
        <span className="font-mono text-[var(--fg-strong)]">
          {current}/{cap}
        </span>
      </div>
      <div className="mt-1 h-[6px] overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-panel-ink)]/15">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function PoolWorkshop({ rewards, pool }: { rewards: RewardItemDTO[]; pool: RewardItemDTO[] }) {
  const create = useCreateReward();
  const [showCreate, setShowCreate] = useState(false);
  const [importing, setImporting] = useState(false);

  const existingNames = useMemo(() => new Set(rewards.map((reward) => reward.name)), [rewards]);
  const missingPreset = useMemo(
    () => GACHA_PRESET_REWARDS.filter((reward) => !existingNames.has(reward.name)),
    [existingNames],
  );
  const grouped = useMemo(() => {
    const groups: Record<Tier, RewardItemDTO[]> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
    };
    rewards.forEach((reward) => groups[reward.tier].push(reward));
    return groups;
  }, [rewards]);

  const importPreset = async () => {
    setImporting(true);
    try {
      for (const reward of missingPreset) {
        await create.mutateAsync(reward);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-xl">卡池工坊</span>
            <span className="en text-[10px]">Pool Builder</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)]/70 to-transparent" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void importPreset()}
            disabled={importing || create.isPending || missingPreset.length === 0}
          >
            <RefreshCw size={15} />
            {missingPreset.length === 0 ? "预设已导入" : `导入预设 ${missingPreset.length}`}
          </Button>
          <Button onClick={() => setShowCreate((value) => !value)}>
            <ImagePlus size={15} />
            {showCreate ? "收起" : "新奖励"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="全部奖励" value={`${rewards.length}`} />
        <MiniStat label="已入池" value={`${pool.length}`} />
        <MiniStat label="可替换图片" value="上传" />
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <NewPoolItemForm onDone={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {TIERS.map((tier) => (
          <div key={tier}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: TIER_COLOR[tier], boxShadow: `0 0 12px ${TIER_COLOR[tier]}` }}
              />
              <h2 className="font-display text-base text-[var(--fg-strong)]">{TIER_LABEL[tier]}</h2>
              <span className="text-[10px] text-[var(--fg-subtle)]">
                {grouped[tier].filter((item) => item.inGachaPool).length}/{grouped[tier].length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/35 to-transparent" />
            </div>
            {grouped[tier].length === 0 ? (
              <div className="rounded-sm border border-dashed border-[var(--border)] py-5 text-center text-xs text-[var(--fg-subtle)]">
                此档暂无奖励
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {grouped[tier].map((item) => (
                  <PoolItemRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function NewPoolItemForm({ onDone }: { onDone: () => void }) {
  const create = useCreateReward();
  const [draft, setDraft] = useState<RewardDraft>(emptyDraft);

  const submit = async () => {
    if (!draft.name.trim()) return;
    await create.mutateAsync({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      emoji: draft.emoji || "🎁",
      costGold: Math.max(0, Number(draft.costGold) || 0),
      costGems: Math.max(0, Number(draft.costGems) || 0),
      weight: clampWeight(draft.weight),
    });
    setDraft(emptyDraft);
    onDone();
  };

  return (
    <div className="panel-cream framed rounded-sm p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 size={16} className="text-[var(--gold-deep)]" />
        <div className="font-display text-sm text-[var(--fg-strong)]">创建卡池奖励</div>
      </div>
      <RewardEditorFields draft={draft} onChange={setDraft} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          取消
        </Button>
        <Button onClick={() => void submit()} disabled={create.isPending || !draft.name.trim()}>
          <Sparkles size={14} />
          添加
        </Button>
      </div>
    </div>
  );
}

function PoolItemRow({ item }: { item: RewardItemDTO }) {
  const update = useUpdateReward();
  const remove = useDeleteReward();
  const [draft, setDraft] = useState<RewardDraft>({
    name: item.name,
    description: item.description ?? "",
    emoji: item.emoji,
    imageUrl: item.imageUrl,
    tier: item.tier,
    costGold: item.costGold,
    costGems: item.costGems,
    inGachaPool: item.inGachaPool,
    weight: item.weight,
  });

  const changed =
    draft.name !== item.name ||
    draft.description !== (item.description ?? "") ||
    draft.emoji !== item.emoji ||
    draft.imageUrl !== item.imageUrl ||
    draft.tier !== item.tier ||
    draft.costGold !== item.costGold ||
    draft.costGems !== item.costGems ||
    draft.inGachaPool !== item.inGachaPool ||
    draft.weight !== item.weight;

  const save = async () => {
    if (!draft.name.trim()) return;
    await update.mutateAsync({
      id: item.id,
      body: {
        ...draft,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        emoji: draft.emoji || "🎁",
        costGold: Math.max(0, Number(draft.costGold) || 0),
        costGems: Math.max(0, Number(draft.costGems) || 0),
        weight: clampWeight(draft.weight),
      },
    });
  };

  return (
    <div className={`panel-cream rounded-sm p-4 ${draft.inGachaPool ? "" : "opacity-70"}`}>
      <RewardEditorFields compact draft={draft} onChange={setDraft} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--gold)]/25 pt-3">
        <div className="flex items-center gap-2 text-[10px] text-[var(--fg-muted)]">
          <span>已兑 {item.redeemedCount}</span>
          <span>权重 {draft.weight}</span>
          <span>{draft.inGachaPool ? "已入池" : "未入池"}</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" disabled={!changed || update.isPending} onClick={() => void save()}>
            <Save size={13} />
            保存
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (confirm("Archive this reward?")) remove.mutate(item.id);
            }}
            title="归档"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RewardEditorFields({
  draft,
  onChange,
  compact = false,
}: {
  draft: RewardDraft;
  onChange: (next: RewardDraft) => void;
  compact?: boolean;
}) {
  const set = <K extends keyof RewardDraft>(key: K, value: RewardDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)]">
        <ImagePicker
          value={draft.imageUrl}
          onChange={(url) => set("imageUrl", url)}
          fallbackEmoji={draft.emoji || "🎁"}
          size={compact ? 58 : 72}
          label={draft.imageUrl ? "换图" : "上传图片"}
          hint="PNG / JPG / WebP / SVG"
        />
        <div className="grid gap-3">
          <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
            <div className="grid gap-1.5">
              <Label>Emoji</Label>
              <Input value={draft.emoji} onChange={(event) => set("emoji", event.target.value)} maxLength={8} />
            </div>
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="奖励名称"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              rows={compact ? 2 : 3}
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="奖励说明"
            />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label="Tier">
          <Select value={draft.tier} onChange={(event) => set("tier", event.target.value as Tier)}>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {TIER_LABEL[tier]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gold">
          <Input
            type="number"
            min={0}
            value={draft.costGold}
            onChange={(event) => set("costGold", Number(event.target.value))}
          />
        </Field>
        <Field label="Gems">
          <Input
            type="number"
            min={0}
            value={draft.costGems}
            onChange={(event) => set("costGems", Number(event.target.value))}
          />
        </Field>
        <Field label="Weight">
          <Input
            type="number"
            min={1}
            max={10}
            value={draft.weight}
            onChange={(event) => set("weight", Number(event.target.value))}
          />
        </Field>
        <Field label="Pool">
          <label className="flex h-9 items-center gap-2 rounded-sm border border-[var(--border-strong)]/60 bg-white/70 px-3 text-sm text-[var(--fg-strong)]">
            <Checkbox
              checked={draft.inGachaPool}
              onCheckedChange={(checked) => set("inGachaPool", checked === true)}
            />
            入池
          </label>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function RollingOverlay({ tier, count }: { tier: Tier; count: 1 | 10 }) {
  const color = TIER_COLOR[tier];
  const videoSrc = getWishVideoSrc(tier, count);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#050914]"
    >
      <video
        key={videoSrc}
        src={videoSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,244,194,0.35),transparent_32%),linear-gradient(180deg,rgba(7,16,36,0.35)_0%,rgba(13,20,50,0.25)_52%,rgba(27,23,48,0.45)_100%)]" />
      <div className="absolute inset-0 mix-blend-screen opacity-45">
        {Array.from({ length: 46 }).map((_, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(index * 41) % 100}%`,
              top: `${(index * 67) % 100}%`,
              width: `${1 + (index % 3)}px`,
              height: `${1 + (index % 3)}px`,
              opacity: 0.28 + (index % 4) * 0.13,
            }}
          />
        ))}
        <motion.div
          initial={{ x: "-20vw", y: "58vh", rotate: -12 }}
          animate={{ x: "108vw", y: "24vh", rotate: -12 }}
          transition={{ duration: 1.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute h-2 w-[52vw] rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, #ffffff)`,
            boxShadow: `0 0 36px ${color}`,
          }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-10 left-0 right-0 text-center"
      >
        <div className="font-display text-lg text-white drop-shadow-[0_0_12px_rgba(0,0,0,0.85)]">
          {count === 10 ? "十连祈愿" : "单次祈愿"}
        </div>
        <div className="mt-2 text-xs text-white/60 drop-shadow-[0_0_10px_rgba(0,0,0,0.85)]">
          {TIER_LABEL[tier]} · ASTRAL SHIFT
        </div>
      </motion.div>
    </motion.div>
  );
}

function RevealOverlay({
  results,
  highestTier,
  onDismiss,
}: {
  results: GachaPullResult["results"];
  highestTier: Tier;
  onDismiss: () => void;
}) {
  const [flipAll, setFlipAll] = useState(false);
  const background =
    highestTier === "legendary"
      ? "bg-[radial-gradient(circle_at_50%_36%,rgba(245,200,93,0.32),transparent_34%),linear-gradient(135deg,#2e2107_0%,#080b17_48%,#13172b_100%)]"
      : highestTier === "epic"
        ? "bg-[radial-gradient(circle_at_50%_36%,rgba(184,137,255,0.28),transparent_34%),linear-gradient(135deg,#29143f_0%,#080b17_48%,#13172b_100%)]"
        : "bg-[linear-gradient(135deg,#071024_0%,#080b17_48%,#151c31_100%)]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 grid place-items-center overflow-auto p-4 sm:p-8 ${background}`}
      onClick={() => flipAll && onDismiss()}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={16} />
      </button>

      <div className="relative w-full max-w-[940px]">
        <div className="mb-5 text-center">
          <div className="font-display-en text-[10px] text-[#f5d989]">
            {results.length === 1 ? "Single Wish" : "Tenfold Wish"}
          </div>
          <div className="mt-1 font-display text-2xl text-white">星辉显现</div>
        </div>

        <div
          className={`grid justify-center gap-3 ${
            results.length === 1 ? "grid-cols-[minmax(180px,260px)]" : "grid-cols-2 sm:grid-cols-5"
          }`}
        >
          {results.map((result, index) => (
            <PullCard
              key={result.pullId}
              tier={result.tier}
              reward={result.reward}
              pity={result.pity}
              delay={index * 0.1}
              onAllFlipped={() => index === results.length - 1 && setFlipAll(true)}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          {flipAll ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
              className="rounded-sm border border-[#f5c85d]/70 bg-gradient-to-b from-[#f8d46f] to-[#b9822f] px-8 py-2 font-display text-sm font-semibold text-[#161b28] shadow-[0_0_28px_-10px_#f5c85d] hover:brightness-110"
            >
              继续
            </button>
          ) : (
            <div className="text-xs text-white/55">揭示中</div>
          )}
          {flipAll && <div className="text-[10px] text-white/35">点击空白处关闭</div>}
        </div>
      </div>
    </motion.div>
  );
}

function PullCard({
  tier,
  reward,
  pity,
  delay,
  onAllFlipped,
}: {
  tier: Tier;
  reward: RewardItemDTO | null;
  pity: "soft" | "hard" | null;
  delay: number;
  onAllFlipped: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const stars = TIER_STARS[tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onAnimationComplete={() => {
        setTimeout(() => {
          setFlipped(true);
          onAllFlipped();
        }, 120);
      }}
      className="relative aspect-[3/4] min-h-[190px] max-h-[280px] w-full min-w-0 [perspective:1000px]"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.72, ease: "easeOut" }}
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={`absolute inset-0 grid place-items-center rounded-sm border-2 bg-gradient-to-br ${TIER_GRAD[tier]}`}
          style={{
            backfaceVisibility: "hidden",
            borderColor: TIER_COLOR[tier],
            boxShadow: `0 0 32px ${TIER_COLOR[tier]}66`,
          }}
        >
          <div className="grid h-16 w-16 place-items-center rounded-full border border-white/45 bg-white/10">
            <Sparkles size={34} className="text-white" />
          </div>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center justify-between rounded-sm border-2 bg-gradient-to-b from-[#fffaf0] to-[#e8ddc2] p-3"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderColor: TIER_COLOR[tier],
            boxShadow: `0 0 34px ${TIER_COLOR[tier]}70`,
          }}
        >
          <div className="flex gap-0.5 text-xs" style={{ color: TIER_COLOR[tier] }}>
            {Array.from({ length: stars }).map((_, index) => (
              <Star key={index} size={12} fill="currentColor" />
            ))}
          </div>
          <RewardIcon reward={reward} tier={tier} size={86} elevated />
          <div className="w-full text-center">
            <div className="mx-auto max-w-[140px] break-words font-display text-[12px] leading-tight text-[var(--fg-strong)]">
              {reward?.name ?? "星尘"}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="font-display-en text-[8px]" style={{ color: TIER_COLOR[tier] }}>
                {TIER_LABEL[tier]}
              </span>
              {pity && <PityBadge pity={pity} />}
            </div>
          </div>
        </div>
      </motion.div>

      {tier === "legendary" && flipped && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 1] }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <Sparkles size={52} className="text-[#f5c85d]" />
        </motion.div>
      )}
    </motion.div>
  );
}

function RewardIcon({
  reward,
  tier,
  size,
  elevated = false,
}: {
  reward: RewardItemDTO | null;
  tier: Tier;
  size: number;
  elevated?: boolean;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-sm border bg-[var(--bg-card)] text-2xl"
      style={{
        width: size,
        height: size,
        borderColor: TIER_COLOR[tier],
        boxShadow: elevated ? `0 0 22px ${TIER_COLOR[tier]}66` : undefined,
      }}
    >
      {reward?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={reward.imageUrl} alt={reward.name} className="h-full w-full object-cover" />
      ) : (
        <span>{reward?.emoji ?? "✦"}</span>
      )}
    </span>
  );
}

function PityBadge({ pity }: { pity: "soft" | "hard" }) {
  return (
    <span className="rounded-sm bg-[#f5c85d]/20 px-1.5 py-0.5 text-[8px] text-[#8a6820]">
      {pity === "hard" ? "硬保底" : "保底"}
    </span>
  );
}

function getHighestTier(results: GachaPullResult["results"]): Tier {
  return results.reduce<Tier>((best, result) => {
    return TIER_ORDER.indexOf(result.tier) > TIER_ORDER.indexOf(best) ? result.tier : best;
  }, "common");
}

function getWishVideoSrc(tier: Tier, count: 1 | 10) {
  if (count === 10) {
    return tier === "legendary"
      ? "/gacha/videos/ten-gold.mp4"
      : "/gacha/videos/ten-purple.mp4";
  }
  if (tier === "legendary") return "/gacha/videos/single-gold.mp4";
  if (tier === "rare" || tier === "epic") return "/gacha/videos/single-purple.mp4";
  return "/gacha/videos/single-blue.mp4";
}

function clampWeight(value: number) {
  const numeric = Number(value) || 1;
  return Math.max(1, Math.min(10, numeric));
}
