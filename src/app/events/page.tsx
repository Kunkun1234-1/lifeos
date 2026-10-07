"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { AreaSelect } from "@/components/area-select";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  useArchivePeriodicTask,
  useCheckInPeriodicTask,
  useCreatePeriodicTask,
  useDailyTaskWeek,
  usePeriodicTasks,
  useUpdatePeriodicTask,
} from "@/hooks/queries";
import type {
  PeriodicTaskDTO,
  PeriodicTaskFrequency,
  PeriodicTasksSnapshotDTO,
  DailyTaskWeekSnapshotDTO,
} from "@/lib/types";
import styles from "./page.module.css";

const FREQUENCIES: Array<{
  value: PeriodicTaskFrequency;
  label: string;
  short: string;
  detail: string;
  icon: typeof Sun;
}> = [
  { value: "DAILY", label: "每日任务", short: "每日", detail: "今天要完成的小行动", icon: Sun },
  { value: "WEEKLY", label: "每周任务", short: "每周", detail: "本周需要达成的结果", icon: CalendarDays },
  { value: "MONTHLY", label: "每月任务", short: "每月", detail: "本月持续推进的事项", icon: CalendarRange },
];

type EditorState = { mode: "create" } | { mode: "edit"; task: PeriodicTaskDTO };

