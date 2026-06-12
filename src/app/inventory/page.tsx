"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import {
  Backpack,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  Frame,
  Gem,
  Gift,
  Shield,
  Snowflake,
  Ticket,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import {
  useEquipFrame,
  useEquipTitle,
  useInventory,
  useUpdateInventoryReward,
} from "@/hooks/queries";
import type {
  EquipmentItemDTO,
  InventoryAchievementDTO,
  InventoryRewardInstanceDTO,
  InventoryRewardStatus,
  RewardItemDTO,
  TitleDTO,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Category = "all" | "resources" | "rewards" | "equipment" | "titles" | "achievements";
type RewardTier = RewardItemDTO["tier"];
type RewardSourceFilter = "all" | "store" | "gacha";
type RewardStatusFilter = "all" | InventoryRewardStatus;
type RewardTierFilter = "all" | RewardTier;

type InventoryRow =
  | {
      id: string;
      kind: "resource";
      title: string;
      subtitle: string;
      value: string;
      icon: ReactNode;
      imageSrc: string;
      tone: string;
    }
  | { id: string; kind: "reward"; reward: InventoryRewardInstanceDTO }
  | { id: string; kind: "equipment"; item: EquipmentItemDTO }
  | { id: string; kind: "title"; item: TitleDTO }
  | { id: string; kind: "achievement"; item: InventoryAchievementDTO };

const CATEGORIES: Array<{ key: Category; cn: string; en: string; icon: typeof Backpack }> = [
  { key: "all", cn: "全部", en: "All", icon: Backpack },
  { key: "resources", cn: "资源", en: "Resources", icon: Coins },
  { key: "rewards", cn: "奖品", en: "Rewards", icon: Gift },
  { key: "equipment", cn: "装备", en: "Equipment", icon: Frame },
  { key: "titles", cn: "称号", en: "Titles", icon: Crown },
  { key: "achievements", cn: "成就", en: "Achievements", icon: Trophy },
];

const STATUS_LABEL: Record<InventoryRewardStatus, string> = {
  available: "可用",
  used: "已使用",
  discarded: "已丢弃",
};

const SOURCE_LABEL: Record<InventoryRewardInstanceDTO["source"], string> = {
  store: "商店",
  gacha: "祈愿",
};

const REWARD_TIER_LABEL: Record<RewardTier, string> = {
  common: "通常",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

const TITLE_TIER_LABEL: Record<TitleDTO["tier"], string> = {
  bronze: "铜",
  silver: "银",
  gold: "金",
  legendary: "传说",
};

const ACHIEVEMENT_TIER_LABEL: Record<InventoryAchievementDTO["tier"], string> = {
  bronze: "铜",
  silver: "银",
  gold: "金",
  legendary: "传说",
};

const REWARD_TIER_COLOR: Record<RewardTier, string> = {
  common: "#8f98a8",
  rare: "#3a6b8e",
  epic: "#9b6bc1",
  legendary: "var(--gold-deep)",
};

const STATUS_TONE: Record<InventoryRewardStatus, string> = {
  available: "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]",
  used: "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]",
  discarded: "border-[var(--danger)]/35 bg-[var(--danger)]/10 text-[var(--danger)]",
};

const INVENTORY_CAPACITY = 1000;

export default function InventoryPage() {
  const { data, isLoading, isError, error } = useInventory();
  const [category, setCategory] = useState<Category>("all");
  const [statusFilter, setStatusFilter] = useState<RewardStatusFilter>("available");
  const [sourceFilter, setSourceFilter] = useState<RewardSourceFilter>("all");
  const [tierFilter, setTierFilter] = useState<RewardTierFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    reward: InventoryRewardInstanceDTO;
    action: "use" | "discard";
  } | null>(null);

  const rows = useMemo<InventoryRow[]>(() => {
    if (!data) return [];

    const resources: InventoryRow[] = [
      {
        id: "resource:gold",
        kind: "resource",
        title: "Gold",
        subtitle: "金币 · 完成行动获得",
        value: data.currency.gold.toLocaleString(),
        icon: <Coins size={18} />,
        imageSrc: "/lifeos/inventory/resource-gold.png",
        tone: "text-[var(--attr-gold)]",
      },
      {
        id: "resource:gems",
        kind: "resource",
        title: "Gems",
        subtitle: "宝石 · 高价值奖励",
        value: data.currency.gems.toLocaleString(),
        icon: <Gem size={18} />,
        imageSrc: "/lifeos/inventory/resource-gems.png",
        tone: "text-[var(--attr-cha)]",
      },
      {
        id: "resource:fate",
        kind: "resource",
        title: "Fate",
        subtitle: "命运券 · 用于祈愿",
        value: data.currency.fate.toLocaleString(),
        icon: <Ticket size={18} />,
        imageSrc: "/lifeos/inventory/resource-fate.png",
        tone: "text-[var(--attr-cre)]",
      },
      {
        id: "resource:freeze",
        kind: "resource",
        title: "Streak Freeze",
        subtitle: `已使用 ${data.freeze.totalUsed} 次`,
        value: data.freeze.count.toLocaleString(),
        icon: <Snowflake size={18} />,
        imageSrc: "/lifeos/inventory/resource-freeze.png",
        tone: "text-[#3a6b8e]",
      },
    ];

    const rewards = data.rewards
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => sourceFilter === "all" || item.source === sourceFilter)
      .filter((item) => tierFilter === "all" || item.reward.tier === tierFilter)
      .map((reward): InventoryRow => ({ id: `reward:${reward.id}`, kind: "reward", reward }));
    const equipment = data.equipment.items.map(
      (item): InventoryRow => ({ id: `equipment:${item.key}`, kind: "equipment", item }),
    );
    const titles = data.titles.items.map(
      (item): InventoryRow => ({ id: `title:${item.key}`, kind: "title", item }),
    );
    const achievements = data.achievements.items.map(
      (item): InventoryRow => ({ id: `achievement:${item.id}`, kind: "achievement", item }),
    );

    if (category === "resources") return resources;
    if (category === "rewards") return rewards;
    if (category === "equipment") return equipment;
    if (category === "titles") return titles;
    if (category === "achievements") return achievements;
    return [...resources, ...rewards, ...equipment, ...titles, ...achievements];
  }, [category, data, sourceFilter, statusFilter, tierFilter]);

  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const counts = useMemo(() => {
    if (!data) {
      return {
        all: 0,
        resources: 0,
        rewards: 0,
        equipment: 0,
        titles: 0,
        achievements: 0,
      };
    }
    const resourceCount = 4;
    return {
      all:
        resourceCount +
        data.rewards.length +
        data.equipment.items.length +
        data.titles.items.length +
        data.achievements.items.length,
      resources: resourceCount,
      rewards: data.rewards.length,
      equipment: data.equipment.items.length,
      titles: data.titles.items.length,
      achievements: data.achievements.items.length,
    };
  }, [data]);

  const activeCategory = CATEGORIES.find((item) => item.key === category) ?? CATEGORIES[0];

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-8">
      <section className="relative overflow-hidden rounded-sm border border-[var(--gold)]/55 bg-[linear-gradient(135deg,rgba(255,252,242,0.2)_0%,rgba(64,91,122,0.14)_42%,rgba(7,20,36,0.22)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24),inset_0_0_0_6px_rgba(255,251,240,0.06),0_26px_80px_-42px_rgba(4,12,24,0.9)] backdrop-blur-[6px]">
        <header className="flex flex-col gap-4 border-b border-[var(--gold)]/38 bg-[rgba(255,252,242,0.4)] px-4 py-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.3)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-[var(--gold)]/60 bg-[linear-gradient(145deg,rgba(42,54,72,0.94),rgba(18,30,48,0.9))] text-[var(--gold-pale)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_12px_24px_-18px_rgba(4,12,24,0.8)]">
              <Backpack size={23} />
            </div>
            <div>
              <div className="section-label">
                <span className="cn text-2xl">背包</span>
                <span className="en text-[11px]">Inventory</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
                <span className="font-display text-[13px] font-bold text-[var(--fg-strong)]">
                  {activeCategory.cn}
                </span>
                <span className="font-mono text-[var(--gold-deep)]">
                  {rows.length}/{INVENTORY_CAPACITY}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[560px]">
            <CurrencyCapsule
              label="Gold"
              value={data?.currency.gold ?? 0}
              icon={<Coins size={16} />}
              imageSrc="/lifeos/inventory/resource-gold.png"
              tone="text-[var(--attr-gold)]"
            />
            <CurrencyCapsule
              label="Fate"
              value={data?.currency.fate ?? 0}
              icon={<Ticket size={16} />}
              imageSrc="/lifeos/inventory/resource-fate.png"
              tone="text-[var(--attr-cre)]"
            />
            <CurrencyCapsule
              label="Gems"
              value={data?.currency.gems ?? 0}
              icon={<Gem size={16} />}
              imageSrc="/lifeos/inventory/resource-gems.png"
              tone="text-[var(--attr-cha)]"
            />
          </div>
        </header>

        {isError ? (
          <div className="p-6 text-sm text-[var(--danger)]">
            {(error as Error).message}
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-190px)] grid-cols-[68px_minmax(0,1fr)] bg-transparent xl:grid-cols-[82px_minmax(0,1fr)_420px]">
            <CategoryRail
              category={category}
              counts={counts}
              onChange={(next) => {
                setCategory(next);
                setSelectedId(null);
              }}
            />

            <section className="relative min-w-0 overflow-hidden border-l border-[var(--gold)]/28 bg-[rgba(10,24,42,0.12)] p-4 shadow-[inset_1px_0_0_rgba(255,255,255,0.18),inset_-1px_0_0_rgba(138,104,32,0.16)] backdrop-blur-[2px] xl:border-r">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(232,201,119,0.13)_1px,transparent_1px),linear-gradient(180deg,rgba(232,201,119,0.09)_1px,transparent_1px)] bg-[length:36px_36px] opacity-45" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_24%_0%,rgba(255,255,255,0.26),transparent_48%)]" />
              <div className="relative z-10 mb-4 flex flex-col gap-3 rounded-sm border border-[var(--gold)]/28 bg-[rgba(255,252,242,0.28)] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),0_14px_34px_-30px_rgba(4,12,24,0.82)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-display text-[20px] font-bold leading-none text-[var(--fg-strong)]">
                    {activeCategory.cn}
                  </div>
                  <div className="mt-1 font-display-en text-[9px] text-[var(--gold-deep)]">
                    {rows.length} ITEMS
                  </div>
                </div>
                {(category === "rewards" || category === "all") && (
                  <InventoryFilters
                    statusFilter={statusFilter}
                    sourceFilter={sourceFilter}
                    tierFilter={tierFilter}
                    onStatusChange={setStatusFilter}
                    onSourceChange={setSourceFilter}
                    onTierChange={setTierFilter}
                  />
                )}
              </div>

              <div className="relative z-10 grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 2xl:grid-cols-[repeat(auto-fill,minmax(124px,1fr))]">
                {isLoading ? (
                  <div className="col-span-full rounded-sm border border-dashed border-[var(--gold)]/48 bg-[rgba(13,28,47,0.28)] py-20 text-center text-sm text-[var(--fg-on-ink)]/82 backdrop-blur-md">
                    Loading...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="col-span-full rounded-sm border border-dashed border-[var(--gold)]/48 bg-[rgba(13,28,47,0.28)] py-20 text-center text-sm text-[var(--fg-on-ink)]/82 backdrop-blur-md">
                    当前分类没有物品。
                  </div>
                ) : (
                  rows.map((row) => (
                    <InventoryGridCard
                      key={row.id}
                      row={row}
                      selected={selected?.id === row.id}
                      onClick={() => setSelectedId(row.id)}
                    />
                  ))
                )}
              </div>
            </section>

            <DetailPanel
              selected={selected}
              onRewardAction={(reward, action) => setPendingAction({ reward, action })}
            />
          </div>
        )}
      </section>

      {pendingAction && (
        <RewardActionDialog
          reward={pendingAction.reward}
          action={pendingAction.action}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}

function CurrencyCapsule({
  label,
  value,
  icon,
  imageSrc,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  imageSrc?: string;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-sm border border-[var(--gold)]/45 bg-[rgba(255,252,242,0.54)] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24),0_14px_28px_-24px_rgba(4,12,24,0.9)] backdrop-blur-xl">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center overflow-hidden border border-[var(--gold)]/48 bg-[rgba(255,252,242,0.28)] shadow-[0_8px_18px_-14px_rgba(4,12,24,0.85)]",
          imageSrc ? "rounded-sm" : "rounded-full",
          tone,
        )}
      >
        {imageSrc ? (
          <Image src={imageSrc} alt="" width={72} height={72} className="h-full w-full object-cover" />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0">
        <div className="font-display-en text-[8px] text-[var(--gold-deep)]">{label}</div>
        <div className="truncate font-mono text-[20px] font-bold leading-none text-[var(--fg-strong)] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function CategoryRail({
  category,
  counts,
  onChange,
}: {
  category: Category;
  counts: Record<Category, number>;
  onChange: (category: Category) => void;
}) {
  return (
    <aside className="flex flex-col items-center gap-2 border-r border-[var(--gold)]/32 bg-[rgba(13,27,45,0.42)] px-2 py-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      {CATEGORIES.map((item) => {
        const Icon = item.icon;
        const active = item.key === category;
        return (
          <button
            key={item.key}
            type="button"
            title={`${item.cn} · ${counts[item.key]}`}
            aria-label={`${item.cn} ${counts[item.key]}`}
            onClick={() => onChange(item.key)}
            className={cn(
              "group relative grid h-12 w-12 place-items-center rounded-sm border transition-all",
              active
                ? "border-[var(--gold)] bg-[rgba(255,252,242,0.18)] text-[var(--gold-pale)] shadow-[0_0_0_2px_rgba(232,201,119,0.18),0_12px_28px_-20px_rgba(0,0,0,0.9)]"
                : "border-transparent text-[var(--gold-pale)]/64 hover:border-[var(--gold)]/45 hover:bg-white/10 hover:text-[var(--gold-pale)]",
            )}
          >
            <Icon size={22} />
            <span
              className={cn(
                "absolute -right-1 -top-1 min-w-5 rounded-full border px-1 font-mono text-[9px]",
                active
                  ? "border-[var(--gold)] bg-[var(--gold-pale)] text-[var(--bg-panel-ink)]"
                  : "border-[var(--gold)]/28 bg-[rgba(255,252,242,0.92)] text-[var(--gold-deep)]",
              )}
            >
              {counts[item.key]}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function InventoryFilters({
  statusFilter,
  sourceFilter,
  tierFilter,
  onStatusChange,
  onSourceChange,
  onTierChange,
}: {
  statusFilter: RewardStatusFilter;
  sourceFilter: RewardSourceFilter;
  tierFilter: RewardTierFilter;
  onStatusChange: (value: RewardStatusFilter) => void;
  onSourceChange: (value: RewardSourceFilter) => void;
  onTierChange: (value: RewardTierFilter) => void;
}) {
  const selectClassName =
    "border-[var(--gold)]/35 bg-[rgba(24,38,58,0.7)] text-[var(--fg-on-ink)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]";

  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:w-[520px]">
      <Select
        value={statusFilter}
        className={selectClassName}
        onChange={(event) => onStatusChange(event.target.value as RewardStatusFilter)}
      >
        <option value="available">可用</option>
        <option value="used">已使用</option>
        <option value="discarded">已丢弃</option>
        <option value="all">全部状态</option>
      </Select>
      <Select
        value={sourceFilter}
        className={selectClassName}
        onChange={(event) => onSourceChange(event.target.value as RewardSourceFilter)}
      >
        <option value="all">全部来源</option>
        <option value="store">商店</option>
        <option value="gacha">祈愿</option>
      </Select>
      <Select
        value={tierFilter}
        className={selectClassName}
        onChange={(event) => onTierChange(event.target.value as RewardTierFilter)}
      >
        <option value="all">全部稀有度</option>
        <option value="common">通常</option>
        <option value="rare">稀有</option>
        <option value="epic">史诗</option>
        <option value="legendary">传说</option>
      </Select>
    </div>
  );
}

function InventoryGridCard({
  row,
  selected,
  onClick,
}: {
  row: InventoryRow;
  selected: boolean;
  onClick: () => void;
}) {
  const content = rowContent(row);
  const quantity = rowQuantity(row);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative aspect-square min-h-[104px] overflow-hidden rounded-sm border bg-[rgba(12,27,46,0.34)] p-2 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),inset_0_-18px_34px_rgba(4,12,24,0.18),0_16px_34px_-26px_rgba(4,12,24,0.88)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[var(--gold)] hover:bg-[rgba(18,34,55,0.46)]",
        selected
          ? "border-[var(--gold)] bg-[rgba(26,42,63,0.5)] shadow-[0_0_0_2px_rgba(232,201,119,0.42),0_0_30px_rgba(212,169,77,0.2),0_18px_40px_-26px_rgba(7,20,36,0.9)]"
          : "border-[rgba(232,201,119,0.34)]",
      )}
    >
      <div className="pointer-events-none absolute inset-1 rounded-[2px] border border-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2">
        <span className="min-w-0 truncate rounded-sm border border-[var(--gold)]/32 bg-[rgba(255,252,242,0.9)] px-1.5 py-0.5 font-display text-[11px] font-bold leading-none text-[var(--fg-strong)] shadow-[0_8px_18px_-16px_rgba(4,12,24,0.75)] backdrop-blur-md">
          {content.title}
        </span>
        <span className="rounded-sm border border-[var(--gold)]/20 bg-[rgba(28,40,58,0.9)] px-1.5 py-0.5 font-mono text-[12px] font-bold leading-none text-[var(--gold-pale)]">
          {quantity}
        </span>
      </div>
      <div className="absolute left-2 top-2 z-10">
        {rowKindIcon(row)}
      </div>
      <div className="grid h-full place-items-center pb-7 pt-4">
        <div className="grid h-[74%] min-h-16 w-[80%] max-w-28 place-items-center overflow-hidden rounded-sm border border-[var(--gold)]/42 bg-[rgba(255,252,242,0.24)] text-[34px] shadow-[inset_0_0_18px_rgba(255,252,242,0.16),0_12px_26px_-22px_rgba(4,12,24,0.95)] backdrop-blur-sm transition-transform group-hover:scale-[1.05]">
          {content.visual}
        </div>
      </div>
    </button>
  );
}

