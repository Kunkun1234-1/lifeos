import assert from "node:assert/strict";
import test from "node:test";
import { getPeriodicPeriod } from "../packages/domain/src/periodic-tasks";

test("returns the selected day for a daily period", () => {
  assert.deepEqual(getPeriodicPeriod("DAILY", "2026-10-07"), {
    periodKey: "2026-10-07",
    periodStart: "2026-10-07",
    periodEnd: "2026-10-07",
  });
});

test("uses Monday through Sunday for a weekly period", () => {
  assert.deepEqual(getPeriodicPeriod("WEEKLY", "2026-10-07"), {
    periodKey: "2026-10-05",
    periodStart: "2026-10-05",
    periodEnd: "2026-10-11",
  });
});

test("keeps Monday on the same weekly period boundary", () => {
  assert.deepEqual(getPeriodicPeriod("WEEKLY", "2026-10-05"), {
    periodKey: "2026-10-05",
    periodStart: "2026-10-05",
    periodEnd: "2026-10-11",
  });
});

test("keeps Sunday on the preceding Monday weekly period", () => {
  assert.deepEqual(getPeriodicPeriod("WEEKLY", "2026-10-11"), {
    periodKey: "2026-10-05",
    periodStart: "2026-10-05",
    periodEnd: "2026-10-11",
  });
});

test("returns a weekly period spanning two calendar years", () => {
  assert.deepEqual(getPeriodicPeriod("WEEKLY", "2027-01-01"), {
    periodKey: "2026-12-28",
    periodStart: "2026-12-28",
    periodEnd: "2027-01-03",
  });
});

test("returns the full month for a monthly period", () => {
  assert.deepEqual(getPeriodicPeriod("MONTHLY", "2026-04-30"), {
    periodKey: "2026-04-01",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
  });
});

test("includes February 29 in a leap-year monthly period", () => {
  assert.deepEqual(getPeriodicPeriod("MONTHLY", "2028-02-29"), {
    periodKey: "2028-02-01",
    periodStart: "2028-02-01",
    periodEnd: "2028-02-29",
  });
});

test("uses UTC calendar fields when a Date has a non-midnight instant", () => {
  assert.deepEqual(
    getPeriodicPeriod("DAILY", new Date("2026-12-31T23:30:00.000Z")),
    {
      periodKey: "2026-12-31",
      periodStart: "2026-12-31",
      periodEnd: "2026-12-31",
    },
  );
});

test("rejects an invalid Date object", () => {
  assert.throws(
    () => getPeriodicPeriod("DAILY", new Date(Number.NaN)),
    RangeError,
  );
});

test("rejects a nonexistent calendar date", () => {
  assert.throws(() => getPeriodicPeriod("MONTHLY", "2026-02-29"), RangeError);
});

test("rejects a date that is not zero-padded YYYY-MM-DD", () => {
  assert.throws(() => getPeriodicPeriod("WEEKLY", "2026-2-03"), RangeError);
});

test("rejects an unsupported frequency at runtime", () => {
  assert.throws(
    () => getPeriodicPeriod("YEARLY" as never, "2026-10-07"),
    RangeError,
  );
});
