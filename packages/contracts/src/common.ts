import { z } from "zod";

export const NullableDateTimeSchema = z
  .union([z.string().datetime(), z.date()])
  .nullable();

export const AreaSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  weight: z.number(),
  healthScore: z.number().int(),
  attributeKey: z.string(),
  attributeXp: z.number().int(),
  order: z.number().int(),
  archived: z.boolean(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});

export const ProjectSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  areaId: z.string().nullable(),
  goalId: z.string().nullable(),
  title: z.string(),
  deliverable: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  startDate: NullableDateTimeSchema,
  deadline: NullableDateTimeSchema,
  completedAt: NullableDateTimeSchema,
  xpReward: z.number().int(),
  goldReward: z.number().int(),
  gemsReward: z.number().int(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});
