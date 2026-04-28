"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Compass,
  Clock,
  CheckCircle2,
  Search,
  AlertTriangle,
  ScrollText,
  Sparkles,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import {
  useDecisions,
  usePrinciples,
  useCreateDecision,
  useDeleteDecision,
  useUpdateDecision,
  useReviewDecision,
} from "@/hooks/queries";
import type { DecisionDTO, DecisionOption, PrincipleDTO } from "@/lib/types";
import { computeEV } from "@/lib/decisions";
import { api } from "@/lib/fetcher";

type DecisionCoach = {
  preMortem: string[];
  devilsAdvocate: string;
  suggestedPrincipleIds: string[];
  suggestedPrinciples: { id: string; title: string; body: string; category: string }[];
  tenTenTen: string;
  ev_commentary: string;
};

const STAKES_LABEL: Record<DecisionDTO["stakes"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};
const STATUS_LABEL: Record<DecisionDTO["status"], string> = {
  open: "待决",
  decided: "已决",
  reviewed: "已复盘",
};
const STATUS_FILTERS: Array<{ value: "all" | DecisionDTO["status"]; cn: string }> = [
  { value: "all", cn: "全部" },
  { value: "open", cn: "待决" },
  { value: "decided", cn: "已决待复盘" },
  { value: "reviewed", cn: "已复盘" },
];

