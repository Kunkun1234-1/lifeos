/**
 * Resin / 精力 — Genshin's 5-layer rhythm gate.
 *
 * Caps at MAX (200). Regenerates 1 per REGEN_INTERVAL_MS (8 minutes), capped
 * at MAX. Stored on User as `resin` + `resinUpdatedAt` (last settled value).
 * Current value is computed lazily on read; settled atomically on spend.
 */

import { prisma } from "./prisma";

export const MAX_RESIN = 200;
export const REGEN_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes per point

export type ResinState = {
  current: number;
  max: number;
  isFull: boolean;
  /** ms until +1 regen (null when full) */
  msToNextRegen: number | null;
  /** epoch ms when resin will be at max (null when full) */
  msToFull: number | null;
  updatedAt: Date;
};

/** Pure helper: given last settled value and timestamp, compute current value. */
export function projectResin(
  lastValue: number,
  lastUpdatedAt: Date,
  now: Date = new Date()
): { current: number; settledAt: Date } {
  if (lastValue >= MAX_RESIN) {
    // Already full — keep settledAt at now so any future spend starts the clock fresh
    return { current: MAX_RESIN, settledAt: now };
  }
  const elapsedMs = now.getTime() - lastUpdatedAt.getTime();
  if (elapsedMs <= 0) {
    return { current: lastValue, settledAt: lastUpdatedAt };
  }
  const ticks = Math.floor(elapsedMs / REGEN_INTERVAL_MS);
  const next = Math.min(MAX_RESIN, lastValue + ticks);
  // Anchor settledAt to the last whole tick boundary so partial ms aren't lost
  const settledAt = new Date(lastUpdatedAt.getTime() + ticks * REGEN_INTERVAL_MS);
  return { current: next, settledAt };
}

/** Read snapshot — does NOT persist. */
export async function getResinSnapshot(userId: string): Promise<ResinState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resin: true, resinUpdatedAt: true },
  });
  if (!user) throw new Error("User not found");
  return summarize(user.resin, user.resinUpdatedAt);
}

function summarize(value: number, settledAt: Date): ResinState {
  const { current, settledAt: anchorAt } = projectResin(value, settledAt);
  const isFull = current >= MAX_RESIN;
  // Clamp both so clock-skew (anchor in the future) can't push values negative.
  const elapsedSinceAnchor = Date.now() - anchorAt.getTime();
  const msToNextRegen = isFull
    ? null
    : Math.max(0, Math.min(REGEN_INTERVAL_MS, REGEN_INTERVAL_MS - elapsedSinceAnchor));
  const msToFull = isFull
    ? null
    : Math.max(0, (MAX_RESIN - current) * REGEN_INTERVAL_MS - elapsedSinceAnchor);
  return {
    current,
    max: MAX_RESIN,
    isFull,
    msToNextRegen,
    msToFull,
    updatedAt: anchorAt,
  };
}

/**
 * Spend `cost` resin atomically. Throws ResinError if insufficient.
 *
 * Strategy: read current settled value, project regen, check budget,
 * write new value + new updatedAt anchored to projected settledAt.
 */
export class ResinError extends Error {
  constructor(public state: ResinState, public cost: number) {
    super(
      `精力不足 · 还剩 ${state.current}/${state.max} · 需要 ${cost}`
    );
    this.name = "ResinError";
  }
}

export async function spendResin(
  userId: string,
  cost: number
): Promise<ResinState> {
  if (cost <= 0) return getResinSnapshot(userId);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { resin: true, resinUpdatedAt: true },
    });
    if (!user) throw new Error("User not found");
    const { current, settledAt } = projectResin(user.resin, user.resinUpdatedAt);
    if (current < cost) {
      throw new ResinError(summarize(user.resin, user.resinUpdatedAt), cost);
    }
    const next = current - cost;
    // If wallet was full and we just spent, anchor regen clock to now
    const newUpdatedAt = current >= MAX_RESIN ? new Date() : settledAt;
    await tx.user.update({
      where: { id: userId },
      data: { resin: next, resinUpdatedAt: newUpdatedAt },
    });
    return summarize(next, newUpdatedAt);
  });
}

/**
 * Refund a previously-spent amount (e.g. when an AI call fails after spending).
 * Reads current settled value, projects regen, adds refund, caps at MAX.
 *
 * Critical: a naive `prisma.update({increment})` would NOT cap and could push
 * resin > 200, breaking the contract.
 */
export async function refundResin(
  userId: string,
  amount: number
): Promise<ResinState | null> {
  if (amount <= 0) return null;
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { resin: true, resinUpdatedAt: true },
    });
    if (!user) return null;
    const { current, settledAt } = projectResin(user.resin, user.resinUpdatedAt);
    const next = Math.min(MAX_RESIN, current + amount);
    // If now full, anchor to now so the regen clock isn't ticking
    const newUpdatedAt = next >= MAX_RESIN ? new Date() : settledAt;
    await tx.user.update({
      where: { id: userId },
      data: { resin: next, resinUpdatedAt: newUpdatedAt },
    });
    return summarize(next, newUpdatedAt);
  });
}

/** Standard costs for AI Coach calls. Tunable from one place. */
export const RESIN_COSTS = {
  decisionCoach: 20,
  weeklyCoach: 30,
  monthlyReview: 50,
  quarterlyReview: 80,
} as const;
