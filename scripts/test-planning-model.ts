import assert from "node:assert/strict";
import { itemsFromGoalTree, itemsFromProjectTree, taskProgress, visiblePlanningItems } from "../src/components/planning/planning-model";
import type { GoalDTO, MilestoneDTO, ProjectDTO, ProjectTreeDTO, TaskDTO } from "../src/lib/types";

const project: ProjectDTO = { id: "p1", title: "交付实验报告", deliverable: null, notes: null, status: "active", startDate: null, deadline: null, completedAt: null, xpReward: 100, goldReward: 40, gemsReward: 1, areaId: null, area: null, goalId: "g1", goal: { id: "g1", objective: "具备研究能力" }, taskCount: 3, taskDoneCount: 1 };
const milestone: MilestoneDTO = { id: "m1", projectId: "p1", title: "基线可复现", notes: null, acceptanceCriteria: "提供脚本和结果", status: "IN_PROGRESS", order: 2, startDate: null, deadline: null, completedAt: null, createdAt: "2026-10-07T00:00:00.000Z", updatedAt: "2026-10-07T00:00:00.000Z" };
function task(id: string, milestoneId: string | null, status: TaskDTO["status"]): TaskDTO {
  return { id, title: id, notes: null, status, priority: 2, dueDate: null, xpReward: 10, goldReward: 5, areaId: null, area: null, projectId: "p1", project: { id: "p1", title: project.title, status: "active" }, milestoneId, milestone: milestoneId ? { id: milestoneId, title: milestone.title } : null, completedAt: null, createdAt: "2026-10-07T00:00:00.000Z" };
}
const tree: ProjectTreeDTO = { project, milestones: [milestone], tasks: [task("t1", "m1", "DONE"), task("t2", "m1", "TODO"), task("legacy", null, "TODO")] };
const items = itemsFromProjectTree(tree);
assert.equal(items.find((item) => item.id === "task:t1")?.parentId, "milestone:m1");
assert.equal(items.find((item) => item.id === "task:legacy")?.parentId, "group:p1:unassigned");
assert.equal(items.filter((item) => item.kind === "task").length, tree.tasks.length, "Old and classified tasks must all remain visible in the complete projection");
assert.equal(new Set(items.map((item) => item.id)).size, items.length);
const collapsed = visiblePlanningItems(items, new Set(["milestone:m1"]));
assert(!collapsed.some((item) => item.id === "task:t1" || item.id === "task:t2"));
assert(collapsed.some((item) => item.id === "task:legacy"), "Collapsing a milestone must not hide sibling legacy tasks");
assert.deepEqual(visiblePlanningItems(items, new Set(["project:p1"])).map((item) => item.id), ["project:p1"]);
assert.equal(visiblePlanningItems(items, new Set()).length, items.length);
assert.deepEqual(taskProgress(tree.tasks), { done: 1, total: 3, percent: 33 });
assert.deepEqual(taskProgress([]), { done: 0, total: 0, percent: 0 });
assert.equal(items.find((item) => item.kind === "milestone")?.status, "IN_PROGRESS", "Task completion is distinct from outcome acceptance");
const goal: GoalDTO = { id: "g1", objective: "具备研究能力", type: "main", notes: null, timeframe: "2026", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-12-31T00:00:00.000Z", status: "active", confidence: 5, areaId: null, area: null, keyResults: [], projects: [{ id: "p1", title: project.title, status: "active" }] };
const goalItems = itemsFromGoalTree({ goal, projects: [tree] });
assert.equal(goalItems.find((item) => item.id === "project:p1")?.parentId, "goal:g1");
assert.deepEqual(visiblePlanningItems(goalItems, new Set(["goal:g1"])).map((item) => item.id), ["goal:g1"]);
const empty = itemsFromGoalTree({ goal, projects: [] });
assert.equal(empty.length, 1);
assert.equal(empty[0].childCount, 0);
console.log("planning model tests passed: hierarchy, legacy tasks, branch collapse, empty state and progress semantics");