export default function EventsPage() {
  const [frequency, setFrequency] = useState<PeriodicTaskFrequency>("DAILY");
  const [anchor, setAnchor] = useState<string>();
  const [dailyView, setDailyView] = useState<"day" | "week">("day");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [removing, setRemoving] = useState<PeriodicTaskDTO | null>(null);
  const isWeekView = frequency === "DAILY" && dailyView === "week";
  const query = usePeriodicTasks(frequency, anchor, !isWeekView);
  const weekQuery = useDailyTaskWeek(anchor, isWeekView);
  const snapshot = isWeekView ? weekQuery.data : query.data;
  const isCurrent = snapshot ? includesDate(snapshot, snapshot.today) : true;

  const selectFrequency = (next: PeriodicTaskFrequency) => {
    setFrequency(next);
    setAnchor(undefined);
  };

  const handleFrequencyKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % FREQUENCIES.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + FREQUENCIES.length) % FREQUENCIES.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = FREQUENCIES.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = FREQUENCIES[nextIndex];
    selectFrequency(next.value);
    document.getElementById(`periodic-frequency-${next.value.toLowerCase()}`)?.focus();
  };

  const movePeriod = (direction: -1 | 1) => {
    if (!snapshot || (direction === 1 && isCurrent)) return;
    setAnchor(shiftPeriod(snapshot.periodStart, isWeekView ? "WEEKLY" : frequency, direction));
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>周期任务</h1>
            <p className={styles.pageDesc}>按日、周、月安排任务，在本期完成后领取奖励。</p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            data-testid="periodic-task-create"
            onClick={() => setEditor({ mode: "create" })}
            disabled={!snapshot || !isCurrent}
          >
            <Plus size={16} />
            新建任务
          </button>
        </header>

        <div className={styles.book}>
          <aside className={styles.periodRail} aria-label="任务周期">
            <div className={styles.periodTabs} role="tablist" aria-orientation="vertical">
              {FREQUENCIES.map((item, index) => {
                const Icon = item.icon;
                const selected = item.value === frequency;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="tab"
                    id={`periodic-frequency-${item.value.toLowerCase()}`}
                    aria-selected={selected}
                    aria-controls="periodic-task-panel"
                    tabIndex={selected ? 0 : -1}
                    data-testid={`periodic-frequency-${item.value.toLowerCase()}`}
                    className={styles.periodTab}
                    data-selected={selected}
                    onClick={() => selectFrequency(item.value)}
                    onKeyDown={(event) => handleFrequencyKeyDown(event, index)}
                  >
                    <Icon size={18} />
                    <span>{item.short}</span>
                  </button>
                );
              })}
            </div>

            {isWeekView ? (
              <WeekProgress snapshot={weekQuery.data} loading={weekQuery.isLoading} />
            ) : <PeriodProgress snapshot={query.data} loading={query.isLoading} />}
          </aside>

          <section
            id="periodic-task-panel"
            className={styles.taskPanel}
            role="tabpanel"
            aria-labelledby={`periodic-frequency-${frequency.toLowerCase()}`}
            aria-live="polite"
          >
            <div className={styles.panelHead}>
              <div>
                <p className={styles.panelKicker}>{frequencyMeta(frequency).label}</p>
                <h2 className={styles.periodTitle}>
                  {snapshot ? isWeekView
                    ? `${formatChineseDate(snapshot.periodStart)} — ${formatChineseDate(snapshot.periodEnd)}`
                    : formatPeriod(query.data!) : "正在读取本期…"}
                </h2>
                <p className={styles.periodDetail}>
                  {isWeekView ? "查看一周的每日任务；今天可打卡，其他日期仅供查看。"
                    : isCurrent ? frequencyMeta(frequency).detail : "历史周期仅供回顾，不可修改或打卡。"}
                </p>
              </div>
              <div className={styles.panelControls}>
                {frequency === "DAILY" ? (
                  <div className={styles.viewSwitch} role="group" aria-label="每日任务视图">
                    {(["day", "week"] as const).map((view) => (
                      <button key={view} type="button" aria-pressed={dailyView === view}
                        data-testid={`periodic-view-${view}`}
                        onClick={() => { setDailyView(view); setAnchor(undefined); }}>
                        {view === "day" ? "日视图" : "周视图"}
                      </button>
                    ))}
                  </div>
                ) : null}
              <div className={styles.periodNav}>
                <button
                  type="button"
                  className={styles.iconButton}
                  data-testid="periodic-previous"
                  aria-label={isWeekView ? "上一周" : "上一期"}
                  title={isWeekView ? "上一周" : "上一期"}
                  onClick={() => movePeriod(-1)}
                  disabled={!snapshot}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  className={styles.currentButton}
                  data-testid="periodic-current"
                  onClick={() => setAnchor(undefined)}
                  disabled={!snapshot || isCurrent}
                >
                  {isWeekView ? "回到本周" : "回到本期"}
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  data-testid="periodic-next"
                  aria-label={isWeekView ? "下一周" : "下一期"}
                  title={isCurrent ? "已经是当前周期" : "下一期"}
                  onClick={() => movePeriod(1)}
                  disabled={!snapshot || isCurrent}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
              </div>
            </div>

            {isWeekView ? <DailyWeekGrid query={weekQuery} onCreate={() => setEditor({ mode: "create" })}
              onCurrent={() => setAnchor(undefined)} onEdit={(task) => setEditor({ mode: "edit", task })}
              onRemove={setRemoving} /> : <TaskListState
              query={query}
              snapshot={query.data}
              readOnly={!isCurrent}
              onCreate={() => setEditor({ mode: "create" })}
              onCurrent={() => setAnchor(undefined)}
              onEdit={(task) => setEditor({ mode: "edit", task })}
              onRemove={setRemoving}
            />}
          </section>
        </div>

        <Link href="/events/archive" className={styles.archiveLink}>
          <History size={14} />
          历史活动
        </Link>
      </div>

      {editor ? (
        <TaskEditorDialog
          state={editor}
          defaultFrequency={frequency}
          onClose={() => setEditor(null)}
          onSaved={(savedFrequency) => {
            setEditor(null);
            selectFrequency(savedFrequency);
          }}
        />
      ) : null}
      {removing ? (
        <ArchiveTaskDialog task={removing} onClose={() => setRemoving(null)} />
      ) : null}
    </main>
  );
}

function WeekProgress({ snapshot, loading }: { snapshot?: DailyTaskWeekSnapshotDTO; loading: boolean }) {
  const total = snapshot?.tasks.reduce((sum, task) => sum + snapshot.days.filter(
    (day) => day >= task.availableFrom && day <= snapshot.today,
  ).length, 0) ?? 0;
  const complete = snapshot?.tasks.reduce((sum, task) => sum + task.completedDates.length, 0) ?? 0;
  return <ProgressSummary total={total} complete={complete} loading={loading} label="本周打卡 · 截至今天" />;
}

