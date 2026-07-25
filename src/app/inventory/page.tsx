"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Lightbulb,
  Lock,
  Pencil,
  Store,
  Trash2,
  X,
} from "lucide-react";
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
  TitleDTO,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

type UiCategory = "all" | "resource" | "item" | "reward" | "collect";

type DisplayRarity = "common" | "good" | "rare" | "epic" | "legendary";

type InventoryItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  rarity: DisplayRarity;
  category: UiCategory;
  typeLabel: string;
  weight: number;
  equipped: boolean;
  usable: boolean;
  imageSrc: string | null;
  emoji: string;
  effects: string[];
  attrs: Array<{ label: string; value: string; tone?: "gold" | "green" }>;
  obtain: string;
  canUse: boolean;
  canEquip: boolean;
  kind: "resource" | "reward" | "equipment" | "title" | "achievement";
  reward?: InventoryRewardInstanceDTO;
  equipment?: EquipmentItemDTO;
  title?: TitleDTO;
  achievement?: InventoryAchievementDTO;
};

const TABS: Array<{ key: UiCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "resource", label: "资源" },
  { key: "item", label: "道具" },
  { key: "reward", label: "奖励" },
  { key: "collect", label: "收藏" },
];

const RARITY_META: Record<
  DisplayRarity,
  { label: string; color: string; glow: string }
> = {
  common: { label: "普通", color: "#8a918c", glow: "rgba(138, 145, 140, 0.28)" },
  good: { label: "优良", color: "#249d6d", glow: "rgba(36, 157, 109, 0.28)" },
  rare: { label: "稀有", color: "#3b82c4", glow: "rgba(59, 130, 196, 0.3)" },
  epic: { label: "史诗", color: "#8b6bb8", glow: "rgba(139, 107, 184, 0.3)" },
  legendary: { label: "传说", color: "#c9902c", glow: "rgba(201, 144, 44, 0.3)" },
};

const CAPACITY_MAX = 60;
/** v2: no auto-prefill; empty by default until the user assigns slots. */
const HOTBAR_STORAGE_KEY = "life-game-inventory-hotbar-v2";
const HOTBAR_SLOT_COUNT = 6;

type HotbarState = {
  preset: 0 | 1;
  presets: [Array<string | null>, Array<string | null>];
};

const EMPTY_PRESET = (): Array<string | null> =>
  Array.from({ length: HOTBAR_SLOT_COUNT }, () => null);

function defaultHotbar(): HotbarState {
  return { preset: 0, presets: [EMPTY_PRESET(), EMPTY_PRESET()] };
}

function mapRewardTier(tier: string): DisplayRarity {
  if (tier === "legendary") return "legendary";
  if (tier === "epic") return "epic";
  if (tier === "rare") return "rare";
  return "common";
}

function mapTitleTier(tier: string): DisplayRarity {
  if (tier === "legendary") return "epic";
  if (tier === "gold") return "rare";
  if (tier === "silver") return "good";
  return "common";
}

function thematicIcon(kind: InventoryItem["kind"]) {
  switch (kind) {
    case "resource":
      return "/life-game/items/resource-gold.png";
    case "reward":
      return "/life-game/items/item-gift.png";
    case "equipment":
      return "/life-game/items/item-frame.png";
    case "title":
      return "/life-game/items/item-crown.png";
    case "achievement":
      return "/life-game/items/item-book.png";
    default:
      return null;
  }
}

function isThematicAsset(src: string | null | undefined) {
  if (!src) return false;
  return (
    src.startsWith("/life-game/") ||
    src.startsWith("/gacha/items/") ||
    src.endsWith(".svg")
  );
}

type InventoryData = NonNullable<ReturnType<typeof useInventory>["data"]>;

function resolveItemImage(
  kind: InventoryItem["kind"],
  imageSrc: string | null | undefined,
  resourceKey?: "gold" | "gems" | "fate" | "freeze",
) {
  if (resourceKey) return `/life-game/items/resource-${resourceKey}.png`;
  if (isThematicAsset(imageSrc)) return imageSrc!;
  return thematicIcon(kind) ?? null;
}

