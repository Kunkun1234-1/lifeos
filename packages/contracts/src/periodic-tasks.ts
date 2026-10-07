import { z } from "zod";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const PeriodicTaskFrequencySchema = z.enum([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
]);

export const PeriodicTaskListQuerySchema = z.object({
  frequency: PeriodicTaskFrequencySchema,
  date: z.string().regex(YMD).optional(),
});

export const DailyTaskWeekQuerySchema = z.object({
  date: z.string().regex(YMD).optional(),
});

export const PeriodicTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  areaId: z.string().min(1).optional().nullable(),
  frequency: PeriodicTaskFrequencySchema,
  xpReward: z.number().int().min(0).max(10000).optional(),
  goldReward: z.number().int().min(0).max(10000).optional(),
});

export const PeriodicTaskUpdateSchema = PeriodicTaskCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const PeriodicTaskCheckInSchema = z.object({
  completed: z.boolean(),
  periodKey: z.string().regex(YMD).optional(),
});

export const PeriodicTaskAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
});

export const PeriodicTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  areaId: z.string().nullable(),
  area: PeriodicTaskAreaSchema.nullable(),
  frequency: PeriodicTaskFrequencySchema,
  xpReward: z.number().int(),
  goldReward: z.number().int(),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PeriodicTasksSnapshotSchema = z.object({
  frequency: PeriodicTaskFrequencySchema,
  periodStart: z.string().regex(YMD),
  periodEnd: z.string().regex(YMD),
  today: z.string().regex(YMD),
  timeZone: z.string(),
  tasks: z.array(PeriodicTaskSchema),
});

export const DailyTaskWeekTaskSchema = PeriodicTaskSchema.extend({
  availableFrom: z.string().regex(YMD),
  completedDates: z.array(z.string().regex(YMD)),
});

export const DailyTaskWeekSnapshotSchema = z.object({
  periodStart: z.string().regex(YMD),
  periodEnd: z.string().regex(YMD),
  today: z.string().regex(YMD),
  timeZone: z.string(),
  days: z.array(z.string().regex(YMD)).length(7),
  tasks: z.array(DailyTaskWeekTaskSchema),
});

export type PeriodicTaskFrequency = z.infer<typeof PeriodicTaskFrequencySchema>;
export type PeriodicTaskListQuery = z.infer<typeof PeriodicTaskListQuerySchema>;
export type DailyTaskWeekQuery = z.infer<typeof DailyTaskWeekQuerySchema>;
export type PeriodicTaskCreateInput = z.infer<typeof PeriodicTaskCreateSchema>;
export type PeriodicTaskUpdateInput = z.infer<typeof PeriodicTaskUpdateSchema>;
export type PeriodicTaskCheckInInput = z.infer<typeof PeriodicTaskCheckInSchema>;
export type PeriodicTaskDTO = z.infer<typeof PeriodicTaskSchema>;
export type PeriodicTasksSnapshot = z.infer<typeof PeriodicTasksSnapshotSchema>;
export type DailyTaskWeekTask = z.infer<typeof DailyTaskWeekTaskSchema>;
export type DailyTaskWeekSnapshot = z.infer<typeof DailyTaskWeekSnapshotSchema>;
