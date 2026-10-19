import type { TaskDTO } from "@/lib/types";

export const TASK_BOARD_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskBoardStatus = (typeof TASK_BOARD_STATUSES)[number];

export function prepareProjectTasks(tasks: TaskDTO[]) {
  return assignTaskPositions([...tasks].sort((a, b) => a.boardPosition - b.boardPosition));
}

export function moveTaskOnProjectBoard(
  tasks: TaskDTO[], taskId: string, projectId: string, targetStatus: TaskBoardStatus,
  targetId: string | null, placement: "before" | "after" | "end",
) {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving || moving.projectId !== projectId) return tasks;
  const remaining = tasks.filter((task) => task.id !== taskId);
  const targetColumn = remaining.filter((task) => task.projectId === projectId && task.status === targetStatus);
  let index = targetColumn.length;
  if (targetId && placement !== "end") {
    const targetIndex = targetColumn.findIndex((task) => task.id === targetId);
    if (targetIndex >= 0) index = targetIndex + (placement === "after" ? 1 : 0);
  }
  targetColumn.splice(index, 0, { ...moving, status: targetStatus });
  const projectTasks = TASK_BOARD_STATUSES.flatMap((status) => status === targetStatus
    ? targetColumn
    : remaining.filter((task) => task.projectId === projectId && task.status === status));
  const untouched = remaining.filter((task) => task.projectId !== projectId || !TASK_BOARD_STATUSES.includes(task.status as TaskBoardStatus));
  return assignTaskPositions([...untouched, ...projectTasks]);
}

function assignTaskPositions(tasks: TaskDTO[]) {
  const positions = new Map<string, number>();
  return tasks.map((task) => {
    if (!task.projectId || !TASK_BOARD_STATUSES.includes(task.status as TaskBoardStatus)) return task;
    const key = `${task.projectId}:${task.status}`;
    const position = positions.get(key) ?? 0;
    positions.set(key, position + 1);
    return { ...task, boardPosition: position };
  });
}
