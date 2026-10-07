"use client";

import { cloneElement, useId, useMemo, useState, type ReactElement, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ListTodo,
  Map as MapIcon,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  useCompleteTask,
  useCreateMilestone,
  useCreateProject,
  useCreateTask,
  useDeleteGoal,
  useDeleteProject,
  useDeleteMilestone,
  useDeleteTask,
  useUpdateKR,
  useUpdateGoal,
  useUpdateMilestone,
  useUpdateProject,
  useUpdateTask,
} from "@/hooks/queries";
import type {
  GoalDTO,
  GoalTreeDTO,
  MilestoneDTO,
  ProjectDTO,
  ProjectTreeDTO,
  TaskDTO,
} from "@/lib/types";
import {
  itemsFromGoalTree,
  itemsFromProjectTree,
  type PlanningItem,
} from "./planning-model";
import styles from "./planning.module.css";
import { toYMD } from "@/lib/date";

const PlanningMap = dynamic(
  () => import("./planning-map").then((module) => module.PlanningMap),
  {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>正在整理任务脉络…</div>,
  },
);

type Props =
  | { mode: "goal"; tree: GoalTreeDTO }
  | { mode: "project"; tree: ProjectTreeDTO };

type CreateRequest =
  | { kind: "project"; goalId: string }
  | { kind: "milestone"; projectId: string }
  | { kind: "task"; projectId: string; milestoneId?: string };

export function PlanningOverview(props: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>();
  const [create, setCreate] = useState<CreateRequest | null>(null);
  const [deleting, setDeleting] = useState<PlanningItem | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [focusId, setFocusId] = useState<string>();
  const items = useMemo(
    () => props.mode === "goal" ? itemsFromGoalTree(props.tree) : itemsFromProjectTree(props.tree),
    [props],
  );
  const selected = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;
  const projectTrees = props.mode === "goal" ? props.tree.projects : [props.tree];
  const root = props.mode === "goal" ? props.tree.goal : props.tree.project;
  const rootTitle = props.mode === "goal" ? props.tree.goal.objective : props.tree.project.title;
  const initialCollapsed = useMemo(
    () => props.mode === "goal"
      ? items.filter((item) => item.kind === "milestone" || item.kind === "group").map((item) => item.id)
      : [],
    [items, props.mode],
  );
  const selectedProjectTree = selected
    ? projectTrees.find((project) => {
        if (selected.kind === "project") return project.project.id === selected.entity?.id;
        if (selected.kind === "milestone") return project.project.id === (selected.entity as MilestoneDTO).projectId;
        if (selected.kind === "task") return project.project.id === (selected.entity as TaskDTO).projectId;
        if (selected.kind === "group") return selected.id === `group:${project.project.id}:unassigned`;
        return false;
      })
    : undefined;

  const addFromNode = (item: PlanningItem) => {
    setSelectedId(undefined);
    if (item.kind === "goal" && item.entity) setCreate({ kind: "project", goalId: item.entity.id });
    if (item.kind === "project" && item.entity) setCreate({ kind: "milestone", projectId: item.entity.id });
    if (item.kind === "milestone" && item.entity) {
      setCreate({ kind: "task", projectId: (item.entity as MilestoneDTO).projectId, milestoneId: item.entity.id });
    }
    if (item.kind === "group") {
      const parent = items.find((candidate) => candidate.id === item.parentId);
      if (parent?.entity) setCreate({ kind: "task", projectId: parent.entity.id });
    }
  };
  const deleteFromNode = (item: PlanningItem) => {
    setSelectedId(undefined);
    setDeleting(item);
  };

  return (
    <main className={styles.page} aria-label={`${rootTitle}的规划地图`}>
      <h1 className={styles.srOnly}>{rootTitle}</h1>
      <nav className={styles.mapNav} aria-label="规划地图导航">
        <Link href={props.mode === "goal" ? "/goals" : "/projects"} className={styles.backLink}>
          <ArrowLeft size={16} /> {props.mode === "goal" ? "返回目标" : "返回项目"}
        </Link>
        {props.mode === "project" && props.tree.project.goal ? (
          <Link href={`/goals/${props.tree.project.goal.id}`} className={styles.mapTitle}>
            {props.tree.project.goal.objective}
          </Link>
        ) : <span className={styles.mapTitle}>{rootTitle}</span>}
      </nav>
      <div className={styles.viewSwitch} aria-label="地图显示方式">
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
          <MapIcon size={15} /> 地图
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
          <ListTodo size={15} /> 列表
        </button>
      </div>
      <section className={styles.workspace} data-view={view} aria-label="规划地图">
        <PlanningMap
          key={`${props.mode}:${root.id}`}
          items={items}
          initialCollapsed={initialCollapsed}
          selectedId={selectedId}
          focusId={focusId}
          inactive={view === "list"}
          onSelect={(item) => setSelectedId(item.id)}
          onAdd={addFromNode}
          onDelete={deleteFromNode}
        />
        {view === "list" ? <OutlineList items={items} onSelect={(item) => setSelectedId(item.id)} onAdd={addFromNode} onDelete={deleteFromNode} /> : null}
      </section>
      {view === "map" ? <p className={styles.mapHint}>点击节点编辑 · ＋ 添加下级 · 拖动画布浏览</p> : null}
      <EntityDrawer
        item={selected}
        projectTree={selectedProjectTree}
        onClose={() => setSelectedId(undefined)}
        onAddMilestone={(projectId) => {
          setSelectedId(undefined);
          setCreate({ kind: "milestone", projectId });
        }}
        onAddTask={(projectId, milestoneId) => {
          setSelectedId(undefined);
          setCreate({ kind: "task", projectId, milestoneId });
        }}
        onDelete={deleteFromNode}
      />
      <CreateDrawer
        request={create}
        projectTrees={projectTrees}
        goal={props.mode === "goal" ? props.tree.goal : undefined}
        onClose={() => setCreate(null)}
        onCreated={(id) => {
          if (create) setFocusId(`${create.kind}:${id}`);
          setCreate(null);
        }}
      />
      {deleting ? (
        <DeleteDrawer
          item={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            if (deleting.entity?.id === root.id) router.push(props.mode === "goal" ? "/goals" : "/projects");
          }}
        />
      ) : null}
    </main>
  );
}

