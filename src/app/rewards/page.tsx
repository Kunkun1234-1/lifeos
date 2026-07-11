"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  Boxes,
  Check,
  Coins,
  Gift,
  MonitorPlay,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePicker } from "@/components/image-picker";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  useAssets,
  useCreateReward,
  useDeleteReward,
  useRedeemReward,
  useRewards,
  useUpdateReward,
  useUser,
} from "@/hooks/queries";
import type { RewardCategory, RewardItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | RewardCategory;
type SortMode = "recommended" | "money-low" | "gold-low" | "newest";

const CATEGORY_META: Record<
  CategoryFilter,
  { label: string; description: string; icon: typeof Boxes }
> = {
  all: { label: "全部商品", description: "浏览完整奖励目录", icon: Boxes },
  virtual: { label: "虚拟商品", description: "时间、权益与数字奖励", icon: MonitorPlay },
  physical_small: { label: "小额实物", description: "money 小于 500 元", icon: Package },
  physical_large: { label: "大额实物", description: "money 大于等于 500 元", icon: ShoppingBag },
};

const TIER_META: Record<RewardItemDTO["tier"], { label: string; className: string }> = {
  common: { label: "通常", className: "border-white/20 bg-white/8 text-white/72" },
  rare: { label: "稀有", className: "border-[#78badc]/40 bg-[#78badc]/12 text-[#c9efff]" },
  epic: { label: "史诗", className: "border-[#d19bdc]/40 bg-[#d19bdc]/12 text-[#f2c9f8]" },
  legendary: { label: "传说", className: "border-[#e8c977]/45 bg-[#e8c977]/12 text-[#fff0b7]" },
};

export default function RewardsPage() {
  const { data: rewards = [], isLoading, error } = useRewards();
  const { data: user } = useUser();
  const { data: assets } = useAssets();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [wishOnly, setWishOnly] = useState(false);
  const [editing, setEditing] = useState<RewardItemDTO | "new" | null>(null);
  const [purchasing, setPurchasing] = useState<RewardItemDTO | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const gold = user?.currency.gold ?? 0;
  const flexibleBalance =
    assets?.pools.find((pool) => pool.type === "flexible")?.balanceCents ?? 0;

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: rewards.length,
      virtual: 0,
      physical_small: 0,
      physical_large: 0,
    };
    for (const reward of rewards) counts[reward.category] += 1;
    return counts;
  }, [rewards]);

  const visibleRewards = useMemo(() => {
    const filtered = rewards.filter(
      (reward) =>
        (category === "all" || reward.category === category) &&
        (!wishOnly || reward.inGachaPool),
    );
    return filtered.slice().sort((a, b) => {
      if (sort === "money-low") return a.costMoneyCents - b.costMoneyCents;
      if (sort === "gold-low") return a.costGold - b.costGold;
      if (sort === "newest") return b.id.localeCompare(a.id);
      return Number(b.inGachaPool) - Number(a.inGachaPool) || a.costMoneyCents - b.costMoneyCents;
    });
  }, [category, rewards, sort, wishOnly]);

  const activeMeta = CATEGORY_META[category];

  return (
    <div className="mx-auto min-h-[calc(100vh-76px)] max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
      <section className="overflow-hidden border border-white/15 bg-[#101c2a]/92 shadow-[0_30px_80px_-46px_rgba(0,0,0,.9)] backdrop-blur-xl">
        <header className="flex flex-col gap-5 border-b border-white/12 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl text-white sm:text-3xl">奖励商店</h1>
            <p className="mt-1 text-sm text-white/55">用现实预算与行动积累，兑换真正想要的奖励。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BalanceDisplay
              icon={<WalletCards size={16} />}
              label="流动资金"
              value={formatMoney(flexibleBalance)}
              tone="money"
            />
            <BalanceDisplay
              icon={<Coins size={16} />}
              label="Gold"
              value={gold.toLocaleString()}
              tone="gold"
            />
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} />
              新建商品
            </Button>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="border-b border-white/12 bg-[#0b1521]/72 p-3 lg:min-h-[680px] lg:border-b-0 lg:border-r">
            <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1" aria-label="商品分类">
              {(Object.keys(CATEGORY_META) as CategoryFilter[]).map((key) => {
                const item = CATEGORY_META[key];
                const Icon = item.icon;
                const selected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={cn(
                      "group flex min-w-[154px] items-center gap-3 border px-3 py-3 text-left transition lg:w-full lg:min-w-0",
                      selected
                        ? "border-[#d7b665]/65 bg-[#d7b665]/12 text-[#ffe8aa]"
                        : "border-transparent text-white/76 hover:border-white/18 hover:bg-white/7 hover:text-white",
                    )}
                    aria-current={selected ? "page" : undefined}
                  >
                    <Icon size={18} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-0.5 hidden truncate text-[10px] text-white/50 lg:block">
                        {item.description}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-white/60">{categoryCounts[key]}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 bg-[linear-gradient(145deg,rgba(255,255,255,.045),transparent_46%)] p-4 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl text-white">{activeMeta.label}</h2>
                <p className="mt-1 text-xs text-white/45">
                  {visibleRewards.length} 件商品 · {activeMeta.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 items-center gap-2 border border-white/15 bg-black/15 px-3 text-xs text-white/65">
                  <Checkbox checked={wishOnly} onCheckedChange={(value) => setWishOnly(value === true)} />
                  <Sparkles size={14} />
                  仅看祈愿池
                </label>
                <div className="relative">
                  <SlidersHorizontal
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45"
                  />
                  <Select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortMode)}
                    className="w-[150px] border-white/15 bg-[#152334] pl-9 text-white"
                    aria-label="商品排序"
                  >
                    <option value="recommended">推荐排序</option>
                    <option value="money-low">Money 从低到高</option>
                    <option value="gold-low">Gold 从低到高</option>
                    <option value="newest">最新创建</option>
                  </Select>
                </div>
              </div>
            </div>

            {error ? (
              <EmptyState title="商店暂时无法加载" description={(error as Error).message} />
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-3 py-5 max-[340px]:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-[.82] animate-pulse border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : visibleRewards.length === 0 ? (
              <EmptyState
                title="这里还没有商品"
                description={wishOnly ? "当前分类没有已加入祈愿池的商品。" : "创建第一件商品，开始安排奖励。"}
                action={
                  <Button onClick={() => setEditing("new")}>
                    <Plus size={16} /> 新建商品
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 py-5 max-[340px]:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleRewards.map((reward) => (
                  <ProductCard
                    key={reward.id}
                    reward={reward}
                    gold={gold}
                    money={flexibleBalance}
                    onPurchase={() => setPurchasing(reward)}
                    onEdit={() => setEditing(reward)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </section>

      <div className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </div>

      {editing ? (
        <ProductDialog
          reward={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setStatusMessage(message);
            setEditing(null);
          }}
        />
      ) : null}

      {purchasing ? (
        <PurchaseDialog
          reward={purchasing}
          gold={gold}
          money={flexibleBalance}
          walletReady={Boolean(assets?.plan.initialized && assets.plan.rolloverCompleted)}
          onClose={() => setPurchasing(null)}
          onPurchased={() => {
            setStatusMessage(`已购买 ${purchasing.name}`);
            setPurchasing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function BalanceDisplay({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "money" | "gold";
}) {
  return (
    <div className="flex h-10 min-w-[138px] items-center gap-2 border border-white/15 bg-black/18 px-3">
      <span className={tone === "gold" ? "text-[#e8c977]" : "text-[#88cbd1]"}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9px] uppercase text-white/38">{label}</span>
        <strong className="block truncate font-mono text-sm text-white">{value}</strong>
      </span>
    </div>
  );
}

function ProductCard({
  reward,
  gold,
  money,
  onPurchase,
  onEdit,
}: {
  reward: RewardItemDTO;
  gold: number;
  money: number;
  onPurchase: () => void;
  onEdit: () => void;
}) {
  const moneyShort = Math.max(0, reward.costMoneyCents - money);
  const goldShort = Math.max(0, reward.costGold - gold);
  const canPurchase = moneyShort === 0 && goldShort === 0;
  const tier = TIER_META[reward.tier];

  return (
    <article className="group relative overflow-hidden border border-white/12 bg-[#162536]/88 transition hover:-translate-y-0.5 hover:border-[#d7b665]/48 hover:shadow-[0_20px_45px_-32px_rgba(0,0,0,.95)]">
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center border border-white/15 bg-[#0b1521]/85 text-white/70 hover:border-[#d7b665]/55 hover:text-[#ffe8aa]"
          title="编辑商品"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="relative aspect-[1.14] overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(126,184,205,.16),transparent_55%),#0d1825]">
        {reward.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reward.imageUrl}
            alt={reward.name}
            className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="grid h-full place-items-center text-6xl">{reward.emoji}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#162536] to-transparent" />
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          <span className={cn("border px-2 py-0.5 text-[10px]", tier.className)}>{tier.label}</span>
          {reward.inGachaPool ? (
            <span className="flex items-center gap-1 border border-[#7fbfd0]/30 bg-[#7fbfd0]/10 px-2 py-0.5 text-[10px] text-[#c9f2f4]">
              <Sparkles size={10} /> 祈愿池
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-3 sm:p-3.5">
        <h3 className="truncate font-display text-base text-white" title={reward.name}>
          {reward.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-[18px] text-white/45">
          {reward.description || CATEGORY_META[reward.category].description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-[#9ad3d3]">
            <WalletCards size={13} />
            <strong className="truncate font-mono text-[11px] sm:text-xs">{formatMoney(reward.costMoneyCents)}</strong>
          </span>
          <span className="text-white/25">+</span>
          <span className="flex items-center gap-1.5 text-[#e8c977]">
            <Coins size={13} />
            <strong className="font-mono text-[11px] sm:text-xs">{reward.costGold.toLocaleString()}</strong>
          </span>
        </div>
        <div className={cn("mt-2 min-h-4 truncate text-[10px]", canPurchase ? "text-[#9ec7ad]" : "text-[#e4ae8d]")}>
          {canPurchase
            ? "余额充足"
            : moneyShort > 0 && goldShort > 0
              ? `还差 ${formatMoney(moneyShort)} 与 ${goldShort} Gold`
              : moneyShort > 0
                ? `还差 ${formatMoney(moneyShort)}`
                : `还差 ${goldShort} Gold`}
        </div>
        <Button
          className="mt-2 w-full px-2 text-xs"
          variant={canPurchase ? "primary" : "outline"}
          onClick={onPurchase}
        >
          {canPurchase ? <Gift size={14} /> : <WalletCards size={14} />}
          {canPurchase ? "购买" : "余额不足"}
        </Button>
      </div>
    </article>
  );
}

function PurchaseDialog({
  reward,
  gold,
  money,
  walletReady,
  onClose,
  onPurchased,
}: {
  reward: RewardItemDTO;
  gold: number;
  money: number;
  walletReady: boolean;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const purchase = useRedeemReward();
  const [error, setError] = useState<string | null>(null);
  const canAfford = reward.costMoneyCents <= money && reward.costGold <= gold;
  const needsWallet = reward.costMoneyCents > 0;
  const canSubmit = canAfford && (!needsWallet || walletReady) && !purchase.isPending;

  const submit = async () => {
    setError(null);
    try {
      await purchase.mutateAsync(reward.id);
      onPurchased();
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  return (
    <DialogShell title={`购买「${reward.name}」`} onClose={onClose}>
      <div className="space-y-3">
        <PriceRow
          icon={<WalletCards size={16} />}
          label="Money · 流动资金"
          cost={formatMoney(reward.costMoneyCents)}
          after={formatMoney(Math.max(0, money - reward.costMoneyCents))}
          enough={reward.costMoneyCents <= money}
        />
        <PriceRow
          icon={<Coins size={16} />}
          label="Gold"
          cost={reward.costGold.toLocaleString()}
          after={Math.max(0, gold - reward.costGold).toLocaleString()}
          enough={reward.costGold <= gold}
        />
      </div>
      {needsWallet && !walletReady ? (
        <p className="mt-3 border border-[#d5a15f]/35 bg-[#d5a15f]/10 p-3 text-xs leading-5 text-[#6f501f]">
          请先完成钱包初始化和本月结转，再购买需要 money 的商品。
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={purchase.isPending}>取消</Button>
        <Button onClick={() => void submit()} disabled={!canSubmit}>
          <Check size={15} />
          {purchase.isPending ? "购买中" : "确认购买"}
        </Button>
      </div>
    </DialogShell>
  );
}

function PriceRow({
  icon,
  label,
  cost,
  after,
  enough,
}: {
  icon: ReactNode;
  label: string;
  cost: string;
  after: string;
  enough: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border border-[var(--border)] bg-white/45 p-3">
      <span className={enough ? "text-[var(--gold-deep)]" : "text-[var(--danger)]"}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-[var(--fg-muted)]">{label}</div>
        <div className="mt-0.5 font-mono text-base font-bold text-[var(--fg-strong)]">-{cost}</div>
      </div>
      <div className="text-right text-[10px] text-[var(--fg-subtle)]">
        购买后
        <div className={cn("mt-0.5 font-mono text-xs", enough ? "text-[var(--fg)]" : "text-[var(--danger)]")}>{after}</div>
      </div>
    </div>
  );
}

function ProductDialog({
  reward,
  onClose,
  onSaved,
}: {
  reward: RewardItemDTO | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const create = useCreateReward();
  const update = useUpdateReward();
  const archive = useDeleteReward();
  const [name, setName] = useState(reward?.name ?? "");
  const [description, setDescription] = useState(reward?.description ?? "");
  const [emoji, setEmoji] = useState(reward?.emoji ?? "🎁");
  const [imageUrl, setImageUrl] = useState<string | null>(reward?.imageUrl ?? null);
  const [category, setCategory] = useState<RewardCategory>(reward?.category ?? "virtual");
  const [tier, setTier] = useState<RewardItemDTO["tier"]>(reward?.tier ?? "common");
  const [moneyYuan, setMoneyYuan] = useState(((reward?.costMoneyCents ?? 0) / 100).toString());
  const [costGold, setCostGold] = useState(reward?.costGold ?? 80);
  const [inGachaPool, setInGachaPool] = useState(reward?.inGachaPool ?? true);
  const [weight, setWeight] = useState(reward?.weight ?? 1);
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending || archive.isPending;

  const submit = async () => {
    const costMoneyCents = Math.round(Number(moneyYuan) * 100);
    setError(null);
    if (!name.trim()) return setError("请填写商品名称");
    if (!Number.isFinite(costMoneyCents) || costMoneyCents < 0) return setError("请输入有效的 money 金额");
    if (costMoneyCents === 0 && costGold === 0) return setError("money 和 gold 不能同时为 0");
    if (category === "physical_small" && costMoneyCents >= 50_000) return setError("小额实物必须低于 500 元");
    if (category === "physical_large" && costMoneyCents < 50_000) return setError("大额实物必须大于等于 500 元");

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      emoji: emoji || "🎁",
      imageUrl,
      category,
      tier,
      costMoneyCents,
      costGold,
      inGachaPool,
      weight,
    };
    try {
      if (reward) await update.mutateAsync({ id: reward.id, body });
      else await create.mutateAsync(body);
      onSaved(reward ? "商品已更新" : "商品已创建");
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  const archiveReward = async () => {
    if (!reward || !confirm(`归档「${reward.name}」？历史库存不会被删除。`)) return;
    try {
      await archive.mutateAsync(reward.id);
      onSaved("商品已归档");
    } catch (reason) {
      setError((reason as Error).message);
    }
  };

  return (
    <DialogShell title={reward ? "编辑商品" : "新建商品"} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <ImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          fallbackEmoji={emoji}
          label="商品图片"
          hint="用于商店、祈愿和背包"
        />
        <div className="grid gap-3">
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <Field label="Emoji">
              <Input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={8} />
            </Field>
            <Field label="商品名称">
              <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            </Field>
          </div>
          <Field label="说明">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </Field>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="商品分类">
          <Select value={category} onChange={(event) => setCategory(event.target.value as RewardCategory)}>
            <option value="virtual">虚拟商品</option>
            <option value="physical_small">小额实物 · 小于 500 元</option>
            <option value="physical_large">大额实物 · 大于等于 500 元</option>
          </Select>
        </Field>
        <Field label="祈愿稀有度">
          <Select value={tier} onChange={(event) => setTier(event.target.value as RewardItemDTO["tier"])}>
            <option value="common">三星 · 通常</option>
            <option value="rare">四星 · 稀有</option>
            <option value="epic">四星 · 精选</option>
            <option value="legendary">五星 · 传说</option>
          </Select>
        </Field>
        <Field label="Money · 人民币元">
          <Input type="number" min={0} step="0.01" value={moneyYuan} onChange={(event) => setMoneyYuan(event.target.value)} />
        </Field>
        <Field label="Gold">
          <Input type="number" min={0} value={costGold} onChange={(event) => setCostGold(Number(event.target.value))} />
        </Field>
        <Field label="祈愿池">
          <label className="flex h-9 items-center gap-2 border border-[var(--border)] bg-white/60 px-3 text-sm text-[var(--fg)]">
            <Checkbox checked={inGachaPool} onCheckedChange={(value) => setInGachaPool(value === true)} />
            加入当前祈愿池
          </label>
        </Field>
        <Field label="池内权重">
          <Input type="number" min={1} max={10} value={weight} onChange={(event) => setWeight(Number(event.target.value))} disabled={!inGachaPool} />
        </Field>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <div>
          {reward ? (
            <Button variant="danger" onClick={() => void archiveReward()} disabled={pending}>
              <Archive size={15} /> 归档
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>取消</Button>
          <Button onClick={() => void submit()} disabled={pending}>
            <Check size={15} /> {pending ? "保存中" : "保存商品"}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#07101b]/72 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn("panel-cream framed my-auto w-full p-5 sm:p-6", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl text-[var(--fg-strong)]">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center text-[var(--fg-muted)] hover:bg-[var(--gold-tint)]" title="关闭">
            <X size={17} />
          </button>
        </div>
        {children}
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

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-[420px] place-items-center py-10 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center border border-white/15 bg-white/5 text-[#d7b665]">
          <Gift size={24} />
        </div>
        <h3 className="mt-4 font-display text-lg text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/45">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
