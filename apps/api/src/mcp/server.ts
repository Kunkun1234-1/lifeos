import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { TaskCreateSchema } from "@lifeos/contracts/tasks";
import { GoalCreateSchema } from "@lifeos/contracts/goals";
import { completeTask, createTask, listTasks } from "@lifeos/domain/tasks";
import { createGoal } from "@lifeos/domain/goals";
import { prisma } from "@/lib/prisma";
import { runAuditedAction } from "./audit";

type HandlerExtra = { authInfo?: AuthInfo };

const idempotencyKey = z.string().min(8).max(128).describe(
  "A unique stable key for this exact requested action. Reuse it only when retrying the same action.",
);

const taskOutput = {
  id: z.string(),
  title: z.string(),
  status: z.string(),
  priority: z.number(),
  dueDate: z.string().nullable(),
  areaId: z.string().nullable(),
  projectId: z.string().nullable(),
};

function identity(extra: HandlerExtra, scope: string) {
  const auth = extra.authInfo;
  const userId = auth?.extra?.userId;
  if (!auth || typeof userId !== "string") throw new Error("Authentication is required");
  if (!auth.scopes.includes(scope)) throw new Error(`Missing required scope: ${scope}`);
  return { userId, clientId: auth.clientId };
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function taskView(task: {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: Date | string | null;
  areaId: string | null;
  projectId: string | null;
}) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: iso(task.dueDate),
    areaId: task.areaId,
    projectId: task.projectId,
  };
}

function result(content: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(content, null, 2) }],
    structuredContent: content as Record<string, unknown>,
  };
}

export function createLifeOsMcpServer() {
  const server = new McpServer(
    { name: "lifeos", version: "1.0.0" },
    {
      instructions:
        "Manage the authenticated user's LifeOS. Read tools may be used to resolve IDs. Before write tools, confirm the intended change with the user and provide a unique idempotencyKey. Never invent area, project, goal, or task IDs.",
    },
  );

  server.registerTool(
    "list_areas",
    {
      title: "List life areas",
      description: "Use this to view the user's active LifeOS areas and resolve an area ID before creating work.",
      inputSchema: {},
      outputSchema: { areas: z.array(z.object({ id: z.string(), name: z.string(), archived: z.boolean() })) },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async (_args, extra) => {
      const { userId } = identity(extra, "lifeos:read");
      const areas = await prisma.area.findMany({
        where: { userId, archived: false },
        select: { id: true, name: true, archived: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      return result({ areas });
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "Use this to view the user's projects and resolve a project ID for a task.",
      inputSchema: {
        status: z.string().max(40).optional().describe("Optional exact project status filter"),
      },
      outputSchema: {
        projects: z.array(z.object({
          id: z.string(), title: z.string(), status: z.string(), areaId: z.string().nullable(), goalId: z.string().nullable(),
        })),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ status }, extra) => {
      const { userId } = identity(extra, "lifeos:read");
      const projects = await prisma.project.findMany({
        where: { userId, ...(status ? { status } : {}) },
        select: { id: true, title: true, status: true, areaId: true, goalId: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      return result({ projects });
    },
  );

  server.registerTool(
    "list_goals",
    {
      title: "List goals",
      description: "Use this to view current goals, their timeframes, and IDs before planning related work.",
      inputSchema: { status: z.string().max(40).optional().describe("Optional exact goal status filter") },
      outputSchema: {
        goals: z.array(z.object({
          id: z.string(), objective: z.string(), status: z.string(), type: z.string(), timeframe: z.string(), areaId: z.string().nullable(),
        })),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ status }, extra) => {
      const { userId } = identity(extra, "lifeos:read");
      const goals = await prisma.goal.findMany({
        where: { userId, ...(status ? { status } : {}) },
        select: { id: true, objective: true, status: true, type: true, timeframe: true, areaId: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      return result({ goals });
    },
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "Use this to view the user's tasks or resolve a task ID before completing it.",
      inputSchema: {
        status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
        projectId: z.string().optional(),
      },
      outputSchema: { tasks: z.array(z.object(taskOutput)) },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ status, projectId }, extra) => {
      const { userId } = identity(extra, "lifeos:read");
      const tasks = await listTasks(prisma, userId, { status, projectId, limit: 100 });
      return result({ tasks: tasks.map(taskView) });
    },
  );

  server.registerTool(
    "create_task",
    {
      title: "Create a task",
      description: "Use this only after the user asks to create a specific task. An area or project ID must come from a read tool or the user.",
      inputSchema: {
        idempotencyKey,
        title: TaskCreateSchema.shape.title,
        notes: TaskCreateSchema.shape.notes,
        areaId: TaskCreateSchema.shape.areaId,
        projectId: TaskCreateSchema.shape.projectId,
        priority: TaskCreateSchema.shape.priority,
        dueDate: TaskCreateSchema.shape.dueDate,
      },
      outputSchema: { task: z.object(taskOutput) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ idempotencyKey: key, ...args }, extra) => {
      const actor = identity(extra, "tasks:write");
      const parsed = TaskCreateSchema.parse(args);
      const created = await runAuditedAction({
        ...actor,
        toolName: "create_task",
        idempotencyKey: key,
        arguments: parsed,
        execute: async () => ({ task: taskView(await createTask(prisma, actor.userId, parsed)) }),
      });
      return result(created);
    },
  );

  server.registerTool(
    "create_goal",
    {
      title: "Create a goal",
      description: "Use this only after the user asks to create a goal and has supplied or approved the objective, timeframe, and key results.",
      inputSchema: { idempotencyKey, ...GoalCreateSchema.shape },
      outputSchema: {
        goal: z.object({ id: z.string(), objective: z.string(), status: z.string(), timeframe: z.string(), areaId: z.string().nullable() }),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ idempotencyKey: key, ...args }, extra) => {
      const actor = identity(extra, "goals:write");
      const parsed = GoalCreateSchema.parse(args);
      const created = await runAuditedAction({
        ...actor,
        toolName: "create_goal",
        idempotencyKey: key,
        arguments: parsed,
        execute: async () => {
          const goal = await createGoal(prisma, actor.userId, parsed);
          return { goal: { id: goal.id, objective: goal.objective, status: goal.status, timeframe: goal.timeframe, areaId: goal.areaId } };
        },
      });
      return result(created);
    },
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete a task",
      description: "Use this only after the user explicitly asks to mark a known task complete. This also grants the task's configured rewards.",
      inputSchema: { idempotencyKey, taskId: z.string().min(1).describe("Exact task ID returned by list_tasks") },
      outputSchema: { task: z.object(taskOutput), reward: z.record(z.unknown()) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ idempotencyKey: key, taskId }, extra) => {
      const actor = identity(extra, "tasks:write");
      const completed = await runAuditedAction({
        ...actor,
        toolName: "complete_task",
        idempotencyKey: key,
        arguments: { taskId },
        execute: async () => {
          const completion = await completeTask(prisma, actor.userId, taskId);
          return {
            task: taskView(completion.task),
            reward: JSON.parse(JSON.stringify(completion.reward)) as Record<string, unknown>,
          };
        },
      });
      return result(completed);
    },
  );

  return server;
}
