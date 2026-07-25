"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Archive,
  Backpack,
  Check,
  Coins,
  Gift,
  Pencil,
  Plus,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImagePicker } from "@/components/image-picker";
import { Input, Select, Textarea } from "@/components/ui/input";
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
import styles from "./page.module.css";

type CategoryFilter = "all" | RewardCategory;
type SortMode = "recommended" | "money-low" | "gold-low" | "newest";

const CATEGORY_TABS: Array<{ key: CategoryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "virtual", label: "虚拟" },
  { key: "physical_small", label: "小额实物" },
  { key: "physical_large", label: "大额实物" },
];

const CATEGORY_LABEL: Record<RewardCategory, string> = {
  virtual: "虚拟商品",
  physical_small: "小额实物",
  physical_large: "大额实物",
};

const TIER_META: Record<
  RewardItemDTO["tier"],
  { label: string; color: string; glow: string }
> = {
  common: { label: "通常", color: "#8a918c", glow: "rgba(138, 145, 140, 0.28)" },
  rare: { label: "稀有", color: "#3b82c4", glow: "rgba(59, 130, 196, 0.3)" },
  epic: { label: "史诗", color: "#8b6bb8", glow: "rgba(139, 107, 184, 0.3)" },
  legendary: { label: "传说", color: "#c9902c", glow: "rgba(201, 144, 44, 0.3)" },
};

export default function RewardsPage() {
  const { data: rewards = [], isLoading, error } = useRewards();
  const { data: user } = useUser();
  const { data: assets } = useAssets();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [wishOnly, setWishOnly] = useState(false);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    const filtered = rewards.filter((reward) => {
      if (category !== "all" && reward.category !== category) return false;
      if (wishOnly && !reward.inGachaPool) return false;
      if (affordableOnly) {
        if (reward.costGold > gold || reward.costMoneyCents > flexibleBalance) {
          return false;
        }
      }
      return true;
    });
    return filtered.slice().sort((a, b) => {
      if (sort === "money-low") return a.costMoneyCents - b.costMoneyCents;
      if (sort === "gold-low") return a.costGold - b.costGold;
      if (sort === "newest") return b.id.localeCompare(a.id);
      return Number(b.inGachaPool) - Number(a.inGachaPool) || a.costMoneyCents - b.costMoneyCents;
    });
  }, [affordableOnly, category, flexibleBalance, gold, rewards, sort, wishOnly]);

  useEffect(() => {
    if (visibleRewards.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleRewards.some((item) => item.id === selectedId)) {
      setSelectedId(visibleRewards[0].id);
    }
  }, [selectedId, visibleRewards]);

  const selected =
    visibleRewards.find((item) => item.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.tabs} role="tablist" aria-label="商品分类">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              className={cn(styles.tab, category === tab.key && styles.tabActive)}
              onClick={() => setCategory(tab.key)}
            >
              {tab.label}
              <span className={styles.tabCount}>{categoryCounts[tab.key]}</span>
            </button>
          ))}
        </div>

        <div className={styles.filterStrip}>
          <div className={styles.filterLeft}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={affordableOnly}
                onChange={(event) => setAffordableOnly(event.target.checked)}
              />
              仅显示买得起
            </label>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={wishOnly}
                onChange={(event) => setWishOnly(event.target.checked)}
              />
              仅看祈愿池
            </label>
            <select
              className={styles.sortSelect}
              aria-label="商品排序"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
            >
              <option value="recommended">推荐排序</option>
              <option value="money-low">Money 从低到高</option>
              <option value="gold-low">Gold 从低到高</option>
              <option value="newest">最新创建</option>
            </select>
          </div>
          <div className={styles.filterRight}>
            <span className={styles.balanceChip} data-tone="money">
              <WalletCards size={14} />
              <strong>{formatMoney(flexibleBalance)}</strong>
            </span>
            <span className={styles.balanceChip} data-tone="gold">
              <Coins size={14} />
              <strong>{gold.toLocaleString()}</strong>
            </span>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setEditing("new")}
            >
              <Plus size={15} />
              新建商品
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className={styles.error}>{(error as Error).message}</div>
      ) : (
        <div className={styles.mainRow}>
          <section className={styles.gridPane}>
            <div className={styles.grid}>
              {isLoading ? (
                <div className={styles.loading}>加载中…</div>
              ) : visibleRewards.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>这里还没有商品</p>
                  <p className={styles.emptyDesc}>
                    {wishOnly || affordableOnly
                      ? "当前筛选下没有商品，试试放宽条件。"
                      : "创建第一件商品，开始安排奖励。"}
                  </p>
                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => setEditing("new")}
                  >
                    <Plus size={15} />
                    新建商品
                  </button>
                </div>
              ) : (
                visibleRewards.map((reward) => (
                  <ProductCard
                    key={reward.id}
                    reward={reward}
                    selected={reward.id === selectedId}
                    onClick={() => setSelectedId(reward.id)}
                  />
                ))
              )}
            </div>
          </section>

          <DetailPanel
            reward={selected}
            gold={gold}
            money={flexibleBalance}
            onEdit={() => selected && setEditing(selected)}
            onPurchase={() => selected && setPurchasing(selected)}
          />
        </div>
      )}

      <div className={styles.bottomRow}>
        <div className={styles.tips}>
          <h2 className={styles.tipsTitle}>商店小贴士</h2>
          <p className={styles.tipsCopy}>
            用金币兑换真正想要的奖励。Money 走流动资金池，Gold 来自日常行动积累；买下后会出现在背包里兑现。
          </p>
        </div>
        <Link href="/inventory" className={styles.bagLink}>
          <Backpack size={16} />
          打开背包
        </Link>
      </div>

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

