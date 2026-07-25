import type { PrismaClient } from "@prisma/client";
import type { GoalCreateInput } from "@lifeos/contracts/goals";

export class GoalLinkError extends Error {}

export async function createGoal(
  db: PrismaClient,
  userId: string,
  data: GoalCreateInput,
) {
  if (data.areaId) {
    const area = await db.area.findFirst({
      where: { id: data.areaId, userId, archived: false },
      select: { id: true },
    });
    if (!area) throw new GoalLinkError("Area not found or not yours");
  }

  const now = new Date();
  const startDate = data.startDate ? new Date(data.startDate) : now;
  const endDate = data.endDate
    ? new Date(data.endDate)
    : new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
  if (endDate <= startDate) {
    throw new GoalLinkError("Goal end date must be after its start date");
  }

  return db.goal.create({
    data: {
      userId,
      type: data.type,
      objective: data.objective,
      notes: data.notes ?? null,
      areaId: data.areaId ?? null,
      timeframe: data.timeframe,
      startDate,
      endDate,
      confidence: data.confidence ?? 5,
      keyResults: {
        create: (data.keyResults ?? []).map((kr, index) => ({
          description: kr.description,
          unit: kr.unit ?? null,
          target: kr.target,
          current: kr.current ?? 0,
          order: index,
        })),
      },
    },
    include: { keyResults: true, area: true, projects: true },
  });
}