function rowQuantity(row: InventoryRow) {
  if (row.kind === "resource") return row.value;
  if (row.kind === "reward") return "1";
  if (row.kind === "equipment") return row.item.equipped ? "E" : "1";
  if (row.kind === "title") return row.item.equipped ? "E" : "1";
  return "1";
}

function rowKindIcon(row: InventoryRow) {
  if (row.kind === "resource") return <Chip>RES</Chip>;
  if (row.kind === "reward") return <Chip style={{ color: REWARD_TIER_COLOR[row.reward.reward.tier] }}>{REWARD_TIER_LABEL[row.reward.reward.tier]}</Chip>;
  if (row.kind === "equipment") return <Chip>{row.item.tier}</Chip>;
  if (row.kind === "title") return <Chip>{TITLE_TIER_LABEL[row.item.tier]}</Chip>;
  return <Chip>{ACHIEVEMENT_TIER_LABEL[row.item.tier]}</Chip>;
}

function rowContent(row: InventoryRow) {
  if (row.kind === "resource") {
    return {
      visual: (
        <Image
          src={row.imageSrc}
          alt=""
          width={160}
          height={160}
          className="h-full w-full object-cover"
        />
      ),
      title: row.id === "resource:freeze" ? "Freeze" : row.title,
      subtitle: row.subtitle,
      chips: <Chip>RESOURCE</Chip>,
      trailing: <div className={`font-mono text-lg font-bold ${row.tone}`}>{row.value}</div>,
    };
  }
  if (row.kind === "reward") {
    const reward = row.reward.reward;
    return {
      visual: reward.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={reward.imageUrl} alt={reward.name} className="h-full w-full object-cover" />
      ) : (
        reward.emoji
      ),
      title: reward.name,
      subtitle: `${SOURCE_LABEL[row.reward.source]} · ${formatDate(row.reward.redeemedAt)}`,
      chips: (
        <>
          <Chip style={{ color: REWARD_TIER_COLOR[reward.tier] }}>{REWARD_TIER_LABEL[reward.tier]}</Chip>
          <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${STATUS_TONE[row.reward.status]}`}>
            {STATUS_LABEL[row.reward.status]}
          </span>
          {reward.archived && <Chip>已归档</Chip>}
        </>
      ),
      trailing: <Gift size={18} className="text-[var(--gold-deep)]" />,
    };
  }
  if (row.kind === "equipment") {
    return {
      visual: <Frame size={20} className="text-[var(--gold-deep)]" />,
      title: row.item.name,
      subtitle: `${row.item.slot} · ${row.item.source}`,
      chips: (
        <>
          <Chip>{row.item.tier}</Chip>
          {row.item.equipped && <Chip>Equipped</Chip>}
        </>
      ),
      trailing: row.item.equipped ? <Check size={18} className="text-[var(--success)]" /> : <Shield size={18} className="text-[var(--fg-muted)]" />,
    };
  }
  if (row.kind === "title") {
    return {
      visual: row.item.emoji,
      title: row.item.name,
      subtitle: `来自成就 · ${row.item.sourceAchievement.name}`,
      chips: (
        <>
          <Chip>{TITLE_TIER_LABEL[row.item.tier]}</Chip>
          {row.item.equipped && <Chip>Equipped</Chip>}
        </>
      ),
      trailing: <Crown size={18} className={row.item.equipped ? "text-[var(--gold-deep)]" : "text-[var(--fg-muted)]"} />,
    };
  }
  return {
    visual: row.item.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={row.item.imageUrl} alt={row.item.name} className="h-full w-full object-cover" />
    ) : (
      row.item.emoji
    ),
    title: row.item.name,
    subtitle: `${row.item.category} · ${formatDate(row.item.unlockedAt)}`,
    chips: (
      <>
        <Chip>{ACHIEVEMENT_TIER_LABEL[row.item.tier]}</Chip>
        {row.item.isCustom && <Chip>Custom</Chip>}
      </>
    ),
    trailing: <Trophy size={18} className="text-[var(--gold-deep)]" />,
  };
}

function DetailPanel({
  selected,
  onRewardAction,
}: {
  selected: InventoryRow | null;
  onRewardAction: (reward: InventoryRewardInstanceDTO, action: "use" | "discard") => void;
}) {
  const equipFrame = useEquipFrame();
  const equipTitle = useEquipTitle();

  return (
    <aside className="col-span-2 min-h-[360px] rounded-none border border-y-0 border-r-0 border-[var(--gold)]/42 bg-[rgba(15,29,48,0.54)] p-5 text-[var(--fg-on-ink)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_24px_0_60px_rgba(255,255,255,0.04)] backdrop-blur-xl xl:col-span-1 xl:min-h-full">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--gold)]/35 pb-3">
        <div>
          <div className="font-display text-[15px] font-bold text-[var(--fg-on-ink)]">详情</div>
          <div className="font-display-en text-[9px] text-[var(--gold-pale)]">Details</div>
        </div>
        <Backpack size={18} className="text-[var(--gold-pale)]" />
      </div>

      {!selected ? (
        <div className="py-16 text-center text-sm text-[var(--fg-on-ink)]/65">
          选择一个物品查看详情。
        </div>
      ) : selected.kind === "resource" ? (
        <ResourceDetail row={selected} />
      ) : selected.kind === "reward" ? (
        <RewardDetail row={selected.reward} onAction={onRewardAction} />
      ) : selected.kind === "equipment" ? (
        <EquipmentDetail
          item={selected.item}
          busy={equipFrame.isPending}
          onEquip={() => equipFrame.mutate(selected.item.equipped ? null : selected.item.key)}
        />
      ) : selected.kind === "title" ? (
        <TitleDetail
          item={selected.item}
          busy={equipTitle.isPending}
          onEquip={() => equipTitle.mutate(selected.item.equipped ? null : selected.item.key)}
        />
      ) : (
        <AchievementDetail item={selected.item} />
      )}
    </aside>
  );
}

function ResourceDetail({ row }: { row: Extract<InventoryRow, { kind: "resource" }> }) {
  return (
    <div>
      <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-sm border border-[var(--gold)]/55 bg-white/10 shadow-[0_16px_34px_-24px_rgba(4,12,24,0.9)]">
        <Image
          src={row.imageSrc}
          alt={row.title}
          width={192}
          height={192}
          className="h-full w-full object-cover"
        />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-[var(--fg-on-ink)]">{row.title}</h2>
      <p className="mt-1 text-sm text-[var(--fg-on-ink)]/70">{row.subtitle}</p>
      <InfoLine label="数量" value={row.value} />
      <div className="mt-5 rounded-sm border border-[var(--gold)]/25 bg-white/5 p-3 text-[12px] leading-6 text-[var(--fg-on-ink)]/72">
        资源类物品只在背包内展示余额，不支持手动调整或丢弃。
      </div>
    </div>
  );
}

function RewardDetail({
  row,
  onAction,
}: {
  row: InventoryRewardInstanceDTO;
  onAction: (reward: InventoryRewardInstanceDTO, action: "use" | "discard") => void;
}) {
  const reward = row.reward;
  return (
    <div>
      <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-sm border border-[var(--gold)]/70 bg-white/5 text-4xl">
        {reward.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.imageUrl} alt={reward.name} className="h-full w-full object-cover" />
        ) : (
          reward.emoji
        )}
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold leading-tight text-[var(--fg-on-ink)]">
        {reward.name}
      </h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`rounded-sm border px-2 py-1 text-[11px] ${STATUS_TONE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
        <Chip dark>{SOURCE_LABEL[row.source]}</Chip>
        <Chip dark>{REWARD_TIER_LABEL[reward.tier]}</Chip>
      </div>
      {reward.description && (
        <p className="mt-3 text-sm leading-6 text-[var(--fg-on-ink)]/74">{reward.description}</p>
      )}
      <InfoLine label="获得时间" value={formatDateTime(row.redeemedAt)} />
      <InfoLine label="花费" value={`${row.costGold} Gold / ${row.costGems} Gems`} />
      {row.usedAt && <InfoLine label="使用时间" value={formatDateTime(row.usedAt)} />}
      {row.discardedAt && <InfoLine label="丢弃时间" value={formatDateTime(row.discardedAt)} />}
      {row.note && <InfoLine label="备注" value={row.note} />}

      {row.status === "available" ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => onAction(row, "use")}>
            <CheckCircle2 size={15} />
            使用
          </Button>
          <Button variant="outline" onClick={() => onAction(row, "discard")}>
            <Trash2 size={15} />
            丢弃
          </Button>
        </div>
      ) : (
        <div className="mt-5 rounded-sm border border-[var(--gold)]/25 bg-white/5 p-3 text-[12px] leading-6 text-[var(--fg-on-ink)]/72">
          这条奖品记录已归档为 {STATUS_LABEL[row.status]}，不会从历史中删除。
        </div>
      )}
    </div>
  );
}

