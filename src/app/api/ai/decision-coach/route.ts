import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/user";
import { chatJSON, llmConfigured, LLMError } from "@/lib/llm";
import { computeEV } from "@/lib/decisions";
import { rateLimit } from "@/lib/rate-limit";
import { spendResin, refundResin, ResinError, RESIN_COSTS } from "@/lib/resin";

const Body = z.object({
  decisionId: z.string().min(1).optional(),
  // Or pass an inline draft (so the user can coach BEFORE saving)
  draft: z
    .object({
      title: z.string().min(1).max(200),
      context: z.string().min(1).max(4000),
      stakes: z.enum(["low", "medium", "high"]).default("medium"),
      options: z
        .array(
          z.object({
            label: z.string().min(1),
            prob: z.number().min(0).max(1),
            payoff: z.number(),
            penalty: z.number(),
            notes: z.string().optional().nullable(),
          })
        )
        .min(2)
        .max(6),
    })
    .optional(),
});

type CoachOutput = {
  preMortem: string[];
  devilsAdvocate: string;
  suggestedPrincipleIds: string[];
  tenTenTen: string;
  ev_commentary: string;
};

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "AI 教练未启用：缺少 DEEPSEEK_API_KEY 配置" },
      { status: 503 }
    );
  }
  const userId = await getCurrentUserId();
  const limit = rateLimit(`${userId}:ai-decision-coach`, 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，${limit.retryAfter}s 后再试` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Resolve decision payload either from DB or inline draft
  let title: string;
  let context: string;
  let stakes: string;
  let options: { label: string; prob: number; payoff: number; penalty: number; notes?: string | null }[];

  if (parsed.data.decisionId) {
    const d = await prisma.decision.findFirst({
      where: { id: parsed.data.decisionId, userId },
    });
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    title = d.title;
    context = d.context;
    stakes = d.stakes;
    let opts: typeof options = [];
    try {
      opts = JSON.parse(d.options);
    } catch {
      opts = [];
    }
    options = opts;
  } else if (parsed.data.draft) {
    ({ title, context, stakes, options } = parsed.data.draft);
  } else {
    return NextResponse.json(
      { error: "Provide decisionId or draft" },
      { status: 400 }
    );
  }

  const principles = await prisma.principle.findMany({
    where: { userId, archived: false },
    select: { id: true, title: true, body: true, category: true },
    take: 30,
  });

  const optionsWithEV = options.map((o, i) => ({
    idx: i,
    label: o.label,
    prob: o.prob,
    payoff: o.payoff,
    penalty: o.penalty,
    ev: Number(computeEV(o).toFixed(2)),
  }));

  const principlesPalette = principles
    .map((p) => `- [${p.id}] (${p.category}) ${p.title} — ${p.body.slice(0, 120)}`)
    .join("\n");

  const sys = `你是一名严谨的决策教练，融合 Ray Dalio《Principles》、Daniel Kahneman《Thinking Fast and Slow》、和 Heath 兄弟 WRAP 框架的思维方式。
你的任务是帮用户避开决策陷阱（确认偏误、损失厌恶、近因效应、过度自信、狭隘框架）。
回复必须是有效的 JSON，不要 Markdown 代码块。中文输出，简洁犀利，每条 1-2 句。`;

  const user = `决策背景：
标题：${title}
上下文：${context}
赌注：${stakes}

候选选项（含 EV 计算）：
${JSON.stringify(optionsWithEV, null, 2)}

用户的原则库（id 是稳定标识符，给建议时直接引用 id）：
${principlesPalette || "（用户尚未写下原则）"}

请按下面的 JSON schema 返回（严格遵守字段名）：
{
  "preMortem": [3-4 条最可能让此决策半年后失败的具体原因，每条以"如果……可能因为……"开头],
  "devilsAdvocate": "扮演反方一句话挑战 EV 最高选项的隐含假设，让用户看到自己没看到的盲点",
  "suggestedPrincipleIds": [从原则库里选 1-3 个最相关的原则 id，列表为 string 数组；用户没写原则时给空数组],
  "tenTenTen": "10 分钟 / 10 个月 / 10 年视角下三句话提示，用 ' / ' 分隔",
  "ev_commentary": "EV 数学的一句解读 — 比如最高 EV 是否其实方差很大、或者 EV 差距其实在 noise 范围内"
}`;

  // Spend resin BEFORE calling DeepSeek (refund on LLM failure)
  let resinAfter;
  try {
    resinAfter = await spendResin(userId, RESIN_COSTS.decisionCoach);
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
      temperature: 0.6,
      maxTokens: 800,
    });
  } catch (e) {
    // Refund the spent resin since the LLM call itself failed (capped at MAX)
    await refundResin(userId, RESIN_COSTS.decisionCoach).catch((err) =>
      console.error("[decision-coach] resin refund failed", err)
    );
    if (e instanceof LLMError) {
      return NextResponse.json(
        { error: e.message, detail: e.detail },
        { status: e.status ?? 502 }
      );
    }
    throw e;
  }

  // Sanitize suggestedPrincipleIds — only keep ones that actually belong to the user
  const ownedIds = new Set(principles.map((p) => p.id));
  const cleanIds = (coach.suggestedPrincipleIds ?? []).filter((id) =>
    ownedIds.has(id)
  );
  const suggestedPrinciples = principles.filter((p) => cleanIds.includes(p.id));

  // Pick only known schema fields — defense against prompt injection that tries
  // to smuggle extra keys back to the client.
  return NextResponse.json({
    preMortem: Array.isArray(coach.preMortem) ? coach.preMortem.slice(0, 6) : [],
    devilsAdvocate: typeof coach.devilsAdvocate === "string" ? coach.devilsAdvocate : "",
    tenTenTen: typeof coach.tenTenTen === "string" ? coach.tenTenTen : "",
    ev_commentary: typeof coach.ev_commentary === "string" ? coach.ev_commentary : "",
    suggestedPrincipleIds: cleanIds,
    suggestedPrinciples,
    resin: resinAfter,
  });
}
