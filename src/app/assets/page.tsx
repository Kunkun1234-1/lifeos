"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleAlert,
  Landmark,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Settings2,
  ShoppingBasket,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  useAssets,
  useCreateWalletTransaction,
  useDeleteWalletTransaction,
  useGoals,
  useInitializeWallet,
  useRefundWalletTransaction,
  useRolloverWallet,
  useUpdateWalletTransaction,
  useUpdateWalletSettings,
  useUser,
  useWalletTransactions,
} from "@/hooks/queries";
import { todayYMD } from "@/lib/date";
import type {
  AssetsSnapshotDTO,
  GoalDTO,
  WalletNecessity,
  WalletPoolDTO,
  WalletPoolType,
  WalletTransactionDTO,
  WalletTransactionType,
} from "@/lib/types";
import { calculateIncomeAllocation } from "@/lib/wallet-calculations";
import styles from "./page.module.css";

type WalletAction = "income" | "expense" | "transfer" | "settings" | null;
type DistMode = "category" | "pool";

const POOL_META: Record<
  WalletPoolType,
  {
    label: string;
    short: string;
    description: string;
    foot: string;
    icon: typeof PiggyBank;
  }
> = {
  savings: {
    label: "储蓄池",
    short: "储蓄",
    description: "长期沉淀资金",
    foot: "为未来梦想储蓄 ›",
    icon: PiggyBank,
  },
  flexible: {
    label: "自由池",
    short: "自由",
    description: "自由调度与非必须开支",
    foot: "灵活支配生活乐趣 ›",
    icon: Sparkles,
  },
  living: {
    label: "生活费池",
    short: "生活费",
    description: "当月必须开支",
    foot: "覆盖本月日常开销 ›",
    icon: ShoppingBasket,
  },
};

const POOL_ORDER: WalletPoolType[] = ["savings", "flexible", "living"];
const FINANCE_GOALS_KEY = "life-game-finance-goals";
const FINANCE_GOALS_HIDDEN_KEY = "life-game-finance-goals-hidden";
const TIPS = [
  "先填满生活费池，再把结余按比例流入储蓄与自由池，节奏会更稳。",
  "连续记账比单笔金额更重要——小笔记录也能堆出理财等级。",
  "自由池适合「想买但可不急」的支出，避免挤占生活费与储蓄。",
];

type FinanceGoal = {
  id: string;
  name: string;
  currentCents: number;
  targetCents: number;
  removable?: boolean;
};

