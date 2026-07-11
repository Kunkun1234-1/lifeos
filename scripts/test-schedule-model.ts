import assert from "node:assert/strict";
import type { RoutineDTO, TaskDTO } from "../src/lib/types";
import {
  SCHEDULE_META_KEY,
  buildEntries,
  calendarDates,
  completionSummary,
  conflictIds,
  decodeNotes,
  tasksForDate,
} from "../src/app/routines/schedule-model";

const baseRoutine: RoutineDTO = {
  id: "routine-1",
  title: "专注工作",
  notes: JSON.stringify({
    [SCHEDULE_META_KEY]: true,
    kind: "single",
    date: "2026-07-11",
    startTime: "09:00",
    endTime: "10:30",
    note: "完成重构",
  }),
  daysOfWeek: "[6]",
  xpReward: 10,
  goldReward: 5,
  streakCurrent: 2,
  streakBest: 4,
  lastCompletedDate: null,
  areaId: null,
  area: null,
  completedToday: false,
};

const entries = buildEntries([
  baseRoutine,
  {
    ...baseRoutine,
    id: "routine-2",
    title: "评审",
    notes: JSON.stringify({
      [SCHEDULE_META_KEY]: true,
      kind: "single",
      date: "2026-07-11",
      startTime: "10:00",
      endTime: "11:00",
    }),
  },
], "2026-07-11");

assert.equal(entries.length, 2);
assert.equal(entries[0].note, "完成重构");
assert.deepEqual([...conflictIds(entries)].sort(), ["routine-1", "routine-2"]);
assert.equal(decodeNotes("普通备注").note, "普通备注");
assert.equal(calendarDates("2026-07-11").length, 42);
assert.deepEqual(completionSummary(entries, "2026-07-11", "2026-07-11", new Date(2026, 6, 11, 9, 30)), {
  done: 0,
  active: 1,
  pending: 1,
  rate: 0,
});

const task: TaskDTO = {
  id: "task-1",
  title: "检查日程页",
  notes: null,
  status: "TODO",
  priority: 2,
  dueDate: "2026-07-11T00:00:00.000Z",
  xpReward: 10,
  goldReward: 5,
  areaId: null,
  area: null,
  projectId: null,
  project: null,
  completedAt: null,
  createdAt: "2026-07-10T00:00:00.000Z",
};

assert.deepEqual(tasksForDate([task], "2026-07-11").map((item) => item.id), ["task-1"]);
console.log("schedule model tests passed");