function buildItems(data: InventoryData): InventoryItem[] {
  const resources: InventoryItem[] = [
    {
      id: "resource:gold",
      name: "金币",
      description: "完成行动与挑战后获得的通用货币，可用于商店兑换与祈愿。",
      quantity: data.currency.gold,
      rarity: "good",
      category: "resource",
      typeLabel: "资源",
      weight: 0,
      equipped: false,
      usable: false,
      imageSrc: resolveItemImage("resource", null, "gold"),
      emoji: "🪙",
      effects: ["可在奖励商店兑换道具", "可用于祈愿抽取"],
      attrs: [
        { label: "流通", value: "通用", tone: "gold" },
        { label: "成长", value: "+日常", tone: "green" },
      ],
      obtain: "完成任务、成就与日常行动获得。",
      canUse: false,
      canEquip: false,
      kind: "resource",
    },
    {
      id: "resource:gems",
      name: "宝石",
      description: "成就与稀有奖励沉淀的珍贵结晶，象征长期坚持。",
      quantity: data.currency.gems,
      rarity: "rare",
      category: "resource",
      typeLabel: "资源",
      weight: 0,
      equipped: false,
      usable: false,
      imageSrc: resolveItemImage("resource", null, "gems"),
      emoji: "💎",
      effects: ["展示长期积累成果", "可用于高价值兑换（规划中）"],
      attrs: [
        { label: "坚持", value: "+稀有", tone: "gold" },
        { label: "收藏", value: "可见", tone: "green" },
      ],
      obtain: "解锁成就与特殊奖励时获得。",
      canUse: false,
      canEquip: false,
      kind: "resource",
    },
    {
      id: "resource:fate",
      name: "命运点",
      description: "通往未知邂逅的信物，投入祈愿池以换取随机奖励。",
      quantity: data.currency.fate,
      rarity: "epic",
      category: "resource",
      typeLabel: "资源",
      weight: 0,
      equipped: false,
      usable: true,
      imageSrc: resolveItemImage("resource", null, "fate"),
      emoji: "🎟️",
      effects: ["可前往祈愿页进行抽取", "稀有资源，建议按计划使用"],
      attrs: [
        { label: "机遇", value: "+随机", tone: "gold" },
        { label: "消耗", value: "祈愿", tone: "green" },
      ],
      obtain: "成就奖励与活动投放。",
      canUse: true,
      canEquip: false,
      kind: "resource",
    },
    {
      id: "resource:freeze",
      name: "冻结券",
      description: "短暂冻结日程压力的恢复道具，让节奏重新对齐。",
      quantity: data.freeze.count,
      rarity: "rare",
      category: "item",
      typeLabel: "道具",
      weight: 1,
      equipped: false,
      usable: data.freeze.count > 0,
      imageSrc: resolveItemImage("resource", null, "freeze"),
      emoji: "❄️",
      effects: [
        `当前可用 ${data.freeze.count} 次`,
        `历史已使用 ${data.freeze.totalUsed} 次`,
      ],
      attrs: [
        { label: "恢复", value: "节奏", tone: "gold" },
        { label: "缓冲", value: "+1日", tone: "green" },
      ],
      obtain: "商店兑换或活动奖励。",
      canUse: data.freeze.count > 0,
      canEquip: false,
      kind: "resource",
    },
  ];

  const rewards = data.rewards.map((row): InventoryItem => {
    const reward = row.reward;
    const usable = row.status === "available" || row.status === "pending_fulfillment";
    return {
      id: `reward:${row.id}`,
      name: reward.name,
      description:
        reward.description ||
        "旅途中兑换或祈愿获得的奖励道具，可在合适时机使用或兑现。",
      quantity: 1,
      rarity: mapRewardTier(reward.tier),
      category: "reward",
      typeLabel: "奖励",
      weight: Math.max(1, Math.round((reward.weight || 10) / 10)),
      equipped: false,
      usable,
      imageSrc: resolveItemImage("reward", reward.imageUrl),
      emoji: reward.emoji || "🎁",
      effects: [
        row.status === "pending_fulfillment"
          ? "待兑现：确认后从流动资金扣款"
          : row.status === "available"
            ? "可直接使用或记录兑现"
            : `状态：${row.status === "used" ? "已使用" : "已丢弃"}`,
        `来源：${row.source === "store" ? "商店" : "祈愿"}`,
      ],
      attrs: [
        { label: "价值", value: `${reward.costGold}金`, tone: "gold" },
        {
          label: "品阶",
          value: RARITY_META[mapRewardTier(reward.tier)].label,
          tone: "green",
        },
      ],
      obtain: row.source === "store" ? "奖励商店兑换获得。" : "祈愿抽取获得。",
      canUse: usable,
      canEquip: false,
      kind: "reward",
      reward: row,
    };
  });

  const equipment = data.equipment.items
    .filter((entry) => entry.unlocked)
    .map((entry): InventoryItem => ({
      id: `equipment:${entry.key}`,
      name: entry.name,
      description: entry.description || "可装备的外观框，装点角色形象。",
      quantity: 1,
      rarity: mapRewardTier(entry.tier),
      category: "collect",
      typeLabel: "收藏",
      weight: 2,
      equipped: entry.equipped,
      usable: false,
      imageSrc: resolveItemImage("equipment", null),
      emoji: entry.emoji || "🖼️",
      effects: [
        "装备后生效于角色头像框",
        entry.equipped ? "当前已装备" : "点击装备以展示",
      ],
      attrs: [
        { label: "部位", value: entry.slot, tone: "gold" },
        { label: "来源", value: entry.source, tone: "green" },
      ],
      obtain: entry.sourceAchievement?.name
        ? `解锁成就「${entry.sourceAchievement.name}」获得。`
        : "成就、活动或祈愿解锁。",
      canUse: false,
      canEquip: true,
      kind: "equipment",
      equipment: entry,
    }));

  const titles = data.titles.items
    .filter((entry) => entry.unlocked)
    .map((entry): InventoryItem => ({
      id: `title:${entry.key}`,
      name: entry.name,
      description: entry.description || "彰显旅途身份的称号。",
      quantity: 1,
      rarity: mapTitleTier(entry.tier),
      category: "collect",
      typeLabel: "收藏",
      weight: 0,
      equipped: entry.equipped,
      usable: false,
      imageSrc: resolveItemImage("title", null),
      emoji: entry.emoji || "👑",
      effects: [
        "装备后显示于角色资料",
        entry.equipped ? "当前佩戴中" : "可装备展示",
      ],
      attrs: [
        { label: "身份", value: "+展示", tone: "gold" },
        { label: "来源", value: "成就", tone: "green" },
      ],
      obtain: `来自成就「${entry.sourceAchievement.name}」。`,
      canUse: false,
      canEquip: true,
      kind: "title",
      title: entry,
    }));

  const achievements = data.achievements.items.map((entry): InventoryItem => ({
    id: `achievement:${entry.id}`,
    name: entry.name,
    description: entry.description || "已解锁的成长印记。",
    quantity: 1,
    rarity: mapTitleTier(entry.tier),
    category: "collect",
    typeLabel: "收藏",
    weight: 1,
    equipped: false,
    usable: false,
    imageSrc: resolveItemImage("achievement", entry.imageUrl),
    emoji: entry.emoji || "🏆",
    effects: [
      `奖励 ${entry.reward.gold} 金 / ${entry.reward.gems} 宝石 / ${entry.reward.fate} 命运`,
      entry.isCustom ? "自定义成就" : `分类：${entry.category}`,
    ],
    attrs: [
      { label: "印记", value: "已解锁", tone: "gold" },
      { label: "回顾", value: "可查阅", tone: "green" },
    ],
    obtain: "完成对应成就条件解锁。",
    canUse: false,
    canEquip: false,
    kind: "achievement",
    achievement: entry,
  }));

  return [...resources, ...rewards, ...equipment, ...titles, ...achievements];
}

