import { z } from "zod";

export const GoalKeyResultCreateSchema = z
  .object({
    description: z.string().min(1).max(200),
    unit: z.string().max(40).optional().nullable(),
    target: z.number().min(0).max(100000),
    current: z.number().min(0).max(100000).default(0),
  })
  .refine((value) => value.current <= value.target, {
    message: "Current progress cannot exceed the target",
    path: ["current"],
  });

export const GoalCreateSchema = z.object({
  objective: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  type: z.enum(["okr", "milestone", "main"]).default("okr"),
  areaId: z.string().optional().nullable(),
  timeframe: z.string().min(1).max(40),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  confidence: z.number().int().min(1).max(10).optional(),
  keyResults: z.array(GoalKeyResultCreateSchema).max(6).optional(),
});

export type GoalCreateInput = z.infer<typeof GoalCreateSchema>;
