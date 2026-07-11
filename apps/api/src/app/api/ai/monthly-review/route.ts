import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { chatJSON, llmConfigured, LLMError } from "@/lib/llm";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { rateLimit } from "@/lib/rate-limit";
import { spendResin, refundResin, ResinError, RESIN_COSTS } from "@/lib/resin";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type CoachOutput = {
  storyline: string;
  areasReport: { area: string; verdict: "Keep" | "More" | "Less" | "Stop"; why: string }[];
  biggestWin: string;
  biggestRegret: string;
  keepMoreLessStop: { keep: string[]; more: string[]; less: string[]; stop: string[] };
  identityCheck: string;
};

export async function GET(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "AI 教练未启用：缺少 DEEPSEEK_API_KEY 配置" },
      { status: 503 }
    );
  }
  const userId = await getCurrentUserId();
  const limit = rateLimit(`${userId}:ai-monthly-review`, 3, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，${limit.retryAfter}s 后再试` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month"); // YYYY-MM (defaults to current)
  if (monthParam && !MONTH_RE.test(monthParam)) {
    return NextResponse.json(
      { error: "month must match YYYY-MM (e.g. 2026-04)" },
      { status: 400 }
    );
  }
  const targetDate = monthParam ? new Date(`${monthParam}-15`) : new Date();
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const [tasksDone, areasXp, dailyReviews, weeklyReviews, decisions, completedGoals, completedProjects, currentUser] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: monthStart, lte: monthEnd } },
      select: { title: true, area: { select: { name: true } } },
      take: 100,
    }),
    prisma.xpLedger.findMany({
      where: { userId, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, areaKey: true },
    }),
    prisma.review.findMany({
      where: { userId, kind: "daily", createdAt: { gte: monthStart, lte: monthEnd } },
      select: { mood: true, energy: true, focus: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { userId, kind: "weekly", createdAt: { gte: monthStart, lte: monthEnd } },
      select: { content: true, createdAt: true },
    }),
    prisma.decision.findMany({
      where: { userId, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { title: true, status: true, rating: true, outcome: true, lessons: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "done", updatedAt: { gte: monthStart, lte: monthEnd } },
      select: { objective: true, areaId: true, area: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { userId, status: "done", completedAt: { gte: monthStart, lte: monthEnd } },
      select: { title: true, area: { select: { name: true } } },
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
  const moods = dailyReviews.map((r) => r.mood).filter((v): v is number => v !== null);
  const avg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : null;

  const tasksByArea: Record<string, number> = {};
  for (const t of tasksDone) {
    const k = t.area?.name ?? "Unassigned";
    tasksByArea[k] = (tasksByArea[k] ?? 0) + 1;
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
    period: `${format(monthStart, "yyyy-MM-dd")} 至 ${format(monthEnd, "yyyy-MM-dd")}`,
    counts: {
      tasksDone: tasksDone.length,
      dailyReviewsLogged: dailyReviews.length,
      weeklyReviewsLogged: weeklyReviews.length,
      decisionsLogged: decisions.length,
      decisionsReviewed: decisions.filter((d) => d.status === "reviewed").length,
      goalsCompleted: completedGoals.length,
      projectsCompleted: completedProjects.length,
    },
    xpByArea,
    tasksByArea,
    avgMood: avg(moods),
    avgEnergy: avg(dailyReviews.map((r) => r.energy).filter((v): v is number => v !== null)),
    avgFocus: avg(dailyReviews.map((r) => r.focus).filter((v): v is number => v !== null)),
    completedGoals: completedGoals.map((g) => g.objective),
    completedProjects: completedProjects.map((p) => p.title),
    decisionLessons: decisions
      .filter((d) => d.lessons)
      .map((d) => `${d.title}: ${d.lessons}`),
    identity: { vision: currentUser?.visionStatement, identityStatements: identity, values },
  };

  const sys = `你是一名月度复盘教练。融合 Tiago Forte（PARA）、James Clear（身份认同）、Ali Abdaal（feel-good productivity）的视角。
回复必须是 JSON，不要 Markdown 代码块。中文。诚实但不刻薄。`;

  const user = `本月数据：
${JSON.stringify(summary, null, 2)}

请按 schema 返回：
{
  "storyline": "本月的一句话叙事 — 比如'这是你抓战略放执行的一个月'，不要套话",
  "areasReport": [对每个有数据的 Area 评一个 verdict (Keep/More/Less/Stop) 加一句 why],
  "biggestWin": "最该被记住的一件事",
  "biggestRegret": "最该警觉的一个 pattern — 不是'我应该更努力'这种废话",
  "keepMoreLessStop": { "keep": [...], "more": [...], "less": [...], "stop": [...] },
  "identityCheck": "本月的行为是不是和 identityStatements/values 一致？给一句诚实判断"
}`;

  let resinAfter;
  try {
    resinAfter = await spendResin(userId, RESIN_COSTS.monthlyReview);
  } catch (e) {
    if (e instanceof ResinError) {
      return NextResponse.json(
        { error: e.message, resin: e.state, cost: e.cost },
        { status: 402 }
      );
    }
    throw e;
  }

  let coach: CoachOutput;
  try {
    coach = await chatJSON<CoachOutput>({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.5,
      maxTokens: 1200,
    });
  } catch (e) {
    await refundResin(userId, RESIN_COSTS.monthlyReview).catch((err) =>
      console.error("[monthly-review] resin refund failed", err)
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
