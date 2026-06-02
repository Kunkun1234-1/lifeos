import type { CommissionItem } from "./commissions";

export type UserSnapshot = {
  id: string;
  name: string;
  class: string;
  visionStatement: string | null;
  coreValues: string[];
  identityStatements: string[];
  avatarUrl: string | null;
  gender: string | null;
  birthday: string | null;
  region: string | null;
  motto: string | null;
  onboardedAt: string | null;
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
  status: "TODO" | "DONE" | "CANCELED";
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

export type GoalDTO = {
  id: string;
  type: string;
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

export type RewardItemDTO = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  imageUrl: string | null;
  tier: "common" | "rare" | "epic" | "legendary";
  costGold: number;
  costGems: number;
  inGachaPool: boolean;
  weight: number;
  redeemedCount: number;
};

export type FinanceAccountType =
  | "cash"
  | "bank"
  | "wallet"
  | "credit"
  | "investment"
  | "debt"
  | "receivable"
  | "virtual";

export type FinanceTransactionType = "income" | "expense" | "transfer";

export type FinanceAccountDTO = {
  id: string;
  name: string;
  type: FinanceAccountType;
  currencyCode: string;
  initialBalanceCents: number;
  balanceCents: number;
  includeInNetWorth: boolean;
  color: string;
  icon: string;
  archived: boolean;
  createdAt: string;
};

export type FinanceCategoryDTO = {
  id: string;
  name: string;
  kind: FinanceTransactionType;
  color: string;
  monthlyBudgetCents: number;
  order: number;
};

export type FinanceTransactionDTO = {
  id: string;
  type: FinanceTransactionType;
  amountCents: number;
  currencyCode: string;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  categoryId: string | null;
  sourceAccount: { id: string; name: string; type: FinanceAccountType } | null;
  targetAccount: { id: string; name: string; type: FinanceAccountType } | null;
  category: { id: string; name: string; kind: FinanceTransactionType; color: string } | null;
  payee: string | null;
  note: string | null;
  tags: string[];
  occurredAt: string;
  createdAt: string;
};

export type AssetsSnapshotDTO = {
  summary: {
    netWorthCents: number;
    assetsCents: number;
    liabilitiesCents: number;
    monthIncomeCents: number;
    monthExpenseCents: number;
    monthNetCents: number;
    monthBudgetCents: number;
    monthBudgetUsedRate: number | null;
  };
  currency: { gold: number; gems: number; fate: number };
  accounts: FinanceAccountDTO[];
  categories: FinanceCategoryDTO[];
  transactions: FinanceTransactionDTO[];
  expenseByCategory: Array<{
    categoryId: string | null;
    name: string;
    color: string;
    amountCents: number;
    budgetCents: number;
  }>;
};

export type DashboardAssetsDTO = {
  summary: AssetsSnapshotDTO["summary"];
  currency: { gold: number; gems: number; fate: number };
  accountCount: number;
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
  fate: number;
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
  fateRemaining: number;
  goldSpent: number;
  fateSpent: number;
  currency: "fate" | "gold";
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

export type NoteKind = "note" | "highlight" | "quote" | "link" | "inspiration";

export type NoteDTO = {
  id: string;
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
