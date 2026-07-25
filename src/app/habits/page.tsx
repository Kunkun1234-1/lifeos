"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import {
  useHabits,
  useCreateHabit,
  useTickHabit,
  useDeleteHabit,
} from "@/hooks/queries";
import type { HabitDTO } from "@/lib/types";
import {
  addDaysYMD,
  daysInRange,
  endOfWeekYMD,
  startOfWeekYMD,
  todayYMD,
} from "@/lib/date";
import styles from "./page.module.css";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export default function HabitsPage() {
  const [showForm, setShowForm] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => todayYMD());
  const { data: habits, isLoading } = useHabits();

  const weekStart = startOfWeekYMD(weekAnchor);
  const weekEnd = endOfWeekYMD(weekAnchor);
  const days = useMemo(() => daysInRange(weekStart, weekEnd), [weekStart, weekEnd]);
  const today = todayYMD();

  const list = habits ?? [];
  const stats = useMemo(() => deriveStats(list, days, today), [list, days, today]);

  const weekTitle = `${formatShort(weekStart)} — ${formatShort(weekEnd)}`;

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>习惯养成</h1>
          <p className={styles.pageDesc}>
            像表格一样打卡：点格子记录当天完成，再点一次可取消。
          </p>
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setWeekAnchor(todayYMD())}
          >
            回到本周
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={15} />
            {showForm ? "收起" : "新建习惯"}
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>本周完成格</div>
            <div className={styles.statValue}>
              {stats.checked}/{stats.possible || 0}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>今日打卡</div>
            <div className={styles.statValue}>
              {stats.todayDone}/{list.filter((h) => h.direction !== "negative").length || 0}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>累计正向</div>
            <div className={styles.statValue}>{stats.totalPositive}</div>
          </div>
        </div>

        {showForm ? (
          <section className={styles.panel}>
            <HabitForm onDone={() => setShowForm(false)} />
          </section>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>打卡表</h2>
            <div className={styles.weekNav}>
              <button
                type="button"
                className={styles.iconBtn}
                title="上一周"
                onClick={() => setWeekAnchor(addDaysYMD(weekStart, -7))}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.weekLabel}>{weekTitle}</span>
              <button
                type="button"
                className={styles.iconBtn}
                title="下一周"
                onClick={() => setWeekAnchor(addDaysYMD(weekStart, 7))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.empty}>正在加载习惯…</div>
          ) : list.length === 0 ? (
            <div className={styles.empty}>
              还没有习惯。点右上角「新建习惯」开始第一行打卡。
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.habitCol}>习惯</th>
                    {days.map((ymd, index) => (
                      <th key={ymd} data-today={ymd === today}>
                        周{WEEKDAY_LABELS[index]}
                        <span className={styles.dayNum}>{Number(ymd.slice(8))}</span>
                      </th>
                    ))}
                    <th className={styles.rateCell}>完成</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((habit) => (
                    <HabitCheckRow
                      key={habit.id}
                      habit={habit}
                      days={days}
                      today={today}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HabitCheckRow({
  habit,
  days,
  today,
}: {
  habit: HabitDTO;
  days: string[];
  today: string;
}) {
  const tick = useTickHabit();
  const remove = useDeleteHabit();
  const primaryDirection: "+" | "-" =
    habit.direction === "negative" ? "-" : "+";
  const isNegativeHabit = habit.direction === "negative";

  const checkedDays = useMemo(() => {
    const set = new Set<string>();
    for (const t of habit.ticks ?? []) {
      if (t.direction === primaryDirection) set.add(t.date);
    }
    return set;
  }, [habit.ticks, primaryDirection]);

  const weekDone = days.filter((d) => d <= today && checkedDays.has(d)).length;
  const weekPossible = days.filter((d) => d <= today).length;
  const rate =
    weekPossible > 0 ? Math.round((weekDone / weekPossible) * 100) : 0;

  return (
    <tr>
      <td className={styles.habitCol}>
        <div className={styles.habitCell}>
          <div className={styles.habitName}>
            <span className={styles.habitTitle}>{habit.title}</span>
            <span className={styles.habitMeta}>
              {habit.area ? `${habit.area.icon} ${habit.area.name}` : "未分领域"}
              {" · "}
              <Flame size={10} style={{ display: "inline", verticalAlign: "-1px" }} />{" "}
              {habit.positiveCount}
              {habit.negativeCount > 0 ? ` · −${habit.negativeCount}` : ""}
            </span>
          </div>
        </div>
      </td>
      {days.map((ymd) => {
        const checked = checkedDays.has(ymd);
        const future = ymd > today;
        return (
          <td key={ymd}>
            <button
              type="button"
              className={styles.cellBtn}
              data-checked={checked}
              data-negative={isNegativeHabit}
              data-today={ymd === today}
              disabled={future || tick.isPending}
              title={
                future
                  ? "未来日期不可打卡"
                  : checked
                    ? "再次点击取消"
                    : isNegativeHabit
                      ? "记录破戒"
                      : "打卡完成"
              }
              onClick={() =>
                tick.mutate({
                  id: habit.id,
                  direction: primaryDirection,
                  date: ymd,
                  toggle: true,
                })
              }
            >
              {checked ? (
                isNegativeHabit ? (
                  <Minus size={14} strokeWidth={3} />
                ) : (
                  <Check size={14} strokeWidth={3} />
                )
              ) : null}
            </button>
          </td>
        );
      })}
      <td className={styles.rateCell}>{rate}%</td>
      <td>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.iconBtn}
            title="归档习惯"
            onClick={() => {
              if (confirm(`归档习惯「${habit.title}」？历史打卡会保留。`)) {
                remove.mutate(habit.id);
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function HabitForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"positive" | "negative" | "both">(
    "positive",
  );
  const [xpPerTick, setXpPerTick] = useState(5);
  const [goldPerTick, setGoldPerTick] = useState(2);
  const create = useCreateHabit();

  const submit = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      notes: notes.trim() || null,
      areaId,
      direction,
      xpPerTick,
      goldPerTick,
    });
    onDone();
  };

  return (
    <div className={styles.formShell}>
      <h2 className={styles.formTitle}>新建习惯</h2>
      <p className={styles.formDetail}>
        正向习惯用于培养；负向习惯用于戒除（格子标红）。
      </p>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <Label>名称</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：每天喝 2L 水"
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <Label>备注（可选）</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <div className={styles.formRow2}>
          <div className={styles.field}>
            <Label>人生领域</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className={styles.field}>
            <Label>类型</Label>
            <Select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as "positive" | "negative" | "both")
              }
            >
              <option value="positive">正向 — 培养</option>
              <option value="negative">负向 — 戒除</option>
              <option value="both">双向 — 可加可减</option>
            </Select>
          </div>
          <div className={styles.field}>
            <Label>每次 XP</Label>
            <Input
              type="number"
              min={0}
              value={xpPerTick}
              onChange={(e) => setXpPerTick(Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <Label>每次金币</Label>
            <Input
              type="number"
              min={0}
              value={goldPerTick}
              onChange={(e) => setGoldPerTick(Number(e.target.value))}
            />
          </div>
        </div>
        <div className={styles.formFooter}>
          <button type="button" className={styles.btnGhost} onClick={onDone}>
            取消
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => void submit()}
            disabled={create.isPending || !title.trim()}
          >
            {create.isPending ? "保存中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function deriveStats(habits: HabitDTO[], days: string[], today: string) {
  let checked = 0;
  let possible = 0;
  let todayDone = 0;
  let totalPositive = 0;

  for (const habit of habits) {
    totalPositive += habit.positiveCount;
    const direction: "+" | "-" = habit.direction === "negative" ? "-" : "+";
    const set = new Set(
      (habit.ticks ?? [])
        .filter((t) => t.direction === direction)
        .map((t) => t.date),
    );
    for (const day of days) {
      if (day > today) continue;
      possible += 1;
      if (set.has(day)) checked += 1;
    }
    if (habit.direction !== "negative" && set.has(today)) todayDone += 1;
  }

  return { checked, possible, todayDone, totalPositive };
}

function formatShort(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}