function EquipmentDetail({ item, busy, onEquip }: { item: EquipmentItemDTO; busy: boolean; onEquip: () => void }) {
  return (
    <div>
      <div className="grid h-16 w-16 place-items-center rounded-sm border border-[var(--gold)]/60 bg-white/5 text-[var(--gold-pale)]">
        <Frame size={28} />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-[var(--fg-on-ink)]">{item.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--fg-on-ink)]/74">{item.description}</p>
      <InfoLine label="稀有度" value={item.tier} />
      <InfoLine label="来源" value={item.source} />
      {item.unlockedAt && <InfoLine label="解锁时间" value={formatDateTime(item.unlockedAt)} />}
      <Button className="mt-5 w-full" variant={item.equipped ? "outline" : "primary"} onClick={onEquip} disabled={busy}>
        {item.equipped ? "卸下" : "装备"}
      </Button>
    </div>
  );
}

function TitleDetail({ item, busy, onEquip }: { item: TitleDTO; busy: boolean; onEquip: () => void }) {
  return (
    <div>
      <div className="grid h-16 w-16 place-items-center rounded-sm border border-[var(--gold)]/60 bg-white/5 text-4xl">
        {item.emoji}
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-[var(--fg-on-ink)]">{item.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--fg-on-ink)]/74">{item.description}</p>
      <InfoLine label="阶级" value={TITLE_TIER_LABEL[item.tier]} />
      <InfoLine label="来自成就" value={item.sourceAchievement.name} />
      {item.unlockedAt && <InfoLine label="解锁时间" value={formatDateTime(item.unlockedAt)} />}
      <Button className="mt-5 w-full" variant={item.equipped ? "outline" : "primary"} onClick={onEquip} disabled={busy}>
        {item.equipped ? "卸下" : "装备"}
      </Button>
    </div>
  );
}

