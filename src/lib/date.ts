/**
 * Local YYYY-MM-DD date helpers.
 * We use the *local* civil date for streak / commission bucketing — not UTC —
 * because users think in wall-clock days.
 */
export function toYMD(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

export function addDaysYMD(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return toYMD(date);
}

export function dayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Get Monday (start) of the ISO week containing ymd. */
export function startOfWeekYMD(ymd: string = todayYMD()): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=Sun..6=Sat
  // Treat Monday as start of week (ISO). Sun (0) → -6, Mon (1) → 0, etc.
  const offset = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + offset);
  return toYMD(dt);
}

export function endOfWeekYMD(ymd: string = todayYMD()): string {
  return addDaysYMD(startOfWeekYMD(ymd), 6);
}

/** Date object representing midnight (local) of the YYYY-MM-DD. */
export function ymdToDate(ymd: string, endOfDay = false): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Format an instant as YYYY-MM-DD in a given IANA timezone. */
export function formatYMDInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Pick a UTC instant that falls on `ymd` around midday in `timeZone`.
 * Used so HabitTick.createdAt lands on the intended civil day.
 */
export function middayInTz(ymd: string, timeZone: string): Date {
  let guess = new Date(`${ymd}T12:00:00.000Z`);
  for (let i = 0; i < 36; i++) {
    const got = formatYMDInTz(guess, timeZone);
    if (got === ymd) return guess;
    guess = new Date(guess.getTime() + (got < ymd ? 1 : -1) * 60 * 60 * 1000);
  }
  return guess;
}

/** Inclusive UTC search window covering a civil day in `timeZone` (±1 day padding). */
export function daySearchWindow(ymd: string, timeZone: string): { start: Date; end: Date } {
  const mid = middayInTz(ymd, timeZone);
  return {
    start: new Date(mid.getTime() - 36 * 60 * 60 * 1000),
    end: new Date(mid.getTime() + 36 * 60 * 60 * 1000),
  };
}

export function daysInRange(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cursor = startYmd;
  while (cursor <= endYmd) {
    out.push(cursor);
    cursor = addDaysYMD(cursor, 1);
    if (out.length > 62) break;
  }
  return out;
}
