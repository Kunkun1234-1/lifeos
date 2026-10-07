import { z } from "zod";
import { NullableDateTimeSchema } from "./common";

export const MilestoneStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
]);

export const MilestoneCreateSchema = z
  .object({
    projectId: z.string().min(1),
    title: z.string().min(1).max(200),
    notes: z.string().max(2000).optional().nullable(),
    acceptanceCriteria: z.string().max(4000).optional().nullable(),
    status: MilestoneStatusSchema.optional(),
    order: z.number().int().min(0).optional(),
    startDate: z.string().datetime().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.deadline ||
      new Date(value.deadline) >= new Date(value.startDate),
    {
      message: "Milestone deadline cannot be before its start date",
      path: ["deadline"],
    },
  );

export const MilestoneUpdateSchema = z
  .object({
    projectId: z.string().min(1).optional(),
    title: z.string().min(1).max(200).optional(),
    notes: z.string().max(2000).optional().nullable(),
    acceptanceCriteria: z.string().max(4000).optional().nullable(),
    status: MilestoneStatusSchema.optional(),
    order: z.number().int().min(0).optional(),
    startDate: z.string().datetime().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.deadline ||
      new Date(value.deadline) >= new Date(value.startDate),
    {
      message: "Milestone deadline cannot be before its start date",
      path: ["deadline"],
    },
  );

export const MilestoneResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  acceptanceCriteria: z.string().nullable(),
  status: MilestoneStatusSchema,
  order: z.number().int(),
  startDate: NullableDateTimeSchema,
  deadline: NullableDateTimeSchema,
  completedAt: NullableDateTimeSchema,
  createdAt: z.union([z.string().datetime(), z.date()]),
  updatedAt: z.union([z.string().datetime(), z.date()]),
});

export const MilestonesResponseSchema = z.array(MilestoneResponseSchema);

export type MilestoneCreateInput = z.infer<typeof MilestoneCreateSchema>;
export type MilestoneUpdateInput = z.infer<typeof MilestoneUpdateSchema>;
export type MilestoneResponse = z.infer<typeof MilestoneResponseSchema>;
export type MilestonesResponse = z.infer<typeof MilestonesResponseSchema>;