export default function DecisionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | DecisionDTO["status"]>("all");
  const { data: decisions, isLoading } = useDecisions(
    filter === "all" ? undefined : filter
  );
  const { data: principles } = usePrinciples(false);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">决策日志</span>
            <span className="en text-[11px]">Decision Journal · WRAP × EV</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            把每个重要决策当成一个赌注 · EV = p × 收益 − (1−p) × 损失。
            决策→执行→复盘的闭环让你「学会自己」。
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "New Decision"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "primary" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.cn}
          </Button>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NewDecisionForm
              principles={principles ?? []}
              onDone={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : (decisions ?? []).length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          决策日志为空。
          {(principles ?? []).length === 0 && (
            <>
              {" "}
              建议先去 <Link href="/principles" className="link-gold">原则库</Link> 写下几条原则。
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(decisions ?? []).map((d) => (
            <DecisionCard key={d.id} decision={d} principles={principles ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// New Decision form
// ============================================================

type DraftOption = {
  label: string;
  prob: number;
  payoff: number;
  penalty: number;
  notes: string;
};

const EMPTY_OPTION: DraftOption = {
  label: "",
  prob: 0.5,
  payoff: 100,
  penalty: 50,
  notes: "",
};

function NewDecisionForm({
  principles,
  onDone,
}: {
  principles: PrincipleDTO[];
  onDone: () => void;
}) {
  const create = useCreateDecision();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [stakes, setStakes] = useState<DecisionDTO["stakes"]>("medium");
  const [opts, setOpts] = useState<DraftOption[]>([
    { ...EMPTY_OPTION, label: "选项 A" },
    { ...EMPTY_OPTION, label: "选项 B" },
  ]);
  const [preMortem, setPreMortem] = useState("");
  const [tenTenTen, setTenTenTen] = useState("");
  const [selectedPrinciples, setSelectedPrinciples] = useState<Set<string>>(new Set());
  const [decideNow, setDecideNow] = useState(false);
  const [chosenIdx, setChosenIdx] = useState(0);

  const [coach, setCoach] = useState<DecisionCoach | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const evValues = opts.map((o) => computeEV(o));
  const bestIdx = evValues.indexOf(Math.max(...evValues));

  const togglePrinciple = (id: string) => {
    setSelectedPrinciples((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const askCoach = async () => {
    if (!title.trim() || !context.trim()) {
      setCoachError("先填好标题和背景再问 AI");
      return;
    }
    const validOpts = opts.filter((o) => o.label.trim());
    if (validOpts.length < 2) {
      setCoachError("至少要 2 个有名字的选项");
      return;
    }
    setCoachLoading(true);
    setCoachError(null);
    try {
      const res = await api<DecisionCoach>("/api/ai/decision-coach", {
        method: "POST",
        json: {
          draft: {
            title: title.trim(),
            context: context.trim(),
            stakes,
            options: validOpts.map((o) => ({
              label: o.label.trim(),
              prob: o.prob,
              payoff: o.payoff,
              penalty: o.penalty,
              notes: o.notes || null,
            })),
          },
        },
      });
      setCoach(res);
      // Auto-select the suggested principles
      if (res.suggestedPrincipleIds.length > 0) {
        setSelectedPrinciples(
          (prev) => new Set([...prev, ...res.suggestedPrincipleIds])
        );
      }
    } catch (e) {
      setCoachError(e instanceof Error ? e.message : "AI 调用失败");
    } finally {
      setCoachLoading(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !context.trim()) return;
    const validOpts = opts.filter((o) => o.label.trim());
    if (validOpts.length < 2) {
      alert("至少需要 2 个选项");
      return;
    }
    await create.mutateAsync({
      title: title.trim(),
      context: context.trim(),
      areaId,
      stakes,
      options: validOpts.map((o) => ({
        label: o.label.trim(),
        prob: o.prob,
        payoff: o.payoff,
        penalty: o.penalty,
        notes: o.notes.trim() || null,
      })),
      preMortem: preMortem.trim() || null,
      tenTenTen: tenTenTen.trim() || null,
      principleIds: Array.from(selectedPrinciples),
      chosenIndex: decideNow ? Math.min(chosenIdx, validOpts.length - 1) : null,
    });
    onDone();
  };

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">新决策</span>
        <span className="en text-[10px]">New Decision · WRAP framework</span>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>标题</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 是否离职去做独立开发"
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label>背景 / Context</Label>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="发生了什么 · 你为什么要做决定 · 关键约束"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>关联领域</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className="grid gap-1.5">
            <Label>赌注大小 (Stakes)</Label>
            <Select
              value={stakes}
              onChange={(e) => setStakes(e.target.value as DecisionDTO["stakes"])}
            >
              <option value="low">低 · Low</option>
              <option value="medium">中 · Medium</option>
              <option value="high">高 · High</option>
            </Select>
          </div>
        </div>

        {/* Options table */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>选项 + EV (期望值计算)</Label>
            <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              prob × payoff − (1−prob) × penalty
            </span>
          </div>
          <div className="space-y-2">
            {opts.map((o, i) => (
              <OptionRow
                key={i}
                idx={i}
                option={o}
                ev={evValues[i]}
                isBest={i === bestIdx && opts.length > 1}
                canRemove={opts.length > 2}
                onChange={(next) => {
                  const arr = [...opts];
                  arr[i] = next;
                  setOpts(arr);
                }}
                onRemove={() => setOpts(opts.filter((_, j) => j !== i))}
              />
            ))}
            {opts.length < 6 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setOpts([
                    ...opts,
                    { ...EMPTY_OPTION, label: `选项 ${String.fromCharCode(65 + opts.length)}` },
                  ])
                }
              >
                <Plus size={14} /> Add option
              </Button>
            )}
          </div>
        </div>

        {/* AI Coach panel */}
        <div className="panel-ink ornate rounded-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display-en text-[10px] uppercase tracking-[0.22em] text-[var(--gold-pale)]">
                AI Decision Coach · DeepSeek
              </div>
              <div className="mt-1 font-display text-[14px] font-bold text-[var(--fg-on-ink)]">
                让 AI 看一眼这个决策的盲点
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
              <div>
                <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                  Devil&apos;s Advocate
                </div>
                <p className="mt-1 italic leading-relaxed">{coach.devilsAdvocate}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                    Pre-mortem · 失败假设
                  </span>
                  <button
                    onClick={() =>
                      setPreMortem(coach.preMortem.map((s) => `· ${s}`).join("\n"))
                    }
                    className="ml-auto rounded-sm border border-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] text-[var(--gold-pale)] hover:bg-[var(--gold)]/20"
                  >
                    填入下方
                  </button>
                </div>
                <ul className="mt-1 space-y-1">
                  {coach.preMortem.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[var(--gold-pale)]">·</span>
                      <span className="flex-1">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                    10-10-10
                  </span>
                  <button
                    onClick={() => setTenTenTen(coach.tenTenTen)}
                    className="ml-auto rounded-sm border border-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] text-[var(--gold-pale)] hover:bg-[var(--gold)]/20"
                  >
                    填入下方
                  </button>
                </div>
                <p className="mt-1 leading-relaxed">{coach.tenTenTen}</p>
              </div>
              <div>
                <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                  EV Commentary
                </div>
                <p className="mt-1 leading-relaxed">{coach.ev_commentary}</p>
              </div>
              {coach.suggestedPrinciples.length > 0 && (
                <div>
                  <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-pale)]">
                    建议引用 (已自动勾选下方原则)
                  </div>
                  <ul className="mt-1 space-y-1">
                    {coach.suggestedPrinciples.map((p) => (
                      <li key={p.id} className="text-[12px]">
                        <b>{p.title}</b> — <span className="text-[var(--gold-pale)]/80">{p.body.slice(0, 100)}…</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WRAP fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Pre-mortem · 预设失败原因</Label>
            <Textarea
              value={preMortem}
              onChange={(e) => setPreMortem(e.target.value)}
              placeholder="假设半年后这个决策失败了，最可能是什么原因？"
              rows={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>10-10-10 Rule</Label>
            <Textarea
              value={tenTenTen}
              onChange={(e) => setTenTenTen(e.target.value)}
              placeholder="10 分钟 / 10 个月 / 10 年后你会怎么看这个决定？"
              rows={3}
            />
          </div>
        </div>

        {/* Principles cited */}
        {principles.length > 0 && (
          <div>
            <Label>引用原则</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {principles.map((p) => {
                const active = selectedPrinciples.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePrinciple(p.id)}
                    className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-[12px] transition-all ${
                      active
                        ? "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]"
                        : "border-[var(--border)] bg-[var(--bg-page)] text-[var(--fg-muted)] hover:border-[var(--gold)]"
                    }`}
                    title={p.body}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Decide now toggle */}
        <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] p-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={decideNow}
              onChange={(e) => setDecideNow(e.target.checked)}
              className="accent-[var(--gold)]"
            />
            <span className="font-display text-sm font-bold text-[var(--fg-strong)]">
              已经做出决定
            </span>
            <span className="text-[11px] text-[var(--fg-muted)]">
              (否则保存为「待决」状态)
            </span>
          </label>
          {decideNow && (
            <div className="mt-3 flex items-center gap-2">
              <Label>选定:</Label>
              <Select
                value={chosenIdx}
                onChange={(e) => setChosenIdx(Number(e.target.value))}
                className="max-w-xs"
              >
                {opts.map((o, i) => (
                  <option key={i} value={i}>
                    {o.label} (EV {evValues[i].toFixed(1)})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={create.isPending || !title.trim() || !context.trim()}
          >
            {create.isPending ? "Saving…" : "Log Decision"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  idx,
  option,
  ev,
  isBest,
  canRemove,
  onChange,
  onRemove,
}: {
  idx: number;
  option: DraftOption;
  ev: number;
  isBest: boolean;
  canRemove: boolean;
  onChange: (next: DraftOption) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`rounded-sm border p-2.5 ${
        isBest
          ? "border-[var(--gold)] bg-[var(--gold-tint)]/40 shadow-[0_0_0_1px_var(--gold)]"
          : "border-[var(--border)] bg-[var(--bg-page)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--bg-panel-ink)] font-display-en text-[10px] font-bold text-[var(--gold-pale)]">
          {String.fromCharCode(65 + idx)}
        </span>
        <Input
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
          placeholder="选项描述"
          className="flex-1"
        />
        {isBest && (
          <span className="chip-gold flex items-center gap-1 whitespace-nowrap">
            <TrendingUp size={11} /> Best EV
          </span>
        )}
        <span
          className={`whitespace-nowrap font-mono text-[12px] font-bold ${
            ev >= 0 ? "text-[var(--success,#3a7d56)]" : "text-[var(--danger)]"
          }`}
        >
          EV {ev.toFixed(1)}
        </span>
        {canRemove && (
          <Button size="icon" variant="ghost" onClick={onRemove} title="Remove">
            <Trash2 size={14} />
          </Button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <NumField
          label="P (成功概率)"
          value={option.prob}
          step={0.05}
          min={0}
          max={1}
          onChange={(v) => onChange({ ...option, prob: v })}
        />
        <NumField
          label="收益 (Payoff)"
          value={option.payoff}
          step={10}
          onChange={(v) => onChange({ ...option, payoff: v })}
        />
        <NumField
          label="损失 (Penalty)"
          value={option.penalty}
          step={10}
          onChange={(v) => onChange({ ...option, penalty: v })}
        />
      </div>
      <Input
        value={option.notes}
        onChange={(e) => onChange({ ...option, notes: e.target.value })}
        placeholder="备注 (optional)"
        className="mt-2 h-8 text-xs"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  step = 1,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 font-display-en text-[9px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {label}
      </div>
      <Input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 text-xs"
      />
    </div>
  );
}

// ============================================================
// Decision card
// ============================================================

function DecisionCard({
  decision,
  principles,
}: {
  decision: DecisionDTO;
  principles: PrincipleDTO[];
}) {
  const remove = useDeleteDecision();
  const update = useUpdateDecision();
  const [showReview, setShowReview] = useState(false);
  const [showDecide, setShowDecide] = useState(false);

  const evList = useMemo(
    () => decision.options.map((o) => o.ev ?? computeEV(o)),
    [decision.options]
  );
  const bestIdx = evList.length > 0 ? evList.indexOf(Math.max(...evList)) : -1;
  const chosen = decision.chosenIndex !== null ? decision.options[decision.chosenIndex] : null;

  const stakeColor =
    decision.stakes === "high"
      ? "text-[var(--danger)]"
      : decision.stakes === "low"
      ? "text-[var(--fg-muted)]"
      : "text-[var(--gold-deep)]";

  return (
    <div className="panel-cream framed rounded-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Compass size={14} className="shrink-0 text-[var(--gold-deep)]" />
            <span
              className={`rounded-sm px-1.5 text-[10px] uppercase tracking-widest ${
                decision.status === "reviewed"
                  ? "bg-[var(--success,#3a7d56)]/15 text-[var(--success,#3a7d56)]"
                  : decision.status === "decided"
                  ? "bg-[var(--gold-tint)] text-[var(--gold-deep)]"
                  : "bg-[var(--bg-elevated)] text-[var(--fg-muted)]"
              }`}
            >
              {STATUS_LABEL[decision.status]}
            </span>
            <span className={`flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] ${stakeColor}`}>
              <AlertTriangle size={10} /> 赌注 {STAKES_LABEL[decision.stakes]}
            </span>
            {decision.area && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                {decision.area.icon} {decision.area.name}
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-[16px] font-bold leading-snug text-[var(--fg-strong)]">
            {decision.title}
          </h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          title="Delete"
          onClick={() => {
            if (confirm("Delete this decision?")) remove.mutate(decision.id);
          }}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-[var(--fg-muted)]">
        {decision.context}
      </p>

      {/* Options table */}
      <div className="mt-3 overflow-hidden rounded-sm border border-[var(--border)]">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--bg-page)] text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <tr>
              <th className="px-2 py-1.5 text-left font-display-en">Option</th>
              <th className="px-2 py-1.5 text-right font-display-en">P</th>
              <th className="px-2 py-1.5 text-right font-display-en">+</th>
              <th className="px-2 py-1.5 text-right font-display-en">−</th>
              <th className="px-2 py-1.5 text-right font-display-en">EV</th>
            </tr>
          </thead>
          <tbody>
            {decision.options.map((o, i) => {
              const isChosen = decision.chosenIndex === i;
              const isBest = i === bestIdx;
              const ev = evList[i];
              return (
                <tr
                  key={i}
                  className={`border-t border-[var(--border)] ${
                    isChosen
                      ? "bg-[var(--gold-tint)]/60"
                      : isBest && decision.status === "open"
                      ? "bg-[var(--gold-tint)]/30"
                      : ""
                  }`}
                >
                  <td className="px-2 py-1.5 text-left">
                    <span className="mr-1 font-display-en text-[10px] font-bold text-[var(--gold-deep)]">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {isChosen && <CheckCircle2 size={11} className="mr-1 inline text-[var(--gold-deep)]" />}
                    {o.label}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">{o.prob.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{o.payoff}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{o.penalty}</td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono font-bold ${
                      ev >= 0 ? "text-[var(--success,#3a7d56)]" : "text-[var(--danger)]"
                    }`}
                  >
                    {ev.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* WRAP details collapsed */}
      {(decision.preMortem || decision.tenTenTen) && (
        <div className="mt-3 grid gap-2 text-[11px]">
          {decision.preMortem && (
            <details className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5">
              <summary className="cursor-pointer font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Pre-mortem
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-[var(--fg)]">{decision.preMortem}</p>
            </details>
          )}
          {decision.tenTenTen && (
            <details className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5">
              <summary className="cursor-pointer font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                10-10-10
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-[var(--fg)]">{decision.tenTenTen}</p>
            </details>
          )}
        </div>
      )}

      {/* Principles cited */}
      {decision.principles.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
          <ScrollText size={11} className="text-[var(--gold-deep)]" />
          <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
            Principles
          </span>
          {decision.principles.map((p) => (
            <span
              key={p.id}
              className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5 text-[10px] text-[var(--gold-deep)]"
            >
              {p.emoji} {p.title}
            </span>
          ))}
        </div>
      )}

      {/* Outcome (if reviewed) */}
      {decision.status === "reviewed" && (
        <div className="mt-3 rounded-sm border border-[var(--success,#3a7d56)]/30 bg-[var(--success,#3a7d56)]/8 p-3">
          <div className="flex items-center gap-2 font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--success,#3a7d56)]">
            <CheckCircle2 size={12} />
            <span>Outcome · Rating {decision.rating}/10</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-[var(--fg)]">
            {decision.outcome}
          </p>
          {decision.lessons && (
            <>
              <div className="mt-2 font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                Lessons
              </div>
              <p className="whitespace-pre-wrap text-[12px] text-[var(--fg)]">{decision.lessons}</p>
            </>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-[10px]">
        <div className="flex items-center gap-2 text-[var(--fg-subtle)]">
          <Clock size={11} />
          <span className="font-mono">
            {new Date(decision.createdAt).toLocaleDateString()}
          </span>
          {chosen && (
            <span className="ml-1">→ {chosen.label}</span>
          )}
        </div>
        <div className="flex gap-2">
          {decision.status === "open" && (
            <Button size="sm" variant="primary" onClick={() => setShowDecide((v) => !v)}>
              <Sparkles size={12} /> Decide
            </Button>
          )}
          {decision.status === "decided" && (
            <Button size="sm" variant="primary" onClick={() => setShowReview((v) => !v)}>
              <Search size={12} /> Review
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDecide && decision.status === "open" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <DecideForm
              decision={decision}
              onCancel={() => setShowDecide(false)}
              onConfirm={(idx) => {
                update.mutate({
                  id: decision.id,
                  body: { chosenIndex: idx },
                });
                setShowDecide(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReview && decision.status === "decided" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <ReviewForm
              decisionId={decision.id}
              onDone={() => setShowReview(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DecideForm({
  decision,
  onCancel,
  onConfirm,
}: {
  decision: DecisionDTO;
  onCancel: () => void;
  onConfirm: (idx: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)]/40 p-3">
      <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
        选定一个选项
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="max-w-xs"
        >
          {decision.options.map((o, i) => (
            <option key={i} value={i}>
              {String.fromCharCode(65 + i)}. {o.label} (EV {(o.ev ?? computeEV(o)).toFixed(1)})
            </option>
          ))}
        </Select>
        <Button size="sm" variant="primary" onClick={() => onConfirm(idx)}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ReviewForm({ decisionId, onDone }: { decisionId: string; onDone: () => void }) {
  const review = useReviewDecision();
  const [outcome, setOutcome] = useState("");
  const [lessons, setLessons] = useState("");
  const [rating, setRating] = useState(7);

  const submit = async () => {
    if (!outcome.trim()) return;
    await review.mutateAsync({
      id: decisionId,
      body: { outcome: outcome.trim(), lessons: lessons.trim() || null, rating },
    });
    onDone();
  };

  return (
    <div className="rounded-sm border border-[var(--gold)] bg-[var(--bg-page)] p-3">
      <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
        Post-mortem · 复盘
      </div>
      <div className="mt-2 grid gap-3">
        <div className="grid gap-1.5">
          <Label>结果 · Outcome</Label>
          <Textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="实际发生了什么？"
            rows={2}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>经验教训 · Lessons</Label>
          <Textarea
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="下次遇到类似情况你会怎么做？(optional)"
            rows={2}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label>事后评分 · 这是个好决策吗？</Label>
            <span className="font-mono text-sm font-bold text-[var(--gold-deep)]">{rating}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="mt-1 w-full accent-[var(--gold)]"
          />
          <p className="mt-1 text-[10px] text-[var(--fg-subtle)]">
            注：好结果不等于好决策。Dalio 强调 process &gt; outcome。
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={review.isPending || !outcome.trim()}
          >
            {review.isPending ? "Saving…" : "Save Review (+80 XP +1 Fate)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