function addLabel(item: PlanningItem) {
  return item.kind === "goal" ? "添加项目" : item.kind === "project" ? "添加里程碑" : "添加任务";
}

function OutlineList({ items, onSelect, onAdd, onDelete }: {
  items: PlanningItem[];
  onSelect: (item: PlanningItem) => void;
  onAdd: (item: PlanningItem) => void;
  onDelete: (item: PlanningItem) => void;
}) {
  const depths = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return new Map(items.map((item) => {
      let depth = 0;
      let parent = item.parentId;
      while (parent) { depth += 1; parent = byId.get(parent)?.parentId; }
      return [item.id, depth];
    }));
  }, [items]);
  return (
    <div className={styles.outline}>
      <h2>层级列表</h2>
      <div className={styles.outlineList}>
        {items.map((item) => (
          <article key={item.id} className={styles.outlineRow} style={{ marginLeft: `${(depths.get(item.id) ?? 0) * 14}px` }}>
            <button type="button" className={styles.outlineItem} onClick={() => onSelect(item)}>
              <span>{kindText(item.kind)}</span><strong>{item.title}</strong><small>{statusText(item.status)}</small>
            </button>
            <div className={styles.outlineActions}>
              {item.kind !== "task" ? <button type="button" onClick={() => onAdd(item)} aria-label={`${addLabel(item)}：${item.title}`}><Plus size={14} />{addLabel(item)}</button> : null}
              {item.entity ? <button type="button" onClick={() => onDelete(item)} aria-label={`删除${kindText(item.kind)}：${item.title}`}><Trash2 size={14} /></button> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DeleteDrawer({ item, onClose, onDeleted }: { item: PlanningItem; onClose: () => void; onDeleted: () => void }) {
  const deleteGoal = useDeleteGoal();
  const deleteProject = useDeleteProject();
  const deleteMilestone = useDeleteMilestone();
  const deleteTask = useDeleteTask();
  const [error, setError] = useState<string>();
  const pending = deleteGoal.isPending || deleteProject.isPending || deleteMilestone.isPending || deleteTask.isPending;
  const explanation = item.kind === "goal"
    ? "目标将移除，所属项目与任务会保留。"
    : item.kind === "project"
      ? "项目及其里程碑将移除，任务会保留在任务计划中。"
      : item.kind === "milestone"
        ? "里程碑将移除，其任务会回到项目的待归类任务中。"
        : "这项任务将永久删除。";
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.drawerOverlay} />
        <Dialog.Content className={styles.deleteDialog}>
          <Dialog.Title>删除{kindText(item.kind)}</Dialog.Title>
          <strong>{item.title}</strong>
          <Dialog.Description>{explanation}</Dialog.Description>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          <div className={styles.deleteActions}>
            <Button variant="outline" onClick={onClose} disabled={pending}>取消</Button>
            <Button variant="danger" disabled={pending} onClick={async () => {
              if (!item.entity || pending) return;
              setError(undefined);
              try {
                const id = item.entity.id;
                if (item.kind === "goal") await deleteGoal.mutateAsync(id);
                if (item.kind === "project") await deleteProject.mutateAsync(id);
                if (item.kind === "milestone") await deleteMilestone.mutateAsync(id);
                if (item.kind === "task") await deleteTask.mutateAsync(id);
                onDeleted();
              } catch (failure) { setError(failure instanceof Error ? failure.message : "删除失败，请重试。"); }
            }}>{pending ? "删除中…" : "确认删除"}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EntityDrawer({
  item,
  projectTree,
  onClose,
  onAddMilestone,
  onAddTask,
  onDelete,
}: {
  item: PlanningItem | null;
  projectTree?: ProjectTreeDTO;
  onClose: () => void;
  onAddMilestone: (projectId: string) => void;
  onAddTask: (projectId: string, milestoneId?: string) => void;
  onDelete: (item: PlanningItem) => void;
}) {
  if (!item) return null;
  const entity = item.entity;
  const projectId = item.kind === "project"
    ? entity?.id
    : item.kind === "milestone"
      ? (entity as MilestoneDTO | undefined)?.projectId
      : item.kind === "task"
        ? (entity as TaskDTO | undefined)?.projectId
        : projectTree?.project.id;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.drawerOverlay} />
        <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
          <div className={styles.drawerHeader}>
            <div>
              <span>{kindText(item.kind)}详情</span>
              <Dialog.Title>{item.title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className={styles.closeButton} aria-label="关闭详情">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className={styles.drawerBody}>
            {item.kind === "group" ? (
              <div className={styles.groupInfo}>
                <strong>这里保存尚未归入里程碑的旧任务。</strong>
                <p>编辑任务并选择里程碑后，它会移动到对应阶段。</p>
              </div>
            ) : entity ? (
              <EntityEditor key={item.id} kind={item.kind} entity={entity} projectTree={projectTree} />
            ) : null}
            {item.entity ? <button type="button" className={styles.deleteLink} onClick={() => onDelete(item)}><Trash2 size={14} /> 删除{kindText(item.kind)}</button> : null}
          </div>
          {projectId && (item.kind === "project" || item.kind === "milestone" || item.kind === "group") ? (
            <footer className={styles.drawerFooter}>
              {item.kind === "project" ? (
                <>
                  <Button variant="ghost" asChild>
                    <Link href={`/projects/${projectId}`}>进入项目概况 <ChevronRight size={14} /></Link>
                  </Button>
                  <Button variant="outline" onClick={() => onAddMilestone(projectId)}>
                    <Plus size={14} /> 添加里程碑
                  </Button>
                </>
              ) : null}
              <Button onClick={() => onAddTask(projectId, item.kind === "milestone" ? entity?.id : undefined)}>
                <Plus size={14} /> 添加任务
              </Button>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EntityEditor({
  kind,
  entity,
  projectTree,
}: {
  kind: PlanningItem["kind"];
  entity: GoalDTO | ProjectDTO | MilestoneDTO | TaskDTO;
  projectTree?: ProjectTreeDTO;
}) {
  if (kind === "goal") return <GoalEditor goal={entity as GoalDTO} />;
  if (kind === "project") return <ProjectEditor project={entity as ProjectDTO} />;
  if (kind === "milestone") return <MilestoneEditor milestone={entity as MilestoneDTO} />;
  if (kind === "task") return <TaskEditor task={entity as TaskDTO} milestones={projectTree?.milestones ?? []} />;
  return null;
}

function GoalEditor({ goal }: { goal: GoalDTO }) {
  const update = useUpdateGoal();
  const [objective, setObjective] = useState(goal.objective);
  const [notes, setNotes] = useState(goal.notes ?? "");
  const [timeframe, setTimeframe] = useState(goal.timeframe);
  const [status, setStatus] = useState(goal.status);
  const [confidence, setConfidence] = useState(goal.confidence);
  const submit = async () => update.mutateAsync({
    id: goal.id,
    body: { objective: objective.trim(), notes: notes.trim() || null, timeframe, confidence, status: goal.status === "done" ? "done" : status },
  });
  return (
    <>
      <EditorForm onSubmit={submit} pending={update.isPending} disabled={!objective.trim()}>
        <Field label="目标"><Input value={objective} maxLength={200} onChange={(event) => setObjective(event.target.value)} /></Field>
        <Field label="说明"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <Field label="周期"><Input value={timeframe} onChange={(event) => setTimeframe(event.target.value)} /></Field>
        <Field label="状态"><Select value={goal.status === "done" ? "done" : status} disabled={goal.status === "done"} onChange={(event) => setStatus(event.target.value as GoalDTO["status"])}><option value="active">进行中</option><option value="paused">暂停</option><option value="done">已完成</option><option value="archived">归档</option></Select></Field>
        <Field label="推进信心"><Select value={confidence} onChange={(event) => setConfidence(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}/10</option>)}</Select></Field>
      </EditorForm>
      <section className={styles.criteriaBlock} aria-label="关键结果">
        <h3>关键结果与达成标准</h3>
        {goal.keyResults.length ? goal.keyResults.map((kr, index) => (
          <KeyResultEditor key={kr.id} goalId={goal.id} kr={kr} index={index} />
        )) : <p>尚未设置关键结果。</p>}
      </section>
    </>
  );
}

function KeyResultEditor({ goalId, kr, index }: { goalId: string; kr: GoalDTO["keyResults"][number]; index: number }) {
  const update = useUpdateKR();
  const [current, setCurrent] = useState(String(kr.current));
  const value = Number(current);
  return (
    <EditorForm
      pending={update.isPending}
      disabled={!current.trim() || !Number.isFinite(value) || value < 0}
      onSubmit={() => update.mutateAsync({ goalId, krId: kr.id, body: { current: value } })}
    >
      <p className={styles.krDescription}>KR{index + 1} · {kr.description} <span>目标 {kr.target}{kr.unit ? ` ${kr.unit}` : ""}</span></p>
      <Field label={`KR${index + 1} 当前值`}><Input type="number" min={0} step="any" value={current} onChange={(event) => setCurrent(event.target.value)} /></Field>
    </EditorForm>
  );
}

function ProjectEditor({ project }: { project: ProjectDTO }) {
  const update = useUpdateProject();
  const [title, setTitle] = useState(project.title);
  const [deliverable, setDeliverable] = useState(project.deliverable ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [deadline, setDeadline] = useState(dateValue(project.deadline));
  const [status, setStatus] = useState(project.status);
  const submit = async () => update.mutateAsync({
    id: project.id,
    body: { title: title.trim(), deliverable: deliverable.trim() || null, notes: notes.trim() || null, deadline: datePayload(deadline, project.deadline), status: project.status === "done" ? "done" : status },
  });
  return (
    <EditorForm onSubmit={submit} pending={update.isPending} disabled={!title.trim()}>
      <Field label="项目名称"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label="交付成果"><Textarea value={deliverable} onChange={(event) => setDeliverable(event.target.value)} /></Field>
      <Field label="补充说明"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <div className={styles.formRow}>
        <Field label="截止日期"><Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></Field>
        <Field label="状态"><Select value={project.status === "done" ? "done" : status} disabled={project.status === "done"} onChange={(event) => setStatus(event.target.value as ProjectDTO["status"])}><option value="idea">构想</option><option value="active">进行中</option><option value="paused">暂停</option><option value="done">已完成</option><option value="archived">归档</option></Select></Field>
      </div>
    </EditorForm>
  );
}

function MilestoneEditor({ milestone }: { milestone: MilestoneDTO }) {
  const update = useUpdateMilestone();
  const [title, setTitle] = useState(milestone.title);
  const [notes, setNotes] = useState(milestone.notes ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(milestone.acceptanceCriteria ?? "");
  const [deadline, setDeadline] = useState(dateValue(milestone.deadline));
  const [status, setStatus] = useState(milestone.status);
  const submit = async () => update.mutateAsync({
    id: milestone.id,
    body: { title: title.trim(), notes: notes.trim() || null, acceptanceCriteria: acceptanceCriteria.trim() || null, deadline: datePayload(deadline, milestone.deadline), status },
  });
  return (
    <EditorForm onSubmit={submit} pending={update.isPending} disabled={!title.trim()}>
      <Field label="里程碑"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label="验收条件"><Textarea value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} placeholder="达到什么可验证的结果，才算这个阶段完成？" /></Field>
      <Field label="补充说明"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <div className={styles.formRow}>
        <Field label="截止日期"><Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></Field>
        <Field label="状态"><Select value={status} onChange={(event) => setStatus(event.target.value as MilestoneDTO["status"])}><option value="TODO">待开始</option><option value="IN_PROGRESS">进行中</option><option value="DONE">已完成</option></Select></Field>
      </div>
    </EditorForm>
  );
}

function TaskEditor({ task, milestones }: { task: TaskDTO; milestones: MilestoneDTO[] }) {
  const update = useUpdateTask();
  const complete = useCompleteTask();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(dateValue(task.dueDate));
  const [priority, setPriority] = useState(task.priority);
  const [milestoneId, setMilestoneId] = useState(task.milestoneId ?? "");
  const [status, setStatus] = useState(task.status);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const submit = async () => update.mutateAsync({
    id: task.id,
    title: title.trim(), notes: notes.trim() || null, dueDate: datePayload(dueDate, task.dueDate), priority,
    milestoneId: milestoneId || null, status: task.status === "DONE" ? "DONE" : status,
  });
  return (
    <EditorForm onSubmit={submit} pending={update.isPending || complete.isPending} disabled={!title.trim()}>
      <Field label="任务"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
      <Field label="备注"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <Field label="所属里程碑"><Select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}><option value="">待归类</option>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</Select></Field>
      <div className={styles.formRow}>
        <Field label="截止日期"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
        <Field label="优先级"><Select value={priority} onChange={(event) => setPriority(Number(event.target.value))}><option value={1}>高</option><option value={2}>中</option><option value={3}>低</option></Select></Field>
      </div>
      {status === "DONE" ? (
        <div className={styles.completedState}><Check size={15} /> 已完成 · 奖励已结算</div>
      ) : (
        <Field label="状态"><Select value={status} onChange={(event) => setStatus(event.target.value as TaskDTO["status"])}><option value="TODO">待开始</option><option value="IN_PROGRESS">进行中</option><option value="CANCELED">已取消</option></Select></Field>
      )}
      {completeError ? <p className={styles.formError} role="alert">{completeError}</p> : null}
      {status !== "DONE" ? (
        <Button type="button" variant="outline" className={styles.completeButton} onClick={async () => {
          setCompleteError(null);
          try {
            await complete.mutateAsync(task.id);
            setStatus("DONE");
          } catch (error) {
            setCompleteError(error instanceof Error ? error.message : "完成任务失败，请稍后重试。");
          }
        }} disabled={complete.isPending || update.isPending}>
          <Check size={15} /> 完成任务并领取奖励
        </Button>
      ) : null}
    </EditorForm>
  );
}

function EditorForm({ children, onSubmit, pending, disabled }: { children: ReactNode; onSubmit: () => Promise<unknown>; pending: boolean; disabled?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form className={styles.form} onSubmit={async (event) => {
      event.preventDefault();
      setError(null);
      try {
        await onSubmit();
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1600);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "保存失败，填写内容已保留，请稍后重试。");
      }
    }}>
      {children}
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      <div className={styles.saveRow}>
        {saved ? <span><Check size={13} /> 已保存</span> : <span />}
        <Button type="submit" disabled={pending || disabled}>{pending ? "保存中…" : "保存修改"}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return <div className={styles.field}><Label htmlFor={id}>{label}</Label>{cloneElement(children, { id })}</div>;
}

function CreateDrawer({
  request,
  projectTrees,
  goal,
  onClose,
  onCreated,
}: {
  request: { kind: "project"; goalId: string } | { kind: "milestone"; projectId: string } | { kind: "task"; projectId: string; milestoneId?: string } | null;
  projectTrees: ProjectTreeDTO[];
  goal?: GoalDTO;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  if (!request) return null;
  const project = request.kind === "project" ? undefined : projectTrees.find((tree) => tree.project.id === request.projectId);
  if (request.kind !== "project" && !project) return null;
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.drawerOverlay} />
        <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
          <div className={styles.drawerHeader}>
            <div><span>{request.kind === "project" ? goal?.objective : project?.project.title}</span><Dialog.Title>{request.kind === "project" ? "新增项目" : request.kind === "milestone" ? "新增里程碑" : "新增任务"}</Dialog.Title></div>
            <Dialog.Close asChild><button type="button" className={styles.closeButton} aria-label="关闭"><X size={18} /></button></Dialog.Close>
          </div>
          <div className={styles.drawerBody}>
            {request.kind === "project" ? (
              <CreateProjectForm goalId={request.goalId} onDone={onCreated} />
            ) : request.kind === "milestone" ? (
              <CreateMilestoneForm project={project!} onDone={onCreated} />
            ) : (
              <CreateTaskForm project={project!} milestoneId={request.milestoneId} onDone={onCreated} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CreateProjectForm({ goalId, onDone }: { goalId: string; onDone: (id: string) => void }) {
  const create = useCreateProject();
  const [title, setTitle] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const submit = async () => {
    const saved = await create.mutateAsync({
      title: title.trim(), deliverable: deliverable.trim() || null, notes: notes.trim() || null,
      goalId, deadline: datePayload(deadline), xpReward: 100, goldReward: 40, gemsReward: 1,
    });
    onDone(saved.id);
  };
  return (
    <EditorForm onSubmit={submit} pending={create.isPending} disabled={!title.trim()}>
      <Field label="项目名称"><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="为目标交付什么完整成果？" /></Field>
      <Field label="交付成果"><Textarea value={deliverable} onChange={(event) => setDeliverable(event.target.value)} placeholder="写下最终可以检查的成果" /></Field>
      <Field label="补充说明"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <Field label="截止日期"><Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></Field>
    </EditorForm>
  );
}

function CreateMilestoneForm({ project, onDone }: { project: ProjectTreeDTO; onDone: (id: string) => void }) {
  const create = useCreateMilestone();
  const [title, setTitle] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const submit = async () => {
    const saved = await create.mutateAsync({
      projectId: project.project.id,
      title: title.trim(),
      acceptanceCriteria: acceptanceCriteria.trim() || null,
      notes: notes.trim() || null,
      status: "TODO",
      deadline: datePayload(deadline),
    });
    onDone(saved.id);
  };
  return (
    <EditorForm onSubmit={submit} pending={create.isPending} disabled={!title.trim()}>
      <Field label="里程碑"><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：可复现基线已经建立" /></Field>
      <Field label="验收条件"><Textarea value={acceptanceCriteria} onChange={(event) => setAcceptanceCriteria(event.target.value)} placeholder="写下可以检查的完成条件" /></Field>
      <Field label="补充说明"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <Field label="截止日期"><Input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></Field>
    </EditorForm>
  );
}

function CreateTaskForm({ project, milestoneId: initialMilestoneId, onDone }: { project: ProjectTreeDTO; milestoneId?: string; onDone: (id: string) => void }) {
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [milestoneId, setMilestoneId] = useState(initialMilestoneId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(2);
  const submit = async () => {
    const saved = await create.mutateAsync({
      title: title.trim(), notes: notes.trim() || null,
      projectId: project.project.id, milestoneId: milestoneId || null,
      dueDate: datePayload(dueDate), priority, xpReward: 10, goldReward: 5,
    });
    onDone(saved.id);
  };
  return (
    <EditorForm onSubmit={submit} pending={create.isPending} disabled={!title.trim()}>
      <Field label="任务"><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="一天内可以推进的具体行动" /></Field>
      <Field label="备注"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <Field label="所属里程碑"><Select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}><option value="">暂不归类</option>{project.milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</Select></Field>
      <div className={styles.formRow}>
        <Field label="截止日期"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
        <Field label="优先级"><Select value={priority} onChange={(event) => setPriority(Number(event.target.value))}><option value={1}>高</option><option value={2}>中</option><option value={3}>低</option></Select></Field>
      </div>
    </EditorForm>
  );
}

function dateValue(value: string | null | undefined) {
  return value ? toYMD(new Date(value)) : "";
}

function datePayload(value: string, original?: string | null) {
  if (original && value === dateValue(original)) return original;
  return value ? new Date(`${value}T23:59:00`).toISOString() : null;
}

function kindText(kind: PlanningItem["kind"]) {
  return ({ goal: "目标", project: "项目", milestone: "里程碑", task: "任务", group: "分组" })[kind];
}

function statusText(status?: string) {
  return ({ active: "进行中", done: "已完成", paused: "暂停", archived: "归档", idea: "构想", TODO: "待开始", IN_PROGRESS: "进行中", DONE: "已完成", CANCELED: "已取消", UNASSIGNED: "待归类" } as Record<string, string>)[status ?? ""] ?? "未设置";
}
