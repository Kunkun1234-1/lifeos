import { z } from "zod";
import {
  AreaSummarySchema,
  NullableDateTimeSchema,
  ProjectSummarySchema,
} from "./common";

export const TaskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELED",
]);

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

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  status: TaskStatusSchema.optional(),
});

export const TaskResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  areaId: z.string().nullable(),
  projectId: z.string().nullable(),
  title: z.string(),
  notes: z.string().nullable(),
  status: TaskStatusSchema.or(z.string()),
  priority: z.number().int(),
  dueDate: NullableDateTimeSchema,
  xpReward: z.number().int(),
  goldReward: z.number().int(),
  completedAt: NullableDateTimeSchema,
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
  area: AreaSummarySchema.nullable(),
  project: ProjectSummarySchema.nullable(),
});

export const TasksResponseSchema = z.array(TaskResponseSchema);

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;
export type TaskResponse = z.infer<typeof TaskResponseSchema>;
export type TasksResponse = z.infer<typeof TasksResponseSchema>;
