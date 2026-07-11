"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleAlert,
  Landmark,
  Pencil,
  PiggyBank,
  RotateCcw,
  Settings2,
  Trash2,
  Utensils,
  WalletCards,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  useAssets,
  useCreateWalletTransaction,
  useDeleteWalletTransaction,
  useInitializeWallet,
  useRefundWalletTransaction,
  useRolloverWallet,
  useUpdateWalletTransaction,
  useUpdateWalletSettings,
  useWalletTransactions,
} from "@/hooks/queries";
import { todayYMD } from "@/lib/date";
import type {
  AssetsSnapshotDTO,
  WalletNecessity,
  WalletPoolDTO,
  WalletPoolType,
  WalletTransactionDTO,
  WalletTransactionType,
} from "@/lib/types";
import { calculateIncomeAllocation } from "@/lib/wallet-calculations";

type WalletAction = "income" | "expense" | "transfer" | "settings" | null;

const POOL_META: Record<
  WalletPoolType,
  { label: string; description: string; icon: typeof Utensils; accent: string; soft: string }
> = {
  living: {
    label: "每月生活费",
    description: "当月必须开支",
    icon: Utensils,
    accent: "#3a6b8e",
    soft: "rgba(58, 107, 142, 0.10)",
  },
  savings: {
    label: "储蓄",
    description: "长期沉淀资金",
    icon: PiggyBank,
    accent: "#4c8a74",
    soft: "rgba(76, 138, 116, 0.10)",
  },
  flexible: {
    label: "流动资金",
    description: "自由调度与非必须开支",
    icon: Waves,
    accent: "#b68838",
    soft: "rgba(182, 136, 56, 0.12)",
  },
};

export default function AssetsPage() {
  const { data, isLoading, error } = useAssets();
  const [action, setAction] = useState<WalletAction>(null);
  const [editingTransaction, setEditingTransaction] = useState<WalletTransactionDTO | null>(null);

  const selectAction = (next: Exclude<WalletAction, null>) => {
    setEditingTransaction(null);
    setAction((current) => toggleAction(current, next));
  };

  if (isLoading) {
    return <PageMessage title="正在整理钱包" detail="正在读取三个资金池..." />;
  }
  if (error || !data) {
    return <PageMessage title="钱包暂时无法打开" detail={error?.message ?? "请稍后重试"} danger />;
  }
  if (!data.plan.initialized) {
    return <InitializationPanel data={data} />;
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--gold)]/45 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">我的钱包</span>
            <span className="en text-[11px]">Money Pools</span>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-sm text-[var(--fg-muted)]">可分配总额</span>
            <strong className="font-mono text-3xl text-[var(--fg-strong)]">
              {formatMoney(data.summary.totalBalanceCents)}
            </strong>
            <span className="font-display text-xs text-[var(--fg-muted)]">
              {formatMonth(data.plan.month)}
            </span>
          </div>
        </div>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <ActionButton active={action === "income"} icon={<ArrowDownToLine size={16} />} onClick={() => selectAction("income")}>
            记收入
          </ActionButton>
          <ActionButton active={action === "expense"} icon={<ArrowUpFromLine size={16} />} onClick={() => selectAction("expense")}>
            记支出
          </ActionButton>
          <Button size="icon" variant={action === "transfer" ? "secondary" : "outline"} title="资金池互转" onClick={() => selectAction("transfer")}>
            <ArrowLeftRight size={17} />
          </Button>
          <Button size="icon" variant={action === "settings" ? "secondary" : "ghost"} title="钱包设置" onClick={() => selectAction("settings")}>
            <Settings2 size={17} />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 md:hidden">
        <ActionButton active={action === "income"} icon={<ArrowDownToLine size={16} />} onClick={() => selectAction("income")}>
          记收入
        </ActionButton>
        <ActionButton active={action === "expense"} icon={<ArrowUpFromLine size={16} />} onClick={() => selectAction("expense")}>
          记支出
        </ActionButton>
        <Button size="icon" variant={action === "transfer" ? "secondary" : "outline"} title="资金池互转" onClick={() => selectAction("transfer")}>
          <ArrowLeftRight size={17} />
        </Button>
        <Button size="icon" variant={action === "settings" ? "secondary" : "ghost"} title="钱包设置" onClick={() => selectAction("settings")}>
          <Settings2 size={17} />
        </Button>
      </div>

      {!data.plan.rolloverCompleted ? <RolloverNotice data={data} /> : null}

      <PoolOverview data={data} />

      {editingTransaction ? (
        <section className="panel-cream framed rounded-sm p-4 md:p-5">
          <TransactionEditor
            data={data}
            transaction={editingTransaction}
            onDone={() => setEditingTransaction(null)}
          />
        </section>
      ) : action ? (
        <section className="panel-cream framed rounded-sm p-4 md:p-5">
          {action === "income" ? <IncomeForm data={data} /> : null}
          {action === "expense" ? <ExpenseForm data={data} /> : null}
          {action === "transfer" ? <TransferForm data={data} /> : null}
          {action === "settings" ? <SettingsForm data={data} /> : null}
        </section>
      ) : null}

      <MonthlySummary data={data} />
      <TransactionLedger
        data={data}
        onEdit={(transaction) => {
          setAction(null);
          setEditingTransaction(transaction);
        }}
      />

    </div>
  );
}

