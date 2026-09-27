export const FINANCE_GOALS_KEY = "life-game-finance-goals";
export const FINANCE_GOALS_HIDDEN_KEY = "life-game-finance-goals-hidden";

export function clearFinanceGoals() {
  try {
    window.localStorage.removeItem(FINANCE_GOALS_KEY);
    window.localStorage.removeItem(FINANCE_GOALS_HIDDEN_KEY);
    return true;
  } catch {
    return false;
  }
}