function AchievementDetail({ item }: { item: InventoryAchievementDTO }) {
  return (
    <div>
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-sm border border-[var(--gold)]/60 bg-white/5 text-4xl">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          item.emoji
        )}
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-[var(--fg-on-ink)]">{item.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--fg-on-ink)]/74">{item.description}</p>
      <InfoLine label="阶级" value={ACHIEVEMENT_TIER_LABEL[item.tier]} />
      <InfoLine label="分类" value={item.category} />
      <InfoLine label="解锁时间" value={formatDateTime(item.unlockedAt)} />
      <InfoLine label="奖励" value={`${item.reward.gold} Gold / ${item.reward.gems} Gems / ${item.reward.fate} Fate`} />
    </div>
  );
}

function RewardActionDialog({
  reward,
  action,
  onClose,
}: {
  reward: InventoryRewardInstanceDTO;
  action: "use" | "discard";
  onClose: () => void;
}) {
  const update = useUpdateInventoryReward();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label = action === "use" ? "使用" : "丢弃";

  const submit = async () => {
    setError(null);
    try {
      await update.mutateAsync({ id: reward.id, action, note });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4">
      <div className="panel-cream framed w-full max-w-md rounded-sm p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg font-bold text-[var(--fg-strong)]">
              {label}奖品
            </div>
            <div className="mt-1 text-sm text-[var(--fg-muted)]">
              {reward.reward.emoji} {reward.reward.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-[var(--gold-tint)]"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="备注（可选）"
          />
        </div>
        {error && <div className="mt-3 text-sm text-[var(--danger)]">{error}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            取消
          </Button>
          <Button variant={action === "use" ? "primary" : "secondary"} onClick={submit} disabled={update.isPending}>
            {action === "use" ? <CheckCircle2 size={15} /> : <Trash2 size={15} />}
            确认{label}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mt-4 border-t border-[var(--gold)]/20 pt-3">
      <div className="font-display-en text-[9px] uppercase text-[var(--gold-pale)]/75">{label}</div>
      <div className="mt-1 break-words text-sm text-[var(--fg-on-ink)]">{value}</div>
    </div>
  );
}

function Chip({
  children,
  dark,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "rounded-sm border px-1.5 py-0.5 font-display-en text-[10px]",
        dark
          ? "border-[var(--gold)]/40 bg-white/5 text-[var(--gold-pale)]"
          : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-subtle)]",
      )}
      style={style}
    >
      {children}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
