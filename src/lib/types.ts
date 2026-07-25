import type { CommissionItem } from "./commissions";

export type UserSnapshot = {
  id: string;
  name: string;
  email: string | null;
  class: string;
  timezone: string;
  visionStatement: string | null;
  coreValues: string[];
  identityStatements: string[];
  avatarUrl: string | null;
  gender: string | null;
  birthday: string | null;
  region: string | null;
  motto: string | null;
  onboardedAt: string | null;
  createdAt: string;
  totalXp: number;
  xpByArea: Record<string, number>;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  levelProgress: number;
  currency: { gold: number; gems: number; fate: number };
  equippedTitle: { key: string; name: string; emoji: string; tier: string } | null;
  equippedFrame: {
    key: string;
    name: string;
    tier: string;
    style: {
      gradient: [string, string];
      strokeWidth: number;
      ornament?: "diamond" | "stars" | "wave" | "ring" | "spark";
      glow?: string;
    };
  } | null;
};

export type AreaDTO = {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  weight: number;
  healthScore: number;
  attributeKey: string;
  attributeXp: number;
  order: number;
  archived: boolean;
};

export type TaskDTO = {
  id: string;
  title: string;
  notes: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
  priority: number;
  dueDate: string | null;
  xpReward: number;
  goldReward: number;
  areaId: string | null;
  area: AreaDTO | null;
  projectId: string | null;
  project: { id: string; title: string; status: string } | null;
  completedAt: string | null;
  createdAt: string;
};

export type HabitTickDTO = {
  id: string;
  direction: "+" | "-";
  date: string; // YYYY-MM-DD in user timezone
  createdAt: string;
};

export type HabitDTO = {
  id: string;
  title: string;
  notes: string | null;
  direction: "positive" | "negative" | "both";
  positiveCount: number;
  negativeCount: number;
  xpPerTick: number;
  goldPerTick: number;
  areaId: string | null;
  area: AreaDTO | null;
  /** Recent ticks (default ~42 days) for check-in grids. */
  ticks?: HabitTickDTO[];
};

export type RoutineDTO = {
  id: string;
  title: string;
  notes: string | null;
  daysOfWeek: string;       // JSON
  xpReward: number;
  goldReward: number;
  streakCurrent: number;
  streakBest: number;
  lastCompletedDate: string | null;
  areaId: string | null;
  area: AreaDTO | null;
  completedToday: boolean;
};

export type CommissionsTodayDTO = {
  id: string;
  date: string;
  items: CommissionItem[];
  completedCount: number;
  bonusClaimed: boolean;
};

export type ReviewDTO = {
  id: string;
  kind: string;
  periodStart: string;
  periodEnd: string;
  content: string;  // JSON
  mood: number | null;
  energy: number | null;
  focus: number | null;
  createdAt: string;
};

export type RewardResult = {
  xpGranted: number;
  goldGranted: number;
  gemsGranted?: number;
  fateGranted?: number;
  areaKey: string | null;
};

// ---------- Phase 2/3 ----------

export type KeyResultDTO = {
  id: string;
  goalId: string;
  description: string;
  unit: string | null;
  target: number;
  current: number;
  order: number;
};

export type GoalType = "okr" | "milestone" | "main";

export type GoalDTO = {
  id: string;
  type: GoalType | string;
  objective: string;
  notes: string | null;
  timeframe: string;
  startDate: string;
  endDate: string;
  status: "active" | "done" | "paused" | "archived";
  confidence: number;
  areaId: string | null;
  area: AreaDTO | null;
  keyResults: KeyResultDTO[];
  projects: { id: string; title: string; status: string }[];
};

export type ProjectDTO = {
  id: string;
  title: string;
  deliverable: string | null;
  notes: string | null;
  status: "idea" | "active" | "paused" | "done" | "archived";
  startDate: string | null;
  deadline: string | null;
  completedAt: string | null;
  xpReward: number;
  goldReward: number;
  gemsReward: number;
  areaId: string | null;
  area: AreaDTO | null;
  goalId: string | null;
  goal: { id: string; objective: string } | null;
  taskCount: number;
  taskDoneCount: number;
};

export type RewardCategory = "virtual" | "physical_small" | "physical_large";

export type RewardItemDTO = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  imageUrl: string | null;
  tier: "common" | "rare" | "epic" | "legendary";
  category: RewardCategory;
  costMoneyCents: number;
  costGold: number;
  costGems: number; // legacy compatibility
  inGachaPool: boolean;
  weight: number;
  redeemedCount: number;
};

export type InventoryRewardStatus = "pending_fulfillment" | "available" | "used" | "discarded";
export type InventoryRewardSource = "store" | "gacha";

