import { z } from "zod";
import { AreaSummarySchema } from "./common";

export const AreasResponseSchema = z.array(AreaSummarySchema);

export type AreaResponse = z.infer<typeof AreaSummarySchema>;
export type AreasResponse = z.infer<typeof AreasResponseSchema>;
