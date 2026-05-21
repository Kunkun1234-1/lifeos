import { z } from "zod";

// ---------- Task ----------
export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  areaId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(3).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  xpReward: z.number().int().min(0).max(1000).optional(),
  goldReward: z.number().int().min(0).max(1000).optional(),
});
export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  status: z.enum(["TODO", "DONE", "CANCELED"]).optional(),
});

// ---------- Habit ----------
export const HabitCreateSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  areaId: z.string().optional().nullable(),
  direction: z.enum(["positive", "negative", "both"]).default("positive"),
  xpPerTick: z.number().int().min(0).max(500).optional(),
  goldPerTick: z.number().int().min(0).max(500).optional(),
});

export const HabitTickSchema = z.object({
  direction: z.enum(["+", "-"]),
});

// ---------- Routine ----------
export const RoutineCreateSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  areaId: z.string().optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7).default([0, 1, 2, 3, 4, 5, 6]),
  xpReward: z.number().int().min(0).max(1000).optional(),
  goldReward: z.number().int().min(0).max(1000).optional(),
});

// ---------- Review ----------
export const ReviewCreateSchema = z.object({
  kind: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("daily"),
  content: z.object({
    // Daily fields
    top3Done: z.string().optional(),
    oneLiner: z.string().optional(),
    notes: z.string().optional(),
    // Weekly fields
    okrProgress: z.string().optional(),
    principlesUsed: z.string().optional(),
    decisionsToReview: z.string().optional(),
    nextWeekTop3: z.string().optional(),
    biggestWin: z.string().optional(),
    biggestRegret: z.string().optional(),
  }).passthrough(),
  mood: z.number().int().min(1).max(10).optional().nullable(),
  energy: z.number().int().min(1).max(10).optional().nullable(),
  focus: z.number().int().min(1).max(10).optional().nullable(),
});

// ---------- User / Vision ----------
export const UserUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  class: z.enum(["Scholar", "Athlete", "Artist", "Engineer", "Connector"]).optional(),
  visionStatement: z.string().max(1000).optional().nullable(),
  coreValues: z.array(z.string().max(100)).max(8).optional(),
  identityStatements: z.array(z.string().max(200)).max(8).optional(),
  // Profile basics
  avatarUrl: z.string().max(500).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  birthday: z.string().optional().nullable(), // ISO yyyy-mm-dd, parsed server-side
  region: z.string().max(60).optional().nullable(),
  motto: z.string().max(280).optional().nullable(),
  onboarded: z.boolean().optional(),
});

// ---------- Custom Achievements / Events ----------
export const CustomAchievementCreateSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(280).default(""),
  emoji: z.string().max(8).default("🏆"),
  imageUrl: z.string().max(500).optional().nullable(),
  tier: z.enum(["bronze", "silver", "gold", "legendary"]).default("bronze"),
  rewardGold: z.number().int().min(0).max(10000).default(0),
  rewardGems: z.number().int().min(0).max(1000).default(0),
  rewardFate: z.number().int().min(0).max(100).default(0),
});

export const CustomEventCreateSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(280).default(""),
  emoji: z.string().max(8).default("🎉"),
  imageUrl: z.string().max(500).optional().nullable(),
  themeColor: z.string().max(20).default("#b68838"),
  startsAt: z.string(), // ISO datetime
  endsAt: z.string(),
  missions: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        title: z.string().min(1).max(80),
        metric: z.string().min(1).max(40), // e.g. task_done, routine_done, habit_pos
        target: z.number().int().min(1).max(1000),
        xpReward: z.number().int().min(0).max(2000).default(0),
        goldReward: z.number().int().min(0).max(2000).default(0),
        gemsReward: z.number().int().min(0).max(200).default(0),
        fateReward: z.number().int().min(0).max(20).default(0),
        emoji: z.string().max(8).default("📝"),
      }),
    )
    .min(1)
    .max(10),
  bonusXp: z.number().int().min(0).max(10000).default(0),
  bonusGold: z.number().int().min(0).max(10000).default(0),
  bonusGems: z.number().int().min(0).max(2000).default(0),
  bonusFate: z.number().int().min(0).max(50).default(0),
});

export const AreaUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(8).optional(),
  color: z.string().max(20).optional(),
  weight: z.number().min(0.1).max(5).optional(),
  order: z.number().int().optional(),
  archived: z.boolean().optional(),
});

// ---------- Goal / KR ----------
export const GoalCreateSchema = z.object({
  objective: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  type: z.enum(["okr", "milestone"]).default("okr"),
  areaId: z.string().optional().nullable(),
  timeframe: z.string().min(1).max(40),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  confidence: z.number().int().min(1).max(10).optional(),
  keyResults: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        unit: z.string().max(40).optional().nullable(),
        target: z.number().min(0).max(100000),
        current: z.number().min(0).max(100000).default(0),
      })
    )
    .max(6)
    .optional(),
});

export const GoalUpdateSchema = z.object({
  objective: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional().nullable(),
  areaId: z.string().optional().nullable(),
  status: z.enum(["active", "done", "paused", "archived"]).optional(),
  confidence: z.number().int().min(1).max(10).optional(),
  timeframe: z.string().min(1).max(40).optional(),
});

