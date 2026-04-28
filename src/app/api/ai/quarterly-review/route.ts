import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { chatJSON, llmConfigured, LLMError } from "@/lib/llm";
import { startOfQuarter, endOfQuarter, format } from "date-fns";
import { rateLimit } from "@/lib/rate-limit";
import { spendResin, refundResin, ResinError, RESIN_COSTS } from "@/lib/resin";

const QUARTER_RE = /^Q[1-4]-\d{4}$/;

type CoachOutput = {
  storyline: string;
  bigArc: string;
  okrScores: { objective: string; score: number; commentary: string }[];
  nextQuarterFocus: string[];
  identityShift: string;
  principleCandidates: string[];
};

function parseQuarter(input: string | null): { year: number; q: number } {
  if (input && QUARTER_RE.test(input)) {
    const [qStr, yStr] = input.split("-");
    return { q: Number(qStr.slice(1)), year: Number(yStr) };
  }
  const now = new Date();
  return { q: Math.floor(now.getMonth() / 3) + 1, year: now.getFullYear() };
}

export async function GET(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "AI 教练未启用：缺少 DEEPSEEK_API_KEY 配置" },
      { status: 503 }
    );
  }
  const userId = await getCurrentUserId();
  const limit = rateLimit(`${userId}:ai-quarterly-review`, 2, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，${limit.retryAfter}s 后再试` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const url = new URL(req.url);
  const qParam = url.searchParams.get("quarter");
  if (qParam && !QUARTER_RE.test(qParam)) {
    return NextResponse.json(
      { error: "quarter must match Qn-YYYY (e.g. Q2-2026)" },
      { status: 400 }
    );
  }
  const { q, year } = parseQuarter(qParam);
  const targetDate = new Date(year, (q - 1) * 3 + 1, 15);
  const periodStart = startOfQuarter(targetDate);
  const periodEnd = endOfQuarter(targetDate);
  const periodLabel = `Q${q}-${year}`;

  const [tasksDone, areasXp, dailyReviews, weeklyReviews, monthlyReviews, decisions, completedGoals, completedProjects, allActiveGoals, currentUser] = await Promise.all([
    prisma.task.count({
      where: { userId, status: "DONE", completedAt: { gte: periodStart, lte: periodEnd } },
    }),
    prisma.xpLedger.findMany({
      where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { amount: true, areaKey: true },
    }),
    prisma.review.count({ where: { userId, kind: "daily", createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.review.count({ where: { userId, kind: "weekly", createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.review.count({ where: { userId, kind: "monthly", createdAt: { gte: periodStart, lte: periodEnd } } }),
    prisma.decision.findMany({
      where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
      select: { title: true, status: true, rating: true, lessons: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "done", updatedAt: { gte: periodStart, lte: periodEnd } },
      select: { objective: true, area: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { userId, status: "done", completedAt: { gte: periodStart, lte: periodEnd } },
      select: { title: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active", timeframe: { contains: periodLabel } },
      select: {
        objective: true,
        confidence: true,
        keyResults: { select: { description: true, current: true, target: true, unit: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { visionStatement: true, identityStatements: true, coreValues: true },
    }),
  ]);

  const xpByArea: Record<string, number> = {};
  for (const e of areasXp) {
    if (!e.areaKey) continue;
    xpByArea[e.areaKey] = (xpByArea[e.areaKey] ?? 0) + e.amount;
  }

  let identity: string[] = [];
  let values: string[] = [];
  try {
    identity = JSON.parse(currentUser?.identityStatements ?? "[]");
    values = JSON.parse(currentUser?.coreValues ?? "[]");
  } catch {
    identity = [];
    values = [];
  }

  const summary = {
    period: periodLabel,
    range: `${format(periodStart, "yyyy-MM-dd")} 至 ${format(periodEnd, "yyyy-MM-dd")}`,
    counts: {
      tasksDone,
      dailyReviews,
      weeklyReviews,
      monthlyReviews,
      decisionsLogged: decisions.length,
      decisionsReviewed: decisions.filter((d) => d.status === "reviewed").length,
      goalsCompleted: completedGoals.length,
      projectsCompleted: completedProjects.length,
    },
    xpByArea,
    completedGoals: completedGoals.map((g) => g.objective),
    completedProjects: completedProjects.map((p) => p.title),
    activeOKRs: allActiveGoals.map((g) => ({
      objective: g.objective,
      confidence: g.confidence,
      krs: g.keyResults.map((k) => `${k.description} ${k.current}/${k.target}${k.unit ? ` ${k.unit}` : ""}`),
    })),
    decisionLessons: decisions.filter((d) => d.lessons).map((d) => `${d.title}: ${d.lessons}`),
    identity: { vision: currentUser?.visionStatement, identityStatements: identity, values },
  };

  let resinAfter;
  try {
    resinAfter = await spendResin(userId, RESIN_COSTS.quarterlyReview);
  } catch (e) {
    if (e instanceof ResinError) {
      return NextResponse.json(
        { error: e.message, resin: e.state, cost: e.cost },
        { status: 402 }
      );
    }
    throw e;
  }

  const sys = `你是一名季度战略教练，融合 Brian Moran《12 Week Year》、John Doerr《Measure What Matters》和 Ray Dalio Principles 的视角。
回复必须是 JSON，不要 Markdown 代码块。中文。简洁犀利，给真正的洞察不给套话。`;

  const user = `本季度数据（${periodLabel}）：
${JSON.stringify(summary, null, 2)}

请按 schema 返回：
{
  "storyline": "本季度的一句话叙事",
  "bigArc": "比月度更宏观：这 3 个月构成了什么样的一个 arc？",
  "okrScores": [对每个 active OKR，按完成度给出 0.0-1.0 评分 + 一句 commentary。如果列表为空就返回空数组],
  "nextQuarterFocus": [下季度建议的 3 件最重要的事],
  "identityShift": "这季度的行为，让用户的身份认同发生了什么改变？是更靠近还是更偏离 identityStatements？",
  "principleCandidates": [从本季的 lessons 和 行为模式 里提炼 1-3 条候选原则，可加入 Principles 库]
}`;

  let coach: CoachOutput;
  try {
    coach = await chatJSON<CoachOutput>({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      maxTokens: 1500,
    });
  } catch (e) {
    await refundResin(userId, RESIN_COSTS.quarterlyReview).catch((err) =>
      console.error("[quarterly-review] resin refund failed", err)
    );
    if (e instanceof LLMError) {
      return NextResponse.json(
        { error: e.message, detail: e.detail },
        { status: e.status ?? 502 }
      );
    }
    throw e;
  }

  return NextResponse.json({ summary, coach, resin: resinAfter });
}
