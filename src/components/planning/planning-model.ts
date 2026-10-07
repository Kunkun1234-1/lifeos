import type {
  GoalDTO,
  GoalTreeDTO,
  MilestoneDTO,
  ProjectDTO,
  ProjectTreeDTO,
  TaskDTO,
} from "@/lib/types";

export type PlanningKind = "goal" | "project" | "milestone" | "task" | "group";

export type PlanningItem = {
  id: string;
  kind: PlanningKind;
  title: string;
  subtitle?: string | null;
  status?: string;
  progressLabel?: string;
  parentId?: string;
  childCount: number;
  entity?: GoalDTO | ProjectDTO | MilestoneDTO | TaskDTO;
};

const key = (kind: PlanningKind, id: string) => `${kind}:${id}`;

function projectItems(tree: ProjectTreeDTO, parentId?: string): PlanningItem[] {
  const projectId = key("project", tree.project.id);
  const milestones = [...tree.milestones].sort((a, b) => a.order - b.order);
  const byMilestone = new Map<string, TaskDTO[]>();
  const unassigned: TaskDTO[] = [];

  for (const task of tree.tasks) {
    if (!task.milestoneId) {
      unassigned.push(task);
      continue;
    }
    const list = byMilestone.get(task.milestoneId) ?? [];
    list.push(task);
    byMilestone.set(task.milestoneId, list);
  }

  const children = milestones.length + (unassigned.length > 0 ? 1 : 0);
  const projectDone = tree.tasks.filter((task) => task.status === "DONE").length;
  const items: PlanningItem[] = [
    {
      id: projectId,
      kind: "project",
      title: tree.project.title,
      subtitle: tree.project.deliverable,
      status: tree.project.status,
      progressLabel: tree.tasks.length ? `${projectDone}/${tree.tasks.length} 任务` : "暂无任务",
      parentId,
      childCount: children,
      entity: tree.project,
    },
  ];

  for (const milestone of milestones) {
    const milestoneId = key("milestone", milestone.id);
    const tasks = byMilestone.get(milestone.id) ?? [];
    const milestoneDone = tasks.filter((task) => task.status === "DONE").length;
    items.push({
      id: milestoneId,
      kind: "milestone",
      title: milestone.title,
      subtitle: milestone.acceptanceCriteria,
      status: milestone.status,
      progressLabel: tasks.length ? `${milestoneDone}/${tasks.length} 任务` : "暂无任务",
      parentId: projectId,
      childCount: tasks.length,
      entity: milestone,
    });
    for (const task of tasks) {
      items.push({
        id: key("task", task.id),
        kind: "task",
        title: task.title,
        subtitle: task.notes,
        status: task.status,
        parentId: milestoneId,
        childCount: 0,
        entity: task,
      });
    }
  }

  if (unassigned.length > 0) {
    const groupId = key("group", `${tree.project.id}:unassigned`);
    items.push({
      id: groupId,
      kind: "group",
      title: "待归类任务",
      subtitle: "这些旧任务尚未分配里程碑",
      status: "UNASSIGNED",
      parentId: projectId,
      childCount: unassigned.length,
    });
    for (const task of unassigned) {
      items.push({
        id: key("task", task.id),
        kind: "task",
        title: task.title,
        subtitle: task.notes,
        status: task.status,
        parentId: groupId,
        childCount: 0,
        entity: task,
      });
    }
  }

  return items;
}

export function itemsFromGoalTree(tree: GoalTreeDTO): PlanningItem[] {
  const rootId = key("goal", tree.goal.id);
  const tasks = tree.projects.flatMap((project) => project.tasks);
  const done = tasks.filter((task) => task.status === "DONE").length;
  return [
    {
      id: rootId,
      kind: "goal",
      title: tree.goal.objective,
      subtitle: tree.goal.notes,
      status: tree.goal.status,
      progressLabel: tasks.length ? `${done}/${tasks.length} 任务` : "暂无任务",
      childCount: tree.projects.length,
      entity: tree.goal,
    },
    ...tree.projects.flatMap((project) => projectItems(project, rootId)),
  ];
}

export function itemsFromProjectTree(tree: ProjectTreeDTO): PlanningItem[] {
  return projectItems(tree);
}

export function visiblePlanningItems(items: PlanningItem[], collapsed: Set<string>) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.filter((item) => {
    let parentId = item.parentId;
    while (parentId) {
      if (collapsed.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return true;
  });
}

export function taskProgress(tasks: TaskDTO[]) {
  const done = tasks.filter((task) => task.status === "DONE").length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
