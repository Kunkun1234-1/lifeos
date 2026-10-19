"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronRight, GripVertical, Plus } from "lucide-react";
import { useAreas, useMoveProjectTask, useProjects, useTasks } from "@/hooks/queries";
import { AREA_META, type AreaName } from "@/lib/area-meta";
import type { ProjectDTO, TaskDTO } from "@/lib/types";
import { moveTaskOnProjectBoard, prepareProjectTasks, type TaskBoardStatus } from "./project-board-model";
import styles from "./project-board.module.css";

const EMPTY_TASKS: TaskDTO[] = [];
const COLUMNS: Array<{ status: TaskBoardStatus; label: string }> = [
  { status: "TODO", label: "计划" }, { status: "IN_PROGRESS", label: "正在进行" },
  { status: "REVIEW", label: "验收" }, { status: "DONE", label: "结束" },
];
type DropTarget = { projectId: string; status: TaskBoardStatus; taskId: string | null; placement: "before" | "after" | "end" };

export function ProjectBoard({ onEditTask, onCreateTask }: { onEditTask?: (task: TaskDTO) => void; onCreateTask?: (project: ProjectDTO) => void }) {
  const { data: projectData = [], isLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
  const { data: taskData, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: areas = [] } = useAreas();
  const move = useMoveProjectTask();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [areaFilter, setAreaFilter] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const initialized = useRef(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => setTasks(prepareProjectTasks(taskData ?? EMPTY_TASKS)), [taskData]);
  useEffect(() => {
    if (initialized.current || !projectData.length) return;
    setCollapsed(new Set(projectData.filter((p) => p.status === "paused" || p.status === "archived").map((p) => p.id)));
    initialized.current = true;
  }, [projectData]);

  const projects = useMemo(() => projectData.filter((p) => areaFilter === "all" ? true : areaFilter === "none" ? !p.areaId : p.areaId === areaFilter), [areaFilter, projectData]);
  const activeAreas = areas.filter((area) => !area.archived);

  const persist = async (target: DropTarget, explicitId?: string) => {
    const taskId = explicitId ?? draggedId;
    if (!taskId || move.isPending) return;
    const previous = tasks;
    const next = moveTaskOnProjectBoard(previous, taskId, target.projectId, target.status, target.taskId, target.placement);
    setDraggedId(null); setDraggedProjectId(null); setDropTarget(null);
    if (next === previous) return;
    setTasks(next); setSaveError(null);
    const projectTasks = next.filter((task) => task.projectId === target.projectId && task.status !== "CANCELED");
    try {
      const result = await move.mutateAsync({
        projectId: target.projectId, movedTaskId: taskId, movedStatus: target.status,
        tasks: projectTasks.map((task) => ({ id: task.id, position: task.boardPosition })),
      });
      setTasks((current) => [...current.filter((task) => task.projectId !== target.projectId), ...result.tasks]);
    } catch (error) {
      setTasks(previous);
      setSaveError(error instanceof Error ? error.message : "任务移动失败");
    }
  };

  if (isLoading) return <div className={styles.state}>正在整理项目任务…</div>;
  if (projectsError || tasksError) return <div className={styles.error} role="alert">项目任务加载失败。<button type="button" onClick={() => { void refetchProjects(); void refetchTasks(); }}>重试</button></div>;
  return <section className={styles.boardSection} aria-label="项目任务看板">
    <div className={styles.toolbar}>
      <div><h2>项目任务</h2><p>每个项目内可跨阶段拖动与自由排序</p></div>
      <label><span>人生领域</span><select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}><option value="all">全部领域</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.icon} {areaName(area.name)}</option>)}<option value="none">未指定领域</option></select></label>
    </div>
    {saveError ? <div className={styles.error} role="alert">保存失败，已恢复原位置：{saveError}</div> : null}
    <div className={styles.projectList}>{projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id && task.status !== "CANCELED");
      const isCollapsed = collapsed.has(project.id);
      return <section key={project.id} className={styles.projectGroup} aria-label={`项目：${project.title}`}>
        <header className={styles.projectHeader}>
          <button type="button" className={styles.collapse} aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? "展开" : "折叠"}${project.title}`} onClick={() => setCollapsed((old) => { const next = new Set(old); if (next.has(project.id)) next.delete(project.id); else next.add(project.id); return next; })}>{isCollapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}</button>
          <div className={styles.projectTitle}><Link href={`/projects/${project.id}`}>{project.title}</Link><span>{project.area ? `${project.area.icon} ${areaName(project.area.name)}` : "未指定领域"} · {projectTasks.length} 项任务</span></div>
          {onCreateTask ? <button type="button" className={styles.addTask} onClick={() => onCreateTask(project)}><Plus size={13}/> 添加任务</button> : null}
          <Link className={styles.details} href={`/projects/${project.id}`}>详情 <ArrowUpRight size={12}/></Link>
        </header>
        {!isCollapsed ? <div className={styles.columns} role="region" tabIndex={0} aria-label={`${project.title}任务阶段`}>{COLUMNS.map((column) => {
          const columnTasks = projectTasks.filter((task) => task.status === column.status);
          return <section key={column.status} className={styles.column} aria-label={`${column.label}阶段`} data-status={column.status} data-active={dropTarget?.projectId === project.id && dropTarget.status === column.status || undefined}
            onDragOver={(e) => { if (!draggedId || draggedProjectId !== project.id) return; e.preventDefault(); setDropTarget({ projectId: project.id, status: column.status, taskId: null, placement: "end" }); }}
            onDrop={(e) => { e.preventDefault(); void persist({ projectId: project.id, status: column.status, taskId: null, placement: "end" }); }}>
            <header><strong>{column.label}</strong><span>{columnTasks.length}</span></header>
            <div className={styles.cards}>{columnTasks.map((task) => <TaskCard key={task.id} task={task} saving={move.isPending} dragging={draggedId === task.id} target={dropTarget?.taskId === task.id ? dropTarget.placement : null}
              onEdit={() => onEditTask?.(task)} onStatus={(status) => void persist({ projectId: project.id, status, taskId: null, placement: "end" }, task.id)}
              onDragStart={() => { setDraggedId(task.id); setDraggedProjectId(project.id); }} onDragEnd={() => { setDraggedId(null); setDraggedProjectId(null); setDropTarget(null); }}
              onDragOver={(e) => { if (!draggedId || draggedProjectId !== project.id || draggedId === task.id) return; e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setDropTarget({ projectId: project.id, status: column.status, taskId: task.id, placement: e.clientY < r.top + r.height / 2 ? "before" : "after" }); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); void persist({ projectId: project.id, status: column.status, taskId: task.id, placement: dropTarget?.taskId === task.id ? dropTarget.placement : "after" }); }}/>)}{columnTasks.length === 0 ? <div className={styles.emptyColumn}>将任务拖到这里</div> : null}</div>
          </section>;
        })}</div> : null}
      </section>;
    })}</div>
    {projects.length === 0 ? <div className={styles.state}>这个领域还没有项目。</div> : null}
    <p className={styles.saving} aria-live="polite">{move.isPending ? "正在保存任务位置…" : ""}</p>
  </section>;
}

function TaskCard({ task, saving, dragging, target, onEdit, onStatus, onDragStart, onDragEnd, onDragOver, onDrop }: { task: TaskDTO; saving: boolean; dragging: boolean; target: "before"|"after"|"end"|null; onEdit:()=>void; onStatus:(status:TaskBoardStatus)=>void; onDragStart:()=>void; onDragEnd:()=>void; onDragOver:(e:DragEvent<HTMLElement>)=>void; onDrop:(e:DragEvent<HTMLElement>)=>void }) {
  return <article className={styles.card} draggable={!saving} data-dragging={dragging || undefined} data-target={target ?? undefined} onDragStart={(e) => { e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain",task.id); onDragStart(); }} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop}>
    <div className={styles.cardTop}><GripVertical size={14}/><button type="button" onClick={onEdit}>{task.title}</button></div>
    <div className={styles.meta}><span>{task.priority===1?"高优先":task.priority===3?"低优先":"普通"}</span><span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("zh-CN",{month:"numeric",day:"numeric"}) : "无截止日"}</span></div>
    <label className={styles.statusSelect}><span>阶段</span><select disabled={saving} value={task.status} onChange={(e)=>onStatus(e.target.value as TaskBoardStatus)}>{COLUMNS.map((c)=><option key={c.status} value={c.status}>{c.label}</option>)}</select></label>
  </article>;
}

function areaName(name:string){ return AREA_META[name as AreaName]?.cn ?? name; }
