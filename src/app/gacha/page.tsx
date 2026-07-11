"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Check,
  Clock3,
  Coins,
  History,
  Info,
  ListTree,
  PackageCheck,
  SkipForward,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGacha, usePullGacha } from "@/hooks/queries";
import type { GachaPullResult, GachaState, RewardItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const WISH_AUDIO_SRC = "/gacha/audio/gilded-ascent.mp3";

const TIER_META: Record<
  RewardItemDTO["tier"],
  { label: string; stars: number; color: string; border: string; glow: string }
> = {
  common: {
    label: "三星",
    stars: 3,
    color: "text-[#d9e4ed]",
    border: "border-[#aebdca]/45",
    glow: "from-[#7c8e9e]/32",
  },
  rare: {
    label: "四星",
    stars: 4,
    color: "text-[#bde9ff]",
    border: "border-[#6cbbe2]/55",
    glow: "from-[#4da4d0]/38",
  },
  epic: {
    label: "四星精选",
    stars: 4,
    color: "text-[#f1c8f5]",
    border: "border-[#c689d1]/55",
    glow: "from-[#b36cc1]/38",
  },
  legendary: {
    label: "五星",
    stars: 5,
    color: "text-[#ffe79a]",
    border: "border-[#e7bd59]/70",
    glow: "from-[#d8a63f]/48",
  },
};

const CATEGORY_LABEL: Record<RewardItemDTO["category"], string> = {
  virtual: "虚拟商品",
  physical_small: "小额实物",
  physical_large: "大额实物",
};

type Overlay = "pool" | "history" | null;

export default function GachaPage() {
  const { data: state, isLoading, error: loadError } = useGacha();
  const pull = usePullGacha();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [phase, setPhase] = useState<"idle" | "rolling" | "reveal">("idle");
  const [result, setResult] = useState<GachaPullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gold = state?.gold ?? 0;
  const goldPerPull = state?.goldPerPull ?? 160;
  const fourStarLeft = Math.max(0, (state?.fourStarPityAt ?? 10) - (state?.pullsSinceRare ?? 0));
  const fiveStarLeft = Math.max(0, (state?.hardPityAt ?? 90) - (state?.pullsSinceEpic ?? 0));
  const poolReady = state?.ready ?? false;

  const doPull = async (count: 1 | 10) => {
    setError(null);
    try {
      const response = await pull.mutateAsync({ count });
      setResult(response);
      setPhase("rolling");
      if (soundOn && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.72;
        void audioRef.current.play().catch(() => undefined);
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => setPhase("reveal"), reduceMotion ? 250 : count === 10 ? 2600 : 2100);
    } catch (reason) {
      setError((reason as Error).message);
      setPhase("idle");
    }
  };

  const dismissResults = () => {
    audioRef.current?.pause();
    setPhase("idle");
    setResult(null);
  };

  return (
    <div className="relative min-h-[calc(100vh-82px)] overflow-hidden bg-[#07111d] text-white">
      <Image
        src="/gacha/backgrounds/wish-observatory-v1.png"
        alt="云端星象观测台"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[62%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,23,.97)_0%,rgba(5,13,23,.82)_24%,rgba(5,13,23,.24)_56%,rgba(5,13,23,.08)_78%,rgba(5,13,23,.42)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06101c]/92 via-[#06101c]/30 to-transparent" />

      <audio ref={audioRef} src={WISH_AUDIO_SRC} preload="auto" />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#07111d]/34 px-4 py-3 backdrop-blur-sm sm:px-7">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center border border-[#e8c977]/45 text-[#ffe7a4]">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl">星轨祈愿</h1>
            <p className="text-[9px] uppercase text-white/40">Astral Wish</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 min-w-[128px] items-center justify-end gap-2 border border-white/18 bg-black/28 px-3">
            <Coins size={15} className="text-[#e8c977]" />
            <strong className="font-mono text-sm">{gold.toLocaleString()}</strong>
            <span className="text-[9px] uppercase text-white/38">Gold</span>
          </div>
          <button
            type="button"
            onClick={() => setSoundOn((value) => !value)}
            className="grid h-9 w-9 place-items-center border border-white/15 bg-black/20 text-white/65 hover:border-[#e8c977]/45 hover:text-white"
            title={soundOn ? "关闭祈愿音效" : "开启祈愿音效"}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-144px)] flex-col justify-between px-5 pb-6 pt-8 sm:px-8 lg:px-12 lg:pb-9 lg:pt-12">
        <div className="max-w-[480px]">
          <div className="flex items-center gap-2 text-xs text-[#d9c27a]">
            <span className="h-px w-8 bg-[#d9c27a]/70" />
            常驻奖励祈愿
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            命轨回响
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/62 sm:text-base">
            每次投入 160 Gold，让长期行动沉淀为一份真实奖励。抽中实物后，在背包中确认预算再兑现。
          </p>

          <div className="mt-7 grid max-w-[430px] grid-cols-2 border-y border-white/12 py-4">
            <PityStat label="四星保底" value={`${fourStarLeft} 抽`} detail="10 抽内必得" />
            <PityStat label="五星保底" value={`${fiveStarLeft} 抽`} detail="74 软保底 · 90 必得" bordered />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <UtilityButton icon={<Info size={14} />} label="概率与奖池" onClick={() => setOverlay("pool")} />
            <UtilityButton icon={<History size={14} />} label="祈愿记录" onClick={() => setOverlay("history")} />
          </div>

          {!poolReady && state ? (
            <div className="mt-5 max-w-md border border-[#e0a967]/35 bg-[#20170d]/65 p-3 text-xs leading-5 text-[#ffe2b0] backdrop-blur-sm">
              奖池尚未准备完成，缺少：{state.missingTiers.map(tierLabel).join("、")}。请先在商店编辑商品的祈愿稀有度。
            </div>
          ) : null}
          {loadError || error ? (
            <div className="mt-5 max-w-md border border-[#df7f78]/35 bg-[#2a1010]/62 p-3 text-xs text-[#ffd0cb]" role="alert">
              {(loadError as Error | undefined)?.message ?? error}
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
          <div className="mr-auto hidden max-w-[340px] text-xs leading-5 text-white/42 lg:block">
            五星基础概率 0.6%，四星基础概率 5.1%。完整规则和商品权重可在抽取前查看。
          </div>
          <WishButton
            count={1}
            cost={goldPerPull}
            disabled={isLoading || pull.isPending || !poolReady || gold < goldPerPull}
            onClick={() => void doPull(1)}
          />
          <WishButton
            count={10}
            cost={goldPerPull * 10}
            primary
            disabled={isLoading || pull.isPending || !poolReady || gold < goldPerPull * 10}
            onClick={() => void doPull(10)}
          />
        </div>
      </main>

      {overlay === "pool" && state ? <PoolOverlay state={state} onClose={() => setOverlay(null)} /> : null}
      {overlay === "history" && state ? <HistoryOverlay state={state} onClose={() => setOverlay(null)} /> : null}

      {phase === "rolling" && result ? (
        <RollingOverlay
          count={result.results.length}
          highestTier={highestTier(result.results)}
          onSkip={() => setPhase("reveal")}
        />
      ) : null}
      {phase === "reveal" && result ? <ResultOverlay result={result} onClose={dismissResults} /> : null}
    </div>
  );
}

function PityStat({ label, value, detail, bordered = false }: { label: string; value: string; detail: string; bordered?: boolean }) {
  return (
    <div className={cn("min-w-0 pr-4", bordered && "border-l border-white/12 pl-5 pr-0")}>
      <div className="text-[10px] uppercase text-white/38">{label}</div>
      <div className="mt-1 font-display text-2xl text-[#ffe5a0]">{value}</div>
      <div className="mt-0.5 truncate text-[10px] text-white/42">{detail}</div>
    </div>
  );
}

function UtilityButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center gap-2 border border-white/14 bg-black/18 px-3 text-xs text-white/64 backdrop-blur-sm transition hover:border-[#e8c977]/45 hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}

function WishButton({
  count,
  cost,
  primary = false,
  disabled,
  onClick,
}: {
  count: 1 | 10;
  cost: number;
  primary?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex h-14 min-w-[210px] items-center justify-between gap-5 border px-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
        primary
          ? "border-[#e8c977]/80 bg-[linear-gradient(120deg,rgba(255,246,207,.96),rgba(225,193,112,.94))] text-[#1a2431] shadow-[0_16px_40px_-24px_rgba(232,201,119,.95)] hover:brightness-105"
          : "border-white/55 bg-[rgba(239,247,250,.88)] text-[#172330] hover:bg-white",
      )}
    >
      <span>
        <span className="block font-display text-base">祈愿 {count} 次</span>
        <span className="mt-0.5 block text-[9px] uppercase opacity-55">Wish × {count}</span>
      </span>
      <span className="flex items-center gap-1.5 font-mono text-sm font-bold">
        <Coins size={15} /> {cost.toLocaleString()}
      </span>
    </button>
  );
}

