"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  Check,
  Clock3,
  Coins,
  History,
  Info,
  ListTree,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  SkipForward,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCreateReward,
  useDeleteReward,
  useGacha,
  usePullGacha,
  useUpdateReward,
} from "@/hooks/queries";
import type {
  GachaPullResult,
  GachaState,
  RewardCategory,
  RewardItemDTO,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Page ambience (ethereal pad). Videos keep their own embedded audio during pulls. */
const WISH_AUDIO_SRC = "/gacha/audio/wish-ambience.mp3";

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
  const revealTimerRef = useRef<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [phase, setPhase] = useState<"idle" | "rolling" | "revealing" | "summary">("idle");
  const [result, setResult] = useState<GachaPullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearRevealTimer = () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const startItemReveal = () => {
    clearRevealTimer();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduceMotion ? "summary" : "revealing");
  };

  const showSummary = () => {
    clearRevealTimer();
    setPhase("summary");
  };

  useEffect(() => () => {
    if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);
  }, []);

  // Enter page: loop ethereal ambience. Pause during pull video so MP4 original audio can play.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = 0.42;
    const shouldPlayAmbience = soundOn && phase !== "rolling";
    if (shouldPlayAmbience) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [soundOn, phase]);

  // Browser autoplay policy: unlock ambience on first user gesture anywhere on the page.
  useEffect(() => {
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio || !soundOn || phase === "rolling") return;
      void audio.play().catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [soundOn, phase]);

  const doPull = async (count: 1 | 10) => {
    setError(null);
    try {
      const response = await pull.mutateAsync({ count });
      setResult(response);
      setPhase("rolling");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      clearRevealTimer();
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        setPhase(reduceMotion ? "summary" : "revealing");
      }, reduceMotion ? 250 : 6500);
    } catch (reason) {
      setError((reason as Error).message);
      setPhase("idle");
    }
  };

  const dismissResults = () => {
    clearRevealTimer();
    setPhase("idle");
    setResult(null);
  };

  const gold = state?.gold ?? 0;
  const goldPerPull = state?.goldPerPull ?? 160;
  const fourStarLeft = Math.max(0, (state?.fourStarPityAt ?? 10) - (state?.pullsSinceRare ?? 0));
  const fiveStarLeft = Math.max(0, (state?.hardPityAt ?? 90) - (state?.pullsSinceEpic ?? 0));
  const poolReady = state?.ready ?? false;

  return (
    <div className="relative min-h-[calc(100vh-82px)] overflow-hidden bg-[#052a22] text-white">
      <Image
        src="/gacha/backgrounds/wish-banner-v2.png"
        alt="雪境星海中的祈愿角色"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[64%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,23,.97)_0%,rgba(5,13,23,.82)_24%,rgba(5,13,23,.24)_56%,rgba(5,13,23,.08)_78%,rgba(5,13,23,.42)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#052a22]/94 via-[#052a22]/34 to-transparent" />

      <audio ref={audioRef} src={WISH_AUDIO_SRC} preload="auto" loop />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#052a22]/42 px-4 py-3 backdrop-blur-sm sm:px-7">
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
          count={result.results.length === 10 ? 10 : 1}
          highestTier={highestTier(result.results)}
          soundOn={soundOn}
          onSkip={startItemReveal}
          onComplete={startItemReveal}
        />
      ) : null}
      {phase === "revealing" && result ? (
        <SequentialRevealOverlay result={result} onSkip={showSummary} onDone={showSummary} />
      ) : null}
      {phase === "summary" && result ? <ResultOverlay result={result} onClose={dismissResults} /> : null}
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
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<RewardItemDTO | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    <OverlayShell
      title={managing ? "DIY 奖励池" : "概率与奖池"}
      icon={<ListTree size={18} />}
      onClose={onClose}
      wide
      actions={
        <button
          type="button"
          onClick={() => {
            setManaging((value) => !value);
            setEditing(null);
            setMessage(null);
          }}
          className="flex h-9 items-center gap-2 border border-[#e8c977]/65 bg-[#e8c977]/12 px-3 text-xs font-bold text-[#ffe7a4] transition hover:bg-[#e8c977]/22"
        >
          {managing ? <Check size={14} /> : <Pencil size={14} />}
          {managing ? "完成编辑" : "编辑奖池"}
        </button>
      }
    >
      {managing ? (
        <PoolManager
          rewards={state.rewards}
          editing={editing}
          message={message}
          onEdit={setEditing}
          onMessage={setMessage}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <RateBox label="五星" rate="0.6%" detail="74 抽起提升，90 抽必得" />
            <RateBox label="四星及以上" rate="5.1%" detail="10 抽内至少一次" />
            <RateBox label="三星" rate="94.3%" detail="其余结果" />
          </div>
          <p className="mt-4 border-l-2 border-[#e8c977] bg-[#0b2b38] px-3 py-2.5 text-xs leading-5 text-white/78">
            四星结果中，稀有占 82%，精选占 18%。同层级商品按权重分配。实物奖励抽中后仍需在背包中支付 money 兑现。
          </p>
          <div className="mt-6 space-y-6">
            {(["legendary", "epic", "rare", "common"] as const).map((tier) => (
              <PoolTier key={tier} tier={tier} items={grouped[tier]} />
            ))}
          </div>
        </>
      )}
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
        <span className="text-[10px] text-white/62">{items.length} 件</span>
        <span className="h-px flex-1 bg-white/18" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 border border-white/18 bg-[#0c2b38] p-3 shadow-[0_10px_28px_-24px_black]">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-white/12 bg-[#061923] text-xl">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
              ) : item.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{item.name}</div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-white/65">
                <span>{CATEGORY_LABEL[item.category]}</span>
                <span>权重 {item.weight}/{totalWeight}</span>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold text-[#ffe7a4]">{baseItemProbability(tier, item.weight, totalWeight)}</span>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="border border-dashed border-white/20 bg-[#0a2632] px-4 py-5 text-center text-xs text-white/58 sm:col-span-2">
            这个星级还没有奖励，可在“编辑奖池”中添加。
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PoolManager({
  rewards,
  editing,
  message,
  onEdit,
  onMessage,
}: {
  rewards: RewardItemDTO[];
  editing: RewardItemDTO | "new" | null;
  message: string | null;
  onEdit: (reward: RewardItemDTO | "new" | null) => void;
  onMessage: (message: string | null) => void;
}) {
  const update = useUpdateReward();
  const archive = useDeleteReward();
  const [error, setError] = useState<string | null>(null);

  const togglePool = async (reward: RewardItemDTO) => {
    setError(null);
    try {
      await update.mutateAsync({
        id: reward.id,
        body: { inGachaPool: !reward.inGachaPool },
      });
      onMessage(reward.inGachaPool ? `「${reward.name}」已移出奖池` : `「${reward.name}」已加入奖池`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  const archiveReward = async (reward: RewardItemDTO) => {
    if (!window.confirm(`归档「${reward.name}」？历史抽取记录和背包物品不会被删除。`)) return;
    setError(null);
    try {
      await archive.mutateAsync(reward.id);
      onMessage(`「${reward.name}」已归档`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  if (editing) {
    return (
      <PoolRewardForm
        key={editing === "new" ? "new" : editing.id}
        reward={editing === "new" ? null : editing}
        onCancel={() => onEdit(null)}
        onSaved={(savedMessage) => {
          onMessage(savedMessage);
          onEdit(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border border-[#e8c977]/28 bg-[#0b2b38] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg text-white">配置你的奖励</h3>
          <p className="mt-1 max-w-lg text-xs leading-5 text-white/68">
            自定义名称、图标、星级、类别和权重。关闭“加入奖池”只会暂停抽取，不会删除奖励。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onMessage(null);
            onEdit("new");
          }}
          className="flex h-10 shrink-0 items-center justify-center gap-2 bg-[#e8c977] px-4 text-xs font-black text-[#10212a] transition hover:bg-[#f6dda0]"
        >
          <Plus size={15} /> 新增奖励
        </button>
      </div>

      {message ? (
        <div className="mt-3 border border-[#59c98f]/40 bg-[#0d3a31] px-3 py-2 text-xs text-[#b9f4d4]" role="status">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 border border-[#ef8d86]/45 bg-[#3a171b] px-3 py-2 text-xs text-[#ffd3ce]" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {rewards.map((reward) => {
          const meta = TIER_META[reward.tier];
          const busy = (update.isPending && update.variables?.id === reward.id) || archive.isPending;
          return (
            <div
              key={reward.id}
              className={cn(
                "grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                reward.inGachaPool
                  ? "border-white/20 bg-[#0c2b38]"
                  : "border-white/10 bg-[#091f2a] opacity-70",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("grid h-11 w-11 shrink-0 place-items-center overflow-hidden border bg-[#061923] text-xl", meta.border)}>
                  {reward.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reward.imageUrl} alt="" className="h-full w-full object-contain" />
                  ) : reward.emoji}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-sm text-white">{reward.name}</strong>
                    <span className={cn("text-[10px] font-bold", meta.color)}>{meta.label}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-white/62">
                    {CATEGORY_LABEL[reward.category]} · 权重 {reward.weight} · {reward.inGachaPool ? "抽取中" : "已停用"}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void togglePool(reward)}
                  className={cn(
                    "h-8 border px-3 text-[11px] font-bold transition disabled:opacity-45",
                    reward.inGachaPool
                      ? "border-[#59c98f]/50 bg-[#123b31] text-[#b9f4d4]"
                      : "border-white/20 bg-[#102833] text-white/68 hover:text-white",
                  )}
                >
                  {reward.inGachaPool ? "已加入奖池" : "加入奖池"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(reward)}
                  className="grid h-8 w-8 place-items-center border border-white/20 bg-[#102833] text-white/75 hover:border-[#e8c977]/55 hover:text-[#ffe7a4]"
                  title={`编辑${reward.name}`}
                  aria-label={`编辑${reward.name}`}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void archiveReward(reward)}
                  className="grid h-8 w-8 place-items-center border border-[#ef8d86]/25 bg-[#31171a] text-[#ffb7b0] hover:border-[#ef8d86]/55"
                  title={`归档${reward.name}`}
                  aria-label={`归档${reward.name}`}
                >
                  <Archive size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PoolRewardForm({
  reward,
  onCancel,
  onSaved,
}: {
  reward: RewardItemDTO | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const create = useCreateReward();
  const update = useUpdateReward();
  const [name, setName] = useState(reward?.name ?? "");
  const [description, setDescription] = useState(reward?.description ?? "");
  const [emoji, setEmoji] = useState(reward?.emoji ?? "🎁");
  const [imageUrl, setImageUrl] = useState(reward?.imageUrl ?? "");
  const [tier, setTier] = useState<RewardItemDTO["tier"]>(reward?.tier ?? "common");
  const [category, setCategory] = useState<RewardCategory>(reward?.category ?? "virtual");
  const [weight, setWeight] = useState(reward?.weight ?? 1);
  const [inGachaPool, setInGachaPool] = useState(reward?.inGachaPool ?? true);
  const [moneyYuan, setMoneyYuan] = useState(((reward?.costMoneyCents ?? 0) / 100).toString());
  const [costGold, setCostGold] = useState(reward?.costGold ?? 80);
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    const costMoneyCents = Math.round(Number(moneyYuan) * 100);
    setError(null);
    if (!name.trim()) return setError("请填写奖励名称");
    if (!Number.isFinite(costMoneyCents) || costMoneyCents < 0) return setError("请输入有效的人民币金额");
    if (costMoneyCents === 0 && costGold === 0) return setError("人民币金额和 Gold 不能同时为 0");
    if (category === "physical_small" && costMoneyCents >= 50_000) return setError("小额实物必须低于 500 元");
    if (category === "physical_large" && costMoneyCents < 50_000) return setError("大额实物必须不低于 500 元");

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      emoji: emoji.trim() || "🎁",
      imageUrl: imageUrl.trim() || null,
      tier,
      category,
      weight: Math.max(1, Math.min(10, Math.round(weight))),
      inGachaPool,
      costMoneyCents,
      costGold: Math.max(0, Math.round(costGold)),
    };

    try {
      if (reward) await update.mutateAsync({ id: reward.id, body });
      else await create.mutateAsync(body);
      onSaved(reward ? `「${body.name}」已更新` : `「${body.name}」已加入奖励库`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  const fieldClass = "grid gap-1.5 text-[11px] font-bold text-white/72";
  const controlClass = "h-10 w-full border border-white/22 bg-[#061923] px-3 text-sm font-medium text-white outline-none transition placeholder:text-white/28 focus:border-[#e8c977]/70";

  return (
    <div>
      <div className="border border-[#e8c977]/28 bg-[#0b2b38] p-4">
        <h3 className="font-display text-xl text-white">{reward ? "编辑奖励" : "新增奖励"}</h3>
        <p className="mt-1 text-xs leading-5 text-white/65">设置奖励内容、兑换成本与抽取权重。图片地址留空时使用 Emoji。</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={fieldClass}>
          奖励名称
          <input className={controlClass} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <label className={fieldClass}>
          Emoji
          <input className={controlClass} value={emoji} maxLength={8} onChange={(event) => setEmoji(event.target.value)} />
        </label>
        <label className={cn(fieldClass, "sm:col-span-2")}>
          说明
          <textarea className="min-h-20 w-full resize-y border border-white/22 bg-[#061923] px-3 py-2 text-sm font-medium text-white outline-none placeholder:text-white/28 focus:border-[#e8c977]/70" value={description ?? ""} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className={cn(fieldClass, "sm:col-span-2")}>
          图片地址（可选）
          <input className={controlClass} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://… 或 /images/reward.png" />
        </label>
        <label className={fieldClass}>
          星级
          <select className={controlClass} value={tier} onChange={(event) => setTier(event.target.value as RewardItemDTO["tier"])}>
            <option value="common">三星 · 通常</option>
            <option value="rare">四星 · 稀有</option>
            <option value="epic">四星 · 精选</option>
            <option value="legendary">五星 · 传说</option>
          </select>
        </label>
        <label className={fieldClass}>
          类型
          <select className={controlClass} value={category} onChange={(event) => setCategory(event.target.value as RewardCategory)}>
            <option value="virtual">虚拟奖励</option>
            <option value="physical_small">小额实物 · 低于 500 元</option>
            <option value="physical_large">大额实物 · 不低于 500 元</option>
          </select>
        </label>
        <label className={fieldClass}>
          池内权重（1–10）
          <input className={controlClass} type="number" min={1} max={10} value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
        </label>
        <label className={fieldClass}>
          Gold 价值
          <input className={controlClass} type="number" min={0} value={costGold} onChange={(event) => setCostGold(Number(event.target.value))} />
        </label>
        <label className={fieldClass}>
          人民币价值（元）
          <input className={controlClass} type="number" min={0} step="0.01" value={moneyYuan} onChange={(event) => setMoneyYuan(event.target.value)} />
        </label>
        <label className="flex h-10 items-center gap-3 self-end border border-white/22 bg-[#061923] px-3 text-xs font-bold text-white/78">
          <input type="checkbox" checked={inGachaPool} onChange={(event) => setInGachaPool(event.target.checked)} className="h-4 w-4 accent-[#e8c977]" />
          保存后加入当前奖池
        </label>
      </div>

      {error ? <div className="mt-4 border border-[#ef8d86]/45 bg-[#3a171b] px-3 py-2 text-xs text-[#ffd3ce]" role="alert">{error}</div> : null}

      <div className="mt-5 flex justify-end gap-2 border-t border-white/14 pt-4">
        <button type="button" onClick={onCancel} disabled={pending} className="h-10 border border-white/24 bg-[#102833] px-4 text-xs font-bold text-white/78 hover:text-white disabled:opacity-45">
          取消
        </button>
        <button type="button" onClick={() => void submit()} disabled={pending} className="flex h-10 items-center gap-2 bg-[#e8c977] px-5 text-xs font-black text-[#10212a] hover:bg-[#f6dda0] disabled:opacity-45">
          <Save size={14} /> {pending ? "保存中…" : "保存奖励"}
        </button>
      </div>
    </div>
  );
}

function HistoryOverlay({ state, onClose }: { state: GachaState; onClose: () => void }) {
  return (
    <OverlayShell title="最近祈愿" icon={<History size={18} />} onClose={onClose}>
      {state.recent.length === 0 ? (
        <div className="grid min-h-64 place-items-center text-center text-sm text-white/65">还没有祈愿记录。</div>
      ) : (
        <div className="divide-y divide-white/14">
          {state.recent.map((pull) => {
            const meta = TIER_META[pull.tier];
            return (
              <div key={pull.id} className="flex items-center gap-3 bg-[#0c2b38] px-3 py-3">
                <div className={cn("grid h-10 w-10 place-items-center border bg-[#061923] text-xl", meta.border)}>
                  {pull.reward?.emoji ?? <Star size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{pull.reward?.name ?? "未命名奖励"}</div>
                  <div className="mt-0.5 text-[10px] text-white/62">{formatDate(pull.pulledAt)}</div>
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

function OverlayShell({
  title,
  icon,
  onClose,
  children,
  actions,
  wide = false,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}) {
  useDialogDismiss(onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-[#02070d]/84 text-white backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn("h-full w-full overflow-y-auto border-l border-white/20 bg-[#071f2c] px-5 pb-5 shadow-[-32px_0_90px_-40px_#000] sm:px-7 sm:pb-7", wide ? "max-w-[780px]" : "max-w-[620px]")}>
        <div className="sticky top-0 z-20 -mx-5 flex items-center justify-between gap-3 border-b border-white/18 bg-[#071f2c] px-5 py-4 shadow-[0_16px_30px_-22px_#000] sm:-mx-7 sm:px-7">
          <div className="flex items-center gap-2 text-[#ffe5a0]">
            {icon}
            <h2 className="font-display text-xl text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center border border-white/35 bg-[#020b11] text-white transition hover:border-[#e8c977]/70 hover:bg-[#3b3421]"
              title={`关闭${title}`}
              aria-label={`关闭${title}`}
            >
              <X size={20} strokeWidth={2.4} className="text-white" />
            </button>
          </div>
        </div>
        <div className="py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function RateBox({ label, rate, detail }: { label: string; rate: string; detail: string }) {
  return (
    <div className="border border-white/20 bg-[#0c2b38] p-3 shadow-[0_10px_28px_-24px_black]">
      <div className="text-[10px] font-bold text-white/68">{label}</div>
      <div className="mt-1 font-display text-2xl text-[#ffe5a0]">{rate}</div>
      <div className="mt-1 text-[10px] leading-4 text-white/62">{detail}</div>
    </div>
  );
}

function RollingOverlay({
  count,
  highestTier,
  soundOn,
  onSkip,
  onComplete,
}: {
  count: 1 | 10;
  highestTier: RewardItemDTO["tier"];
  soundOn: boolean;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const meta = TIER_META[highestTier];
  const videoSrc = getWishVideoSrc(highestTier, count);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !soundOn;
    video.volume = 0.9;
    if (soundOn) {
      void video.play().catch(() => undefined);
    }
  }, [soundOn, videoSrc]);

  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-hidden bg-[#040a13] text-white" aria-label="祈愿进行中">
      <video
        key={videoSrc}
        ref={videoRef}
        src={videoSrc}
        autoPlay
        playsInline
        preload="auto"
        onEnded={onComplete}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-black/10" />
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent", meta.glow)} />
      <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center drop-shadow-[0_2px_12px_rgba(0,0,0,.9)]">
        <div className="font-display text-xl text-white">{count === 10 ? "十连祈愿" : "单次祈愿"}</div>
        <div className={cn("mt-2 text-xs uppercase", meta.color)}>{meta.label} · Astral Shift</div>
      </div>
      <button type="button" onClick={onSkip} className="absolute right-5 top-5 z-10 flex h-9 items-center gap-2 border border-white/25 bg-black/25 px-3 text-xs text-white/75 backdrop-blur-sm hover:border-white/55 hover:text-white">
        <SkipForward size={14} /> 跳过
      </button>
    </div>,
    document.body,
  );
}

function getWishVideoSrc(tier: RewardItemDTO["tier"], count: 1 | 10) {
  if (count === 10) {
    return tier === "legendary" ? "/gacha/videos/ten-gold.mp4" : "/gacha/videos/ten-purple.mp4";
  }
  if (tier === "legendary") return "/gacha/videos/single-gold.mp4";
  if (tier === "rare" || tier === "epic") return "/gacha/videos/single-purple.mp4";
  return "/gacha/videos/single-blue.mp4";
}

function SequentialRevealOverlay({
  result,
  onSkip,
  onDone,
}: {
  result: GachaPullResult;
  onSkip: () => void;
  onDone: () => void;
}) {
  const items = result.results;
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const current = items[index];
  const meta = TIER_META[current.tier];
  const reward = current.reward;
  const isLast = index >= items.length - 1;

  useEffect(() => {
    setEntered(false);
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [index]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const advance = () => {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((value) => value + 1);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex cursor-pointer flex-col bg-[#040a13] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="逐个揭示祈愿结果"
      onClick={advance}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          advance();
        }
        if (event.key === "Escape") onSkip();
      }}
      tabIndex={0}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-[#040a13]", meta.glow)} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.08),transparent_42%)]" />

      <div className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-7">
        <div className="text-xs text-white/55">
          {index + 1} / {items.length}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSkip();
          }}
          className="flex h-9 items-center gap-2 border border-white/25 bg-black/30 px-3 text-xs text-white/80 backdrop-blur-sm hover:border-white/55 hover:text-white"
        >
          <SkipForward size={14} /> 跳过动画
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div
          className={cn(
            "relative w-full max-w-sm overflow-hidden border bg-[#0d1824]/92 shadow-[0_30px_80px_-40px_rgba(0,0,0,.95)] transition duration-500",
            meta.border,
            entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-95 opacity-0",
          )}
        >
          <div className={cn("absolute inset-x-0 top-0 h-48 bg-gradient-to-b to-transparent", meta.glow)} />
          <div className="relative grid aspect-[4/5] place-items-center p-8">
            {reward?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reward.imageUrl}
                alt={reward.name}
                className="h-[58%] w-[58%] object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.55)]"
              />
            ) : (
              <div className="grid place-items-center text-7xl">{reward?.emoji ?? "✦"}</div>
            )}
          </div>
          <div className="relative border-t border-white/10 px-5 py-5 text-center">
            <div className="flex justify-center gap-1 text-[#ffe28a]" aria-label={`${meta.stars} 星`}>
              {Array.from({ length: meta.stars }).map((_, starIndex) => (
                <Star key={starIndex} size={16} fill="currentColor" />
              ))}
            </div>
            <div className={cn("mt-2 text-xs uppercase tracking-[0.18em]", meta.color)}>{meta.label}</div>
            <h3 className="mt-2 font-display text-2xl text-white">{reward?.name ?? "未命名奖励"}</h3>
            <div className="mt-2 text-xs text-white/45">
              {reward ? CATEGORY_LABEL[reward.category] : "奖励"}
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-white/55">
          {isLast ? "点击查看全部结果" : "点击继续下一项"}
        </p>
      </div>
    </div>,
    document.body,
  );
}

function ResultOverlay({ result, onClose }: { result: GachaPullResult; onClose: () => void }) {
  useDialogDismiss(onClose);
  const topTier = highestTier(result.results);
  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#052a22]/98 p-4 pt-20 text-white sm:p-7 sm:pt-20" role="dialog" aria-modal="true" aria-label="祈愿结果">
      <button
        type="button"
        onClick={onClose}
        className="fixed right-4 top-4 z-[95] grid h-11 w-11 place-items-center border border-white/30 bg-[#052a22]/90 text-white shadow-lg backdrop-blur-md transition hover:border-[#e8c977]/75 sm:right-7 sm:top-7"
        title="关闭祈愿结果"
        aria-label="关闭祈愿结果"
      >
        <X size={22} strokeWidth={2.4} className="text-white" />
      </button>
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
    </div>,
    document.body,
  );
}

function useDialogDismiss(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
}

function ResultCard({ item }: { item: GachaPullResult["results"][number] }) {
  const reward = item.reward;
  const meta = TIER_META[item.tier];
  const pending = reward && (reward.category !== "virtual" || reward.costMoneyCents > 0);
  return (
    <article className={cn("relative overflow-hidden border bg-[#111f2f]", meta.border)}>
      <div className={cn("absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent", meta.glow)} />
      <div className="relative grid aspect-square place-items-center p-4">
        {reward?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.imageUrl} alt={reward.name} className="h-[44%] w-[44%] object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,.45)]" />
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
