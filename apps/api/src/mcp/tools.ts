import { Buffer } from "node:buffer";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CustomAchievementCreateSchema,
  CustomEventCreateSchema,
  DecisionCreateSchema,
  DecisionOptionSchema,
  DecisionReviewSchema,
  DecisionUpdateSchema,
  GachaPullSchema,
  GoalCreateSchema,
  GoalUpdateSchema,
  HabitCreateSchema,
  HabitTickSchema,
  KRUpdateSchema,
  NoteCreateSchema,
  NoteMoveSchema,
  NoteUpdateSchema,
  PrincipleCreateSchema,
  PrincipleUpdateSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ReviewCreateSchema,
  RewardItemSchema,
  RewardItemUpdateSchema,
  RoutineCreateSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  UserUpdateSchema,
  WalletInitializationSchema,
  WalletSettingsUpdateSchema,
  WalletTransactionCreateSchema,
} from "@/lib/validators";
import { runAuditedAction } from "./audit";
import { callLifeOsApi } from "./api-client";

type HandlerExtra = { authInfo?: AuthInfo };
type Args = Record<string, unknown>;
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const idempotencyKey = z.string().min(8).max(128).describe(
  "A unique stable key for this exact action. Reuse it only to retry the same action.",
);
const id = z.string().min(1).max(191).describe("Exact entity ID returned by a LifeOS read tool");
const empty = z.object({});
const idOnly = z.object({ id });

const READ = ["lifeos:read"];
const WRITE = ["lifeos:write"];
const ECONOMY = ["lifeos:economy"];
const AI = ["lifeos:ai"];

function action(schema: z.ZodTypeAny) {
  return z.intersection(schema, z.object({ idempotencyKey }));
}

function identity(extra: HandlerExtra, scopes: string[], aliases: string[] = []) {
  const auth = extra.authInfo;
  const userId = auth?.extra?.userId;
  if (!auth || typeof userId !== "string") throw new Error("Authentication is required");
  if (![...scopes, ...aliases].some((scope) => auth.scopes.includes(scope))) {
    throw new Error(`Missing required scope: ${scopes.join(" or ")}`);
  }
  return { userId, clientId: auth.clientId };
}

function output(data: unknown) {
  const payload = { data };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function omit(args: Args, keys: string[]) {
  return Object.fromEntries(Object.entries(args).filter(([key]) => !keys.includes(key)));
}

function path(template: string, args: Args) {
  return template.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_match, key: string) => {
    const value = args[key];
    if (typeof value !== "string" || !value) throw new Error(`Missing route parameter: ${key}`);
    return encodeURIComponent(value);
  });
}

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  method: Method;
  route: string;
  schema: z.ZodTypeAny;
  scopes: string[];
  aliases?: string[];
  pathKeys?: string[];
  queryKeys?: string[];
  query?: (args: Args) => Record<string, string | number | boolean | null | undefined>;
  body?: (args: Args) => unknown;
  destructive?: boolean;
  openWorld?: boolean;
};