export type InventoryRewardInstanceDTO = {
  id: string;
  status: InventoryRewardStatus;
  source: InventoryRewardSource;
  costMoneyCents: number;
  costGold: number;
  costGems: number;
  fulfilledAt: string | null;
  redeemedAt: string;
  usedAt: string | null;
  discardedAt: string | null;
  note: string | null;
  reward: RewardItemDTO & { archived: boolean };
};

export type InventoryAchievementDTO = {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  imageUrl: string | null;
  tier: "bronze" | "silver" | "gold" | "legendary";
  category: string;
  isCustom: boolean;
  unlockedAt: string;
  reward: { gold: number; gems: number; fate: number };
};

export type WalletPoolType = "living" | "savings" | "flexible";
export type WalletTransactionType = "income" | "expense" | "refund" | "transfer";
export type WalletNecessity = "essential" | "optional";

export type WalletPoolDTO = {
  id: string;
  type: WalletPoolType;
  currencyCode: string;
  balanceCents: number;
  createdAt: string;
};

export type WalletAllocationDTO = {
  id: string;
  poolId: string;
  amountCents: number;
  balanceAfterCents: number;
  pool: { id: string; type: WalletPoolType };
};

export type WalletTransactionDTO = {
  id: string;
  type: WalletTransactionType;
  amountCents: number;
  currencyCode: string;
  necessity: WalletNecessity | null;
  sourcePoolType: WalletPoolType | null;
  targetPoolType: WalletPoolType | null;
  counterparty: string | null;
  note: string | null;
  refundOfId: string | null;
  refund: { id: string } | null;
  refundOf: { id: string; counterparty: string | null; necessity: WalletNecessity | null } | null;
  occurredAt: string;
  createdAt: string;
  allocations: WalletAllocationDTO[];
};

export type AssetsSnapshotDTO = {
  summary: {
    totalBalanceCents: number;
    monthIncomeCents: number;
    monthExpenseCents: number;
    monthRefundCents: number;
    monthNetCents: number;
    monthEssentialExpenseCents: number;
    monthOptionalExpenseCents: number;
  };
  currency: { gold: number; gems: number; fate: number };
  pools: WalletPoolDTO[];
  plan: {
    id: string;
    month: string;
    livingTargetCents: number;
    livingGapCents: number;
    savingsRateBps: number;
    flexibleRateBps: number;
    carryLivingTarget: boolean;
    initialized: boolean;
    rolloverCompleted: boolean;
  };
  transactions: WalletTransactionDTO[];
};

export type DashboardAssetsDTO = {
  summary: AssetsSnapshotDTO["summary"];
  currency: { gold: number; gems: number; fate: number };
  poolCount: number;
};

export type DashboardSnapshotDTO = {
  user: UserSnapshot;
  areas: AreaDTO[];
  routines: RoutineDTO[];
  commissions: CommissionsTodayDTO;
  tasksTodo: TaskDTO[];
  tasksDone: TaskDTO[];
  assets: DashboardAssetsDTO;
};

export type AchievementDTO = {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  imageUrl: string | null;
  tier: "bronze" | "silver" | "gold" | "legendary";
  category: string;
  hidden: boolean;
  isCustom: boolean;
  isManual: boolean;
  threshold: number;
  current: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  reward: { gold: number; gems: number; fate: number };
};

export type GachaState = {
  gold: number;
  pullsSinceRare: number;
  pullsSinceEpic: number;
  totalPulls: number;
  recent: Array<{
    id: string;
    tier: "common" | "rare" | "epic" | "legendary";
    pity: "soft" | "hard" | null;
    reward: RewardItemDTO | null;
    pulledAt: string;
  }>;
  pool: RewardItemDTO[];
  rewards: RewardItemDTO[];
  goldPerPull: number;
  rulesVersion: string;
  ready: boolean;
  missingTiers: Array<"common" | "rare" | "epic" | "legendary">;
  fourStarPityAt: number;
  softPityAt: number;
  hardPityAt: number;
};

export type GachaPullResult = {
  results: Array<{
    pullId: string;
    tier: "common" | "rare" | "epic" | "legendary";
    pity: "soft" | "hard" | null;
    reward: RewardItemDTO | null;
  }>;
  goldRemaining: number;
  goldSpent: number;
  batchId: string;
  pullsSinceRare: number;
  pullsSinceEpic: number;
  totalPulls: number;
};

export type FreezeState = {
  count: number;
  totalUsed: number;
  costGold: number;
};

export type BPMissionDTO = {
  key: string;
  title: string;
  metric: string;
  target: number;
  xp: number;
  emoji: string;
  current: number;
  done: boolean;
};

export type BPLevelReward = { level: number; gold: number; gems: number; fate: number };