function PoolOverlay({ state, onClose }: { state: GachaState; onClose: () => void }) {
  const grouped = useMemo(
    () => ({
      legendary: state.pool.filter((item) => item.tier === "legendary"),
      epic: state.pool.filter((item) => item.tier === "epic"),
      rare: state.pool.filter((item) => item.tier === "rare"),
      common: state.pool.filter((item) => item.tier === "common"),
    }),
    [state.pool],
  );

  return (
    <OverlayShell title="概率与奖池" icon={<ListTree size={18} />} onClose={onClose}>
      <div className="grid gap-2 sm:grid-cols-3">
        <RateBox label="五星" rate="0.6%" detail="74 抽起提升，90 抽必得" />
        <RateBox label="四星及以上" rate="5.1%" detail="10 抽内至少一次" />
        <RateBox label="三星" rate="94.3%" detail="其余结果" />
      </div>
      <p className="mt-4 border-l-2 border-[#e8c977]/55 pl-3 text-xs leading-5 text-white/52">
        四星结果中，稀有占 82%，精选占 18%。同层级商品按权重分配。实物奖励抽中后仍需在背包中支付 money 兑现。
      </p>
      <div className="mt-5 space-y-5">
        {(["legendary", "epic", "rare", "common"] as const).map((tier) => (
          <PoolTier key={tier} tier={tier} items={grouped[tier]} />
        ))}
      </div>
    </OverlayShell>
  );
}