export default function AssetsPage() {
  const { data, isLoading, error } = useAssets();
  const { data: user } = useUser();
  const { data: goals } = useGoals();
  const [action, setAction] = useState<WalletAction>(null);
  const [editingTransaction, setEditingTransaction] = useState<WalletTransactionDTO | null>(null);
  const [distMode, setDistMode] = useState<DistMode>("category");
  const [poolFilter, setPoolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [financeGoals, setFinanceGoals] = useState<FinanceGoal[]>([]);
  const [hiddenFinanceGoalIds, setHiddenFinanceGoalIds] = useState<string[]>([]);

  useEffect(() => {
    setFinanceGoals(readFinanceGoals());
    setHiddenFinanceGoalIds(readHiddenFinanceGoalIds());
  }, []);

  const removeDisplayedFinanceGoal = (goalId: string) => {
    if (goalId.startsWith("local-")) {
      const next = financeGoals.filter((goal) => goal.id !== goalId);
      setFinanceGoals(next);
      writeFinanceGoals(next);
      return;
    }
    const next = Array.from(new Set([...hiddenFinanceGoalIds, goalId]));
    setHiddenFinanceGoalIds(next);
    writeHiddenFinanceGoalIds(next);
  };

  const selectAction = (next: Exclude<WalletAction, null>) => {
    setEditingTransaction(null);
    setAction((current) => toggleAction(current, next));
  };

  const closeWalletModal = useCallback(() => {
    setAction(null);
    setEditingTransaction(null);
  }, []);

  const modalAction =
    action === "income" || action === "expense" || action === "transfer"
      ? action
      : null;
  const showWalletModal = Boolean(modalAction || editingTransaction);

  const transactionQuery = useWalletTransactions({
    type: typeFilter,
    pool: poolFilter,
    month: data?.plan.month ?? "",
  });

  if (isLoading) {
    return <PageMessage title="正在整理钱包" detail="正在读取三个资金池..." />;
  }
  if (error || !data) {
    return <PageMessage title="钱包暂时无法打开" detail={error?.message ?? "请稍后重试"} danger />;
  }
  if (!data.plan.initialized) {
    return (
      <div className={styles.initWrap}>
        <InitializationPanel data={data} />
      </div>
    );
  }

  const transactions = transactionQuery.data ?? data.transactions;
  const total = data.summary.totalBalanceCents;
  const income = data.summary.monthIncomeCents;
  const expense = data.summary.monthExpenseCents;
  const balance = data.summary.monthNetCents;
  const balanceRate = income > 0 ? Math.max(0, Math.min(100, (balance / income) * 100)) : 0;
  const incomeCount = data.transactions.filter((tx) => tx.type === "income").length;
  const optionalExpense = data.summary.monthOptionalExpenseCents;

  const pools = POOL_ORDER.map((type) => {
    const pool = getPool(data, type);
    const target = poolTargetCents(data, type);
    const share = total > 0 ? (pool.balanceCents / total) * 100 : 0;
    const progress = target > 0 ? Math.min(100, (pool.balanceCents / target) * 100) : 0;
    return { type, pool, target, share, progress };
  });

  const stats = deriveBookkeepingStats(data.transactions, data.plan.month);
  const financeLevel = deriveFinanceLevel(stats.bookkeepingDays, stats.monthCount, total);
  const style = deriveFinanceStyle(data);
  const tip = TIPS[stats.bookkeepingDays % TIPS.length];

  const displayGoals = buildFinanceGoals(data, goals ?? [], financeGoals, hiddenFinanceGoalIds);
  const distribution = buildExpenseDistribution(data.transactions, distMode);
  const name = user?.name || "旅行者";
  const title =
    user?.equippedTitle?.name ||
    user?.class ||
    "人生探索者";

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>钱包</h1>
        <p className={styles.pageDesc}>三池分流 · 记账升级 · 看见结余如何变成目标</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.profile} aria-label="理财角色档案">
          <div className={styles.profileArtWrap}>
            <Image
              className={styles.profileArt}
              src="/life-game/profile-panel-v2.png"
              alt="角色立绘"
              fill
              sizes="260px"
              priority
              unoptimized
            />
          </div>
          <div className={styles.profileBody}>
            <div className={styles.profileCard}>
              <div className={styles.profileName}>{name}</div>
              <div className={styles.profileTitle}>{title}</div>

              <div className={styles.levelBlock}>
                <div className={styles.levelRow}>
                  <span className={styles.levelLabel}>理财等级</span>
                  <span className={styles.levelValue}>Lv.{financeLevel.level}</span>
                </div>
                <div className={styles.xpTrack} aria-hidden>
                  <div
                    className={styles.xpFill}
                    style={{ width: `${financeLevel.progress * 100}%` }}
                  />
                </div>
                <div className={styles.xpMeta}>
                  {financeLevel.xp} / {financeLevel.next} XP
                </div>
              </div>

              <div className={styles.statList}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>记账天数</span>
                  <span className={styles.statValue}>{stats.bookkeepingDays} 天</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>连续记账</span>
                  <span className={styles.statValue}>{stats.streakDays} 天</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>本月记录</span>
                  <span className={styles.statValue}>{stats.monthCount} 笔</span>
                </div>
              </div>
            </div>

            <div className={styles.styleBlock}>
              <div className={styles.styleBadge}>
                <Sparkles size={12} />
                理财风格 · {style.label}
              </div>
              <p className={styles.styleDesc}>{style.description}</p>
            </div>
          </div>
          <div className={styles.profileFoot} aria-hidden />
        </aside>

        <div className={styles.center}>
          <section className={styles.metrics} aria-label="本月财务概览">
            <article className={styles.metricCard} data-tone="green">
              <div className={styles.metricLabel}>总资产</div>
              <div className={styles.metricValue}>{formatPlain(total)}</div>
              <div
                className={`${styles.metricDelta} ${
                  balance >= 0 ? styles.metricDeltaUp : styles.metricDeltaDown
                }`}
              >
                {balance >= 0 ? "+" : "-"}
                {formatPlain(Math.abs(balance))} {balance >= 0 ? "↑" : "↓"}
              </div>
            </article>

            <article className={styles.metricCard} data-tone="income">
              <div className={styles.metricLabel}>本月收入</div>
              <div className={styles.metricValue}>{formatPlain(income)}</div>
              <div className={`${styles.metricDelta} ${styles.metricDeltaUp}`}>
                {data.summary.monthRefundCents > 0
                  ? `退款 +${formatPlain(data.summary.monthRefundCents)} ↑`
                  : `入账 ${incomeCount} 笔 ↑`}
              </div>
            </article>

            <article className={styles.metricCard} data-tone="expense">
              <div className={styles.metricLabel}>本月支出</div>
              <div className={styles.metricValue}>{formatPlain(expense)}</div>
              <div className={`${styles.metricDelta} ${styles.metricDeltaDown}`}>
                {optionalExpense > 0
                  ? `非必须 -${formatPlain(optionalExpense)} ↓`
                  : `本月累计 -${formatPlain(expense)} ↓`}
              </div>
            </article>

            <article className={styles.metricCard} data-tone="balance">
              <div className={styles.metricLabel}>本月结余</div>
              <div className={styles.metricBalanceRow}>
                <div>
                  <div className={styles.metricValue}>{formatPlain(balance)}</div>
                  <div className={styles.balanceRate}>
                    结余率 <strong>{balanceRate.toFixed(1)}%</strong>
                  </div>
                </div>
                <div className={styles.ringWrap} aria-hidden>
                  <svg className={styles.ringSvg} viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="17" fill="none" stroke="#e8ead8" strokeWidth="5" />
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="none"
                      stroke="#249d6d"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(balanceRate / 100) * 106.76} 106.76`}
                    />
                  </svg>
                  <div className={styles.ringLabel}>{Math.round(balanceRate)}%</div>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.pools} aria-label="三池资产">
            {pools.map(({ type, pool, target, share, progress }) => {
              const meta = POOL_META[type];
              const Icon = meta.icon;
              return (
                <article key={type} className={styles.poolCard} data-pool={type}>
                  <div className={styles.poolHead}>
                    <div>
                      <div className={styles.poolTitle}>{meta.label}</div>
                      <div className={styles.poolShare}>占总资产 {share.toFixed(1)}%</div>
                    </div>
                    <div className={styles.poolIcon}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <div className={styles.poolAmount}>{formatPlain(pool.balanceCents)}</div>
                  <div className={styles.poolTrack}>
                    <div className={styles.poolFill} style={{ width: `${progress}%` }} />
                  </div>
                  <div className={styles.poolMeta}>
                    <span>
                      目标 <strong>{formatPlain(target)}</strong>
                    </span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className={styles.poolFoot}>
                    <span>{meta.foot}</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className={styles.actions} aria-label="快捷操作">
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="expense"
              data-active={action === "expense"}
              onClick={() => selectAction("expense")}
            >
              <Minus size={16} />
              记一笔支出
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="income"
              data-active={action === "income"}
              onClick={() => selectAction("income")}
            >
              <Plus size={16} />
              记一笔收入
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="transfer"
              data-active={action === "transfer"}
              onClick={() => selectAction("transfer")}
            >
              <ArrowLeftRight size={16} />
              池间划转
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              data-kind="budget"
              data-active={action === "settings"}
              onClick={() => selectAction("settings")}
            >
              <Settings2 size={16} />
              调整预算
            </button>
          </section>

          {!data.plan.rolloverCompleted ? (
            <div className={styles.rollover}>
              <RolloverNotice data={data} />
            </div>
          ) : null}

          {action === "settings" && !editingTransaction ? (
            <section className={styles.actionPanel}>
              <SettingsForm data={data} />
            </section>
          ) : null}

          {showWalletModal ? (
            <WalletModal onClose={closeWalletModal}>
              {editingTransaction ? (
                <TransactionEditor
                  data={data}
                  transaction={editingTransaction}
                  onDone={closeWalletModal}
                />
              ) : null}
              {!editingTransaction && modalAction === "income" ? (
                <IncomeForm data={data} onDone={closeWalletModal} />
              ) : null}
              {!editingTransaction && modalAction === "expense" ? (
                <ExpenseForm data={data} onDone={closeWalletModal} />
              ) : null}
              {!editingTransaction && modalAction === "transfer" ? (
                <TransferForm data={data} onDone={closeWalletModal} />
              ) : null}
            </WalletModal>
          ) : null}

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>最近交易</h2>
              <div className={styles.filters}>
                <select
                  className={styles.filterSelect}
                  aria-label="按资金池筛选"
                  value={poolFilter}
                  onChange={(event) => setPoolFilter(event.target.value)}
                >
                  <option value="">全部池</option>
                  {POOL_ORDER.map((type) => (
                    <option key={type} value={type}>
                      {POOL_META[type].label}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.filterSelect}
                  aria-label="按类型筛选"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="">全部类型</option>
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                  <option value="refund">退款</option>
                  <option value="transfer">划转</option>
                </select>
              </div>
            </div>
            <TransactionList
              data={data}
              transactions={transactions}
              onEdit={(transaction) => {
                setAction(null);
                setEditingTransaction(transaction);
              }}
            />
          </article>
        </div>

        <aside className={styles.rightRail} aria-label="财务分析">
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>财务目标</h2>
            </div>
            <div className={styles.goalList}>
              {displayGoals.length === 0 ? (
                <div className={styles.empty}>还没有财务目标</div>
              ) : null}
              {displayGoals.map((goal) => {
                const pct =
                  goal.targetCents > 0
                    ? Math.min(100, (goal.currentCents / goal.targetCents) * 100)
                    : 0;
                return (
                  <div key={goal.id} className={styles.goalItem}>
                    <div className={styles.goalTop}>
                      <span className={styles.goalName}>{goal.name}</span>
                      <div className={styles.goalActions}>
                        <span className={styles.goalProgress}>
                          {formatPlain(goal.currentCents)} / {formatPlain(goal.targetCents)}
                        </span>
                        <button
                          type="button"
                          className={styles.goalDelete}
                          title="删除目标"
                          aria-label={`删除${goal.name}`}
                          onClick={() => {
                            if (confirm(`删除财务目标「${goal.name}」？`)) {
                              removeDisplayedFinanceGoal(goal.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className={styles.goalTrack}>
                      <div className={styles.goalFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.addGoal}
              onClick={() => {
                const next = addFinanceGoal(financeGoals);
                setFinanceGoals(next);
                writeFinanceGoals(next);
              }}
            >
              + 添加新目标
            </button>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>本月支出分布</h2>
              <div className={styles.segToggle}>
                <button
                  type="button"
                  className={styles.segBtn}
                  data-active={distMode === "category"}
                  onClick={() => setDistMode("category")}
                >
                  按分类
                </button>
                <button
                  type="button"
                  className={styles.segBtn}
                  data-active={distMode === "pool"}
                  onClick={() => setDistMode("pool")}
                >
                  按池
                </button>
              </div>
            </div>
            <ExpenseDonut segments={distribution} totalCents={expense} />
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>各池使用情况</h2>
            </div>
            <div className={styles.usageList}>
              {pools.map(({ type, progress }) => (
                <div key={type} className={styles.usageRow}>
                  <div className={styles.usageTop}>
                    <span className={styles.usageName}>{POOL_META[type].label}</span>
                    <span className={styles.usagePct}>{progress.toFixed(0)}%</span>
                  </div>
                  <div className={styles.usageTrack}>
                    <div
                      className={styles.usageFill}
                      data-pool={type}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>

        <aside className={styles.tip}>
          <Image
            className={styles.tipMascot}
            src="/life-game/pixel-dragon-v1.png"
            alt=""
            width={56}
            height={48}
            unoptimized
          />
          <div>
            <div className={styles.tipLabel}>理财小贴士</div>
            <p className={styles.tipText}>{tip}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TransactionList({
  data,
  transactions,
  onEdit,
}: {
  data: AssetsSnapshotDTO;
  transactions: WalletTransactionDTO[];
  onEdit: (transaction: WalletTransactionDTO) => void;
}) {
  const remove = useDeleteWalletTransaction();
  const refund = useRefundWalletTransaction();
  const error = remove.error?.message ?? refund.error?.message;

  if (transactions.length === 0) {
    return <div className={styles.empty}>暂无符合条件的流水</div>;
  }

  return (
    <div className={styles.txList}>
      {error ? <FormError message={error} /> : null}
      {transactions.map((transaction) => {
        const poolType = primaryPoolType(transaction);
        const amountTone =
          transaction.type === "income" || transaction.type === "refund"
            ? styles.txAmountPos
            : transaction.type === "expense"
              ? styles.txAmountNeg
              : styles.txAmountNeutral;
        return (
          <article key={transaction.id} className={styles.txRow}>
            <div className={styles.txIcon}>{transactionIcon(transaction)}</div>
            <div className={styles.txMain}>
              <div className={styles.txName}>
                {transaction.counterparty || transactionTitle(transaction)}
              </div>
              <div className={styles.txMeta}>
                <span>{transactionCategory(transaction)}</span>
                {poolType ? (
                  <span className={styles.poolPill} data-pool={poolType}>
                    {POOL_META[poolType].short}
                  </span>
                ) : null}
              </div>
            </div>
            <div className={styles.txRight}>
              <div className={`${styles.txAmount} ${amountTone}`}>
                {formatTransactionAmount(transaction)}
              </div>
              <div className={styles.txTime}>
                {formatTxTime(transaction.occurredAt)}
              </div>
              <div className={styles.txActions}>
                {transaction.type !== "refund" && !transaction.refund ? (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="编辑流水"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil size={13} />
                  </button>
                ) : null}
                {transaction.type === "expense" && !transaction.refund ? (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="退款"
                    disabled={refund.isPending}
                    onClick={() => {
                      if (confirm(`将 ${formatMoney(transaction.amountCents)} 退回原资金池？`)) {
                        refund.mutate(transaction.id);
                      }
                    }}
                  >
                    <RotateCcw size={13} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="删除流水"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm("删除这条流水并回滚资金池余额？")) {
                      remove.mutate(transaction.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
      <div className="sr-only">当前钱包月份 {data.plan.month}</div>
    </div>
  );
}

function ExpenseDonut({
  segments,
  totalCents,
}: {
  segments: Array<{ key: string; label: string; cents: number; color: string }>;
  totalCents: number;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (segments.length === 0 || totalCents <= 0) {
    return <div className={styles.empty}>本月还没有支出记录</div>;
  }

  return (
    <div className={styles.distBody}>
      <div className={styles.donutWrap}>
        <svg className={styles.donutSvg} viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={radius} fill="none" stroke="#e8ead8" strokeWidth="14" />
          {segments.map((segment) => {
            const ratio = segment.cents / totalCents;
            const length = ratio * circumference;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                key={segment.key}
                cx="56"
                cy="56"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="14"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className={styles.donutCenter}>
          <strong>{formatPlain(totalCents)}</strong>
          <span>本月支出</span>
        </div>
      </div>
      <div className={styles.legend}>
        {segments.map((segment) => {
          const pct = totalCents > 0 ? (segment.cents / totalCents) * 100 : 0;
          return (
            <div key={segment.key} className={styles.legendRow}>
              <span className={styles.legendDot} style={{ background: segment.color }} />
              <span className={styles.legendName}>{segment.label}</span>
              <span className={styles.legendVal}>
                {pct.toFixed(0)}% · {formatPlain(segment.cents)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
      onDone?.();
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title={initial ? "编辑收入" : "记录收入"} detail="先补足当前生活费余额，也可以确认充足或手动调整本笔分配" icon={<ArrowDownToLine size={18} />}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
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
        <div className="border-t border-[var(--border)] pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
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
                <AllocationInput label="生活费池" value={livingAllocation} onChange={setLivingAllocation} />
                <AllocationInput label={`储蓄池 · ${formatRate(data.plan.savingsRateBps)}`} value={savingsAllocation} onChange={setSavingsAllocation} />
                <AllocationInput label={`自由池 · ${formatRate(data.plan.flexibleRateBps)}`} value={flexibleAllocation} onChange={setFlexibleAllocation} />
              </>
            ) : (
              <>
                <AllocationRow label="生活费池" value={allocation.livingCents} />
                <AllocationRow label={`储蓄池 · ${formatRate(data.plan.savingsRateBps)}`} value={allocation.savingsCents} />
                <AllocationRow label={`自由池 · ${formatRate(data.plan.flexibleRateBps)}`} value={allocation.flexibleCents} />
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
          {onDone ? <Button variant="ghost" onClick={onDone}>取消</Button> : null}
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
      onDone?.();
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title={initial ? "编辑支出" : "记录支出"} detail="只判断这笔钱是否必须，系统会选择对应资金池" icon={<ArrowUpFromLine size={18} />}>
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
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
        <div className="grid gap-3 sm:grid-cols-2">
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
                ? `自由池也不足，还差 ${formatMoney(amountCents - sourcePoolBalance)}，请先调整资金池。`
                : `这笔必须支出将直接使用自由池，支出后自由池预计剩余 ${formatMoney(sourcePoolBalance - amountCents)}。`}
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
          {onDone ? <Button variant="ghost" onClick={onDone}>取消</Button> : null}
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
      onDone?.();
    } catch {
      // React Query exposes the error below without clearing the form.
    }
  };

  return (
    <FormShell title={initial ? "编辑资金调整" : "池间划转"} detail="人工调整资金用途，钱包总额不会变化" icon={<ArrowLeftRight size={18} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="转出资金池" htmlFor="transfer-source">
          <Select id="transfer-source" value={sourcePoolType} onChange={(event) => { setSourcePoolType(event.target.value as WalletPoolType); setAcknowledged(false); }}>
            <PoolOptions />
          </Select>
        </Field>
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
          {onDone ? <Button variant="ghost" onClick={onDone}>取消</Button> : null}
          <Button onClick={submit} disabled={!canSubmit || pending}>{initial ? "保存修改" : "确认调整"}</Button>
        </div>
      </FormFooter>
    </FormShell>
  );
}

function WalletModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="资金操作"
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={16} />
        </button>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>,
    document.body,
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
    <FormShell title="调整预算" detail="设置生活费目标和补足生活费后的收入分配比例" icon={<Settings2 size={18} />}>
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
              % · 自由 {100 - savingsPercent}%
            </span>
          </div>
          <input id="settings-savings-rate" type="range" min="0" max="100" step="5" value={savingsPercent} onChange={(event) => setSavingsPercent(Number(event.target.value))} className="mt-4 w-full accent-[var(--gold-deep)]" />
          <div className="mt-1 flex justify-between text-xs text-[var(--fg-muted)]"><span>全部自由</span><span>全部储蓄</span></div>
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
          <div className="flex items-center justify-between gap-3"><Label htmlFor="initial-rate">剩余收入分配</Label><span className="font-mono text-sm font-bold">储蓄 {savingsPercent}% · 自由 {100 - savingsPercent}%</span></div>
          <input id="initial-rate" type="range" min="0" max="100" step="5" value={savingsPercent} onChange={(event) => setSavingsPercent(Number(event.target.value))} className="mt-3 w-full accent-[var(--gold-deep)]" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div><h2 className="font-display text-base text-[var(--fg-strong)]">初始资金分配</h2><p className="mt-1 text-xs text-[var(--fg-muted)]">三个池子的合计必须等于可分配总额</p></div>
        <Button variant="outline" size="sm" onClick={autoAllocate}>按规则分配</Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="生活费池" htmlFor="initial-living"><Input id="initial-living" inputMode="decimal" value={living} onChange={(event) => setLiving(event.target.value)} /></Field>
        <Field label="储蓄池" htmlFor="initial-savings"><Input id="initial-savings" inputMode="decimal" value={savings} onChange={(event) => setSavings(event.target.value)} /></Field>
        <Field label="自由池" htmlFor="initial-flexible"><Input id="initial-flexible" inputMode="decimal" value={flexible} onChange={(event) => setFlexible(event.target.value)} /></Field>
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
  );
}

function RolloverNotice({ data }: { data: AssetsSnapshotDTO }) {
  const rollover = useRolloverWallet();
  const livingBalance = getPool(data, "living").balanceCents;
  const submit = () => {
    if (confirm(`将上月生活费结余 ${formatMoney(livingBalance)} 转入自由池？`)) rollover.mutate();
  };
  return (
    <>
      <div className="flex items-start gap-3">
        <CircleAlert size={18} className="mt-0.5 shrink-0 text-[var(--warning)]" />
        <div>
          <h2 className="font-display text-sm text-[var(--fg-strong)]">请处理上月生活费结余</h2>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            默认将 {formatMoney(livingBalance)} 转入自由池，完成后再开始本月记账。
          </p>
        </div>
      </div>
      <Button variant="secondary" onClick={submit} disabled={rollover.isPending}>
        结转到自由池
      </Button>
      {rollover.error ? <span className="text-xs text-[var(--danger)]">{rollover.error.message}</span> : null}
    </>
  );
}

function FormShell({ title, detail, icon, children }: { title: string; detail: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 border-b border-[var(--gold)]/35 pb-3 pr-10">
        <span className="mt-0.5 text-[var(--gold-deep)]">{icon}</span>
        <div>
          <h2 className="font-display text-base text-[var(--fg-strong)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">{detail}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function FormFooter({ error, success, children }: { error?: string; success?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {error ? <span className="text-sm text-[var(--danger)]">{error}</span> : null}
        {!error && success ? <span className="text-sm text-[var(--success)]">{success}</span> : null}
      </div>
      {children}
    </div>
  );
}

function WarningBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border border-[var(--warning)]/55 bg-[var(--warning)]/10 px-3 py-3 text-[var(--fg-strong)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <CircleAlert size={17} className="mt-0.5 shrink-0 text-[var(--warning)]" />
        <div className="contents">{children}</div>
      </div>
    </div>
  );
}

function AllocationRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <strong className="font-mono text-[var(--fg-strong)]">{formatMoney(value)}</strong>
    </div>
  );
}

function AllocationInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 py-2 text-sm">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <Input
        aria-label={`${label}分配金额`}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-right font-mono"
      />
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 border px-3 text-sm transition-colors ${
        active
          ? "border-[var(--gold)] bg-[var(--gold-tint)] text-[var(--gold-deep)]"
          : "border-[var(--border)] bg-white text-[var(--fg-muted)] hover:border-[var(--gold)]"
      }`}
    >
      {children}
    </button>
  );
}