const definitions: ToolDefinition[] = [
  // Overview and read-only state
  { name: "get_dashboard", title: "Get dashboard", description: "Get the user's current LifeOS dashboard, priorities, currencies, and progress.", method: "GET", route: "/api/dashboard", schema: empty, scopes: READ },
  { name: "get_analytics", title: "Get analytics", description: "Get the user's LifeOS analytics and trend summaries.", method: "GET", route: "/api/analytics", schema: empty, scopes: READ },
  { name: "list_areas", title: "List life areas", description: "List active life areas and resolve their IDs.", method: "GET", route: "/api/areas", schema: empty, scopes: READ },
  { name: "list_tasks", title: "List tasks", description: "List tasks, optionally filtered by status or project.", method: "GET", route: "/api/tasks", schema: z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(), projectId: z.string().optional() }), scopes: READ, queryKeys: ["status", "projectId"] },
  { name: "list_habits", title: "List habits", description: "List the user's active habits and recent ticks.", method: "GET", route: "/api/habits", schema: empty, scopes: READ },
  { name: "list_routines", title: "List routines", description: "List active routines and completion state.", method: "GET", route: "/api/routines", schema: empty, scopes: READ },
  { name: "list_goals", title: "List goals", description: "List goals and key results, optionally filtered by status.", method: "GET", route: "/api/goals", schema: z.object({ status: z.enum(["active", "done", "paused", "archived"]).optional() }), scopes: READ, queryKeys: ["status"] },
  { name: "list_projects", title: "List projects", description: "List projects and resolve project IDs, optionally filtered by status.", method: "GET", route: "/api/projects", schema: z.object({ status: z.enum(["idea", "active", "paused", "done", "archived"]).optional() }), scopes: READ, queryKeys: ["status"] },
  { name: "search_notes", title: "Search notes", description: "Search or filter notes by text, kind, tag, linked entity, or archived state.", method: "GET", route: "/api/notes", schema: z.object({ q: z.string().max(200).optional(), kind: z.enum(["note", "folder", "highlight", "quote", "link", "inspiration"]).optional(), tag: z.string().max(40).optional(), areaId: z.string().optional(), projectId: z.string().optional(), goalId: z.string().optional(), archived: z.boolean().optional() }), scopes: READ, query: (a) => ({ q: a.q as string, kind: a.kind as string, tag: a.tag as string, areaId: a.areaId as string, projectId: a.projectId as string, goalId: a.goalId as string, archived: a.archived ? 1 : undefined }) },
  { name: "get_note", title: "Get note", description: "Read one note or knowledge-base page by exact ID.", method: "GET", route: "/api/notes/:id", schema: idOnly, scopes: READ, pathKeys: ["id"] },
  { name: "get_notes_tree", title: "Get notes tree", description: "Get the note hierarchy, optionally flattened or searched.", method: "GET", route: "/api/notes/tree", schema: z.object({ archived: z.boolean().optional(), flat: z.boolean().optional(), q: z.string().max(200).optional() }), scopes: READ, query: (a) => ({ archived: a.archived ? 1 : undefined, flat: a.flat ? 1 : undefined, q: a.q as string }) },
  { name: "list_principles", title: "List principles", description: "List the user's decision and life principles.", method: "GET", route: "/api/principles", schema: z.object({ archived: z.boolean().optional() }), scopes: READ, query: (a) => ({ archived: a.archived ? 1 : undefined }) },
  { name: "list_decisions", title: "List decisions", description: "List decision records, optionally filtered by status.", method: "GET", route: "/api/decisions", schema: z.object({ status: z.enum(["open", "decided", "reviewed"]).optional() }), scopes: READ, queryKeys: ["status"] },
  { name: "list_reviews", title: "List reviews", description: "List daily, weekly, monthly, or quarterly reviews.", method: "GET", route: "/api/review", schema: z.object({ kind: z.enum(["daily", "weekly", "monthly", "quarterly"]).optional(), limit: z.number().int().min(1).max(100).optional() }), scopes: READ, queryKeys: ["kind", "limit"] },
  { name: "get_week_summary", title: "Get week summary", description: "Get the computed summary for the current review week.", method: "GET", route: "/api/review/week-summary", schema: empty, scopes: READ },
  { name: "list_rewards", title: "List reward catalog", description: "List the user's reward-shop items.", method: "GET", route: "/api/rewards", schema: empty, scopes: READ },
  { name: "get_inventory", title: "Get inventory", description: "Get owned rewards, achievements, titles, and equipment inventory.", method: "GET", route: "/api/inventory", schema: empty, scopes: READ },
  { name: "list_achievements", title: "List achievements", description: "List achievement definitions and unlock state.", method: "GET", route: "/api/achievements", schema: empty, scopes: READ },
  { name: "list_events", title: "List events", description: "List events, missions, progress, and claim state.", method: "GET", route: "/api/events", schema: empty, scopes: READ },
  { name: "get_battle_pass", title: "Get battle pass", description: "Get battle-pass level progress and claim state.", method: "GET", route: "/api/battlepass", schema: empty, scopes: READ },
  { name: "get_gacha_status", title: "Get gacha status", description: "Get wish pool, pity state, fate balance, and recent results.", method: "GET", route: "/api/gacha", schema: empty, scopes: READ },
  { name: "get_assets", title: "Get wallet", description: "Get wallet balances, plan settings, and current financial summary.", method: "GET", route: "/api/assets", schema: empty, scopes: READ },
  { name: "list_asset_transactions", title: "List wallet transactions", description: "List and filter wallet transactions.", method: "GET", route: "/api/assets/transactions", schema: z.object({ type: z.enum(["income", "expense", "refund", "transfer"]).optional(), necessity: z.enum(["essential", "optional"]).optional(), pool: z.enum(["living", "savings", "flexible"]).optional(), month: z.string().regex(/^\d{4}-\d{2}$/).optional() }), scopes: READ, queryKeys: ["type", "necessity", "pool", "month"] },
  { name: "list_equipment", title: "List equipment", description: "List equipment and the currently equipped frame.", method: "GET", route: "/api/equipment", schema: empty, scopes: READ },
  { name: "list_titles", title: "List titles", description: "List titles and the currently equipped title.", method: "GET", route: "/api/titles", schema: empty, scopes: READ },
  { name: "get_commissions", title: "Get daily commissions", description: "Get today's four generated commissions and completion state.", method: "GET", route: "/api/commissions/today", schema: empty, scopes: READ },
  { name: "get_profile", title: "Get profile", description: "Get the user's profile, vision, values, and game attributes.", method: "GET", route: "/api/user", schema: empty, scopes: READ },
  { name: "get_resin", title: "Get AI resin", description: "Get the current AI-resin balance and regeneration state.", method: "GET", route: "/api/resin", schema: empty, scopes: READ },
  { name: "get_freezes", title: "Get freeze inventory", description: "Get habit-freeze inventory and purchase status.", method: "GET", route: "/api/freeze", schema: empty, scopes: READ },

  // Tasks, habits, and routines
  { name: "create_task", title: "Create task", description: "Create a specific task with optional links and rewards.", method: "POST", route: "/api/tasks", schema: action(TaskCreateSchema), scopes: WRITE, aliases: ["tasks:write"] },
  { name: "update_task", title: "Update task", description: "Update fields or status on an existing task.", method: "PATCH", route: "/api/tasks/:id", schema: action(TaskUpdateSchema.extend({ id })), scopes: WRITE, aliases: ["tasks:write"], pathKeys: ["id"] },
  { name: "delete_task", title: "Delete task", description: "Permanently delete one task by exact ID.", method: "DELETE", route: "/api/tasks/:id", schema: action(idOnly), scopes: WRITE, aliases: ["tasks:write"], pathKeys: ["id"], destructive: true },
  { name: "complete_task", title: "Complete task", description: "Complete one task and grant its configured rewards.", method: "POST", route: "/api/tasks/:id/complete", schema: action(idOnly), scopes: WRITE, aliases: ["tasks:write"], pathKeys: ["id"] },
  { name: "create_habit", title: "Create habit", description: "Create a positive, negative, or bidirectional habit.", method: "POST", route: "/api/habits", schema: action(HabitCreateSchema), scopes: WRITE },
  { name: "update_habit", title: "Update habit", description: "Update an existing habit's configuration.", method: "PATCH", route: "/api/habits/:id", schema: action(HabitCreateSchema.partial().extend({ id })), scopes: WRITE, pathKeys: ["id"] },
  { name: "archive_habit", title: "Archive habit", description: "Archive a habit so it no longer appears as active.", method: "DELETE", route: "/api/habits/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "tick_habit", title: "Tick habit", description: "Record or toggle a positive or negative habit tick for a civil day.", method: "POST", route: "/api/habits/:id/tick", schema: action(HabitTickSchema.and(idOnly)), scopes: WRITE, pathKeys: ["id"] },
  { name: "create_routine", title: "Create routine", description: "Create a recurring weekly routine.", method: "POST", route: "/api/routines", schema: action(RoutineCreateSchema), scopes: WRITE },
  { name: "update_routine", title: "Update routine", description: "Update an existing routine's schedule or rewards.", method: "PATCH", route: "/api/routines/:id", schema: action(RoutineCreateSchema.partial().extend({ id })), scopes: WRITE, pathKeys: ["id"] },
  { name: "archive_routine", title: "Archive routine", description: "Archive a routine so it is no longer active.", method: "DELETE", route: "/api/routines/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "complete_routine", title: "Complete routine", description: "Complete a routine for today and grant rewards.", method: "POST", route: "/api/routines/:id/complete", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"] },

  // Goals, projects, and knowledge
  { name: "create_goal", title: "Create goal", description: "Create a goal with its initial key results.", method: "POST", route: "/api/goals", schema: action(GoalCreateSchema), scopes: WRITE, aliases: ["goals:write"] },
  { name: "update_goal", title: "Update goal", description: "Update an existing goal's objective, status, or metadata.", method: "PATCH", route: "/api/goals/:id", schema: action(GoalUpdateSchema.extend({ id })), scopes: WRITE, aliases: ["goals:write"], pathKeys: ["id"] },
  { name: "delete_goal", title: "Delete goal", description: "Permanently delete one goal by exact ID.", method: "DELETE", route: "/api/goals/:id", schema: action(idOnly), scopes: WRITE, aliases: ["goals:write"], pathKeys: ["id"], destructive: true },
  { name: "update_key_result", title: "Update key result", description: "Update a key result's wording, target, or current value.", method: "PATCH", route: "/api/goals/:id/kr/:krId", schema: action(KRUpdateSchema.extend({ id, krId: id })), scopes: WRITE, aliases: ["goals:write"], pathKeys: ["id", "krId"] },
  { name: "delete_key_result", title: "Delete key result", description: "Permanently delete a key result from a goal.", method: "DELETE", route: "/api/goals/:id/kr/:krId", schema: action(z.object({ id, krId: id })), scopes: WRITE, aliases: ["goals:write"], pathKeys: ["id", "krId"], destructive: true },
  { name: "create_project", title: "Create project", description: "Create a project linked to an optional area or goal.", method: "POST", route: "/api/projects", schema: action(ProjectCreateSchema), scopes: WRITE },
  { name: "update_project", title: "Update project", description: "Update a project's definition, dates, links, status, or rewards.", method: "PATCH", route: "/api/projects/:id", schema: action(ProjectUpdateSchema.extend({ id })), scopes: WRITE, pathKeys: ["id"] },
  { name: "delete_project", title: "Delete project", description: "Permanently delete one project by exact ID.", method: "DELETE", route: "/api/projects/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "create_note", title: "Create note", description: "Create a note, folder, highlight, quote, link, or inspiration page.", method: "POST", route: "/api/notes", schema: action(NoteCreateSchema), scopes: WRITE },
  { name: "update_note", title: "Update note", description: "Update a note's content, metadata, links, or archive state.", method: "PATCH", route: "/api/notes/:id", schema: action(NoteUpdateSchema.extend({ id })), scopes: WRITE, pathKeys: ["id"] },
  { name: "delete_note", title: "Delete note", description: "Permanently delete one note or page by exact ID.", method: "DELETE", route: "/api/notes/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "move_note", title: "Move note", description: "Move a note within the knowledge tree and set its sibling position.", method: "POST", route: "/api/notes/:id/move", schema: action(NoteMoveSchema.and(idOnly)), scopes: WRITE, pathKeys: ["id"] },
  { name: "create_principle", title: "Create principle", description: "Create a reusable personal principle.", method: "POST", route: "/api/principles", schema: action(PrincipleCreateSchema), scopes: WRITE },
  { name: "update_principle", title: "Update principle", description: "Update or archive a personal principle.", method: "PATCH", route: "/api/principles/:id", schema: action(PrincipleUpdateSchema.extend({ id })), scopes: WRITE, pathKeys: ["id"] },
  { name: "delete_principle", title: "Delete principle", description: "Permanently delete one principle by exact ID.", method: "DELETE", route: "/api/principles/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },

  // Decisions and reviews
  { name: "create_decision", title: "Create decision", description: "Create a structured decision record with options and probabilities.", method: "POST", route: "/api/decisions", schema: action(DecisionCreateSchema), scopes: WRITE },
  { name: "update_decision", title: "Update decision", description: "Update a decision record, selected option, or status.", method: "PATCH", route: "/api/decisions/:id", schema: action(DecisionUpdateSchema.extend({ id })), scopes: WRITE, pathKeys: ["id"] },
  { name: "delete_decision", title: "Delete decision", description: "Permanently delete one decision record.", method: "DELETE", route: "/api/decisions/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "review_decision", title: "Review decision", description: "Record the outcome, lesson, and rating for a prior decision.", method: "POST", route: "/api/decisions/:id/review", schema: action(DecisionReviewSchema.and(idOnly)), scopes: WRITE, pathKeys: ["id"] },
  { name: "create_review", title: "Create review", description: "Create a daily, weekly, monthly, or quarterly reflection.", method: "POST", route: "/api/review", schema: action(ReviewCreateSchema), scopes: WRITE },

  // Reward catalog, inventory, and game systems
  { name: "create_reward", title: "Create reward item", description: "Create an item in the personal reward catalog.", method: "POST", route: "/api/rewards", schema: action(RewardItemSchema), scopes: WRITE },
  { name: "update_reward", title: "Update reward item", description: "Update a reward item's pricing, category, image, or gacha settings.", method: "PATCH", route: "/api/rewards/:id", schema: action(RewardItemUpdateSchema.and(idOnly)), scopes: WRITE, pathKeys: ["id"] },
  { name: "archive_reward", title: "Archive reward item", description: "Archive a reward item so it is no longer sold.", method: "DELETE", route: "/api/rewards/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "redeem_reward", title: "Redeem reward", description: "Spend the configured money or gold to redeem one reward item.", method: "POST", route: "/api/rewards/:id/redeem", schema: action(idOnly), scopes: ECONOMY, pathKeys: ["id"], destructive: true },
  { name: "manage_inventory_reward", title: "Manage inventory reward", description: "Fulfill, use, or discard one redeemed inventory reward.", method: "PATCH", route: "/api/inventory/rewards/:id", schema: action(z.object({ id, action: z.enum(["fulfill", "use", "discard"]), note: z.string().max(500).optional().nullable() })), scopes: ECONOMY, pathKeys: ["id"], destructive: true },
  { name: "equip_title", title: "Equip title", description: "Equip an owned title, or pass null to unequip it.", method: "POST", route: "/api/titles/equip", schema: action(z.object({ key: z.string().min(1).max(80).nullable() })), scopes: WRITE },
  { name: "equip_equipment", title: "Equip frame", description: "Equip an owned frame, or pass null to unequip it.", method: "POST", route: "/api/equipment/equip", schema: action(z.object({ key: z.string().min(1).max(80).nullable() })), scopes: WRITE },
  { name: "create_custom_achievement", title: "Create achievement", description: "Create a custom achievement definition for the user.", method: "POST", route: "/api/achievements/custom", schema: action(CustomAchievementCreateSchema), scopes: WRITE },
  { name: "delete_custom_achievement", title: "Delete custom achievement", description: "Delete one user-owned custom achievement definition.", method: "DELETE", route: "/api/achievements/custom/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "unlock_achievement", title: "Unlock achievement", description: "Explicitly unlock an eligible achievement and grant its rewards.", method: "POST", route: "/api/achievements/:id/unlock", schema: action(idOnly), scopes: ECONOMY, pathKeys: ["id"] },
  { name: "create_custom_event", title: "Create event", description: "Create a custom timed event with missions and bonus rewards.", method: "POST", route: "/api/events/custom", schema: action(CustomEventCreateSchema), scopes: WRITE },
  { name: "delete_custom_event", title: "Delete custom event", description: "Delete one user-owned custom event.", method: "DELETE", route: "/api/events/custom/:id", schema: action(idOnly), scopes: WRITE, pathKeys: ["id"], destructive: true },
  { name: "claim_event_reward", title: "Claim event reward", description: "Claim a completed event mission or the __bonus__ reward.", method: "POST", route: "/api/events/:id/claim", schema: action(z.object({ id, missionKey: z.string().min(1).max(80) })), scopes: ECONOMY, pathKeys: ["id"] },
  { name: "claim_battle_pass", title: "Claim battle-pass reward", description: "Claim one earned battle-pass level reward.", method: "POST", route: "/api/battlepass/claim", schema: action(z.object({ level: z.number().int().min(1).max(20) })), scopes: ECONOMY },
  { name: "regenerate_commissions", title: "Regenerate commissions", description: "Replace today's generated commission set.", method: "POST", route: "/api/commissions/today", schema: action(empty), scopes: WRITE, destructive: true },
  { name: "complete_commission", title: "Complete commission", description: "Complete one daily commission, cascade its source action, and grant rewards.", method: "POST", route: "/api/commissions/complete", schema: action(z.object({ itemId: id })), scopes: ECONOMY },
  { name: "buy_freeze", title: "Buy habit freeze", description: "Spend gold to buy one habit-freeze item.", method: "POST", route: "/api/freeze", schema: action(empty), scopes: ECONOMY, destructive: true },
  { name: "pull_gacha", title: "Make wish", description: "Spend fate for one or ten gacha pulls with server-side pity rules.", method: "POST", route: "/api/gacha/pull", schema: action(GachaPullSchema), scopes: ECONOMY, destructive: true },

  // Wallet and profile
  { name: "initialize_wallet", title: "Initialize wallet", description: "Initialize wallet balances and allocation settings.", method: "POST", route: "/api/assets/initialize", schema: action(WalletInitializationSchema), scopes: ECONOMY },
  { name: "update_wallet_settings", title: "Update wallet settings", description: "Update living target, savings rate, and carry policy.", method: "PUT", route: "/api/assets/settings", schema: action(WalletSettingsUpdateSchema), scopes: ECONOMY },
  { name: "create_asset_transaction", title: "Create wallet transaction", description: "Create an income, expense, or transfer transaction.", method: "POST", route: "/api/assets/transactions", schema: action(WalletTransactionCreateSchema), scopes: ECONOMY, destructive: true },
  { name: "update_asset_transaction", title: "Update wallet transaction", description: "Replace an existing wallet transaction with corrected values.", method: "PATCH", route: "/api/assets/transactions/:id", schema: action(WalletTransactionCreateSchema.and(idOnly)), scopes: ECONOMY, pathKeys: ["id"], destructive: true },
  { name: "delete_asset_transaction", title: "Delete wallet transaction", description: "Permanently delete a wallet transaction and reverse its ledger effect.", method: "DELETE", route: "/api/assets/transactions/:id", schema: action(idOnly), scopes: ECONOMY, pathKeys: ["id"], destructive: true },
  { name: "refund_asset_transaction", title: "Refund wallet transaction", description: "Create a refund for one eligible expense transaction.", method: "POST", route: "/api/assets/transactions/:id/refund", schema: action(idOnly), scopes: ECONOMY, pathKeys: ["id"] },
  { name: "rollover_wallet", title: "Rollover wallet month", description: "Process the prior month's living-fund surplus according to wallet rules.", method: "POST", route: "/api/assets/rollover", schema: action(empty), scopes: ECONOMY, destructive: true },
  { name: "update_profile", title: "Update profile", description: "Update profile basics, class, vision, values, identities, or onboarding state.", method: "PATCH", route: "/api/user", schema: action(UserUpdateSchema), scopes: WRITE },

  // Resin-spending AI tools. These call the configured external model.
  { name: "decision_coach", title: "Run decision coach", description: "Spend AI resin to analyze a saved decision or inline draft.", method: "POST", route: "/api/ai/decision-coach", schema: action(z.object({ decisionId: z.string().min(1).optional(), draft: z.object({ title: z.string().min(1).max(200), context: z.string().min(1).max(4000), stakes: z.enum(["low", "medium", "high"]).default("medium"), options: z.array(DecisionOptionSchema).min(2).max(6) }).optional() }).refine((v) => Boolean(v.decisionId || v.draft), "Provide decisionId or draft")), scopes: AI, destructive: true, openWorld: true },
  { name: "schedule_coach", title: "Run schedule coach", description: "Spend AI resin for focused suggestions from a supplied day schedule.", method: "POST", route: "/api/ai/schedule-coach", schema: action(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), schedules: z.array(z.object({ title: z.string().max(200), startTime: z.string().max(8).nullable(), endTime: z.string().max(8).nullable(), area: z.string().max(80).nullable(), completed: z.boolean() })).max(40), tasks: z.array(z.object({ title: z.string().max(200), status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]), priority: z.number().int().min(0).max(10), dueDate: z.string().max(40).nullable(), area: z.string().max(80).nullable() })).max(40) })), scopes: AI, destructive: true, openWorld: true },
  { name: "weekly_coach", title: "Run weekly coach", description: "Spend AI resin to generate the current weekly coaching review.", method: "GET", route: "/api/ai/weekly-coach", schema: action(empty), scopes: AI, destructive: true, openWorld: true },
  { name: "monthly_review_coach", title: "Run monthly review coach", description: "Spend AI resin to generate a monthly review for YYYY-MM.", method: "GET", route: "/api/ai/monthly-review", schema: action(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() })), scopes: AI, queryKeys: ["month"], destructive: true, openWorld: true },
  { name: "quarterly_review_coach", title: "Run quarterly review coach", description: "Spend AI resin to generate a quarterly review such as Q3-2026.", method: "GET", route: "/api/ai/quarterly-review", schema: action(z.object({ quarter: z.string().regex(/^Q[1-4]-\d{4}$/).optional() })), scopes: AI, queryKeys: ["quarter"], destructive: true, openWorld: true },
];

