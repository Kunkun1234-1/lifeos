"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useCreateReview, useReviews } from "@/hooks/queries";
import { api } from "@/lib/fetcher";
import { BookOpen, CalendarDays, CalendarRange, CalendarClock, Sparkles, Loader2 } from "lucide-react";

type Tab = "daily" | "weekly" | "monthly" | "quarterly";

export default function ReviewPage() {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-8 py-8">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">复盘</span>
          <span className="en text-[11px]">Review</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
        <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
          每日 2-3 分钟，每周日 20-30 分钟。复盘是这个系统真正能&ldquo;学你&rdquo;的部分。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        <TabButton active={tab === "daily"} onClick={() => setTab("daily")} icon={<BookOpen size={14} />}>
          每日 · Daily
        </TabButton>
        <TabButton active={tab === "weekly"} onClick={() => setTab("weekly")} icon={<CalendarDays size={14} />}>
          每周 · Weekly
        </TabButton>
        <TabButton active={tab === "monthly"} onClick={() => setTab("monthly")} icon={<CalendarRange size={14} />}>
          每月 · Monthly
        </TabButton>
        <TabButton active={tab === "quarterly"} onClick={() => setTab("quarterly")} icon={<CalendarClock size={14} />}>
          每季 · Quarterly
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "daily" ? (
          <motion.div key="d" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <DailyReview />
          </motion.div>
        ) : tab === "weekly" ? (
          <motion.div key="w" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            <WeeklyReview />
          </motion.div>
        ) : tab === "monthly" ? (
          <motion.div key="m" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            <MonthlyReview />
          </motion.div>
        ) : (
          <motion.div key="q" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            <QuarterlyReview />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 font-display text-sm transition-colors ${
        active
          ? "text-[var(--fg-strong)]"
          : "text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
      }`}
    >
      {icon}
      {children}
      {active && (
        <motion.div
          layoutId="review-tab-underline"
          className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[var(--gold)]"
        />
      )}
    </button>
  );
}

/* ---------- Daily Review ---------- */
function DailyReview() {
  const [top3, setTop3] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [focus, setFocus] = useState(7);
  const [submitted, setSubmitted] = useState(false);

  const create = useCreateReview();
  const { data: reviews } = useReviews("daily");

  const submit = async () => {
    await create.mutateAsync({
      kind: "daily",
      content: { top3Done: top3, oneLiner, notes },
      mood,
      energy,
      focus,
    });
    setSubmitted(true);
    setTop3("");
    setOneLiner("");
    setNotes("");
  };

  return (
    <div className="space-y-5">
      <div className="panel-cream framed rounded-sm p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="section-label">
            <span className="cn text-base">{new Date().toLocaleDateString("zh-CN")}</span>
            <span className="en text-[10px]">Today</span>
          </div>
          <span className="text-[10px] text-[var(--fg-muted)]">
            奖励 +30 XP / +10⭐ / +1🎫
          </span>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-1.5">
            <Label>今日 Top 3 — 做了哪几件？</Label>
            <Textarea
              value={top3}
              onChange={(e) => setTop3(e.target.value)}
              placeholder="1. … 2. … 3. …"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Slider label="心情" value={mood} onChange={setMood} />
            <Slider label="精力" value={energy} onChange={setEnergy} />
            <Slider label="专注" value={focus} onChange={setFocus} />
          </div>
          <div className="grid gap-1.5">
            <Label>一句话总结 — &ldquo;今天我…&rdquo;</Label>
            <Input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="今天我…" />
          </div>
          <div className="grid gap-1.5">
            <Label>其他备注</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-end gap-3">
            {submitted && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--success)]">
                ✓ 已保存
              </motion.span>
            )}
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Saving…" : "保存复盘"}
            </Button>
          </div>
        </div>
      </div>

      {(reviews?.length ?? 0) > 0 && (
        <ReviewHistory reviews={reviews!} title="每日复盘历史" />
      )}
    </div>
  );
}

/* ---------- Weekly Review ---------- */
type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  counts: {
    tasksDone: number;
    habitsTicked: number;
    routinesDone: number;
    commissionsFull: number;
    dailyReviews: number;
  };
  weeklyXp: number;
  xpByArea: Record<string, number>;
  averages: { mood: number | null; energy: number | null; focus: number | null };
  activeGoals: Array<{
    id: string;
    objective: string;
    timeframe: string;
    area: string | null;
    confidence: number;
    krs: Array<{ description: string; current: number; target: number; unit: string | null }>;
  }>;
  activeProjects: Array<{
    id: string;
    title: string;
    area: string | null;
    taskCount: number;
    taskDone: number;
  }>;
};

type WeeklyCoachOutput = {
  pattern: string;
  win: string;
  blindspot: string;
  questions: string[];
  nextWeekTop3: string[];
};

function WeeklyReview() {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [okrProgress, setOkrProgress] = useState("");
  const [biggestWin, setBiggestWin] = useState("");
  const [biggestRegret, setBiggestRegret] = useState("");
  const [principlesUsed, setPrinciplesUsed] = useState("");
  const [decisionsToReview, setDecisionsToReview] = useState("");
  const [nextWeekTop3, setNextWeekTop3] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [coach, setCoach] = useState<WeeklyCoachOutput | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const create = useCreateReview();
  const { data: reviews } = useReviews("weekly");

  useEffect(() => {
    api<WeekSummary>("/api/review/week-summary").then(setSummary).catch(() => {});
  }, [submitted]);

  const askCoach = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const res = await api<{ coach: WeeklyCoachOutput }>("/api/ai/weekly-coach");
      setCoach(res.coach);
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : "AI 调用失败");
    } finally {
      setCoachLoading(false);
    }
  };

  const submit = async () => {
    await create.mutateAsync({
      kind: "weekly",
      content: {
        okrProgress,
        biggestWin,
        biggestRegret,
        principlesUsed,
        decisionsToReview,
        nextWeekTop3,
      },
    });
    setSubmitted(true);
    setOkrProgress("");
    setBiggestWin("");
    setBiggestRegret("");
    setPrinciplesUsed("");
    setDecisionsToReview("");
    setNextWeekTop3("");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* Left: Auto-summary */}
      <aside className="space-y-4">
        <div className="panel-cream framed rounded-sm p-5">
          <div className="section-label mb-3">
            <span className="cn text-base">本周数据</span>
            <span className="en text-[10px]">This Week</span>
          </div>
          {!summary ? (
            <div className="text-sm text-[var(--fg-muted)]">Loading…</div>
          ) : (
            <>
              <div className="text-[11px] text-[var(--fg-muted)]">
                {summary.weekStart} → {summary.weekEnd}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <SummaryRow label="任务完成" value={summary.counts.tasksDone} unit="个" />
                <SummaryRow label="正向习惯" value={summary.counts.habitsTicked} unit="次" />
                <SummaryRow label="日程完成" value={summary.counts.routinesDone} unit="次" />
                <SummaryRow label="4/4 委托" value={summary.counts.commissionsFull} unit="天" />
                <SummaryRow label="每日复盘" value={summary.counts.dailyReviews} unit="次" />
                <li className="mt-2 border-t border-[var(--border)] pt-2 flex justify-between font-bold text-[var(--gold-deep)]">
                  <span>本周累计 XP</span>
                  <span className="font-mono">{summary.weeklyXp.toLocaleString()}</span>
                </li>
              </ul>
              {summary.averages.mood !== null && (
                <div className="mt-3 flex items-center gap-3 border-t border-[var(--border)] pt-2 text-[11px]">
                  <span className="text-[var(--fg-muted)]">均值</span>
                  <span>心情 <b>{summary.averages.mood}</b></span>
                  <span>精力 <b>{summary.averages.energy}</b></span>
                  <span>专注 <b>{summary.averages.focus}</b></span>
                </div>
              )}
            </>
          )}
        </div>

        {summary && summary.activeGoals.length > 0 && (
          <div className="panel-cream framed rounded-sm p-5">
            <div className="section-label mb-3">
              <span className="cn text-base">在进 OKR</span>
              <span className="en text-[10px]">Active Goals</span>
            </div>
            <ul className="space-y-3 text-sm">
              {summary.activeGoals.slice(0, 5).map((g) => (
                <li key={g.id}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-[12px] font-bold text-[var(--fg-strong)]">
                      {g.objective}
                    </span>
                    <span className="text-[10px] text-[var(--gold-deep)]">{g.confidence}/10</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {g.krs.map((k, i) => (
                      <li key={i} className="text-[11px] text-[var(--fg-muted)]">
                        · {k.description} ·{" "}
                        <span className="font-mono text-[var(--fg)]">
                          {k.current}/{k.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Right: Form */}
      <div className="space-y-5">
        {/* AI Coach panel */}
        <div className="panel-ink ornate rounded-sm p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display-en text-[10px] uppercase tracking-[0.25em] text-[var(--gold-pale)]">
                AI Coach · DeepSeek
              </div>
              <div className="mt-1 font-display text-base font-bold text-[var(--fg-on-ink)]">
                让 AI 先看一眼本周
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={askCoach} disabled={coachLoading}>
              {coachLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {coachLoading ? "思考中…" : coach ? "重新分析" : "召唤教练"}
            </Button>
          </div>
          {coachError && (
            <div className="mt-3 rounded-sm bg-[var(--danger)]/15 px-3 py-2 text-[12px] text-[var(--gold-pale)]">
              {coachError}
            </div>
          )}
          {coach && (
            <div className="mt-4 grid gap-3 text-[13px] text-[var(--fg-on-ink)]">
              <CoachLine label="Pattern" body={coach.pattern} />
              <CoachLine label="Win"     body={coach.win}     onUse={() => setBiggestWin(coach.win)} useLabel="填入最大收获" />
              <CoachLine label="Blindspot" body={coach.blindspot} onUse={() => setBiggestRegret(coach.blindspot)} useLabel="填入最大遗憾" />
              <div>
                <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                  3 Questions
                </div>
                <ul className="mt-1 space-y-1">
                  {coach.questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[var(--gold-pale)]">·</span>
                      <span className="flex-1">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <CoachLine
                label="Next Week Top 3"
                body={coach.nextWeekTop3.map((s, i) => `${i + 1}. ${s}`).join("\n")}
                onUse={() => setNextWeekTop3(coach.nextWeekTop3.map((s, i) => `${i + 1}. ${s}`).join("\n"))}
                useLabel="填入下周 Top 3"
                pre
              />
            </div>
          )}
        </div>

        <div className="panel-cream framed rounded-sm p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="section-label">
              <span className="cn text-base">本周复盘</span>
              <span className="en text-[10px]">Weekly Review</span>
            </div>
            <span className="text-[10px] text-[var(--fg-muted)]">
              奖励 +200 XP / +60⭐ / +1💎 / +3🎫
            </span>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <Label>本周 OKR 进度推进了多少？哪些 KR 卡住了？</Label>
              <Textarea
                value={okrProgress}
                onChange={(e) => setOkrProgress(e.target.value)}
                placeholder="对照左侧 OKR 数据，写下你的判断"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>本周最大收获</Label>
                <Textarea
                  value={biggestWin}
                  onChange={(e) => setBiggestWin(e.target.value)}
                  placeholder="一件事 · 一个洞察 · 一次胜利"
                  rows={2}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>本周最大遗憾</Label>
                <Textarea
                  value={biggestRegret}
                  onChange={(e) => setBiggestRegret(e.target.value)}
                  placeholder="不评判，只记录"
                  rows={2}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>本周用到/想到的 Principles</Label>
              <Textarea
                value={principlesUsed}
                onChange={(e) => setPrinciplesUsed(e.target.value)}
                placeholder="写下来 · 之后会进 Principles 库（Phase 4）"
                rows={2}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>本周哪些决策值得复看？</Label>
              <Textarea
                value={decisionsToReview}
                onChange={(e) => setDecisionsToReview(e.target.value)}
                placeholder="哪些选择可以放进 Decision Journal（Phase 4）"
                rows={2}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>下周 Top 3 优先事项</Label>
              <Textarea
                value={nextWeekTop3}
                onChange={(e) => setNextWeekTop3(e.target.value)}
                placeholder="1. … 2. … 3. …"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              {submitted && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[var(--success)]"
                >
                  ✓ 已保存 · 下周见
                </motion.span>
              )}
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending ? "Saving…" : "保存周复盘"}
              </Button>
            </div>
          </div>
        </div>

        {(reviews?.length ?? 0) > 0 && (
          <ReviewHistory reviews={reviews!} title="周复盘历史" weekly />
        )}
      </div>
    </div>
  );
}

function CoachLine({
  label,
  body,
  onUse,
  useLabel,
  pre,
}: {
  label: string;
  body: string;
  onUse?: () => void;
  useLabel?: string;
  pre?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
          {label}
        </span>
        {onUse && (
          <button
            onClick={onUse}
            className="ml-auto rounded-sm border border-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] text-[var(--gold-pale)] hover:bg-[var(--gold)]/20"
          >
            {useLabel ?? "Use this"}
          </button>
        )}
      </div>
      <div className={`mt-1 leading-relaxed ${pre ? "whitespace-pre-wrap" : ""}`}>{body}</div>
    </div>
  );
}

/* ---------- Monthly Review ---------- */

type MonthlyCoachOutput = {
  storyline: string;
  areasReport: { area: string; verdict: "Keep" | "More" | "Less" | "Stop"; why: string }[];
  biggestWin: string;
  biggestRegret: string;
  keepMoreLessStop: { keep: string[]; more: string[]; less: string[]; stop: string[] };
  identityCheck: string;
};

type MonthlySummary = {
  period: string;
  counts: {
    tasksDone: number;
    dailyReviewsLogged: number;
    weeklyReviewsLogged: number;
    decisionsLogged: number;
    decisionsReviewed: number;
    goalsCompleted: number;
    projectsCompleted: number;
  };
  xpByArea: Record<string, number>;
  tasksByArea: Record<string, number>;
  avgMood: number | null;
  avgEnergy: number | null;
  avgFocus: number | null;
};

const VERDICT_STYLE: Record<string, string> = {
  Keep: "bg-[var(--success,#3a7d56)]/15 text-[var(--success,#3a7d56)]",
  More: "bg-[var(--gold-tint)] text-[var(--gold-deep)]",
  Less: "bg-[#c5554a]/15 text-[#c5554a]",
  Stop: "bg-[var(--danger)]/20 text-[var(--danger)]",
};

function MonthlyReview() {
  const monthKey = new Date().toISOString().slice(0, 7);
  const [coach, setCoach] = useState<MonthlyCoachOutput | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bigWin, setBigWin] = useState("");
  const [bigRegret, setBigRegret] = useState("");
  const [keep, setKeep] = useState("");
  const [more, setMore] = useState("");
  const [less, setLess] = useState("");
  const [stop, setStop] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const create = useCreateReview();
  const { data: reviews } = useReviews("monthly");

  const ask = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ summary: MonthlySummary; coach: MonthlyCoachOutput }>(
        `/api/ai/monthly-review?month=${monthKey}`
      );
      setSummary(res.summary);
      setCoach(res.coach);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 调用失败");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    await create.mutateAsync({
      kind: "monthly",
      content: {
        biggestWin: bigWin,
        biggestRegret: bigRegret,
        keep,
        more,
        less,
        stop,
        ai: coach ?? null,
        summary: summary ?? null,
      },
    });
    setSubmitted(true);
  };

  return (
    <div className="space-y-5">
      <div className="panel-ink ornate rounded-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display-en text-[10px] uppercase tracking-[0.25em] text-[var(--gold-pale)]">
              Monthly Synthesis · DeepSeek
            </div>
            <div className="mt-1 font-display text-lg font-bold text-[var(--fg-on-ink)]">
              {monthKey} 月度回望
            </div>
            <div className="mt-1 text-[12px] text-[var(--fg-on-ink)]/70">
              60 分钟仪式 · 看 Area 健康度 · 决定 Keep/More/Less/Stop
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={ask} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "汇总中…" : coach ? "重新生成" : "生成本月画像"}
          </Button>
        </div>
        {error && (
          <div className="mt-3 rounded-sm bg-[var(--danger)]/15 px-3 py-2 text-[12px] text-[var(--gold-pale)]">
            {error}
          </div>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Stat label="任务完成" value={summary.counts.tasksDone} />
          <Stat label="每日复盘" value={summary.counts.dailyReviewsLogged} />
          <Stat label="每周复盘" value={summary.counts.weeklyReviewsLogged} />
          <Stat label="决策记录" value={summary.counts.decisionsLogged} />
          <Stat label="决策复盘" value={summary.counts.decisionsReviewed} />
          <Stat label="完成目标 + 项目" value={summary.counts.goalsCompleted + summary.counts.projectsCompleted} />
        </div>
      )}

      {coach && (
        <div className="space-y-5">
          <div className="panel-cream framed rounded-sm p-5">
            <div className="section-label mb-2">
              <span className="cn text-base">本月叙事</span>
              <span className="en text-[10px]">Storyline</span>
            </div>
            <p className="font-display text-[15px] leading-relaxed text-[var(--fg-strong)]">
              {coach.storyline}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel-cream framed rounded-sm p-5">
              <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Biggest Win
              </div>
              <p className="mt-2 text-[14px] text-[var(--fg)]">{coach.biggestWin}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setBigWin(coach.biggestWin)}>
                填入表单
              </Button>
            </div>
            <div className="panel-cream framed rounded-sm p-5">
              <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Biggest Regret
              </div>
              <p className="mt-2 text-[14px] text-[var(--fg)]">{coach.biggestRegret}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setBigRegret(coach.biggestRegret)}>
                填入表单
              </Button>
            </div>
          </div>

          {coach.areasReport.length > 0 && (
            <div className="panel-cream framed rounded-sm p-5">
              <div className="section-label mb-3">
                <span className="cn text-base">Area Health Verdict</span>
                <span className="en text-[10px]">Per-area judgment</span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {coach.areasReport.map((a, i) => (
                  <li key={i} className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[14px] font-bold text-[var(--fg-strong)]">{a.area}</span>
                      <span className={`rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${VERDICT_STYLE[a.verdict] ?? ""}`}>
                        {a.verdict}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{a.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {(["keep", "more", "less", "stop"] as const).map((k) => {
              const items = coach.keepMoreLessStop[k] ?? [];
              const setter = { keep: setKeep, more: setMore, less: setLess, stop: setStop }[k];
              const labels: Record<string, string> = { keep: "Keep · 保留", more: "More · 加大", less: "Less · 减少", stop: "Stop · 停掉" };
              return (
                <div key={k} className="panel-cream framed rounded-sm p-4">
                  <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                    {labels[k]}
                  </div>
                  {items.length === 0 ? (
                    <p className="mt-2 text-[12px] text-[var(--fg-muted)]">—</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-[12px] text-[var(--fg)]">
                      {items.map((s, i) => (
                        <li key={i}>· {s}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => setter(items.join("\n"))}
                    className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)] hover:underline"
                  >
                    填入表单 →
                  </button>
                </div>
              );
            })}
          </div>

          <div className="panel-ink rounded-sm p-5">
            <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
              Identity Check
            </div>
            <p className="mt-2 italic text-[var(--fg-on-ink)]">{coach.identityCheck}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="panel-cream framed rounded-sm p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="section-label">
            <span className="cn text-base">本月手写复盘</span>
            <span className="en text-[10px]">Monthly Reflection</span>
          </div>
          <span className="text-[10px] text-[var(--fg-muted)]">
            奖励 +600 XP / +200⭐ / +2💎 / +5🎫
          </span>
        </div>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>本月最大收获</Label>
              <Textarea value={bigWin} onChange={(e) => setBigWin(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label>本月最大遗憾</Label>
              <Textarea value={bigRegret} onChange={(e) => setBigRegret(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Keep · 保留</Label>
              <Textarea value={keep} onChange={(e) => setKeep(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label>More · 加大</Label>
              <Textarea value={more} onChange={(e) => setMore(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Less · 减少</Label>
              <Textarea value={less} onChange={(e) => setLess(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label>Stop · 停掉</Label>
              <Textarea value={stop} onChange={(e) => setStop(e.target.value)} rows={2} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {submitted && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--success)]">
                ✓ 已保存 · 下月再聚
              </motion.span>
            )}
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Saving…" : "保存月度复盘"}
            </Button>
          </div>
        </div>
      </div>

      {(reviews?.length ?? 0) > 0 && (
        <ReviewHistory reviews={reviews!} title="月复盘历史" weekly />
      )}
    </div>
  );
}

/* ---------- Quarterly Review ---------- */

type QuarterlyCoachOutput = {
  storyline: string;
  bigArc: string;
  okrScores: { objective: string; score: number; commentary: string }[];
  nextQuarterFocus: string[];
  identityShift: string;
  principleCandidates: string[];
};

type QuarterlySummary = {
  period: string;
  range: string;
  counts: {
    tasksDone: number;
    dailyReviews: number;
    weeklyReviews: number;
    monthlyReviews: number;
    decisionsLogged: number;
    decisionsReviewed: number;
    goalsCompleted: number;
    projectsCompleted: number;
  };
};

function currentQuarter(): string {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`;
}

function QuarterlyReview() {
  const qLabel = currentQuarter();
  const [coach, setCoach] = useState<QuarterlyCoachOutput | null>(null);
  const [summary, setSummary] = useState<QuarterlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [storyline, setStoryline] = useState("");
  const [keepKrs, setKeepKrs] = useState("");
  const [shiftIdentity, setShiftIdentity] = useState("");
  const [nextQ, setNextQ] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const create = useCreateReview();
  const { data: reviews } = useReviews("quarterly");

  const ask = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ summary: QuarterlySummary; coach: QuarterlyCoachOutput }>(
        `/api/ai/quarterly-review?quarter=${qLabel}`
      );
      setSummary(res.summary);
      setCoach(res.coach);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 调用失败");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    await create.mutateAsync({
      kind: "quarterly",
      content: {
        biggestWin: storyline,
        okrProgress: keepKrs,
        identityShift: shiftIdentity,
        nextQuarterTop3: nextQ,
        ai: coach ?? null,
        summary: summary ?? null,
      },
    });
    setSubmitted(true);
  };

  return (
    <div className="space-y-5">
      <div className="panel-ink ornate rounded-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display-en text-[10px] uppercase tracking-[0.25em] text-[var(--gold-pale)]">
              Quarterly Synthesis · DeepSeek
            </div>
            <div className="mt-1 font-display text-lg font-bold text-[var(--fg-on-ink)]">
              {qLabel} 季度战略复盘
            </div>
            <div className="mt-1 text-[12px] text-[var(--fg-on-ink)]/70">
              2-3 小时仪式 · OKR 评分 · 设定下季度方向 · 提炼新 Principles
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={ask} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "汇总中…" : coach ? "重新生成" : "生成本季画像"}
          </Button>
        </div>
        {error && (
          <div className="mt-3 rounded-sm bg-[var(--danger)]/15 px-3 py-2 text-[12px] text-[var(--gold-pale)]">
            {error}
          </div>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="任务完成" value={summary.counts.tasksDone} />
          <Stat label="每周复盘" value={summary.counts.weeklyReviews} />
          <Stat label="每月复盘" value={summary.counts.monthlyReviews} />
          <Stat label="决策复盘" value={summary.counts.decisionsReviewed} />
          <Stat label="完成目标" value={summary.counts.goalsCompleted} />
          <Stat label="完成项目" value={summary.counts.projectsCompleted} />
          <Stat label="决策记录" value={summary.counts.decisionsLogged} />
          <Stat label="每日复盘" value={summary.counts.dailyReviews} />
        </div>
      )}

      {coach && (
        <div className="space-y-5">
          <div className="panel-cream framed rounded-sm p-5">
            <div className="section-label mb-2">
              <span className="cn text-base">本季叙事 + 大弧线</span>
              <span className="en text-[10px]">Storyline + Arc</span>
            </div>
            <p className="font-display text-[15px] leading-relaxed text-[var(--fg-strong)]">{coach.storyline}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--fg)]">{coach.bigArc}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setStoryline(`${coach.storyline}\n\n${coach.bigArc}`)}>
              填入下方
            </Button>
          </div>

          {coach.okrScores.length > 0 && (
            <div className="panel-cream framed rounded-sm p-5">
              <div className="section-label mb-3">
                <span className="cn text-base">OKR 季度评分</span>
                <span className="en text-[10px]">0.0 - 1.0 per Doerr</span>
              </div>
              <ul className="space-y-3">
                {coach.okrScores.map((s, i) => {
                  const tone =
                    s.score >= 0.7 ? "text-[var(--success,#3a7d56)]" : s.score >= 0.4 ? "text-[var(--gold-deep)]" : "text-[var(--danger)]";
                  return (
                    <li key={i} className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-[14px] font-bold text-[var(--fg-strong)]">{s.objective}</span>
                        <span className={`font-mono text-[15px] font-bold ${tone}`}>{s.score.toFixed(2)}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{s.commentary}</p>
                    </li>
                  );
                })}
              </ul>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setKeepKrs(coach.okrScores.map((s) => `· ${s.objective} → ${s.score.toFixed(2)}: ${s.commentary}`).join("\n"))}>
                填入 OKR 评分
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel-cream framed rounded-sm p-5">
              <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Identity Shift
              </div>
              <p className="mt-2 italic text-[14px] text-[var(--fg)]">{coach.identityShift}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShiftIdentity(coach.identityShift)}>
                填入下方
              </Button>
            </div>
            <div className="panel-cream framed rounded-sm p-5">
              <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Next Quarter Focus
              </div>
              <ul className="mt-2 space-y-1 text-[14px] text-[var(--fg)]">
                {coach.nextQuarterFocus.map((f, i) => (
                  <li key={i}>{i + 1}. {f}</li>
                ))}
              </ul>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setNextQ(coach.nextQuarterFocus.map((s, i) => `${i + 1}. ${s}`).join("\n"))}>
                填入下方
              </Button>
            </div>
          </div>

          {coach.principleCandidates.length > 0 && (
            <div className="panel-ink rounded-sm p-5">
              <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                候选原则 · Principle Candidates
              </div>
              <p className="mt-1 text-[11px] text-[var(--fg-on-ink)]/70">
                从本季的复盘 + 决策 lessons 提炼。考虑写进
                <Link href="/principles" className="ml-1 underline">
                  原则库
                </Link>
              </p>
              <ul className="mt-3 space-y-1.5">
                {coach.principleCandidates.map((p, i) => (
                  <li key={i} className="text-[13px] text-[var(--fg-on-ink)]">· {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="panel-cream framed rounded-sm p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="section-label">
            <span className="cn text-base">本季手写复盘</span>
            <span className="en text-[10px]">Quarterly Reflection</span>
          </div>
          <span className="text-[10px] text-[var(--fg-muted)]">
            奖励 +1500 XP / +500⭐ / +5💎 / +10🎫
          </span>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>本季叙事 + 大弧线</Label>
            <Textarea value={storyline} onChange={(e) => setStoryline(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label>OKR 评分 + commentary</Label>
            <Textarea value={keepKrs} onChange={(e) => setKeepKrs(e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>身份认同的演变</Label>
              <Textarea value={shiftIdentity} onChange={(e) => setShiftIdentity(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-1.5">
              <Label>下季度 Top 3</Label>
              <Textarea value={nextQ} onChange={(e) => setNextQ(e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {submitted && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--success)]">
                ✓ 已保存 · 下季再聚
              </motion.span>
            )}
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Saving…" : "保存季度复盘"}
            </Button>
          </div>
        </div>
      </div>

      {(reviews?.length ?? 0) > 0 && <ReviewHistory reviews={reviews!} title="季复盘历史" weekly />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-cream framed rounded-sm p-3 text-center">
      <div className="font-mono text-2xl font-bold text-[var(--gold-deep)]">{value}</div>
      <div className="mt-0.5 font-display-en text-[9px] uppercase tracking-[0.22em] text-[var(--fg-muted)]">
        {label}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <li className="flex items-baseline justify-between">
      <span className="text-[var(--fg)]">{label}</span>
      <span className="font-mono text-[var(--fg-strong)]">
        {value} <span className="text-[10px] text-[var(--fg-muted)]">{unit}</span>
      </span>
    </li>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-sm font-bold text-[var(--gold-deep)]">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--gold)]"
      />
    </div>
  );
}

function ReviewHistory({
  reviews,
  title,
  weekly,
}: {
  reviews: Array<{
    id: string;
    createdAt: string;
    content: string;
    mood: number | null;
    energy: number | null;
    focus: number | null;
  }>;
  title: string;
  weekly?: boolean;
}) {
  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="section-label mb-3">
        <span className="cn text-sm">{title}</span>
        <span className="en text-[10px]">History</span>
      </div>
      <ul className="space-y-3">
        {reviews.slice(0, 8).map((r) => {
          let parsed: Record<string, string> = {};
          try {
            parsed = JSON.parse(r.content);
          } catch {}
          return (
            <li key={r.id} className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] p-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--fg-muted)]">
                <span>{new Date(r.createdAt).toLocaleString("zh-CN")}</span>
                {!weekly && (
                  <span className="flex gap-2 font-mono">
                    {r.mood !== null && <span>心情 {r.mood}</span>}
                    {r.energy !== null && <span>精力 {r.energy}</span>}
                    {r.focus !== null && <span>专注 {r.focus}</span>}
                  </span>
                )}
              </div>
              {!weekly && parsed.oneLiner && (
                <div className="text-sm italic text-[var(--fg)]">&ldquo;{parsed.oneLiner}&rdquo;</div>
              )}
              {weekly && parsed.biggestWin && (
                <div className="text-sm">
                  <span className="font-display-en text-[10px] text-[var(--gold-deep)]">WIN · </span>
                  {parsed.biggestWin}
                </div>
              )}
              {weekly && parsed.nextWeekTop3 && (
                <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
                  <span className="font-display-en text-[9px] text-[var(--gold-deep)]">NEXT · </span>
                  {parsed.nextWeekTop3}
                </div>
              )}
              {!weekly && parsed.top3Done && (
                <div className="mt-1 whitespace-pre-wrap text-xs text-[var(--fg-muted)]">
                  {parsed.top3Done}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