function PoolOptions() {
  return (
    <>
      {POOL_ORDER.map((type) => (
        <option key={type} value={type}>
          {POOL_META[type].label}
        </option>
      ))}
    </>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="mt-4 border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
      {message}
    </div>
  );
}

function PageMessage({ title, detail, danger = false }: { title: string; detail: string; danger?: boolean }) {
  return (
    <div className={styles.message}>
      <Landmark size={28} className={danger ? "mx-auto text-[var(--danger)]" : "mx-auto text-[var(--gold-deep)]"} />
      <h1>{title}</h1>
      <p>{detail}</p>
    </div>
  );
}

function getPool(data: AssetsSnapshotDTO, type: WalletPoolType): WalletPoolDTO {
  return (
    data.pools.find((pool) => pool.type === type) ?? {
      id: type,
      type,
      balanceCents: 0,
      currencyCode: "CNY",
      createdAt: "",
    }
  );
}

function toggleAction(current: WalletAction, next: Exclude<WalletAction, null>): WalletAction {
  return current === next ? null : next;
}

function poolTargetCents(data: AssetsSnapshotDTO, type: WalletPoolType) {
  const pool = getPool(data, type);
  if (type === "living") {
    return Math.max(data.plan.livingTargetCents, pool.balanceCents);
  }
  if (type === "savings") {
    const rate = data.plan.savingsRateBps / 10000;
    const inferred = Math.round(data.plan.livingTargetCents * Math.max(rate, 0.2) * 2.5);
    return Math.max(pool.balanceCents, roundUpNice(inferred || pool.balanceCents * 1.15));
  }
  const rate = data.plan.flexibleRateBps / 10000;
  const inferred = Math.round(data.plan.livingTargetCents * Math.max(rate, 0.2) * 1.8);
  return Math.max(pool.balanceCents, roundUpNice(inferred || pool.balanceCents * 1.15));
}