function PoolOverview({ data }: { data: AssetsSnapshotDTO }) {
  const living = getPool(data, "living");
  const livingTarget = data.plan.livingTargetCents;
  const livingRate = livingTarget > 0 ? Math.min((living.balanceCents / livingTarget) * 100, 100) : 0;

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {(["living", "savings", "flexible"] as const).map((type) => {
        const pool = getPool(data, type);
        const meta = POOL_META[type];
        const Icon = meta.icon;
        return (
          <article key={type} className="panel-cream framed min-w-0 rounded-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-display text-base text-[var(--fg-strong)]">{meta.label}</h2>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">{meta.description}</p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border" style={{ color: meta.accent, borderColor: `${meta.accent}66`, backgroundColor: meta.soft }}>
                <Icon size={19} />
              </div>
            </div>
            <div className="mt-5 font-mono text-2xl font-bold text-[var(--fg-strong)]">{formatMoney(pool.balanceCents)}</div>
            {type === "living" ? (
              <div className="mt-4 space-y-2">
                <div className="h-2 overflow-hidden rounded-sm bg-[var(--border-soft)]">
                  <div className="h-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${livingRate}%` }} />
                </div>
                <div className="flex justify-between gap-3 text-xs text-[var(--fg-muted)]">
                  <span>目标 {formatMoney(livingTarget)}</span>
                  <span>{data.plan.livingGapCents > 0 ? `还需 ${formatMoney(data.plan.livingGapCents)}` : "本月已充足"}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t border-[var(--border)]/70 pt-3 text-xs text-[var(--fg-muted)]">
                {type === "savings"
                  ? `收入余额的 ${formatRate(data.plan.savingsRateBps)} 自动存入`
                  : `收入余额的 ${formatRate(data.plan.flexibleRateBps)} 自动转入`}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function MonthlySummary({ data }: { data: AssetsSnapshotDTO }) {
  const items = [
    { label: "本月收入", value: data.summary.monthIncomeCents, tone: "text-[var(--success)]" },
    { label: "本月退款", value: data.summary.monthRefundCents, tone: "text-[var(--success)]" },
    { label: "必须支出", value: data.summary.monthEssentialExpenseCents, tone: "text-[var(--fg-strong)]" },
    { label: "非必须支出", value: data.summary.monthOptionalExpenseCents, tone: "text-[var(--warning)]" },
    { label: "本月结余", value: data.summary.monthNetCents, tone: data.summary.monthNetCents >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]" },
  ];
  return (
    <section className="border-y border-[var(--gold)]/35 bg-[var(--bg-panel)]/85 px-4 py-4 backdrop-blur">
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 lg:border-r lg:border-[var(--border)] lg:last:border-r-0">
            <div className="font-display text-xs text-[var(--fg-muted)]">{item.label}</div>
            <div className={`mt-1 truncate font-mono text-lg font-bold ${item.tone}`}>{formatMoney(item.value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IncomeForm({
  data,
  initial,
  onDone,
}: {
  data: AssetsSnapshotDTO;
  initial?: WalletTransactionDTO;
  onDone?: () => void;
}) {
  const create = useCreateWalletTransaction();
  const update = useUpdateWalletTransaction();
  const initialAllocation = allocationValues(initial);
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [date, setDate] = useState(initial ? dateToYMD(initial.occurredAt) : todayYMD());
  const [note, setNote] = useState(initial?.note ?? "");
  const [livingSatisfied, setLivingSatisfied] = useState(false);
  const [manual, setManual] = useState(Boolean(initial));
  const [livingAllocation, setLivingAllocation] = useState(centsToInput(initialAllocation.livingCents));
  const [savingsAllocation, setSavingsAllocation] = useState(centsToInput(initialAllocation.savingsCents));
  const [flexibleAllocation, setFlexibleAllocation] = useState(centsToInput(initialAllocation.flexibleCents));
  const amountCents = moneyToCents(amount);
  const effectiveLivingBalance = effectivePoolBalance(data, "living", initial);
  const automaticAllocation = calculateIncomeAllocation({
    amountCents,
    livingBalanceCents: effectiveLivingBalance,
    livingTargetCents: livingSatisfied ? effectiveLivingBalance : data.plan.livingTargetCents,
    savingsRateBps: data.plan.savingsRateBps,
  });
  const allocation = manual
    ? {
        livingCents: moneyToCents(livingAllocation),
        savingsCents: moneyToCents(savingsAllocation),
        flexibleCents: moneyToCents(flexibleAllocation),
      }
    : automaticAllocation;
  const allocatedTotal = allocation.livingCents + allocation.savingsCents + allocation.flexibleCents;
  const allocationMatches = allocatedTotal === amountCents;
  const pending = create.isPending || update.isPending;
  const mutationError = create.error?.message ?? update.error?.message;

  const toggleManual = () => {
    if (!manual) {
      setLivingAllocation(centsToInput(automaticAllocation.livingCents));
      setSavingsAllocation(centsToInput(automaticAllocation.savingsCents));
      setFlexibleAllocation(centsToInput(automaticAllocation.flexibleCents));
    }
    setManual((value) => !value);
  };

  const submit = async () => {
    if (amountCents <= 0 || !allocationMatches) return;
    const body = {
      type: "income",
      amountCents,
      currencyCode: "CNY",
      counterparty: counterparty.trim() || null,
      note: note.trim() || null,
      occurredAt: toOccurredAt(date),
      allocations: allocation,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, body });
      else await create.mutateAsync(body);
      if (initial) onDone?.();
      else {
        setAmount("");
        setCounterparty("");
        setNote("");
        setManual(false);
      }
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title={initial ? "编辑收入" : "记录收入"} detail="先补足当前生活费余额，也可以确认充足或手动调整本笔分配" icon={<ArrowDownToLine size={18} />}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="收入金额" htmlFor="income-amount">
            <Input id="income-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="10000.00" />
          </Field>
          <Field label="来源" htmlFor="income-source">
            <Input id="income-source" value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder="工资 / 兼职" />
          </Field>
          <Field label="日期" htmlFor="income-date">
            <Input id="income-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="备注" htmlFor="income-note">
            <Input id="income-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" />
          </Field>
        </div>
        <div className="border-l-0 border-[var(--border)] xl:border-l xl:pl-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
            <span className="font-display text-sm text-[var(--fg-strong)]">分配预览</span>
            <span className="font-mono text-sm font-bold text-[var(--fg-strong)]">合计 {formatMoney(amountCents)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <label className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
              <Checkbox
                checked={livingSatisfied}
                onCheckedChange={(checked) => {
                  setLivingSatisfied(checked === true);
                  setManual(false);
                }}
              />
              本月生活费已足够
            </label>
            <Button variant="outline" size="sm" onClick={toggleManual}>
              {manual ? "恢复自动分配" : "手动调整"}
            </Button>
          </div>
          <div className="divide-y divide-[var(--border)]/70 border-t border-[var(--border)]/70">
            {manual ? (
              <>
                <AllocationInput label="每月生活费" value={livingAllocation} onChange={setLivingAllocation} />
                <AllocationInput label={`储蓄 · ${formatRate(data.plan.savingsRateBps)}`} value={savingsAllocation} onChange={setSavingsAllocation} />
                <AllocationInput label={`流动资金 · ${formatRate(data.plan.flexibleRateBps)}`} value={flexibleAllocation} onChange={setFlexibleAllocation} />
              </>
            ) : (
              <>
                <AllocationRow label="每月生活费" value={allocation.livingCents} />
                <AllocationRow label={`储蓄 · ${formatRate(data.plan.savingsRateBps)}`} value={allocation.savingsCents} />
                <AllocationRow label={`流动资金 · ${formatRate(data.plan.flexibleRateBps)}`} value={allocation.flexibleCents} />
              </>
            )}
          </div>
          {!allocationMatches ? (
            <div className="mt-2 text-right text-xs text-[var(--danger)]">
              分配合计与收入相差 {formatMoney(Math.abs(amountCents - allocatedTotal))}
            </div>
          ) : null}
          {initial ? (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">保存时会先回滚原分配，再以这里确认的金额重新入账。</p>
          ) : null}
        </div>
      </div>
      <FormFooter error={mutationError}>
        <div className="flex gap-2">
          {initial ? <Button variant="ghost" onClick={onDone}>取消</Button> : null}
          <Button onClick={submit} disabled={amountCents <= 0 || !allocationMatches || pending}>
            {initial ? "保存修改" : "确认入账"}
          </Button>
        </div>
      </FormFooter>
    </FormShell>
  );
}

function ExpenseForm({
  data,
  initial,
  onDone,
}: {
  data: AssetsSnapshotDTO;
  initial?: WalletTransactionDTO;
  onDone?: () => void;
}) {
  const create = useCreateWalletTransaction();
  const update = useUpdateWalletTransaction();
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [necessity, setNecessity] = useState<WalletNecessity>(initial?.necessity ?? "essential");
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [date, setDate] = useState(initial ? dateToYMD(initial.occurredAt) : todayYMD());
  const [note, setNote] = useState(initial?.note ?? "");
  const [acknowledged, setAcknowledged] = useState(false);
  const amountCents = moneyToCents(amount);
  const livingBalance = effectivePoolBalance(data, "living", initial);
  const needsFlexibleFallback = necessity === "essential" && amountCents > livingBalance;
  const sourcePoolType: "living" | "flexible" =
    necessity === "optional" || needsFlexibleFallback ? "flexible" : "living";
  const sourcePoolBalance = effectivePoolBalance(data, sourcePoolType, initial);
  const sourceBalanceInsufficient = amountCents > sourcePoolBalance;
  const pending = create.isPending || update.isPending;
  const mutationError = create.error?.message ?? update.error?.message;

  const submit = async () => {
    if (amountCents <= 0 || (needsFlexibleFallback && !acknowledged)) return;
    try {
      const body = {
        type: "expense",
        amountCents,
        currencyCode: "CNY",
        necessity,
        sourcePoolType,
        acknowledgeWarning: acknowledged,
        counterparty: counterparty.trim() || null,
        note: note.trim() || null,
        occurredAt: toOccurredAt(date),
      };
      if (initial) await update.mutateAsync({ id: initial.id, body });
      else await create.mutateAsync(body);
      if (initial) onDone?.();
      else {
        setAmount("");
        setCounterparty("");
        setNote("");
        setAcknowledged(false);
      }
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title={initial ? "编辑支出" : "记录支出"} detail="只判断这笔钱是否必须，系统会选择对应资金池" icon={<ArrowUpFromLine size={18} />}>
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <Label>支出性质</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SegmentButton active={necessity === "essential"} onClick={() => { setNecessity("essential"); setAcknowledged(false); }}>必须</SegmentButton>
            <SegmentButton active={necessity === "optional"} onClick={() => { setNecessity("optional"); setAcknowledged(false); }}>非必须</SegmentButton>
          </div>
          <div className="mt-4 border-t border-[var(--border)] pt-3 text-sm text-[var(--fg-muted)]">
            将从 <strong className="text-[var(--fg-strong)]">{POOL_META[sourcePoolType].label}</strong> 扣除
            <div className="mt-1 font-mono text-xs">可用 {formatMoney(sourcePoolBalance)}</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="支出金额" htmlFor="expense-amount">
            <Input id="expense-amount" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setAcknowledged(false); }} placeholder="280.00" />
          </Field>
          <Field label="对象" htmlFor="expense-counterparty">
            <Input id="expense-counterparty" value={counterparty} onChange={(event) => setCounterparty(event.target.value)} placeholder="房租 / 超市" />
          </Field>
          <Field label="日期" htmlFor="expense-date">
            <Input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="备注" htmlFor="expense-note">
            <Input id="expense-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" />
          </Field>
        </div>
      </div>
      {needsFlexibleFallback ? (
        <WarningBox>
          <div>
            <strong>生活费余额不足</strong>
            <p className="mt-1 text-xs">
              {sourceBalanceInsufficient
                ? `流动资金也不足，还差 ${formatMoney(amountCents - sourcePoolBalance)}，请先调整资金池。`
                : `这笔必须支出将直接使用流动资金，支出后流动资金预计剩余 ${formatMoney(sourcePoolBalance - amountCents)}。`}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
            我已了解
          </label>
        </WarningBox>
      ) : null}
      <FormFooter error={mutationError}>
        <div className="flex gap-2">
          {initial ? <Button variant="ghost" onClick={onDone}>取消</Button> : null}
          <Button onClick={submit} disabled={amountCents <= 0 || sourceBalanceInsufficient || pending || (needsFlexibleFallback && !acknowledged)}>
            {initial ? "保存修改" : "确认支出"}
          </Button>
        </div>
      </FormFooter>
    </FormShell>
  );
}

function TransferForm({
  data,
  initial,
  onDone,
}: {
  data: AssetsSnapshotDTO;
  initial?: WalletTransactionDTO;
  onDone?: () => void;
}) {
  const create = useCreateWalletTransaction();
  const update = useUpdateWalletTransaction();
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [sourcePoolType, setSourcePoolType] = useState<WalletPoolType>(initial?.sourcePoolType ?? "flexible");
  const [targetPoolType, setTargetPoolType] = useState<WalletPoolType>(initial?.targetPoolType ?? "living");
  const [date, setDate] = useState(initial ? dateToYMD(initial.occurredAt) : todayYMD());
  const [note, setNote] = useState(initial?.note ?? "");
  const [acknowledged, setAcknowledged] = useState(false);
  const amountCents = moneyToCents(amount);
  const sourcePoolBalance = effectivePoolBalance(data, sourcePoolType, initial);
  const usesSavings = sourcePoolType === "savings";
  const pending = create.isPending || update.isPending;
  const mutationError = create.error?.message ?? update.error?.message;
  const canSubmit = amountCents > 0 && amountCents <= sourcePoolBalance && sourcePoolType !== targetPoolType && (!usesSavings || acknowledged);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const body = {
        type: "transfer",
        amountCents,
        currencyCode: "CNY",
        sourcePoolType,
        targetPoolType,
        acknowledgeWarning: acknowledged,
        note: note.trim() || null,
        occurredAt: toOccurredAt(date),
      };
      if (initial) await update.mutateAsync({ id: initial.id, body });
      else await create.mutateAsync(body);
      if (initial) onDone?.();
      else {
        setAmount("");
        setNote("");
        setAcknowledged(false);
      }
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title={initial ? "编辑资金调整" : "资金池互转"} detail="人工调整资金用途，钱包总额不会变化" icon={<ArrowLeftRight size={18} />}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_1fr_1fr] md:items-end">
        <Field label="转出资金池" htmlFor="transfer-source">
          <Select id="transfer-source" value={sourcePoolType} onChange={(event) => { setSourcePoolType(event.target.value as WalletPoolType); setAcknowledged(false); }}>
            <PoolOptions />
          </Select>
        </Field>
        <div className="hidden h-9 items-center text-[var(--gold-deep)] md:flex"><ArrowLeftRight size={18} /></div>
        <Field label="转入资金池" htmlFor="transfer-target">
          <Select id="transfer-target" value={targetPoolType} onChange={(event) => setTargetPoolType(event.target.value as WalletPoolType)}>
            <PoolOptions />
          </Select>
        </Field>
        <Field label="转账金额" htmlFor="transfer-amount">
          <Input id="transfer-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="500.00" />
        </Field>
        <Field label="日期" htmlFor="transfer-date">
          <Input id="transfer-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>
      <Field label="备注" htmlFor="transfer-note">
        <Textarea id="transfer-note" className="min-h-16" value={note} onChange={(event) => setNote(event.target.value)} placeholder="为什么调整这笔资金？" />
      </Field>
      <div className="text-xs text-[var(--fg-muted)]">{POOL_META[sourcePoolType].label}可用余额 {formatMoney(sourcePoolBalance)}</div>
      {usesSavings ? (
        <WarningBox>
          <div><strong>这会减少已储蓄金额</strong><p className="mt-1 text-xs">转出后，储蓄将减少 {formatMoney(amountCents)}。</p></div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
            确认转出
          </label>
        </WarningBox>
      ) : null}
      <FormFooter error={mutationError ?? (sourcePoolType === targetPoolType ? "请选择不同的转入资金池" : amountCents > sourcePoolBalance ? "转出资金池余额不足" : undefined)}>
        <div className="flex gap-2">
          {initial ? <Button variant="ghost" onClick={onDone}>取消</Button> : null}
          <Button onClick={submit} disabled={!canSubmit || pending}>{initial ? "保存修改" : "确认调整"}</Button>
        </div>
      </FormFooter>
    </FormShell>
  );
}

function TransactionEditor({
  data,
  transaction,
  onDone,
}: {
  data: AssetsSnapshotDTO;
  transaction: WalletTransactionDTO;
  onDone: () => void;
}) {
  if (transaction.type === "income") {
    return <IncomeForm data={data} initial={transaction} onDone={onDone} />;
  }
  if (transaction.type === "expense") {
    return <ExpenseForm data={data} initial={transaction} onDone={onDone} />;
  }
  if (transaction.type === "transfer") {
    return <TransferForm data={data} initial={transaction} onDone={onDone} />;
  }
  return <FormError message="退款流水不能编辑" />;
}

function SettingsForm({ data }: { data: AssetsSnapshotDTO }) {
  const update = useUpdateWalletSettings();
  const [livingTarget, setLivingTarget] = useState(String(data.plan.livingTargetCents / 100));
  const [savingsPercent, setSavingsPercent] = useState(data.plan.savingsRateBps / 100);
  const [carryLivingTarget, setCarryLivingTarget] = useState(data.plan.carryLivingTarget);

  const submit = async () => {
    try {
      await update.mutateAsync({
        livingTargetCents: moneyToCents(livingTarget),
        savingsRateBps: savingsPercent * 100,
        carryLivingTarget,
      });
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title="钱包设置" detail="设置生活费目标和补足生活费后的收入分配比例" icon={<Settings2 size={18} />}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="本月生活费目标" htmlFor="settings-living-target">
          <Input id="settings-living-target" inputMode="decimal" value={livingTarget} onChange={(event) => setLivingTarget(event.target.value)} />
          <p className="mt-2 text-xs text-[var(--fg-muted)]">按当前剩余余额判断是否充足，消费后遇到新收入时会再次补足。</p>
        </Field>
        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="settings-savings-rate">剩余收入分配</Label>
            <span className="flex items-center gap-2 font-mono text-sm font-bold text-[var(--fg-strong)]">
              储蓄
              <Input
                aria-label="储蓄比例"
                type="number"
                min="0"
                max="100"
                step="5"
                value={savingsPercent}
                onChange={(event) => setSavingsPercent(clampPercent(Number(event.target.value)))}
                className="h-8 w-20 text-right font-mono"
              />
              % · 流动 {100 - savingsPercent}%
            </span>
          </div>
          <input id="settings-savings-rate" type="range" min="0" max="100" step="5" value={savingsPercent} onChange={(event) => setSavingsPercent(Number(event.target.value))} className="mt-4 w-full accent-[var(--gold-deep)]" />
          <div className="mt-1 flex justify-between text-xs text-[var(--fg-muted)]"><span>全部流动</span><span>全部储蓄</span></div>
        </div>
        <label className="flex items-start gap-3 border-t border-[var(--border)] pt-4 lg:col-span-2">
          <Checkbox
            checked={carryLivingTarget}
            onCheckedChange={(checked) => setCarryLivingTarget(checked === true)}
          />
          <span>
            <strong className="font-display text-sm text-[var(--fg-strong)]">下月沿用本月生活费目标</strong>
            <span className="mt-1 block text-xs text-[var(--fg-muted)]">关闭后，新月份的生活费目标从 0 开始，由你重新设置。</span>
          </span>
        </label>
      </div>
      <FormFooter error={update.error?.message} success={update.isSuccess ? "设置已更新" : undefined}>
        <Button onClick={submit} disabled={update.isPending}>保存设置</Button>
      </FormFooter>
    </FormShell>
  );
}

function InitializationPanel({ data }: { data: AssetsSnapshotDTO }) {
  const initialize = useInitializeWallet();
  const [total, setTotal] = useState("0");
  const [livingTarget, setLivingTarget] = useState("6000");
  const [savingsPercent, setSavingsPercent] = useState(50);
  const [living, setLiving] = useState("0");
  const [savings, setSavings] = useState("0");
  const [flexible, setFlexible] = useState("0");
  const totalCents = moneyToCents(total);
  const allocatedCents = moneyToCents(living) + moneyToCents(savings) + moneyToCents(flexible);
  const differenceCents = totalCents - allocatedCents;

  const autoAllocate = () => {
    const allocation = calculateIncomeAllocation({
      amountCents: totalCents,
      livingBalanceCents: 0,
      livingTargetCents: moneyToCents(livingTarget),
      savingsRateBps: savingsPercent * 100,
    });
    setLiving(centsToInput(allocation.livingCents));
    setSavings(centsToInput(allocation.savingsCents));
    setFlexible(centsToInput(allocation.flexibleCents));
  };

  const submit = async () => {
    if (differenceCents !== 0) return;
    try {
      await initialize.mutateAsync({
        livingTargetCents: moneyToCents(livingTarget),
        savingsRateBps: savingsPercent * 100,
        carryLivingTarget: true,
        livingBalanceCents: moneyToCents(living),
        savingsBalanceCents: moneyToCents(savings),
        flexibleBalanceCents: moneyToCents(flexible),
      });
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 md:px-8 md:py-12">
      <section className="panel-cream ornate framed rounded-sm p-5 md:p-8">
        <div className="flex items-start gap-4 border-b border-[var(--gold)]/40 pb-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]"><WalletCards size={21} /></div>
          <div>
            <h1 className="font-display text-xl text-[var(--fg-strong)]">初始化我的钱包</h1>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">旧账户、负债、信用卡和投资余额不会带入。请从零确认现在真正可分配的金额。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="当前可分配总额" htmlFor="initial-total">
            <Input id="initial-total" inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} />
          </Field>
          <Field label="每月生活费目标" htmlFor="initial-living-target">
            <Input id="initial-living-target" inputMode="decimal" value={livingTarget} onChange={(event) => setLivingTarget(event.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="initial-rate">剩余收入分配</Label><span className="font-mono text-sm font-bold">储蓄 {savingsPercent}% · 流动 {100 - savingsPercent}%</span></div>
            <input id="initial-rate" type="range" min="0" max="100" step="5" value={savingsPercent} onChange={(event) => setSavingsPercent(Number(event.target.value))} className="mt-3 w-full accent-[var(--gold-deep)]" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div><h2 className="font-display text-base text-[var(--fg-strong)]">初始资金分配</h2><p className="mt-1 text-xs text-[var(--fg-muted)]">三个池子的合计必须等于可分配总额</p></div>
          <Button variant="outline" size="sm" onClick={autoAllocate}>按规则分配</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="每月生活费" htmlFor="initial-living"><Input id="initial-living" inputMode="decimal" value={living} onChange={(event) => setLiving(event.target.value)} /></Field>
          <Field label="储蓄" htmlFor="initial-savings"><Input id="initial-savings" inputMode="decimal" value={savings} onChange={(event) => setSavings(event.target.value)} /></Field>
          <Field label="流动资金" htmlFor="initial-flexible"><Input id="initial-flexible" inputMode="decimal" value={flexible} onChange={(event) => setFlexible(event.target.value)} /></Field>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--gold)]/35 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className={`font-mono text-sm ${differenceCents === 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {differenceCents === 0 ? `已分配 ${formatMoney(allocatedCents)}` : `仍需调整 ${formatMoney(Math.abs(differenceCents))}`}
          </div>
          <Button onClick={submit} disabled={differenceCents !== 0 || initialize.isPending}>确认并启用钱包</Button>
        </div>
        {initialize.error ? <FormError message={initialize.error.message} /> : null}
        <div className="sr-only">当前月份 {data.plan.month}</div>
      </section>
    </div>
  );
}

function RolloverNotice({ data }: { data: AssetsSnapshotDTO }) {
  const rollover = useRolloverWallet();
  const livingBalance = getPool(data, "living").balanceCents;
  const submit = () => {
    if (confirm(`将上月生活费结余 ${formatMoney(livingBalance)} 转入流动资金？`)) rollover.mutate();
  };
  return (
    <section className="flex flex-col gap-3 border border-[var(--warning)]/55 bg-[var(--bg-card)]/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <CircleAlert size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" />
        <div><h2 className="font-display text-sm text-[var(--fg-strong)]">请处理上月生活费结余</h2><p className="mt-1 text-xs text-[var(--fg-muted)]">默认将 {formatMoney(livingBalance)} 人工转入流动资金，完成后再开始本月记账。</p></div>
      </div>
      <Button variant="secondary" onClick={submit} disabled={rollover.isPending}>结转到流动资金</Button>
      {rollover.error ? <span className="text-xs text-[var(--danger)]">{rollover.error.message}</span> : null}
    </section>
  );
}

function TransactionLedger({
  data,
  onEdit,
}: {
  data: AssetsSnapshotDTO;
  onEdit: (transaction: WalletTransactionDTO) => void;
}) {
  const remove = useDeleteWalletTransaction();
  const refund = useRefundWalletTransaction();
  const [type, setType] = useState("");
  const [necessity, setNecessity] = useState("");
  const [pool, setPool] = useState("");
  const [month, setMonth] = useState("");
  const transactionQuery = useWalletTransactions({ type, necessity, pool, month });
  const transactions = transactionQuery.data ?? data.transactions;
  const error = remove.error?.message ?? refund.error?.message ?? transactionQuery.error?.message;
  return (
    <section className="panel-cream rounded-sm p-4 md:p-5">
      <div className="flex flex-col gap-3 border-b border-[var(--gold)]/35 pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div><h2 className="font-display text-lg text-[var(--fg-strong)]">流水</h2><p className="text-xs text-[var(--fg-muted)]">每笔资金变化都可追溯</p></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[140px_140px_150px_160px]">
          <Select aria-label="流水类型" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">全部类型</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
            <option value="refund">退款</option>
            <option value="transfer">资金调整</option>
          </Select>
          <Select aria-label="支出性质" value={necessity} onChange={(event) => setNecessity(event.target.value)}>
            <option value="">全部性质</option>
            <option value="essential">必须</option>
            <option value="optional">非必须</option>
          </Select>
          <Select aria-label="资金池筛选" value={pool} onChange={(event) => setPool(event.target.value)}>
            <option value="">全部资金池</option>
            <PoolOptions />
          </Select>
          <Input aria-label="月份筛选" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </div>
      </div>
      {error ? <FormError message={error} /> : null}
      {transactions.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">暂无符合条件的流水</div>
      ) : (
        <div className="divide-y divide-[var(--border)]/70">
          {transactions.map((transaction) => (
            <article key={transaction.id} className="grid gap-3 py-4 sm:grid-cols-[120px_minmax(0,1fr)_auto_auto] sm:items-center">
              <div><TransactionBadge transaction={transaction} /><div className="mt-1 font-mono text-[11px] text-[var(--fg-subtle)]">{new Date(transaction.occurredAt).toLocaleDateString("zh-CN")}</div></div>
              <div className="min-w-0"><h3 className="truncate font-display text-sm text-[var(--fg-strong)]">{transaction.counterparty || transactionTitle(transaction)}</h3><p className="mt-1 truncate text-xs text-[var(--fg-muted)]">{transactionFlow(transaction)}{transaction.note ? ` · ${transaction.note}` : ""}</p>{transaction.type === "income" ? <AllocationSummary transaction={transaction} /> : null}{transaction.refund ? <div className="mt-1 text-[11px] text-[var(--success)]">已退款</div> : null}</div>
              <div className={`font-mono text-base font-bold ${transactionAmountTone(transaction.type)}`}>{formatTransactionAmount(transaction)}</div>
              <div className="flex justify-end gap-1">
                {transaction.type !== "refund" && !transaction.refund ? (
                  <Button size="icon" variant="ghost" title="编辑流水" onClick={() => onEdit(transaction)}><Pencil size={15} /></Button>
                ) : null}
                {transaction.type === "expense" && !transaction.refund ? (
                  <Button size="icon" variant="ghost" title="退款" disabled={refund.isPending} onClick={() => { if (confirm(`将 ${formatMoney(transaction.amountCents)} 退回原资金池？`)) refund.mutate(transaction.id); }}><RotateCcw size={15} /></Button>
                ) : null}
                <Button size="icon" variant="ghost" title="删除流水" disabled={remove.isPending} onClick={() => { if (confirm("删除这条流水并回滚资金池余额？")) remove.mutate(transaction.id); }}><Trash2 size={15} /></Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AllocationSummary({ transaction }: { transaction: WalletTransactionDTO }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--fg-subtle)]">
      {transaction.allocations.filter((item) => item.amountCents > 0).map((allocation) => (
        <span key={allocation.id}>{POOL_META[allocation.pool.type].label} +{formatMoney(allocation.amountCents)}</span>
      ))}
    </div>
  );
}

function TransactionBadge({ transaction }: { transaction: WalletTransactionDTO }) {
  const label = transaction.type === "income" ? "收入" : transaction.type === "refund" ? "退款" : transaction.type === "transfer" ? "资金调整" : transaction.necessity === "essential" ? "必须" : "非必须";
  const className = transaction.type === "income" || transaction.type === "refund" ? "border-[var(--success)]/50 text-[var(--success)]" : transaction.type === "expense" ? "border-[var(--danger)]/45 text-[var(--danger)]" : "border-[var(--gold)]/60 text-[var(--gold-deep)]";
  return <span className={`inline-flex rounded-sm border bg-white/45 px-2 py-1 font-display text-[11px] ${className}`}>{label}</span>;
}

function FormShell({ title, detail, icon, children }: { title: string; detail: string; icon: ReactNode; children: ReactNode }) {
  return <div className="space-y-4"><div className="flex items-start gap-3 border-b border-[var(--gold)]/35 pb-3"><span className="mt-0.5 text-[var(--gold-deep)]">{icon}</span><div><h2 className="font-display text-base text-[var(--fg-strong)]">{title}</h2><p className="mt-1 text-xs text-[var(--fg-muted)]">{detail}</p></div></div>{children}</div>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div><Label htmlFor={htmlFor}>{label}</Label><div className="mt-1.5">{children}</div></div>;
}

function FormFooter({ error, success, children }: { error?: string; success?: string; children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between"><div>{error ? <span className="text-sm text-[var(--danger)]">{error}</span> : success ? <span className="text-sm text-[var(--success)]">{success}</span> : null}</div>{children}</div>;
}

function WarningBox({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border border-[var(--warning)]/55 bg-[var(--warning)]/10 px-3 py-3 text-[var(--fg-strong)] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><CircleAlert size={17} className="mt-0.5 shrink-0 text-[var(--warning)]" /><div className="contents">{children}</div></div></div>;
}

function AllocationRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3 py-2 text-sm"><span className="text-[var(--fg-muted)]">{label}</span><strong className="font-mono text-[var(--fg-strong)]">{formatMoney(value)}</strong></div>;
}

function AllocationInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 py-2 text-sm"><span className="text-[var(--fg-muted)]">{label}</span><Input aria-label={`${label}分配金额`} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="text-right font-mono" /></div>;
}

function SegmentButton({ active, onClick, compact = false, children }: { active: boolean; onClick: () => void; compact?: boolean; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`border transition-colors ${compact ? "h-8 px-3 text-xs" : "h-9 px-3 text-sm"} ${active ? "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]" : "border-[var(--border)] bg-white/40 text-[var(--fg-muted)] hover:border-[var(--gold)]"}`}>{children}</button>;
}

function ActionButton({ active, icon, onClick, children }: { active: boolean; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return <Button variant={active ? "primary" : "secondary"} onClick={onClick}>{icon}{children}</Button>;
}

function PoolOptions() {
  return <>{(["living", "savings", "flexible"] as const).map((type) => <option key={type} value={type}>{POOL_META[type].label}</option>)}</>;
}

function FormError({ message }: { message: string }) {
  return <div className="mt-4 border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">{message}</div>;
}

function PageMessage({ title, detail, danger = false }: { title: string; detail: string; danger?: boolean }) {
  return <div className="mx-auto max-w-[720px] px-4 py-16"><div className="panel-cream framed rounded-sm p-8 text-center"><Landmark size={28} className={`mx-auto ${danger ? "text-[var(--danger)]" : "text-[var(--gold-deep)]"}`} /><h1 className="mt-4 font-display text-xl text-[var(--fg-strong)]">{title}</h1><p className="mt-2 text-sm text-[var(--fg-muted)]">{detail}</p></div></div>;
}

function getPool(data: AssetsSnapshotDTO, type: WalletPoolType): WalletPoolDTO {
  return data.pools.find((pool) => pool.type === type) ?? { id: type, type, balanceCents: 0, currencyCode: "CNY", createdAt: "" };
}

function toggleAction(current: WalletAction, next: Exclude<WalletAction, null>): WalletAction {
  return current === next ? null : next;
}

function transactionTitle(transaction: WalletTransactionDTO) {
  if (transaction.type === "income") return "收入";
  if (transaction.type === "refund") return "退款";
  if (transaction.type === "expense") return transaction.necessity === "essential" ? "必须支出" : "非必须支出";
  return "资金池调整";
}

function transactionFlow(transaction: WalletTransactionDTO) {
  if (transaction.type === "income") return "分配到资金池";
  if (transaction.type === "refund") return `退回${POOL_META[transaction.targetPoolType ?? "flexible"].label}`;
  if (transaction.type === "expense") return `从${POOL_META[transaction.sourcePoolType ?? "flexible"].label}扣除`;
  return `${POOL_META[transaction.sourcePoolType ?? "flexible"].label} → ${POOL_META[transaction.targetPoolType ?? "living"].label}`;
}

function formatTransactionAmount(transaction: WalletTransactionDTO) {
  const sign = transaction.type === "income" || transaction.type === "refund" ? "+" : transaction.type === "expense" ? "-" : "";
  return `${sign}${formatMoney(transaction.amountCents, transaction.currencyCode)}`;
}

function transactionAmountTone(type: WalletTransactionType) {
  if (type === "income" || type === "refund") return "text-[var(--success)]";
  if (type === "expense") return "text-[var(--danger)]";
  return "text-[var(--fg-strong)]";
}

function moneyToCents(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

function formatMoney(cents: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

function formatRate(rateBps: number) {
  return `${rateBps / 100}%`;
}

function formatMonth(month: string) {
  const [year, value] = month.split("-");
  return `${year} 年 ${Number(value)} 月`;
}

function toOccurredAt(date: string) {
  return date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString();
}

function dateToYMD(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function allocationValues(transaction?: WalletTransactionDTO) {
  const values = { livingCents: 0, savingsCents: 0, flexibleCents: 0 };
  for (const allocation of transaction?.allocations ?? []) {
    if (allocation.amountCents <= 0) continue;
    if (allocation.pool.type === "living") values.livingCents += allocation.amountCents;
    if (allocation.pool.type === "savings") values.savingsCents += allocation.amountCents;
    if (allocation.pool.type === "flexible") values.flexibleCents += allocation.amountCents;
  }
  return values;
}

function effectivePoolBalance(
  data: AssetsSnapshotDTO,
  type: WalletPoolType,
  transaction?: WalletTransactionDTO,
) {
  const current = getPool(data, type).balanceCents;
  const originalDelta = (transaction?.allocations ?? [])
    .filter((allocation) => allocation.pool.type === type)
    .reduce((sum, allocation) => sum + allocation.amountCents, 0);
  return current - originalDelta;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
