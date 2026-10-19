import { NextResponse, after } from "next/server";
import { grantRewardInTransaction } from "@lifeos/domain/rewards";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { safeCheck } from "@/lib/achievements";
import { ProjectTaskBoardOrderSchema } from "@/lib/validators";

const TASK_INCLUDE = {
  area: true,
  project: true,
  milestone: { select: { id: true, title: true } },
} as const;

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  const data = ProjectTaskBoardOrderSchema.parse(await req.json());
  const ids = data.tasks.map((task) => task.id);
  if (new Set(ids).size !== ids.length || !ids.includes(data.movedTaskId)) {
    return NextResponse.json({ error: "Invalid task order" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const tasks = await tx.task.findMany({
      where: { userId, projectId: data.projectId, id: { in: ids } },
    });
    if (tasks.length !== ids.length) return null;
    const moving = tasks.find((task) => task.id === data.movedTaskId);
    if (!moving) return null;

    let reward = null;
    const now = new Date();
    if (data.movedStatus === "DONE") {
      const claimed = await tx.task.updateMany({
        where: {
          id: moving.id,
          userId,
          projectId: data.projectId,
          rewardClaimedAt: null,
        },
        data: { status: "DONE", completedAt: now, rewardClaimedAt: now },
      });
      if (claimed.count === 1) {
        reward = await grantRewardInTransaction(tx, {
          userId,
          xp: moving.xpReward,
          gold: moving.goldReward,
          source: "task",
          sourceId: moving.id,
          areaId: moving.areaId,
        });
      } else {
        await tx.task.update({
          where: { id: moving.id },
          data: { status: "DONE", completedAt: now },
        });
      }
    } else {
      await tx.task.update({
        where: { id: moving.id },
        data: { status: data.movedStatus, completedAt: null },
      });
    }

    for (const task of data.tasks) {
      await tx.task.update({
        where: { id: task.id },
        data: { boardPosition: task.position },
      });
    }

    const updated = await tx.task.findMany({
      where: { userId, projectId: data.projectId },
      include: TASK_INCLUDE,
      orderBy: [{ status: "asc" }, { boardPosition: "asc" }, { createdAt: "desc" }],
    });
    return { tasks: updated, reward };
  });

  if (!result) {
    return NextResponse.json({ error: "Task not found in this project" }, { status: 404 });
  }
  if (result.reward) after(() => safeCheck(userId));
  return NextResponse.json(result);
}
