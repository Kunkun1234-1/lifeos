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