function roundUpNice(cents: number) {
  if (cents <= 0) return 100000;
  const yuan = cents / 100;
  const step = yuan >= 10000 ? 1000 : yuan >= 1000 ? 500 : 100;
  return Math.ceil(yuan / step) * step * 100;
}

function deriveBookkeepingStats(transactions: WalletTransactionDTO[], month: string) {
  const days = new Set(transactions.map((tx) => dateToYMD(tx.occurredAt)));
  const monthCount = transactions.filter((tx) => dateToYMD(tx.occurredAt).startsWith(month)).length;
  const streakDays = computeStreak(days);
  return {
    bookkeepingDays: days.size,
    streakDays,
    monthCount,
  };
}

function computeStreak(days: Set<string>) {
  if (days.size === 0) return 0;
  const cursor = new Date();
  const today = dateToYMD(cursor.toISOString());
  if (!days.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const key = dateToYMD(cursor.toISOString());
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function deriveFinanceLevel(bookkeepingDays: number, monthCount: number, totalCents: number) {
  const totalXp =
    bookkeepingDays * 35 + monthCount * 20 + Math.min(600, Math.floor(totalCents / 8000));
  const perLevel = 1200;
  const level = Math.max(1, Math.min(99, Math.floor(totalXp / perLevel) + 1));
  const xp = totalXp % perLevel;
  return { level, xp, next: perLevel, progress: xp / perLevel };
}

function deriveFinanceStyle(data: AssetsSnapshotDTO) {
  const total = Math.max(1, data.summary.totalBalanceCents);
  const savingsShare = getPool(data, "savings").balanceCents / total;
  const flexibleShare = getPool(data, "flexible").balanceCents / total;
  if (savingsShare >= 0.4) {
    return {
      label: "稳健储蓄型",
      description: "优先沉淀长期资金，适合稳步推进目标与抗风险。",
    };
  }
  if (flexibleShare >= 0.35) {
    return {
      label: "灵活支配型",
      description: "保留充足自由资金，兼顾生活乐趣与机动开支。",
    };
  }
  return {
    label: "均衡规划型",
    description: "生活费、储蓄与自由资金比例均衡，节奏稳健。",
  };
}

function buildFinanceGoals(
  data: AssetsSnapshotDTO,
  goals: GoalDTO[],
  localGoals: FinanceGoal[],
  hiddenIds: string[],
): FinanceGoal[] {
  const hidden = new Set(hiddenIds);
  const living = getPool(data, "living");
  const savings = getPool(data, "savings");
  const livingGoal: FinanceGoal = {
    id: "living-target",
    name: "本月生活费目标",
    currentCents: Math.min(living.balanceCents, data.plan.livingTargetCents),
    targetCents: Math.max(data.plan.livingTargetCents, 1),
    removable: true,
  };
  const savingsGoal: FinanceGoal = {
    id: "savings-target",
    name: "储蓄池达成",
    currentCents: savings.balanceCents,
    targetCents: poolTargetCents(data, "savings"),
    removable: true,
  };

  const wealthGoals = goals
    .filter((goal) => goal.status === "active" && (goal.area?.name?.includes("财富") || goal.area?.icon === "💰"))
    .slice(0, 1)
    .map((goal) => {
      const kr = goal.keyResults[0];
      const target = Math.max(1, Math.round((kr?.target ?? 1) * 100));
      const current = Math.max(0, Math.round((kr?.current ?? 0) * 100));
      return {
        id: goal.id,
        name: goal.objective,
        currentCents: current,
        targetCents: target,
        removable: true,
      } satisfies FinanceGoal;
    });

  const locals = localGoals.map((goal) => ({ ...goal, removable: true }));
  return [livingGoal, savingsGoal, ...wealthGoals, ...locals]
    .filter((goal) => !hidden.has(goal.id))
    .slice(0, 6);
}

function addFinanceGoal(current: FinanceGoal[]) {
  const next: FinanceGoal = {
    id: `local-${Date.now()}`,
    name: "新财务目标",
    currentCents: 0,
    targetCents: 100000,
    removable: true,
  };
  return [...current, next].slice(-6);
}

function readFinanceGoals(): FinanceGoal[] {
  try {
    const raw = window.localStorage.getItem(FINANCE_GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FinanceGoal[];
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeFinanceGoals(goals: FinanceGoal[]) {
  try {
    window.localStorage.setItem(FINANCE_GOALS_KEY, JSON.stringify(goals.slice(0, 6)));
  } catch {
    // ignore
  }
}

function readHiddenFinanceGoalIds(): string[] {
  try {
    const raw = window.localStorage.getItem(FINANCE_GOALS_HIDDEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeHiddenFinanceGoalIds(ids: string[]) {
  try {
    window.localStorage.setItem(FINANCE_GOALS_HIDDEN_KEY, JSON.stringify(ids.slice(0, 20)));
  } catch {
    // ignore
  }
}

function buildExpenseDistribution(transactions: WalletTransactionDTO[], mode: DistMode) {
  const expenses = transactions.filter((tx) => tx.type === "expense");
  if (mode === "pool") {
    const buckets: Record<WalletPoolType, number> = { living: 0, savings: 0, flexible: 0 };
    for (const tx of expenses) {
      const type = tx.sourcePoolType ?? "living";
      buckets[type] += tx.amountCents;
    }
    return POOL_ORDER
      .filter((type) => buckets[type] > 0)
      .map((type) => ({
        key: type,
        label: POOL_META[type].label,
        cents: buckets[type],
        color: type === "savings" ? "#249d6d" : type === "flexible" ? "#c9a227" : "#5b9ec9",
      }));
  }

  let essential = 0;
  let optional = 0;
  for (const tx of expenses) {
    if (tx.necessity === "optional") optional += tx.amountCents;
    else essential += tx.amountCents;
  }
  return [
    essential > 0
      ? { key: "essential", label: "必须支出", cents: essential, color: "#5b9ec9" }
      : null,
    optional > 0
      ? { key: "optional", label: "非必须支出", cents: optional, color: "#c9a227" }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; cents: number; color: string }>;
}

function primaryPoolType(transaction: WalletTransactionDTO): WalletPoolType | null {
  if (transaction.sourcePoolType) return transaction.sourcePoolType;
  if (transaction.targetPoolType) return transaction.targetPoolType;
  const positive = transaction.allocations.find((item) => item.amountCents > 0);
  return positive?.pool.type ?? null;
}

function transactionCategory(transaction: WalletTransactionDTO) {
  if (transaction.type === "income") return "收入入账";
  if (transaction.type === "refund") return "退款";
  if (transaction.type === "transfer") return "池间划转";
  return transaction.necessity === "optional" ? "非必须支出" : "必须支出";
}

function transactionIcon(transaction: WalletTransactionDTO) {
  if (transaction.type === "income") return <ArrowDownToLine size={16} />;
  if (transaction.type === "transfer") return <ArrowLeftRight size={16} />;
  if (transaction.type === "refund") return <RotateCcw size={16} />;
  if (transaction.necessity === "optional") return <Sparkles size={16} />;
  return <ShoppingBasket size={16} />;
}

function transactionTitle(transaction: WalletTransactionDTO) {
  if (transaction.type === "income") return "收入";
  if (transaction.type === "refund") return "退款";
  if (transaction.type === "expense") {
    return transaction.necessity === "essential" ? "必须支出" : "非必须支出";
  }
  return "资金池调整";
}

function formatTransactionAmount(transaction: WalletTransactionDTO) {
  const sign =
    transaction.type === "income" || transaction.type === "refund"
      ? "+"
      : transaction.type === "expense"
        ? "-"
        : "";
  return `${sign}${formatPlain(transaction.amountCents)}`;
}

function formatTxTime(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatPlain(cents: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatRate(rateBps: number) {
  return `${rateBps / 100}%`;
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
