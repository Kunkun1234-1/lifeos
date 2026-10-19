import assert from "node:assert/strict";
import { moveTaskOnProjectBoard, prepareProjectTasks } from "../src/app/tasks/project-board-model";
import type { TaskDTO } from "../src/lib/types";

function task(id: string, projectId: string, status: TaskDTO["status"], boardPosition: number): TaskDTO {
  return { id, title: id, notes: null, status, boardPosition, priority: 2, dueDate: null, xpReward: 10, goldReward: 5, areaId: null, area: null, projectId, project: { id: projectId, title: projectId, status: "active" }, milestoneId: null, milestone: null, completedAt: null, rewardClaimedAt: null, createdAt: "2026-10-19T00:00:00.000Z" };
}
const initial = prepareProjectTasks([task("p1-b", "p1", "TODO", 2), task("p1-a", "p1", "TODO", 0), task("p2-a", "p2", "TODO", 0), task("done", "p1", "DONE", 0)]);
const reordered = moveTaskOnProjectBoard(initial, "p1-b", "p1", "TODO", "p1-a", "before");
assert.deepEqual(reordered.filter((item) => item.projectId === "p1" && item.status === "TODO").map((item) => [item.id, item.boardPosition]), [["p1-b", 0], ["p1-a", 1]]);
const review = moveTaskOnProjectBoard(reordered, "p1-a", "p1", "REVIEW", null, "end");
assert.equal(review.find((item) => item.id === "p1-a")?.status, "REVIEW");
assert.strictEqual(moveTaskOnProjectBoard(review, "p2-a", "p1", "DONE", null, "end"), review);
assert.equal(moveTaskOnProjectBoard(review, "done", "p1", "IN_PROGRESS", null, "end").find((item) => item.id === "done")?.status, "IN_PROGRESS");
console.log("project task board tests passed: ordering, stages, project boundary and completion reentry");