function ProductCard({
  reward,
  selected,
  onClick,
}: {
  reward: RewardItemDTO;
  selected: boolean;
  onClick: () => void;
}) {
  const tier = TIER_META[reward.tier];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(styles.card, selected && styles.cardSelected)}
      style={
        {
          "--rarity-color": tier.color,
          "--rarity-glow": tier.glow,
        } as CSSProperties
      }
    >
      {reward.inGachaPool ? (
        <span className={styles.cardWish} title="已加入祈愿池">
          ★
        </span>
      ) : null}
      <span className={styles.cardPrice}>{reward.costGold}G</span>
      <div className={styles.cardVisual}>
        {reward.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.imageUrl} alt={reward.name} />
        ) : (
          <span>{reward.emoji || "🎁"}</span>
        )}
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardName}>{reward.name}</span>
        <span className={styles.cardRarity}>{tier.label}</span>
      </div>
    </button>
  );
}

function DetailPanel({
  reward,
  gold,
  money,
  onEdit,
  onPurchase,
}: {
  reward: RewardItemDTO | null;
  gold: number;
  money: number;
  onEdit: () => void;
  onPurchase: () => void;
}) {
  if (!reward) {
    return (
      <aside className={styles.detail}>
        <div className={styles.detailEmpty}>选择一件商品查看详情。</div>
      </aside>
    );
  }

  const tier = TIER_META[reward.tier];
  const moneyShort = Math.max(0, reward.costMoneyCents - money);
  const goldShort = Math.max(0, reward.costGold - gold);
  const canPurchase = moneyShort === 0 && goldShort === 0;

  return (
    <aside className={styles.detail}>
      <div className={styles.detailHead}>
        <div>
          <h2 className={styles.detailTitle}>{reward.name}</h2>
          <span
            className={styles.detailTag}
            style={{ "--rarity-color": tier.color } as CSSProperties}
          >
            {tier.label}
          </span>
          <span className={`${styles.detailTag} ${styles.detailTagSoft}`}>
            {CATEGORY_LABEL[reward.category]}
          </span>
        </div>
        <button
          type="button"
          className={styles.detailEdit}
          onClick={onEdit}
          title="编辑商品"
          aria-label="编辑商品"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className={styles.detailPreviewRow}>
        <div className={styles.detailThumb}>
          {reward.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reward.imageUrl} alt={reward.name} />
          ) : (
            <span>{reward.emoji || "🎁"}</span>
          )}
        </div>
        <div className={styles.detailStats}>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>Money</span>
            <span className={styles.detailStatValue}>
              {formatMoney(reward.costMoneyCents)}
            </span>
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>Gold</span>
            <span className={styles.detailStatValue}>
              {reward.costGold.toLocaleString()}
            </span>
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>祈愿池</span>
            <span className={styles.detailStatValue}>
              {reward.inGachaPool ? `权重 ${reward.weight}` : "未加入"}
            </span>
          </div>
        </div>
      </div>

      <p className={styles.detailDesc}>
        {reward.description || "暂无说明，买下后可在背包中兑现。"}
      </p>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>购买条件</h3>
        <p className={`${styles.affordNote} ${canPurchase ? styles.affordOk : styles.affordBad}`}>
          {canPurchase
            ? "余额充足，可以兑换。"
            : moneyShort > 0 && goldShort > 0
              ? `还差 ${formatMoney(moneyShort)} 与 ${goldShort} Gold`
              : moneyShort > 0
                ? `还差 ${formatMoney(moneyShort)}`
                : `还差 ${goldShort} Gold`}
        </p>
      </div>

      <div className={styles.detailActions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={onPurchase}
          disabled={!canPurchase}
        >
          {canPurchase ? <Gift size={15} /> : <WalletCards size={15} />}
          {canPurchase ? "购买" : "余额不足"}
        </button>
        <button type="button" className={styles.btnSecondary} onClick={onEdit}>
          <Pencil size={15} />
          编辑商品
        </button>
      </div>
    </aside>
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
      <div className={styles.fieldGrid}>
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
        <p className={styles.warnBox}>
          请先完成钱包初始化和本月结转，再购买需要 money 的商品。
        </p>
      ) : null}
      {error ? <p className={styles.dialogError} role="alert">{error}</p> : null}
      <div className={styles.dialogActions}>
        <Button variant="outline" onClick={onClose} disabled={purchase.isPending}>
          取消
        </Button>
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
    <div className={styles.priceRow}>
      <span style={{ color: enough ? "#8a6a12" : "#c5554a" }}>{icon}</span>
      <div>
        <div className={styles.priceLabel}>{label}</div>
        <div className={styles.priceCost}>-{cost}</div>
      </div>
      <div className={styles.priceAfter}>
        购买后
        <div style={{ color: enough ? "#15231c" : "#c5554a", marginTop: 2, fontFamily: "var(--font-geist-mono), monospace" }}>
          {after}
        </div>
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
    if (!Number.isFinite(costMoneyCents) || costMoneyCents < 0) {
      return setError("请输入有效的 money 金额");
    }
    if (costMoneyCents === 0 && costGold === 0) return setError("money 和 gold 不能同时为 0");
    if (category === "physical_small" && costMoneyCents >= 50_000) {
      return setError("小额实物必须低于 500 元");
    }
    if (category === "physical_large" && costMoneyCents < 50_000) {
      return setError("大额实物必须大于等于 500 元");
    }

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
      <div className={`${styles.productForm}`}>
        <ImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          fallbackEmoji={emoji}
          label="商品图片"
          hint="用于商店、祈愿和背包"
        />
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGrid} style={{ gridTemplateColumns: "72px 1fr" }}>
            <div className={styles.field}>
              <label>Emoji</label>
              <Input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={8} />
            </div>
            <div className={styles.field}>
              <label>商品名称</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            </div>
          </div>
          <div className={styles.field}>
            <label>说明</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`} style={{ marginTop: 14 }}>
        <div className={styles.field}>
          <label>商品分类</label>
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as RewardCategory)}
          >
            <option value="virtual">虚拟商品</option>
            <option value="physical_small">小额实物 · 小于 500 元</option>
            <option value="physical_large">大额实物 · 大于等于 500 元</option>
          </Select>
        </div>
        <div className={styles.field}>
          <label>祈愿稀有度</label>
          <Select
            value={tier}
            onChange={(event) => setTier(event.target.value as RewardItemDTO["tier"])}
          >
            <option value="common">三星 · 通常</option>
            <option value="rare">四星 · 稀有</option>
            <option value="epic">四星 · 精选</option>
            <option value="legendary">五星 · 传说</option>
          </Select>
        </div>
        <div className={styles.field}>
          <label>Money · 人民币元</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={moneyYuan}
            onChange={(event) => setMoneyYuan(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>Gold</label>
          <Input
            type="number"
            min={0}
            value={costGold}
            onChange={(event) => setCostGold(Number(event.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label>祈愿池</label>
          <label className={styles.checkLabel} style={{ height: 36, padding: "0 10px", border: "1px solid #d9dcc3", borderRadius: 6, background: "#fff" }}>
            <Checkbox
              checked={inGachaPool}
              onCheckedChange={(value) => setInGachaPool(value === true)}
            />
            加入当前祈愿池
          </label>
        </div>
        <div className={styles.field}>
          <label>池内权重</label>
          <Input
            type="number"
            min={1}
            max={10}
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
            disabled={!inGachaPool}
          />
        </div>
      </div>

      {error ? <p className={styles.dialogError} role="alert">{error}</p> : null}
      <div className={styles.dialogActions} style={{ justifyContent: "space-between" }}>
        <div>
          {reward ? (
            <Button variant="danger" onClick={() => void archiveReward()} disabled={pending}>
              <Archive size={15} /> 归档
            </Button>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            取消
          </Button>
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
    <div
      className={styles.dialogBackdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(styles.dialogPanel, wide && styles.dialogPanelWide)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.dialogHead}>
          <h2 className={styles.dialogTitle}>{title}</h2>
          <button
            type="button"
            className={styles.dialogClose}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        {children}
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
