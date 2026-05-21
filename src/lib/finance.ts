import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { kind: "income", name: "工资", color: "#4c8a74", order: 10 },
  { kind: "income", name: "副业", color: "#3a6b8e", order: 20 },
  { kind: "income", name: "退款", color: "#8a6820", order: 30 },
  { kind: "expense", name: "餐饮", color: "#c5554a", order: 10, monthlyBudgetCents: 180000 },
  { kind: "expense", name: "交通", color: "#3a6b8e", order: 20, monthlyBudgetCents: 50000 },
  { kind: "expense", name: "学习", color: "#4c8a74", order: 30, monthlyBudgetCents: 100000 },
  { kind: "expense", name: "娱乐", color: "#9b6bc1", order: 40, monthlyBudgetCents: 80000 },
  { kind: "expense", name: "健康", color: "#c76d95", order: 50, monthlyBudgetCents: 80000 },
  { kind: "expense", name: "购物", color: "#b68838", order: 60, monthlyBudgetCents: 150000 },
  { kind: "expense", name: "居住", color: "#6b6458", order: 70, monthlyBudgetCents: 0 },
  { kind: "expense", name: "其他", color: "#9a8f7f", order: 90, monthlyBudgetCents: 0 },
  { kind: "transfer", name: "账户转账", color: "#b68838", order: 10 },
  { kind: "transfer", name: "还款", color: "#3a6b8e", order: 20 },
] as const;

export async function ensureFinanceDefaults(userId: string) {
  await prisma.financeCategory.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      userId,
      kind: category.kind,
      name: category.name,
      color: category.color,
      order: category.order,
      monthlyBudgetCents: "monthlyBudgetCents" in category ? category.monthlyBudgetCents : 0,
    })),
    skipDuplicates: true,
  });
}

export function monthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export function parseTags(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function signedInitialBalance(type: string, cents: number) {
  if ((type === "credit" || type === "debt") && cents > 0) return -cents;
  return cents;
}
