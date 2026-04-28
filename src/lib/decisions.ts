import type { DecisionOption } from "./types";

/** Expected value: prob × payoff − (1−prob) × penalty. */
export function computeEV(opt: { prob: number; payoff: number; penalty: number }) {
  const p = Math.min(1, Math.max(0, opt.prob));
  return p * opt.payoff - (1 - p) * opt.penalty;
}

/** Annotate every option with its computed EV. */
export function withEV(opts: DecisionOption[]): DecisionOption[] {
  return opts.map((o) => ({ ...o, ev: computeEV(o) }));
}

type DBDecision = {
  id: string;
  title: string;
  context: string;
  status: string;
  stakes: string;
  options: string;
  chosenIndex: number | null;
  preMortem: string | null;
  tenTenTen: string | null;
  decidedAt: Date | null;
  reviewDueAt: Date | null;
  reviewedAt: Date | null;
  outcome: string | null;
  lessons: string | null;
  rating: number | null;
  areaId: string | null;
  area: {
    id: string;
    name: string;
    icon: string;
    color: string;
    attributeKey: string;
  } | null;
  principles: {
    principle: { id: string; title: string; emoji: string };
  }[];
  createdAt: Date;
};

export function serializeDecision(d: DBDecision) {
  let parsedOptions: DecisionOption[] = [];
  try {
    const raw = JSON.parse(d.options);
    if (Array.isArray(raw)) parsedOptions = raw;
  } catch {
    parsedOptions = [];
  }
  return {
    id: d.id,
    title: d.title,
    context: d.context,
    status: d.status as "open" | "decided" | "reviewed",
    stakes: d.stakes as "low" | "medium" | "high",
    options: withEV(parsedOptions),
    chosenIndex: d.chosenIndex,
    preMortem: d.preMortem,
    tenTenTen: d.tenTenTen,
    decidedAt: d.decidedAt?.toISOString() ?? null,
    reviewDueAt: d.reviewDueAt?.toISOString() ?? null,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    outcome: d.outcome,
    lessons: d.lessons,
    rating: d.rating,
    areaId: d.areaId,
    area: d.area
      ? {
          id: d.area.id,
          name: d.area.name,
          icon: d.area.icon,
          color: d.area.color,
          attributeKey: d.area.attributeKey,
        }
      : null,
    principles: d.principles.map((p) => p.principle),
    createdAt: d.createdAt.toISOString(),
  };
}