function PoolTier({ tier, items }: { tier: RewardItemDTO["tier"]; items: RewardItemDTO[] }) {
  const meta = TIER_META[tier];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("font-display text-sm", meta.color)}>{meta.label}</span>
        <span className="text-[10px] text-white/35">{items.length} 件</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 border border-white/10 bg-white/5 p-2.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-black/20 text-xl">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
              ) : item.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white/82">{item.name}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/38">
                <span>{CATEGORY_LABEL[item.category]}</span>
                <span>权重 {item.weight}/{totalWeight}</span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-white/42">{baseItemProbability(tier, item.weight, totalWeight)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistoryOverlay({ state, onClose }: { state: GachaState; onClose: () => void }) {
  return (
    <OverlayShell title="最近祈愿" icon={<History size={18} />} onClose={onClose}>
      {state.recent.length === 0 ? (
        <div className="grid min-h-64 place-items-center text-center text-sm text-white/42">还没有祈愿记录。</div>
      ) : (
        <div className="divide-y divide-white/10">
          {state.recent.map((pull) => {
            const meta = TIER_META[pull.tier];
            return (
              <div key={pull.id} className="flex items-center gap-3 py-3">
                <div className={cn("grid h-10 w-10 place-items-center border bg-white/5 text-xl", meta.border)}>
                  {pull.reward?.emoji ?? <Star size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white/82">{pull.reward?.name ?? "未命名奖励"}</div>
                  <div className="mt-0.5 text-[10px] text-white/38">{formatDate(pull.pulledAt)}</div>
                </div>
                <div className="text-right">
                  <div className={cn("text-xs", meta.color)}>{meta.label}</div>
                  {pull.pity ? <div className="mt-0.5 text-[9px] text-[#e8c977]">{pull.pity === "hard" ? "硬保底" : "保底"}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </OverlayShell>
  );
}

function OverlayShell({ title, icon, onClose, children }: { title: string; icon: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#030914]/72 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="h-full w-full max-w-[620px] overflow-y-auto border-l border-white/14 bg-[#0c1826]/98 p-5 shadow-[-30px_0_80px_-50px_black] sm:p-7">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-[#ffe5a0]">
            {icon}
            <h2 className="font-display text-xl text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/12 text-white/58 hover:text-white" title="关闭">
            <X size={17} />
          </button>
        </div>
        <div className="py-5">{children}</div>
      </div>
    </div>
  );
}

function RateBox({ label, rate, detail }: { label: string; rate: string; detail: string }) {
  return (
    <div className="border border-white/12 bg-white/5 p-3">
      <div className="text-[10px] text-white/42">{label}</div>
      <div className="mt-1 font-display text-2xl text-[#ffe5a0]">{rate}</div>
      <div className="mt-1 text-[9px] leading-4 text-white/35">{detail}</div>
    </div>
  );
}

function RollingOverlay({ count, highestTier, onSkip }: { count: number; highestTier: RewardItemDTO["tier"]; onSkip: () => void }) {
  const meta = TIER_META[highestTier];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#040a13]/96" aria-label="祈愿进行中">
      <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent to-transparent", meta.glow)} />
      <div className="relative grid place-items-center text-center">
        <div className="absolute h-64 w-64 animate-ping rounded-full border border-white/12 motion-reduce:animate-none" />
        <div className="absolute h-44 w-44 animate-spin rounded-full border border-dashed border-[#e8c977]/30 [animation-duration:9s] motion-reduce:animate-none" />
        <div className="grid h-28 w-28 place-items-center rounded-full border border-[#e8c977]/55 bg-[#101b2b] shadow-[0_0_80px_-20px_rgba(232,201,119,.72)]">
          <Sparkles size={40} className={meta.color} />
        </div>
        <div className="mt-8 font-display text-2xl text-white">星轨正在回应</div>
        <div className="mt-2 text-xs text-white/42">{count === 10 ? "十次祈愿已写入命轨" : "祈愿结果已写入命轨"}</div>
      </div>
      <button type="button" onClick={onSkip} className="absolute right-5 top-5 flex h-9 items-center gap-2 border border-white/15 px-3 text-xs text-white/62 hover:text-white">
        <SkipForward size={14} /> 跳过
      </button>
    </div>
  );
}

function ResultOverlay({ result, onClose }: { result: GachaPullResult; onClose: () => void }) {
  const topTier = highestTier(result.results);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#07111d]/98 p-4 sm:p-7" role="dialog" aria-modal="true" aria-label="祈愿结果">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center">
        <div className="flex flex-col gap-3 border-b border-white/12 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#e8c977]">
              <Check size={16} />
              <span className="text-xs">祈愿完成</span>
            </div>
            <h2 className="mt-2 font-display text-3xl text-white">星轨回响</h2>
            <p className="mt-1 text-xs text-white/42">消耗 {result.goldSpent.toLocaleString()} Gold · 当前余额 {result.goldRemaining.toLocaleString()}</p>
          </div>
          <div className={cn("font-display text-sm", TIER_META[topTier].color)}>本次最高 {TIER_META[topTier].label}</div>
        </div>

        <div className={cn("mt-5 grid gap-3", result.results.length === 1 ? "mx-auto w-full max-w-sm" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
          {result.results.map((item) => <ResultCard key={item.pullId} item={item} />)}
        </div>

        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={onClose} className="min-w-[220px]">
            <PackageCheck size={17} /> 收入背包
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ item }: { item: GachaPullResult["results"][number] }) {
  const reward = item.reward;
  const meta = TIER_META[item.tier];
  const pending = reward && (reward.category !== "virtual" || reward.costMoneyCents > 0);
  return (
    <article className={cn("relative overflow-hidden border bg-[#111f2f]", meta.border)}>
      <div className={cn("absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent", meta.glow)} />
      <div className="relative aspect-square p-4">
        {reward?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.imageUrl} alt={reward.name} className="h-full w-full object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,.45)]" />
        ) : (
          <div className="grid h-full place-items-center text-6xl">{reward?.emoji ?? "✦"}</div>
        )}
      </div>
      <div className="relative border-t border-white/10 p-3 text-center">
        <div className="flex justify-center gap-0.5 text-[#ffe28a]" aria-label={`${meta.stars} 星`}>
          {Array.from({ length: meta.stars }).map((_, index) => <Star key={index} size={11} fill="currentColor" />)}
        </div>
        <h3 className="mt-1 truncate font-display text-sm text-white">{reward?.name ?? "未命名奖励"}</h3>
        <div className="mt-1 text-[9px] text-white/40">{reward ? CATEGORY_LABEL[reward.category] : meta.label}</div>
        {pending && reward ? (
          <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-[#9ed8de]">
            <Clock3 size={10} /> 待兑现 {formatMoney(reward.costMoneyCents)}
          </div>
        ) : (
          <div className="mt-2 text-[9px] text-[#b7dfba]">已可使用</div>
        )}
      </div>
    </article>
  );
}

function highestTier(results: GachaPullResult["results"]): RewardItemDTO["tier"] {
  const order: RewardItemDTO["tier"][] = ["common", "rare", "epic", "legendary"];
  return results.reduce<RewardItemDTO["tier"]>(
    (highest, result) => order.indexOf(result.tier) > order.indexOf(highest) ? result.tier : highest,
    "common",
  );
}

function tierLabel(tier: RewardItemDTO["tier"]) {
  return TIER_META[tier].label;
}

function baseItemProbability(tier: RewardItemDTO["tier"], weight: number, totalWeight: number) {
  if (totalWeight === 0) return "0%";
  const tierRate = tier === "legendary" ? 0.006 : tier === "epic" ? 0.051 * 0.18 : tier === "rare" ? 0.051 * 0.82 : 0.943;
  return `${((tierRate * weight * 100) / totalWeight).toFixed(2)}%`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
