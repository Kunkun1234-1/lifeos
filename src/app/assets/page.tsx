"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CreditCard,
  Gem,
  Landmark,
  Plus,
  ReceiptText,
  ShieldCheck,
  Ticket,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  useAssets,
  useCreateFinanceAccount,
  useCreateFinanceTransaction,
  useDeleteFinanceTransaction,
} from "@/hooks/queries";
import { todayYMD } from "@/lib/date";
import type {
  AssetsSnapshotDTO,
  FinanceAccountDTO,
  FinanceAccountType,
  FinanceCategoryDTO,
  FinanceTransactionDTO,
  FinanceTransactionType,
} from "@/lib/types";

const ACCOUNT_TYPES: Array<{
  value: FinanceAccountType;
  label: string;
  icon: typeof Wallet;
  color: string;
}> = [
  { value: "cash", label: "现金", icon: Banknote, color: "#b68838" },
  { value: "bank", label: "银行卡", icon: Landmark, color: "#3a6b8e" },
  { value: "wallet", label: "支付钱包", icon: Wallet, color: "#4c8a74" },
  { value: "credit", label: "信用卡", icon: CreditCard, color: "#c5554a" },
  { value: "investment", label: "投资", icon: TrendingUp, color: "#9b6bc1" },
  { value: "debt", label: "债务", icon: TrendingDown, color: "#c5554a" },
  { value: "receivable", label: "应收", icon: ShieldCheck, color: "#c76d95" },
  { value: "virtual", label: "虚拟钱包", icon: Gem, color: "#8a6820" },
];

const TRANSACTION_TYPES: Array<{
  value: FinanceTransactionType;
  label: string;
  icon: typeof ReceiptText;
}> = [
  { value: "expense", label: "支出", icon: TrendingDown },
  { value: "income", label: "收入", icon: TrendingUp },
  { value: "transfer", label: "转账", icon: ArrowLeftRight },
];

const EMPTY_SUMMARY = {
  netWorthCents: 0,
  assetsCents: 0,
  liabilitiesCents: 0,
  monthIncomeCents: 0,
  monthExpenseCents: 0,
  monthNetCents: 0,
  monthBudgetCents: 0,
  monthBudgetUsedRate: null,
};