function DailyWeekGrid({ query, onCreate, onCurrent, onEdit, onRemove }: {
  query: ReturnType<typeof useDailyTaskWeek>;
  onCreate: () => void;
  onCurrent: () => void;
  onEdit: (task: PeriodicTaskDTO) => void;
  onRemove: (task: PeriodicTaskDTO) => void;
}) {
  const snapshot = query.data;
  if (query.isLoading) return <div className={styles.stateBox}><LoaderCircle className={styles.spin} size={22} />正在读取本周打卡…</div>;
  if (query.isError) return <div className={styles.errorBox} role="alert">
    <strong>周视图加载失败</strong><span>{errorMessage(query.error)}</span>
    <button type="button" className={styles.secondaryButton} onClick={() => void query.refetch()}>重新加载</button>
  </div>;
  if (!snapshot) return null;
  const current = includesDate(snapshot, snapshot.today);
  if (!snapshot.tasks.length) return <div className={styles.emptyState}>
    <h3>这一周没有每日任务</h3><p>{current ? "建立每日任务，就能在这里查看整周打卡。" : "可以返回本周继续安排每日任务。"}</p>
    <button type="button" className={styles.primaryButton} onClick={current ? onCreate : onCurrent}>
      {current ? "新建每日任务" : "回到本周"}
    </button>
  </div>;
  return <div className={styles.weekScroll} role="region" aria-label="每日任务周打卡表，可横向滚动" tabIndex={0}>
    <table className={styles.weekTable}>
      <caption className={styles.weekCaption}>✓ 已完成 · — 未到日期或任务尚未建立；仅今天可打卡。</caption>
      <thead><tr><th scope="col">每日任务</th>{snapshot.days.map((day) => <th key={day} scope="col" data-today={day === snapshot.today}>
        <span>{weekdayLabel(day)}</span><small>{Number(day.slice(5, 7))}/{Number(day.slice(8))}</small>
        {day === snapshot.today ? <b>今天</b> : null}
      </th>)}</tr></thead>
      <tbody>{snapshot.tasks.map((task) => <DailyWeekRow key={task.id} task={task} snapshot={snapshot}
        onEdit={() => onEdit(task)} onRemove={() => onRemove(task)} />)}</tbody>
    </table>
  </div>;
}

function DailyWeekRow({ task, snapshot, onEdit, onRemove }: {
  task: DailyTaskWeekSnapshotDTO["tasks"][number]; snapshot: DailyTaskWeekSnapshotDTO;
  onEdit: () => void; onRemove: () => void;
}) {
  const checkIn = useCheckInPeriodicTask();
  const [actionError, setActionError] = useState<string | null>(null);
  const toggle = async (day: string, completed: boolean) => {
    setActionError(null);
    try { await checkIn.mutateAsync({ id: task.id, completed: !completed, periodKey: day }); }
    catch (error) { setActionError(errorMessage(error)); }
  };
  return <tr>
    <th scope="row" className={styles.weekTask}>
      <span className={styles.weekTaskTitle}>{task.title}</span>
      {task.area ? <small>{task.area.icon} {task.area.name}</small> : null}
      <small>+{task.xpReward} XP · +{task.goldReward} 金币</small>
      {includesDate(snapshot, snapshot.today) ? <div className={styles.weekManage}>
        <button type="button" className={styles.miniButton} aria-label={`编辑 ${task.title}`} disabled={checkIn.isPending} onClick={onEdit}><Pencil size={14} /></button>
        <button type="button" className={styles.miniButton} aria-label={`移除 ${task.title}`} disabled={checkIn.isPending} onClick={onRemove}><Trash2 size={14} /></button>
      </div> : null}
      {actionError ? <small role="alert" className={styles.inlineError}>{actionError}</small> : null}
    </th>
    {snapshot.days.map((day) => {
      const completed = task.completedDates.includes(day);
      const available = day >= task.availableFrom && day <= snapshot.today;
      const editable = available && day === snapshot.today;
      const state = completed ? "已完成" : !available ? day > snapshot.today ? "未到日期" : "尚未建立" : "未完成";
      return <td key={day} data-today={day === snapshot.today}>
        <button type="button" className={styles.weekCheck} data-checked={completed}
          data-testid={`periodic-week-check-${task.id}-${day}`} aria-pressed={completed}
          aria-label={`${task.title} ${day} ${state}${editable ? completed ? "，点击撤销" : "，点击打卡" : "，仅供查看"}`}
          title={`${formatChineseDate(day)} · ${state}${editable ? " · 点击切换" : " · 仅供查看"}`}
          disabled={!editable || checkIn.isPending} onClick={() => void toggle(day, completed)}>
          {editable && checkIn.isPending ? <LoaderCircle className={styles.spin} size={17} />
            : completed ? <Check size={19} strokeWidth={3} /> : available ? <span className={styles.weekEmptyMark} /> : "—"}
        </button>
      </td>;
    })}
  </tr>;
}

