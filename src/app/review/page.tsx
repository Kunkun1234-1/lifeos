"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useCreateReview, useReviews } from "@/hooks/queries";
import { api } from "@/lib/fetcher";
import { BookOpen, CalendarDays } from "lucide-react";

type Tab = "daily" | "weekly";

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
          每日 2-3 分钟，每周日 20-30 分钟。复盘是这个系统真正能"学你"的部分。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <TabButton active={tab === "daily"} onClick={() => setTab("daily")} icon={<BookOpen size={14} />}>
          每日复盘 · Daily
        </TabButton>
        <TabButton active={tab === "weekly"} onClick={() => setTab("weekly")} icon={<CalendarDays size={14} />}>
          每周复盘 · Weekly
        </TabButton>
      </div>

      <AnimatePresence mode="wait">
        {tab === "daily" ? (
          <motion.div
            key="d"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
          >
            <DailyReview />
          </motion.div>
        ) : (
          <motion.div
            key="w"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
          >
            <WeeklyReview />
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

function WeeklyReview() {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [okrProgress, setOkrProgress] = useState("");
  const [biggestWin, setBiggestWin] = useState("");
  const [biggestRegret, setBiggestRegret] = useState("");
  const [principlesUsed, setPrinciplesUsed] = useState("");
  const [decisionsToReview, setDecisionsToReview] = useState("");
  const [nextWeekTop3, setNextWeekTop3] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const create = useCreateReview();
  const { data: reviews } = useReviews("weekly");

  useEffect(() => {
    api<WeekSummary>("/api/review/week-summary").then(setSummary).catch(() => {});
  }, [submitted]);

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