export function registerLifeOsTools(server: McpServer, apiOrigin: string) {
  for (const definition of definitions) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.schema,
        outputSchema: z.object({ data: z.unknown() }),
        annotations: {
          readOnlyHint: definition.scopes === READ,
          destructiveHint: definition.destructive ?? false,
          idempotentHint: definition.method === "GET" ? true : true,
          openWorldHint: definition.openWorld ?? false,
        },
      },
      async (rawArgs, extra) => {
        const args = definition.schema.parse(rawArgs) as Args;
        const actor = identity(extra, definition.scopes, definition.aliases);
        const key = typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined;
        const pathKeys = definition.pathKeys ?? [];
        const queryKeys = definition.queryKeys ?? [];
        const query = definition.query
          ? definition.query(args)
          : Object.fromEntries(queryKeys.map((name) => [name, args[name]])) as Record<string, string | number | boolean | null | undefined>;
        const body = definition.body
          ? definition.body(args)
          : definition.method === "GET" || definition.method === "DELETE"
            ? undefined
            : omit(args, ["idempotencyKey", ...pathKeys, ...queryKeys]);
        const execute = () => callLifeOsApi({
          apiOrigin,
          userId: actor.userId,
          method: definition.method,
          path: path(definition.route, args),
          query,
          body,
          idempotencyKey: key,
        });

        if (!key) return output(await execute());
        return output(await runAuditedAction({
          ...actor,
          toolName: definition.name,
          idempotencyKey: key,
          arguments: omit(args, ["idempotencyKey"]),
          execute,
        }));
      },
    );
  }

  registerUploadTool(server, apiOrigin);
}