function PeriodProgress({
  snapshot,
  loading,
}: {
  snapshot?: PeriodicTasksSnapshotDTO;
  loading: boolean;
}) {
  const total = snapshot?.tasks.length ?? 0;
  const complete = snapshot?.tasks.filter((task) => task.completed).length ?? 0;
  return <ProgressSummary total={total} complete={complete} loading={loading} label="本期进度" />;
}

function ProgressSummary({ total, complete, loading, label }: { total: number; complete: number; loading: boolean; label: string }) {
  const percent = total ? Math.round((complete / total) * 100) : 0;

  return (
    <div className={styles.progressCard}>
      <span className={styles.progressLabel}>{label}</span>
      <strong>{loading ? "—" : `${complete}/${total}`}</strong>
      <div className={styles.progressTrack} aria-label={`本期完成度 ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>{loading ? "正在统计" : total ? `已完成 ${percent}%` : "等待第一项任务"}</small>
    </div>
  );
}

function TaskListState({
  query,
  snapshot,
  readOnly,
  onCreate,
  onCurrent,
  onEdit,
  onRemove,
}: {
  query: ReturnType<typeof usePeriodicTasks>;
  snapshot?: PeriodicTasksSnapshotDTO;
  readOnly: boolean;
  onCreate: () => void;
  onCurrent: () => void;
  onEdit: (task: PeriodicTaskDTO) => void;
  onRemove: (task: PeriodicTaskDTO) => void;
}) {
  if (query.isLoading) {
    return (
      <div className={styles.stateBox}>
        <LoaderCircle className={styles.spin} size={22} />
        正在整理任务册…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className={styles.errorBox} role="alert">
        <strong>周期任务加载失败</strong>
        <span>{errorMessage(query.error)}</span>
        <button type="button" className={styles.secondaryButton} onClick={() => void query.refetch()}>
          重新加载
        </button>
      </div>
    );
  }

  if (!snapshot || snapshot.tasks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyMark}><Check size={26} /></div>
        <h3>{readOnly ? "这一期没有任务" : "本期任务册还是空的"}</h3>
        <p>{readOnly ? "可以返回本期继续安排任务。" : "建立第一项任务，完成后在这里直接打卡。"}</p>
        {readOnly ? (
          <button type="button" className={styles.secondaryButton} onClick={onCurrent}>
            回到本期
          </button>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={onCreate}>
            <Plus size={15} /> 新建第一项任务
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.taskList}>
      {snapshot.tasks.map((task, index) => (
        <PeriodicTaskRow
          key={task.id}
          task={task}
          index={index}
          periodKey={snapshot.periodStart}
          readOnly={readOnly}
          onEdit={() => onEdit(task)}
          onRemove={() => onRemove(task)}
        />
      ))}
    </div>
  );
}

function PeriodicTaskRow({
  task,
  index,
  periodKey,
  readOnly,
  onEdit,
  onRemove,
}: {
  task: PeriodicTaskDTO;
  index: number;
  periodKey: string;
  readOnly: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const checkIn = useCheckInPeriodicTask();
  const [actionError, setActionError] = useState<string | null>(null);

  const toggle = async () => {
    setActionError(null);
    try {
      await checkIn.mutateAsync({ id: task.id, completed: !task.completed, periodKey });
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <article className={styles.taskRow} data-completed={task.completed} data-testid={`periodic-task-${task.id}`}>
      <div className={styles.questIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
      <div className={styles.taskBody}>
        <div className={styles.taskTitleLine}>
          <h3>{task.title}</h3>
          {task.area ? (
            <span className={styles.areaChip} style={{ borderColor: task.area.color ?? undefined }}>
              {task.area.icon} {task.area.name}
            </span>
          ) : null}
        </div>
        {task.notes ? <p>{task.notes}</p> : null}
        <div className={styles.rewards} aria-label="完成奖励">
          <span><Sparkles size={14} /> +{task.xpReward} XP</span>
          <span><Coins size={14} /> +{task.goldReward} 金币</span>
        </div>
        {actionError ? <p className={styles.inlineError} role="alert">{actionError}</p> : null}
      </div>
      <div className={styles.taskActions}>
        {!readOnly ? (
          <div className={styles.manageActions}>
            <button type="button" className={styles.miniButton} aria-label={`编辑 ${task.title}`} title="编辑" onClick={onEdit} disabled={checkIn.isPending}>
              <Pencil size={14} />
            </button>
            <button type="button" className={styles.miniButton} aria-label={`移除 ${task.title}`} title="移除任务" onClick={onRemove} disabled={checkIn.isPending}>
              <Trash2 size={14} />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className={styles.checkButton}
          data-testid={`periodic-check-${task.id}`}
          data-checked={task.completed}
          aria-pressed={task.completed}
          aria-label={task.completed ? `取消完成 ${task.title}` : `完成 ${task.title}`}
          title={readOnly ? "历史周期不可打卡" : task.completed ? "再次点击取消完成" : "完成任务"}
          disabled={readOnly || checkIn.isPending}
          onClick={() => void toggle()}
        >
          {checkIn.isPending ? <LoaderCircle className={styles.spin} size={20} /> : <Check size={22} strokeWidth={3} />}
        </button>
      </div>
    </article>
  );
}

function TaskEditorDialog({
  state,
  defaultFrequency,
  onClose,
  onSaved,
}: {
  state: EditorState;
  defaultFrequency: PeriodicTaskFrequency;
  onClose: () => void;
  onSaved: (frequency: PeriodicTaskFrequency) => void;
}) {
  const task = state.mode === "edit" ? state.task : null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [frequency, setFrequency] = useState<PeriodicTaskFrequency>(task?.frequency ?? defaultFrequency);
  const [areaId, setAreaId] = useState<string | null>(task?.areaId ?? null);
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 5);
  const [goldReward, setGoldReward] = useState(task?.goldReward ?? 2);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const create = useCreatePeriodicTask();
  const update = useUpdatePeriodicTask();
  const pending = create.isPending || update.isPending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || pending) return;
    setSubmitError(null);
    const body = {
      title: title.trim(),
      notes: notes.trim() || null,
      frequency,
      areaId,
      xpReward: Math.min(10000, Math.max(0, Math.round(xpReward))),
      goldReward: Math.min(10000, Math.max(0, Math.round(goldReward))),
    };
    try {
      if (task) await update.mutateAsync({ id: task.id, body });
      else await create.mutateAsync(body);
      onSaved(frequency);
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={styles.dialog} data-testid="periodic-task-editor">
          <div className={styles.dialogHead}>
            <div>
              <Dialog.Title>{task ? "编辑周期任务" : "新建周期任务"}</Dialog.Title>
              <Dialog.Description className={styles.dialogDescription}>
                设置重复周期和每次完成后获得的奖励。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className={styles.iconButton} aria-label="关闭" disabled={pending}><X size={17} /></button>
            </Dialog.Close>
          </div>

          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <div className={styles.field}>
              <Label htmlFor="periodic-title">任务名称</Label>
              <Input id="periodic-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：完成本周复盘" maxLength={200} autoFocus required />
            </div>
            <div className={styles.field}>
              <Label htmlFor="periodic-notes">备注</Label>
              <Textarea id="periodic-notes" value={notes ?? ""} onChange={(event) => setNotes(event.target.value)} placeholder="补充完成标准或提醒（可选）" maxLength={2000} rows={3} />
            </div>
            <div className={styles.formTwoColumns}>
              <div className={styles.field}>
                <Label htmlFor="periodic-frequency">重复周期</Label>
                <Select id="periodic-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as PeriodicTaskFrequency)}>
                  {FREQUENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </Select>
              </div>
              <div className={styles.field}>
                <Label>人生领域</Label>
                <AreaSelect value={areaId} onChange={setAreaId} />
              </div>
              <div className={styles.field}>
                <Label htmlFor="periodic-xp">经验奖励</Label>
                <Input id="periodic-xp" type="number" min={0} max={10000} step={1} value={xpReward} onChange={(event) => setXpReward(Number(event.target.value))} />
              </div>
              <div className={styles.field}>
                <Label htmlFor="periodic-gold">金币奖励</Label>
                <Input id="periodic-gold" type="number" min={0} max={10000} step={1} value={goldReward} onChange={(event) => setGoldReward(Number(event.target.value))} />
              </div>
            </div>
            {submitError ? <p className={styles.formError} role="alert">保存失败：{submitError}</p> : null}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={pending}>取消</button>
              <button type="submit" className={styles.primaryButton} data-testid="periodic-task-save" disabled={pending || !title.trim()}>
                {pending ? <LoaderCircle className={styles.spin} size={15} /> : null}
                {pending ? "保存中…" : task ? "保存修改" : "创建任务"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ArchiveTaskDialog({ task, onClose }: { task: PeriodicTaskDTO; onClose: () => void }) {
  const archive = useArchivePeriodicTask();
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const confirmArchive = async () => {
    setArchiveError(null);
    try {
      await archive.mutateAsync(task.id);
      onClose();
    } catch (error) {
      setArchiveError(errorMessage(error));
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !archive.isPending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={`${styles.dialog} ${styles.confirmDialog}`} data-testid="periodic-task-remove-dialog">
          <Dialog.Title>移除任务</Dialog.Title>
          <Dialog.Description className={styles.dialogDescription}>
            确认移除「{task.title}」？已有的历史打卡会继续保留。
          </Dialog.Description>
          {archiveError ? <p className={styles.formError} role="alert">移除失败：{archiveError}</p> : null}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={archive.isPending}>继续保留</button>
            <button type="button" className={styles.dangerButton} onClick={() => void confirmArchive()} disabled={archive.isPending}>
              {archive.isPending ? <LoaderCircle className={styles.spin} size={15} /> : <Trash2 size={15} />}
              {archive.isPending ? "移除中…" : "移除任务"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function frequencyMeta(frequency: PeriodicTaskFrequency) {
  return FREQUENCIES.find((item) => item.value === frequency) ?? FREQUENCIES[0];
}

function includesDate(snapshot: { periodStart: string; periodEnd: string }, ymd: string) {
  return snapshot.periodStart <= ymd && ymd <= snapshot.periodEnd;
}

function shiftPeriod(ymd: string, frequency: PeriodicTaskFrequency, direction: -1 | 1) {
  if (frequency === "DAILY") return addCivilDays(ymd, direction);
  if (frequency === "WEEKLY") return addCivilDays(ymd, direction * 7);
  const [year, month] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + direction, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function addCivilDays(ymd: string, amount: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function formatPeriod(snapshot: PeriodicTasksSnapshotDTO) {
  if (snapshot.frequency === "DAILY") {
    return `${formatChineseDate(snapshot.periodStart)} · ${weekdayLabel(snapshot.periodStart)}`;
  }
  if (snapshot.frequency === "WEEKLY") {
    return `${formatChineseDate(snapshot.periodStart)} — ${formatChineseDate(snapshot.periodEnd)}`;
  }
  const [year, month] = snapshot.periodStart.split("-").map(Number);
  return `${year} 年 ${month} 月`;
}

function formatChineseDate(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

function weekdayLabel(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "请求未完成，请稍后重试。";
}