export type BPSnapshot = {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalXp: number;
  cappedXp: number;
  cap: number;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
  missions: BPMissionDTO[];
  claimedLevels: number[];
  rewards: BPLevelReward[];
};

// ---------- Phase 4 ----------

export type PrincipleDTO = {
  id: string;
  title: string;
  body: string;
  source: string | null;
  category: "life" | "decision" | "health" | "money" | "relationship" | "career";
  emoji: string;
  usageCount: number;
  archived: boolean;
  createdAt: string;
};

export type DecisionOption = {
  label: string;
  prob: number;     // 0..1
  payoff: number;
  penalty: number;
  notes?: string | null;
  ev?: number;      // computed: prob*payoff − (1-prob)*penalty
};

export type TitleDTO = {
  key: string;
  name: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "legendary";
  sourceAchievement: {
    key: string;
    name: string;
    emoji: string;
    tier: string;
    trigger: string;
  };
  unlocked: boolean;
  unlockedAt: string | null;
  equipped: boolean;
};

export type TitlesSnapshot = {
  items: TitleDTO[];
  equippedKey: string | null;
  unlockedCount: number;
  totalCount: number;
};

export type EventStatus = "upcoming" | "active" | "ended";

export type EventMissionDTO = {
  key: string;
  title: string;
  metric: string;
  target: number;
  current: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  emoji: string;
  xpReward: number;
  goldReward: number;
  gemsReward: number;
  fateReward: number;
};

export type EventSnapshotDTO = {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  imageUrl: string | null;
  themeColor: string;
  isCustom: boolean;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  msToStart: number | null;
  msToEnd: number | null;
  missions: EventMissionDTO[];
  bonus: {
    xp: number;
    gold: number;
    gems: number;
    fate: number;
    equipmentKey: string | null;
  };
  bonusClaimed: boolean;
  allMissionsClaimed: boolean;
};

export type EquipmentItemDTO = {
  key: string;
  name: string;
  description: string;
  emoji: string;
  slot: string;
  tier: "common" | "rare" | "epic" | "legendary";
  source: "seed" | "achievement" | "event" | "gacha";
  sourceKey: string | null;
  sourceAchievement: { key: string; name: string; emoji: string; tier: string; trigger: string } | null;
  style: {
    gradient: [string, string];
    strokeWidth: number;
    ornament?: "diamond" | "stars" | "wave" | "ring" | "spark";
    glow?: string;
  };
  unlocked: boolean;
  unlockedAt: string | null;
  equipped: boolean;
};

export type EquipmentSnapshotDTO = {
  items: EquipmentItemDTO[];
  equippedKey: string | null;
  unlockedCount: number;
  totalCount: number;
};

export type InventorySnapshotDTO = {
  currency: { gold: number; gems: number; fate: number };
  freeze: FreezeState;
  rewards: InventoryRewardInstanceDTO[];
  equipment: EquipmentSnapshotDTO;
  titles: TitlesSnapshot;
  achievements: {
    items: InventoryAchievementDTO[];
    unlockedCount: number;
    totalCount: number;
  };
};

export type NoteKind =
  | "note"
  | "folder"
  | "highlight"
  | "quote"
  | "link"
  | "inspiration";

export type NoteDTO = {
  id: string;
  parentId: string | null;
  position: number;
  icon: string | null;
  coverUrl: string | null;
  kind: NoteKind;
  title: string;
  body: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  author: string | null;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  areaId: string | null;
  area: { id: string; name: string; icon: string; color: string } | null;
  projectId: string | null;
  project: { id: string; title: string } | null;
  goalId: string | null;
  goal: { id: string; objective: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** Lightweight node for the knowledge-base page tree (no body). */
export type NoteTreeNodeDTO = {
  id: string;
  parentId: string | null;
  position: number;
  icon: string | null;
  kind: NoteKind;
  title: string;
  pinned: boolean;
  archived: boolean;
  childCount: number;
  updatedAt: string;
  children?: NoteTreeNodeDTO[];
};

export type DecisionDTO = {
  id: string;
  title: string;
  context: string;
  status: "open" | "decided" | "reviewed";
  stakes: "low" | "medium" | "high";
  options: DecisionOption[];
  chosenIndex: number | null;
  preMortem: string | null;
  tenTenTen: string | null;
  decidedAt: string | null;
  reviewDueAt: string | null;
  reviewedAt: string | null;
  outcome: string | null;
  lessons: string | null;
  rating: number | null;
  areaId: string | null;
  area: { id: string; name: string; icon: string; color: string; attributeKey: string } | null;
  principles: { id: string; title: string; emoji: string }[];
  createdAt: string;
};