function registerUploadTool(server: McpServer, apiOrigin: string) {
  const schema = action(z.object({
    fileName: z.string().min(1).max(180),
    mimeType: z.enum([
      "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
      "audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/ogg",
      "audio/wav", "audio/x-wav", "audio/wave", "audio/webm", "audio/x-m4a",
    ]),
    base64: z.string().min(4).max(21_000_000).describe("Raw base64 file bytes without a data-URL prefix"),
  }));

  server.registerTool(
    "upload_media",
    {
      title: "Upload media",
      description: "Upload an image (max 4 MB) or audio file (max 15 MB) to the configured LifeOS media backend.",
      inputSchema: schema,
      outputSchema: z.object({ data: z.unknown() }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (rawArgs, extra) => {
      const args = schema.parse(rawArgs);
      const actor = identity(extra, WRITE);
      const bytes = Buffer.from(args.base64, "base64");
      const limit = args.mimeType.startsWith("audio/") ? 15 * 1024 * 1024 : 4 * 1024 * 1024;
      if (bytes.length > limit) throw new Error(`File exceeds the ${limit / 1024 / 1024} MB upload limit`);
      const formData = new FormData();
      formData.set("file", new File([bytes], args.fileName, { type: args.mimeType }));
      const data = await runAuditedAction({
        ...actor,
        toolName: "upload_media",
        idempotencyKey: args.idempotencyKey,
        arguments: { fileName: args.fileName, mimeType: args.mimeType, bytes: bytes.length },
        execute: () => callLifeOsApi({
          apiOrigin,
          userId: actor.userId,
          method: "POST",
          path: "/api/upload",
          formData,
          idempotencyKey: args.idempotencyKey,
        }),
      });
      return output(data);
    },
  );
}

export const LIFEOS_MCP_TOOL_COUNT = definitions.length + 1;