export default function InventoryPage() {
  const { data, isLoading, isError, error } = useInventory();
  const [category, setCategory] = useState<UiCategory>("all");
  const [rarityFilter, setRarityFilter] = useState<"all" | DisplayRarity>("all");
  const [usableOnly, setUsableOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [hotbar, setHotbar] = useState<HotbarState>(defaultHotbar);
  const [hotbarReady, setHotbarReady] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [editHotbar, setEditHotbar] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    reward: InventoryRewardInstanceDTO;
    action: "fulfill" | "use" | "discard";
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOTBAR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HotbarState;
        if (
          parsed &&
          (parsed.preset === 0 || parsed.preset === 1) &&
          Array.isArray(parsed.presets?.[0]) &&
          Array.isArray(parsed.presets?.[1])
        ) {
          setHotbar({
            preset: parsed.preset,
            presets: [
              [...parsed.presets[0], ...EMPTY_PRESET()].slice(0, HOTBAR_SLOT_COUNT),
              [...parsed.presets[1], ...EMPTY_PRESET()].slice(0, HOTBAR_SLOT_COUNT),
            ],
          });
        }
      }
    } catch {
      /* ignore corrupt storage */
    } finally {
      setHotbarReady(true);
    }
  }, []);

  useEffect(() => {
    if (!hotbarReady) return;
    localStorage.setItem(HOTBAR_STORAGE_KEY, JSON.stringify(hotbar));
  }, [hotbar, hotbarReady]);

  const items = useMemo(() => (data ? buildItems(data) : []), [data]);

  // Drop stale hotbar ids (e.g. used/discarded rewards) without auto-filling.
  useEffect(() => {
    if (!hotbarReady || !items.length) return;
    const valid = new Set(items.map((item) => item.id));
    setHotbar((prev) => {
      let changed = false;
      const nextPresets = prev.presets.map((preset) =>
        preset.map((slot) => {
          if (slot != null && !valid.has(slot)) {
            changed = true;
            return null;
          }
          return slot;
        }),
      ) as HotbarState["presets"];
      return changed ? { ...prev, presets: nextPresets } : prev;
    });
  }, [items, hotbarReady]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (rarityFilter !== "all" && item.rarity !== rarityFilter) return false;
      if (usableOnly && !item.usable) return false;
      return true;
    });
  }, [items, category, rarityFilter, usableOnly]);

  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const usedSlots = items.length;
  const currentSlots = hotbar.presets[hotbar.preset];
  const hotbarItemIds = useMemo(
    () => new Set(currentSlots.filter((id): id is string => id != null)),
    [currentSlots],
  );

  const assignToHotbar = (itemId: string, slotIndex = activeSlot) => {
    setHotbar((prev) => {
      const nextPresets: HotbarState["presets"] = [
        [...prev.presets[0]],
        [...prev.presets[1]],
      ];
      const preset = nextPresets[prev.preset];
      // One item occupies at most one slot in the active preset.
      for (let i = 0; i < preset.length; i += 1) {
        if (preset[i] === itemId) preset[i] = null;
      }
      preset[slotIndex] = itemId;
      return { ...prev, presets: nextPresets };
    });
  };

  const clearHotbarSlot = (slotIndex: number) => {
    setHotbar((prev) => {
      const nextPresets: HotbarState["presets"] = [
        [...prev.presets[0]],
        [...prev.presets[1]],
      ];
      nextPresets[prev.preset][slotIndex] = null;
      return { ...prev, presets: nextPresets };
    });
  };

  const removeFromHotbar = (itemId: string) => {
    setHotbar((prev) => {
      const nextPresets: HotbarState["presets"] = [
        [...prev.presets[0]],
        [...prev.presets[1]],
      ];
      nextPresets[prev.preset] = nextPresets[prev.preset].map((slot) =>
        slot === itemId ? null : slot,
      );
      return { ...prev, presets: nextPresets };
    });
  };

  const sortGridHint = () => {
    setRarityFilter("all");
    setUsableOnly(false);
    setCategory("all");
    setSelectedId(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.tabs} role="tablist" aria-label="物品分类">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              className={cn(styles.tab, category === tab.key && styles.tabActive)}
              onClick={() => {
                setCategory(tab.key);
                setSelectedId(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.filterStrip}>
          <div className={styles.filterLeft}>
            <select
              className={styles.raritySelect}
              value={rarityFilter}
              aria-label="稀有度"
              onChange={(event) =>
                setRarityFilter(event.target.value as "all" | DisplayRarity)
              }
            >
              <option value="all">稀有度</option>
              <option value="common">普通</option>
              <option value="good">优良</option>
              <option value="rare">稀有</option>
              <option value="epic">史诗</option>
              <option value="legendary">传说</option>
            </select>

            <label className={styles.usableCheck}>
              <input
                type="checkbox"
                checked={usableOnly}
                onChange={(event) => setUsableOnly(event.target.checked)}
              />
              仅显示可使用
            </label>
          </div>

          <div className={styles.filterRight}>
            <span className={styles.capacity}>
              背包容量{" "}
              <strong>
                {Math.min(usedSlots, CAPACITY_MAX)} / {CAPACITY_MAX}
              </strong>
            </span>
            <button
              type="button"
              className={styles.capacityBtn}
              title="整理背包"
              onClick={sortGridHint}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {isError ? (
        <div className={styles.error}>{(error as Error).message}</div>
      ) : (
        <>
          <div className={styles.mainRow}>
            <section className={styles.gridPane}>
              <div className={styles.grid}>
                {isLoading ? (
                  <div className={styles.loading}>加载中…</div>
                ) : filtered.length === 0 ? (
                  <div className={styles.empty}>当前筛选下没有物品。</div>
                ) : (
                  filtered.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      selected={selected?.id === item.id}
                      showEquipMark={
                        item.equipped || hotbarItemIds.has(item.id)
                      }
                      onClick={() => {
                        setSelectedId(item.id);
                        if (editHotbar) assignToHotbar(item.id);
                      }}
                    />
                  ))
                )}
              </div>
            </section>

            <DetailPanel
              item={selected}
              locked={locked}
              inHotbar={selected ? hotbarItemIds.has(selected.id) : false}
              onToggleLock={() => setLocked((value) => !value)}
              onSort={sortGridHint}
              onRewardAction={(reward, action) =>
                setPendingAction({ reward, action })
              }
              onAssignHotbar={() => {
                if (selected) assignToHotbar(selected.id);
              }}
              onRemoveHotbar={() => {
                if (selected) removeFromHotbar(selected.id);
              }}
            />
          </div>

          <div className={styles.bottomRow}>
            <section className={styles.hotbar}>
              <div className={styles.hotbarHead}>
                <h2 className={styles.hotbarTitle}>
                  装备 / 快捷栏
                  <span
                    className={styles.infoIcon}
                    title="选中物品后点空槽或「放入快捷栏」写入；外观框/称号点「装备」才会真正佩戴。编辑模式下点格子可清空。"
                  >
                    i
                  </span>
                </h2>
                <div className={styles.presetRow}>
                  <span>快捷栏预设</span>
                  <button
                    type="button"
                    className={cn(
                      styles.presetBtn,
                      hotbar.preset === 0 && styles.presetBtnActive,
                    )}
                    onClick={() => setHotbar((prev) => ({ ...prev, preset: 0 }))}
                  >
                    方案一
                  </button>
                  <button
                    type="button"
                    className={cn(
                      styles.presetBtn,
                      hotbar.preset === 1 && styles.presetBtnActive,
                    )}
                    onClick={() => setHotbar((prev) => ({ ...prev, preset: 1 }))}
                  >
                    方案二
                  </button>
                  <button
                    type="button"
                    className={styles.presetEdit}
                    title={editHotbar ? "完成编辑" : "编辑快捷栏"}
                    aria-pressed={editHotbar}
                    onClick={() => setEditHotbar((value) => !value)}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>

              <div className={styles.hotbarSlots}>
                {currentSlots.map((slotId, index) => {
                  const item = slotId
                    ? (items.find((entry) => entry.id === slotId) ?? null)
                    : null;
                  return (
                    <button
                      key={`slot-${index}`}
                      type="button"
                      className={cn(
                        styles.slot,
                        activeSlot === index && styles.slotActive,
                      )}
                      onClick={() => {
                        setActiveSlot(index);
                        if (selected && (!item || editHotbar)) {
                          assignToHotbar(selected.id, index);
                        } else if (editHotbar && item) {
                          clearHotbarSlot(index);
                        } else if (item) {
                          setSelectedId(item.id);
                        }
                      }}
                    >
                      <span className={styles.slotIndex}>{index + 1}</span>
                      {item ? (
                        <>
                          <span className={styles.slotQty}>
                            x{formatQty(item.quantity)}
                          </span>
                          <span className={styles.slotIcon}>
                            <ItemVisual item={item} size={40} />
                          </span>
                          <span className={styles.slotName}>{item.name}</span>
                        </>
                      ) : (
                        <>
                          <span className={styles.slotIcon}>
                            <span className={styles.slotEmptyIcon}>+</span>
                          </span>
                          <span
                            className={cn(styles.slotName, styles.slotEmptyName)}
                          >
                            空位
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className={styles.tips}>
              <h2 className={styles.tipsTitle}>
                <Lightbulb size={15} />
                背包小贴士
              </h2>
              <div className={styles.tipsBody}>
                <div className={styles.tipsAvatar}>
                  <Image
                    src="/life-game/sidebar-guide-v1.png"
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                  />
                </div>
                <p className={styles.tipsCopy}>
                  底部是快捷栏，默认空着——选中物品后点空槽或「放入快捷栏」才会写入。外观框与称号用「装备」真正佩戴；角标
                  E 表示已装备或已在快捷栏中。
                </p>
              </div>
              <Link href="/rewards" className={styles.shopBtn}>
                <Store size={15} />
                前往道具商店
              </Link>
            </aside>
          </div>
        </>
      )}

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

function ItemCard({
  item,
  selected,
  showEquipMark,
  onClick,
}: {
  item: InventoryItem;
  selected: boolean;
  showEquipMark: boolean;
  onClick: () => void;
}) {
  const rarity = RARITY_META[item.rarity];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(styles.card, selected && styles.cardSelected)}
      style={
        {
          "--rarity-color": rarity.color,
          "--rarity-glow": rarity.glow,
        } as CSSProperties
      }
    >
      {showEquipMark && (
        <span
          className={styles.cardEquip}
          title={item.equipped ? "已装备" : "在快捷栏中"}
        >
          E
        </span>
      )}
      <span className={styles.cardQty}>x{formatQty(item.quantity)}</span>
      <div className={styles.cardVisual}>
        <ItemVisual item={item} size={72} />
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardName}>{item.name}</span>
        <span className={styles.cardRarity}>{rarity.label}</span>
      </div>
    </button>
  );
}

function DetailPanel({
  item,
  locked,
  inHotbar,
  onToggleLock,
  onSort,
  onRewardAction,
  onAssignHotbar,
  onRemoveHotbar,
}: {
  item: InventoryItem | null;
  locked: boolean;
  inHotbar: boolean;
  onToggleLock: () => void;
  onSort: () => void;
  onRewardAction: (
    reward: InventoryRewardInstanceDTO,
    action: "fulfill" | "use" | "discard",
  ) => void;
  onAssignHotbar: () => void;
  onRemoveHotbar: () => void;
}) {
  const equipFrame = useEquipFrame();
  const equipTitle = useEquipTitle();

  if (!item) {
    return (
      <aside className={styles.detail}>
        <div className={styles.detailEmpty}>选择一个物品查看详情。</div>
      </aside>
    );
  }

  const rarity = RARITY_META[item.rarity];
  const isRealEquip = item.kind === "equipment" || item.kind === "title";

  const handleUse = () => {
    if (item.kind === "reward" && item.reward) {
      if (item.reward.status === "pending_fulfillment") {
        onRewardAction(item.reward, "fulfill");
      } else if (item.reward.status === "available") {
        onRewardAction(item.reward, "use");
      }
      return;
    }
    if (item.id === "resource:fate") {
      window.location.href = "/gacha";
    }
  };

  const handleEquip = () => {
    if (item.kind === "equipment" && item.equipment) {
      equipFrame.mutate(item.equipment.equipped ? null : item.equipment.key);
      return;
    }
    if (item.kind === "title" && item.title) {
      equipTitle.mutate(item.title.equipped ? null : item.title.key);
      return;
    }
    if (inHotbar) {
      onRemoveHotbar();
      return;
    }
    onAssignHotbar();
  };

  const equipBusy = equipFrame.isPending || equipTitle.isPending;
  const useDisabled = locked || !item.canUse;
  const equipLabel = isRealEquip
    ? item.equipped
      ? "卸下"
      : "装备"
    : inHotbar
      ? "移出快捷栏"
      : "放入快捷栏";

  return (
    <aside className={styles.detail}>
      <div className={styles.detailHead}>
        <div>
          <h2 className={styles.detailTitle}>{item.name}</h2>
          <span
            className={styles.detailRarityTag}
            style={{ "--rarity-color": rarity.color } as CSSProperties}
          >
            {rarity.label}
          </span>
        </div>
        <button
          type="button"
          className={styles.detailLock}
          title={locked ? "解锁操作" : "锁定操作"}
          onClick={onToggleLock}
        >
          <Lock size={14} />
        </button>
      </div>

      <div className={styles.detailPreviewRow}>
        <div className={styles.detailThumb}>
          <ItemVisual item={item} size={88} />
        </div>
        <div className={styles.detailStats}>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>持有数量</span>
            <span className={styles.detailStatValue}>
              × {formatQty(item.quantity)}
            </span>
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>类型</span>
            <span className={styles.detailStatValue}>{item.typeLabel}</span>
          </div>
          <div className={styles.detailStat}>
            <span className={styles.detailStatLabel}>重量</span>
            <span className={styles.detailStatValue}>{item.weight}</span>
          </div>
        </div>
      </div>

      <p className={styles.detailDesc}>{item.description}</p>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>道具效果</h3>
        <ul className={styles.effectList}>
          {item.effects.map((effect) => (
            <li key={effect}>{effect}</li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          属性加成
          {isRealEquip ? <span>（装备后生效）</span> : null}
        </h3>
        <div className={styles.attrGrid}>
          {item.attrs.map((attr) => (
            <div key={`${attr.label}-${attr.value}`} className={styles.attrItem}>
              <span
                className={cn(
                  styles.attrDot,
                  attr.tone === "green" && styles.attrDotAlt,
                )}
              />
              {attr.label} {attr.value}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>获取途径</h3>
        <p className={styles.obtainText}>{item.obtain}</p>
      </div>

      {item.kind === "reward" &&
        item.reward?.status === "available" &&
        !locked && (
          <div className={styles.section}>
            <button
              type="button"
              className={styles.btnSort}
              style={{ width: "100%", height: 34 }}
              onClick={() => item.reward && onRewardAction(item.reward, "discard")}
            >
              <Trash2 size={13} style={{ display: "inline", marginRight: 6 }} />
              丢弃此奖品
            </button>
          </div>
        )}

      <div className={styles.detailActions}>
        <button
          type="button"
          className={styles.btnUse}
          disabled={useDisabled}
          onClick={handleUse}
        >
          使用
        </button>
        <button
          type="button"
          className={styles.btnEquip}
          disabled={locked}
          onClick={handleEquip}
        >
          {equipBusy ? "…" : equipLabel}
        </button>
        <button
          type="button"
          className={styles.btnSort}
          disabled={locked}
          onClick={onSort}
        >
          整理
        </button>
      </div>
    </aside>
  );
}

function ItemVisual({ item, size }: { item: InventoryItem; size: number }) {
  const src = item.imageSrc || thematicIcon(item.kind);
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={styles.itemPixel}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  return <span aria-hidden>{item.emoji}</span>;
}

function RewardActionDialog({
  reward,
  action,
  onClose,
}: {
  reward: InventoryRewardInstanceDTO;
  action: "fulfill" | "use" | "discard";
  onClose: () => void;
}) {
  const update = useUpdateInventoryReward();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const label =
    action === "fulfill" ? "兑现" : action === "use" ? "使用" : "丢弃";

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
    <div className={styles.dialogBackdrop}>
      <div className={styles.dialogPanel}>
        <div className={styles.dialogHead}>
          <div>
            <h3 className={styles.dialogTitle}>{label}奖品</h3>
            <div className={styles.dialogSub}>
              {reward.reward.emoji} {reward.reward.name}
            </div>
          </div>
          <button
            type="button"
            className={styles.dialogClose}
            onClick={onClose}
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <textarea
          className={styles.dialogNote}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          placeholder="备注（可选）"
        />
        {error && <div className={styles.dialogError}>{error}</div>}
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={styles.dialogCancel}
            onClick={onClose}
            disabled={update.isPending}
          >
            取消
          </button>
          <button
            type="button"
            className={cn(
              styles.dialogConfirm,
              action === "discard" && styles.dialogConfirmDanger,
            )}
            onClick={submit}
            disabled={update.isPending}
          >
            <CheckCircle2
              size={14}
              style={{ display: "inline", marginRight: 6 }}
            />
            确认{label}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatQty(value: number) {
  if (value >= 10000) return `${Math.floor(value / 1000)}k`;
  return value.toLocaleString("zh-CN");
}