export default function AssetsPage() {
  const { data, isLoading } = useAssets();
  const [openForm, setOpenForm] = useState<"transaction" | "account" | null>("transaction");

  const summary = data?.summary ?? EMPTY_SUMMARY;
  const accounts = data?.accounts ?? [];
  const categories = data?.categories ?? [];
  const transactions = data?.transactions ?? [];

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">人生资产</span>
            <span className="en text-[11px]">Assets Ledger</span>
          </div>
          <div className="mt-2 h-px max-w-xl bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={openForm === "transaction" ? "primary" : "secondary"}
            onClick={() => setOpenForm((value) => (value === "transaction" ? null : "transaction"))}
          >
            <ReceiptText size={16} />
            记一笔
          </Button>
          <Button
            variant={openForm === "account" ? "primary" : "outline"}
            onClick={() => setOpenForm((value) => (value === "account" ? null : "account"))}
          >
            <Plus size={16} />
            新账户
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="净资产"
          value={formatMoney(summary.netWorthCents)}
          tone={summary.netWorthCents >= 0 ? "strong" : "danger"}
          icon={<Building2 size={18} />}
        />
        <MetricCard label="资产" value={formatMoney(summary.assetsCents)} icon={<TrendingUp size={18} />} />
        <MetricCard
          label="负债"
          value={formatMoney(summary.liabilitiesCents)}
          tone={summary.liabilitiesCents > 0 ? "danger" : "muted"}
          icon={<TrendingDown size={18} />}
        />
        <MetricCard
          label="本月结余"
          value={formatMoney(summary.monthNetCents)}
          tone={summary.monthNetCents >= 0 ? "success" : "danger"}
          icon={<ReceiptText size={18} />}
        />
        <VirtualCurrencyCard data={data} />
      </section>

      {openForm && (
        <section className="panel-cream framed rounded-sm p-4">
          {openForm === "transaction" ? (
            <TransactionForm accounts={accounts} categories={categories} />
          ) : (
            <AccountForm />
          )}
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel-cream rounded-sm p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg text-[var(--fg-strong)]">流水</h2>
              <p className="font-display-en text-[9px] text-[var(--gold-deep)]">Transactions</p>
            </div>
            <span className="rounded-sm border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 font-mono text-xs text-[var(--fg-muted)]">
              {transactions.length}
            </span>
          </div>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading...</div>
          ) : transactions.length === 0 ? (
            <EmptyState title="暂无流水" />
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </section>

        <div className="space-y-5">
          <AccountPanel accounts={accounts} />
          <BudgetPanel data={data} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "strong",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "strong" | "success" | "danger" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[var(--danger)]"
        : tone === "muted"
          ? "text-[var(--fg-muted)]"
          : "text-[var(--fg-strong)]";

  return (
    <div className="panel-cream framed rounded-sm p-4">
      <div className="flex items-center justify-between text-[var(--gold-deep)]">
        <span className="font-display text-[12px] text-[var(--fg-muted)]">{label}</span>
        {icon}
      </div>
      <div className={`mt-3 break-words font-mono text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function VirtualCurrencyCard({ data }: { data: AssetsSnapshotDTO | undefined }) {
  return (
    <div className="panel-ink rounded-sm p-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-[12px] text-[var(--fg-on-ink)]">虚拟资产</span>
        <Gem size={18} className="text-[var(--gold-pale)]" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <CurrencyPill label="Gold" value={data?.currency.gold ?? 0} />
        <CurrencyPill label="Gems" value={data?.currency.gems ?? 0} />
        <CurrencyPill label="Fate" value={data?.currency.fate ?? 0} icon={<Ticket size={13} />} />
      </div>
    </div>
  );
}

function CurrencyPill({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-[var(--gold)]/40 bg-white/5 px-2 py-2">
      <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-[var(--gold-pale)]">
        {icon}
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 font-display-en text-[8px] text-[var(--fg-on-ink)]/65">{label}</div>
    </div>
  );
}

function AccountForm() {
  const create = useCreateFinanceAccount();
  const [name, setName] = useState("");
  const [type, setType] = useState<FinanceAccountType>("bank");
  const [balance, setBalance] = useState("0");
  const [currencyCode, setCurrencyCode] = useState("CNY");
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);

  const meta = ACCOUNT_TYPES.find((item) => item.value === type) ?? ACCOUNT_TYPES[0];

  const submit = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({
        name: name.trim(),
        type,
        currencyCode: currencyCode.trim().toUpperCase() || "CNY",
        initialBalanceCents: moneyToCents(balance),
        includeInNetWorth,
        color: meta.color,
        icon: type,
      });
      setName("");
      setBalance("0");
    } catch {
      // Mutation error is rendered below from React Query state.
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_180px_160px_120px_auto] lg:items-end">
        <div>
          <Label htmlFor="account-name">账户名</Label>
          <Input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="招商银行 / 微信钱包"
          />
        </div>
        <div>
          <Label htmlFor="account-type">类型</Label>
          <Select
            id="account-type"
            value={type}
            onChange={(event) => setType(event.target.value as FinanceAccountType)}
          >
            {ACCOUNT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="account-balance">初始余额</Label>
          <Input
            id="account-balance"
            inputMode="decimal"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="account-currency">币种</Label>
          <Input
            id="account-currency"
            value={currencyCode}
            maxLength={3}
            onChange={(event) => setCurrencyCode(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 pb-1 lg:justify-end">
          <Checkbox
            id="include-net-worth"
            checked={includeInNetWorth}
            onCheckedChange={(checked) => setIncludeInNetWorth(checked === true)}
          />
          <label htmlFor="include-net-worth" className="text-sm text-[var(--fg-muted)]">
            计入净资产
          </label>
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            保存账户
          </Button>
        </div>
      </div>
      {create.error && <FormError message={create.error.message} />}
    </div>
  );
}

function TransactionForm({
  accounts,
  categories,
}: {
  accounts: FinanceAccountDTO[];
  categories: FinanceCategoryDTO[];
}) {
  const create = useCreateFinanceTransaction();
  const [type, setType] = useState<FinanceTransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? "");
  const [targetAccountId, setTargetAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [payee, setPayee] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!sourceAccountId && accounts[0]) setSourceAccountId(accounts[0].id);
    if (!targetAccountId && accounts[0]) setTargetAccountId(accounts[1]?.id ?? accounts[0].id);
  }, [accounts, sourceAccountId, targetAccountId]);

  const typeCategories = categories.filter((category) => category.kind === type);
  const hasRequiredAccounts =
    type === "income"
      ? !!targetAccountId
      : type === "expense"
        ? !!sourceAccountId
        : !!sourceAccountId && !!targetAccountId && sourceAccountId !== targetAccountId;
  const canSubmit =
    accounts.length > 0 &&
    moneyToCents(amount) > 0 &&
    hasRequiredAccounts;

  const submit = async () => {
    if (!canSubmit) return;
    const occurredAt = date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString();
    const primaryAccount = accounts.find((account) => account.id === (type === "income" ? targetAccountId : sourceAccountId));
    try {
      await create.mutateAsync({
        type,
        amountCents: moneyToCents(amount),
        currencyCode: primaryAccount?.currencyCode ?? "CNY",
        sourceAccountId: type === "income" ? null : sourceAccountId,
        targetAccountId: type === "expense" ? null : targetAccountId,
        categoryId: categoryId || null,
        payee: payee.trim() || null,
        note: note.trim() || null,
        tags: [],
        occurredAt,
      });
      setAmount("");
      setPayee("");
      setNote("");
    } catch {
      // Mutation error is rendered below from React Query state.
    }
  };

  if (accounts.length === 0) {
    return <EmptyState title="先建立一个真实账户" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TRANSACTION_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setType(value);
              setCategoryId("");
            }}
            className={`inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-sm transition-colors ${
              type === value
                ? "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]"
                : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:border-[var(--gold)]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div>
          <Label htmlFor="transaction-amount">金额</Label>
          <Input
            id="transaction-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="88.50"
          />
        </div>
        <div>
          <Label htmlFor="transaction-source">{type === "income" ? "入账账户" : "出账账户"}</Label>
          <Select
            id="transaction-source"
            value={type === "income" ? targetAccountId : sourceAccountId}
            onChange={(event) =>
              type === "income"
                ? setTargetAccountId(event.target.value)
                : setSourceAccountId(event.target.value)
            }
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        {type === "transfer" && (
          <div>
            <Label htmlFor="transaction-target">转入账户</Label>
            <Select
              id="transaction-target"
              value={targetAccountId}
              onChange={(event) => setTargetAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="transaction-category">分类</Label>
          <Select
            id="transaction-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">未分类</option>
            {typeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="transaction-date">日期</Label>
          <Input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Label htmlFor="transaction-payee">{type === "income" ? "来源" : "商户/对象"}</Label>
          <Input
            id="transaction-payee"
            value={payee}
            onChange={(event) => setPayee(event.target.value)}
            placeholder="星巴克 / 工资"
          />
        </div>
        <div>
          <Label htmlFor="transaction-note">备注</Label>
          <Textarea
            id="transaction-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-9"
          />
        </div>
        <Button onClick={submit} disabled={!canSubmit || create.isPending}>
          保存流水
        </Button>
      </div>
      {create.error && <FormError message={create.error.message} />}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
      {message}
    </div>
  );
}

function TransactionList({ transactions }: { transactions: FinanceTransactionDTO[] }) {
  const remove = useDeleteFinanceTransaction();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left font-display-en text-[9px] text-[var(--gold-deep)]">
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Item</th>
            <th className="py-2 pr-3">Account</th>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3 text-right">Amount</th>
            <th className="w-10 py-2" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-[var(--border)]/60">
              <td className="py-3 pr-3">
                <TransactionTypeBadge type={transaction.type} />
              </td>
              <td className="max-w-[280px] py-3 pr-3">
                <div className="truncate font-display text-[13px] text-[var(--fg-strong)]">
                  {transaction.payee || transaction.category?.name || "未命名流水"}
                </div>
                {transaction.note && (
                  <div className="mt-0.5 truncate text-[11px] text-[var(--fg-subtle)]">{transaction.note}</div>
                )}
              </td>
              <td className="py-3 pr-3 text-[12px] text-[var(--fg-muted)]">
                {accountFlowLabel(transaction)}
              </td>
              <td className="py-3 pr-3 font-mono text-[12px] text-[var(--fg-subtle)]">
                {new Date(transaction.occurredAt).toLocaleDateString("zh-CN")}
              </td>
              <td className={`py-3 pr-3 text-right font-mono font-bold ${amountColor(transaction.type)}`}>
                {formatTransactionAmount(transaction)}
              </td>
              <td className="py-3 text-right">
                <Button
                  size="icon"
                  variant="ghost"
                  title="删除流水"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm("删除这条流水并回滚账户余额？")) remove.mutate(transaction.id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionTypeBadge({ type }: { type: FinanceTransactionType }) {
  const meta = TRANSACTION_TYPES.find((item) => item.value === type) ?? TRANSACTION_TYPES[0];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[11px] text-[var(--fg-muted)]">
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function AccountPanel({ accounts }: { accounts: FinanceAccountDTO[] }) {
  return (
    <section className="panel-cream rounded-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-[var(--fg-strong)]">账户</h2>
          <p className="font-display-en text-[9px] text-[var(--gold-deep)]">Accounts</p>
        </div>
        <span className="font-mono text-xs text-[var(--fg-muted)]">{accounts.length}</span>
      </div>
      {accounts.length === 0 ? (
        <EmptyState title="暂无账户" />
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => {
            const typeMeta = ACCOUNT_TYPES.find((item) => item.value === account.type) ?? ACCOUNT_TYPES[0];
            const Icon = typeMeta.icon;
            return (
              <div
                key={account.id}
                className="flex items-center gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-[var(--border)]"
                  style={{ color: account.color, backgroundColor: `${account.color}14` }}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[13px] text-[var(--fg-strong)]">{account.name}</div>
                  <div className="text-[11px] text-[var(--fg-subtle)]">
                    {typeMeta.label} · {account.currencyCode}
                  </div>
                </div>
                <div className={`font-mono text-sm font-bold ${account.balanceCents < 0 ? "text-[var(--danger)]" : "text-[var(--fg-strong)]"}`}>
                  {formatMoney(account.balanceCents, account.currencyCode)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BudgetPanel({ data }: { data: AssetsSnapshotDTO | undefined }) {
  const rows = data?.expenseByCategory ?? [];
  const totalExpense = data?.summary.monthExpenseCents ?? 0;
  const totalBudget = data?.summary.monthBudgetCents ?? 0;

  return (
    <section className="panel-cream rounded-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-[var(--fg-strong)]">本月预算</h2>
          <p className="font-display-en text-[9px] text-[var(--gold-deep)]">Budget</p>
        </div>
        <span className="font-mono text-xs text-[var(--fg-muted)]">
          {formatMoney(totalExpense)} / {formatMoney(totalBudget)}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="本月暂无支出" />
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 6).map((row) => {
            const percent = row.budgetCents > 0 ? Math.min(1, row.amountCents / row.budgetCents) : 0;
            return (
              <div key={row.categoryId ?? row.name}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-display text-[var(--fg-strong)]">{row.name}</span>
                  <span className="font-mono text-[var(--fg-muted)]">
                    {formatMoney(row.amountCents)}
                    {row.budgetCents > 0 ? ` / ${formatMoney(row.budgetCents)}` : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-panel-ink)]/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: row.budgetCents > 0 ? `${Math.max(3, percent * 100)}%` : "100%",
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-sm border border-dashed border-[var(--border)] bg-[var(--bg-card)]/60 py-8 text-center text-sm text-[var(--fg-subtle)]">
      {title}
    </div>
  );
}

function moneyToCents(value: string) {
  const normalized = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(normalized)) return 0;
  return Math.round(normalized * 100);
}

function formatMoney(cents: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function accountFlowLabel(transaction: FinanceTransactionDTO) {
  if (transaction.type === "income") return transaction.targetAccount?.name ?? "未知账户";
  if (transaction.type === "expense") return transaction.sourceAccount?.name ?? "未知账户";
  return `${transaction.sourceAccount?.name ?? "未知账户"} -> ${transaction.targetAccount?.name ?? "未知账户"}`;
}

function amountColor(type: FinanceTransactionType) {
  if (type === "income") return "text-[var(--success)]";
  if (type === "expense") return "text-[var(--danger)]";
  return "text-[var(--fg-strong)]";
}

function formatTransactionAmount(transaction: FinanceTransactionDTO) {
  const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : "";
  return `${sign}${formatMoney(transaction.amountCents, transaction.currencyCode)}`;
}
