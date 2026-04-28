import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { chatJSON, llmConfigured, LLMError } from "@/lib/llm";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { rateLimit } from "@/lib/rate-limit";
import { spendResin, refundResin, ResinError, RESIN_COSTS } from "@/lib/resin";

type CoachOutput = {
  pattern: string;
  win: string;
  blindspot: string;
  questions: string[];
  nextWeekTop3: string[];
};

export async function GET() {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "AI 教练未启用：缺少 DEEPSEEK_API_KEY 配置" },
      { status: 503 }
    );
  }
  const userId = await getCurrentUserId();
  const limit = rateLimit(`${userId}:ai-weekly-coach`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，${limit.retryAfter}s 后再试` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Pull the same data the Weekly Review page summarizes — but for the LLM
  const [tasksDone, habitTicks, routineCompletions, dailyReviews, commissions, xpRows, openGoals, activeProjects, recentDecisions] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: weekStart, lte: weekEnd } },
      select: { title: true, area: { select: { name: true } } },
      take: 30,
    }),
    prisma.habitTick.count({
      where: { habit: { userId }, direction: "+", createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.routineCompletion.count({
      where: { routine: { userId }, createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.review.findMany({
      where: { userId, kind: "daily", createdAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { createdAt: "asc" },
      select: { mood: true, energy: true, focus: true, content: true, createdAt: true },
    }),
    prisma.dailyCommission.count({
      where: { userId, bonusClaimed: true, createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.xpLedger.aggregate({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      _sum: { amount: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      select: { id: true, objective: true, confidence: true, keyResults: { select: { description: true, current: true, target: true, unit: true } } },
      take: 10,
    }),
    prisma.project.findMany({
      where: { userId, status: "active" },
      select: { title: true, deadline: true },
      take: 10,
    }),
    prisma.decision.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      select: { title: true, status: true, rating: true },
      take: 10,
    }),
  ]);

  const moods = dailyReviews.map((r) => r.mood).filter((v): v is number => v !== null);
  const energies = dailyReviews.map((r) => r.energy).filter((v): v is number => v !== null);
  const focuses = dailyReviews.map((r) => r.focus).filter((v): v is number => v !== null);
  const avg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : null;

  const summary = {
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekEnd: format(weekEnd, "yyyy-MM-dd"),
    counts: {
      tasksDone: tasksDone.length,
      habitTicks,
      routineCompletions,
      dailyReviewsLogged: dailyReviews.length,
      fullCommissionDays: commissions,
      decisionsLogged: recentDecisions.length,
    },
    avgMood: avg(moods),
    avgEnergy: avg(energies),
    avgFocus: avg(focuses),
    totalXp: xpRows._sum.amount ?? 0,
    activeOKRs: openGoals.map((g) => ({
      objective: g.objective,
      confidence: g.confidence,
      krs: g.keyResults.map((k) => `${k.description} ${k.current}/${k.target}${k.unit ? ` ${k.unit}` : ""}`),
    })),
    activeProjects: activeProjects.map((p) => ({
      title: p.title,
      deadline: p.deadline ? format(p.deadline, "yyyy-MM-dd") : null,
    })),
    decisionsThisWeek: recentDecisions,
  };

  const sys = `你是一名思维教练，作风像 Ali Abdaal × James Clear × Ray Dalio。给周复盘一个简短的 reflection。
回复必须是 JSON，不要 Markdown 代码块。中文，犀利，每条不超过 2 句。
不要正能量空话，不要重复数据，不要假装看到模式当数据太少时。`;

  const user = `本周（${summary.weekStart} 至 ${summary.weekEnd}）的活动数据：
${JSON.stringify(summary, null, 2)}

请按下面 schema 返回：
{
  "pattern": "数据中真正显著的一个模式 — 不是描述，是判断（'你这周 XX 比 YY 多 3 倍'之类）",
  "win": "本周最该庆祝/承认的一件事 — 一句话",
  "blindspot": "用户没注意到的一个盲点 — 比如 OKR 推进慢但 confidence 还很高、心情低但任务量大、某 area 缺席",
  "questions": [3 个用于复盘的问题，每个都直击用户行为模式或决定，不是泛泛而问],
  "nextWeekTop3": [基于本周数据建议的下周 3 件最重要的事，要具体可执行]
}`;

  let resinAfter;
  try {
    resinAfter = await spendResin(userId, RESIN_COSTS.weeklyCoach);
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
      maxTokens: 800,
    });
  } catch (e) {
    await refundResin(userId, RESIN_COSTS.weeklyCoach).catch((err) =>
      console.error("[weekly-coach] resin refund failed", err)
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