export const KRUpdateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  unit: z.string().max(40).optional().nullable(),
  target: z.number().min(0).max(100000).optional(),
  current: z.number().min(0).max(100000).optional(),
});

// ---------- Project ----------
export const ProjectCreateSchema = z.object({
  title: z.string().min(1).max(200),
  deliverable: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  areaId: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
  status: z.enum(["idea", "active", "paused", "done", "archived"]).default("active"),
  startDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  xpReward: z.number().int().min(0).max(10000).optional(),
  goldReward: z.number().int().min(0).max(10000).optional(),
  gemsReward: z.number().int().min(0).max(100).optional(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

// ---------- Reward ----------
export const RewardItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  emoji: z.string().max(8).default("🎁"),
  imageUrl: z.string().max(500).optional().nullable(),
  tier: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  costGold: z.number().int().min(0).max(100000).default(0),
  costGems: z.number().int().min(0).max(100).default(0),
  inGachaPool: z.boolean().default(true),
  weight: z.number().int().min(1).max(10).default(1),
});

export const RewardItemUpdateSchema = RewardItemSchema.partial();

// ---------- Finance ----------
export const FinanceAccountCreateSchema = z.object({
  name: z.string().min(1).max(80),
  type: z
    .enum(["cash", "bank", "wallet", "credit", "investment", "debt", "receivable", "virtual"])
    .default("cash"),
  currencyCode: z.string().min(3).max(3).default("CNY"),
  initialBalanceCents: z.number().int().min(-1_000_000_000).max(1_000_000_000).default(0),
  includeInNetWorth: z.boolean().default(true),
  color: z.string().max(20).default("#b68838"),
  icon: z.string().max(30).default("wallet"),
});

export const FinanceTransactionCreateSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amountCents: z.number().int().min(1).max(1_000_000_000),
  currencyCode: z.string().min(3).max(3).default("CNY"),
  sourceAccountId: z.string().optional().nullable(),
  targetAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  payee: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(40)).max(12).default([]),
  occurredAt: z.string().datetime().optional(),
});

// ---------- Gacha ----------
export const GachaPullSchema = z.object({
  count: z.union([z.literal(1), z.literal(10)]).default(1),
});

// ---------- Phase 4: Principles ----------
export const PrincipleCreateSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  source: z.string().max(80).optional().nullable(),
  category: z.enum(["life", "decision", "health", "money", "relationship", "career"]).default("life"),
  emoji: z.string().max(8).default("📜"),
});

export const PrincipleUpdateSchema = PrincipleCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

// ---------- Phase 4: Decisions ----------
export const DecisionOptionSchema = z.object({
  label: z.string().min(1).max(120),
  prob: z.number().min(0).max(1).default(0.5),
  payoff: z.number().min(-1_000_000).max(1_000_000).default(0),
  penalty: z.number().min(-1_000_000).max(1_000_000).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const DecisionCreateSchema = z.object({
  title: z.string().min(1).max(160),
  context: z.string().min(1).max(4000),
  areaId: z.string().optional().nullable(),
  stakes: z.enum(["low", "medium", "high"]).default("medium"),
  options: z.array(DecisionOptionSchema).min(2).max(6),
  preMortem: z.string().max(2000).optional().nullable(),
  tenTenTen: z.string().max(2000).optional().nullable(),
  principleIds: z.array(z.string()).max(20).optional(),
  // If supplied, decision is created in 'decided' state with this option chosen
  chosenIndex: z.number().int().min(0).max(5).optional().nullable(),
  reviewDueAt: z.string().datetime().optional().nullable(),
});

export const DecisionUpdateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  context: z.string().min(1).max(4000).optional(),
  areaId: z.string().optional().nullable(),
  stakes: z.enum(["low", "medium", "high"]).optional(),
  options: z.array(DecisionOptionSchema).min(2).max(6).optional(),
  preMortem: z.string().max(2000).optional().nullable(),
  tenTenTen: z.string().max(2000).optional().nullable(),
  principleIds: z.array(z.string()).max(20).optional(),
  chosenIndex: z.number().int().min(0).max(5).optional().nullable(),
  status: z.enum(["open", "decided", "reviewed"]).optional(),
  reviewDueAt: z.string().datetime().optional().nullable(),
});

export const DecisionReviewSchema = z.object({
  outcome: z.string().min(1).max(2000),
  lessons: z.string().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(10),
});

// ---------- Knowledge Base / Notes ----------
export const NOTE_KINDS = ["note", "highlight", "quote", "link", "inspiration"] as const;

// Treat empty string as `null` for optional URL — friendlier for PATCH-clear flows
const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().url().max(500).nullable()
);

export const NoteCreateSchema = z.object({
  kind: z.enum(NOTE_KINDS).default("note"),
  title: z.string().min(1).max(200),
  body: z.string().max(10_000).default(""),
  sourceUrl: optionalUrl,
  sourceTitle: z.string().max(200).optional().nullable(),
  author: z.string().max(120).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  areaId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
  pinned: z.boolean().default(false),
});

export const NoteUpdateSchema = NoteCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});
