"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetcher";
import { todayYMD, addDaysYMD } from "@/lib/date";
import type {
  UserSnapshot,
  AreaDTO,
  TaskDTO,
  HabitDTO,
  RoutineDTO,
  CommissionsTodayDTO,
  ReviewDTO,
  RewardResult,
  GoalDTO,
  ProjectDTO,
  RewardItemDTO,
  AchievementDTO,
  GachaState,
  GachaPullResult,
  FreezeState,
  BPSnapshot,
  BPLevelReward,
  PrincipleDTO,
  DecisionDTO,
  TitlesSnapshot,
  NoteDTO,
  EventSnapshotDTO,
  EquipmentSnapshotDTO,
  AssetsSnapshotDTO,
  FinanceAccountDTO,
  FinanceTransactionDTO,
} from "@/lib/types";
import { useRewardsStore } from "@/stores/rewards";

export const qk = {
  user: ["user"] as const,
  areas: ["areas"] as const,
  tasks: (status?: string) => ["tasks", { status }] as const,
  habits: ["habits"] as const,
  routines: ["routines"] as const,
  commissions: ["commissions", "today"] as const,
  reviews: (kind?: string) => ["reviews", { kind }] as const,
  goals: ["goals"] as const,
  projects: (status?: string) => ["projects", { status }] as const,
  rewards: ["rewards"] as const,
  achievements: ["achievements"] as const,
  gacha: ["gacha"] as const,
  freeze: ["freeze"] as const,
  battlepass: ["battlepass"] as const,
  principles: (archived?: boolean) => ["principles", { archived }] as const,
  decisions: (status?: string) => ["decisions", { status }] as const,
  titles: ["titles"] as const,
  resin: ["resin"] as const,
  notes: (filters?: Record<string, string | undefined>) => ["notes", filters ?? {}] as const,
  events: ["events"] as const,
  equipment: ["equipment"] as const,
  assets: ["assets"] as const,
};

// ---------- queries ----------
export const useUser = () =>
  useQuery({ queryKey: qk.user, queryFn: () => api<UserSnapshot>("/api/user") });

export const useAreas = () =>
  useQuery({ queryKey: qk.areas, queryFn: () => api<AreaDTO[]>("/api/areas") });

export const useTasks = (status?: string) =>
  useQuery({
    queryKey: qk.tasks(status),
    queryFn: () => api<TaskDTO[]>(`/api/tasks${status ? `?status=${status}` : ""}`),
  });

export const useHabits = () =>
  useQuery({ queryKey: qk.habits, queryFn: () => api<HabitDTO[]>("/api/habits") });

export const useRoutines = () =>
  useQuery({ queryKey: qk.routines, queryFn: () => api<RoutineDTO[]>("/api/routines") });

export const useCommissions = () =>
  useQuery({
    queryKey: qk.commissions,
    queryFn: () => api<CommissionsTodayDTO>("/api/commissions/today"),
    staleTime: 30_000,
  });

export const useReviews = (kind?: string) =>
  useQuery({
    queryKey: qk.reviews(kind),
    queryFn: () => api<ReviewDTO[]>(`/api/review${kind ? `?kind=${kind}` : ""}`),
  });

// ---------- mutations ----------

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api("/api/user", { method: "PATCH", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.user }),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<TaskDTO>("/api/tasks", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.commissions });
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (id: string) =>
      api<{ task: TaskDTO; reward: RewardResult }>(`/api/tasks/${id}/complete`, {
        method: "POST",
      }),
    // Optimistic: flip the row to DONE in every cached tasks list before
    // the server confirms. Eliminates the visible Neon-roundtrip stall
    // (the user's "5-7s wait after clicking complete" pain).
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = qc.getQueriesData<TaskDTO[]>({ queryKey: ["tasks"] });
      qc.setQueriesData<TaskDTO[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, status: "DONE" as const, completedAt: new Date().toISOString() }
            : t,
        ),
      );
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      // Rollback every snapshot we took
      if (context?.snapshots) {
        for (const [key, value] of context.snapshots) {
          qc.setQueryData(key, value);
        }
      }
    },
    onSuccess: (data) => {
      push({
        xp: data.reward.xpGranted,
        gold: data.reward.goldGranted,
        gems: 0,
        fate: 0,
        areaKey: data.reward.areaKey,
        label: "Task done",
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.areas });
      qc.invalidateQueries({ queryKey: qk.commissions });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api<TaskDTO>(`/api/tasks/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.commissions });
    },
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<HabitDTO>("/api/habits", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.commissions });
    },
  });
}

export function useTickHabit() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "+" | "-" }) =>
      api<{ habit: HabitDTO; reward: RewardResult }>(`/api/habits/${id}/tick`, {
        method: "POST",
        json: { direction },
      }),
    // Optimistic: bump positive/negative count immediately so repeated taps
    // feel responsive on the habits list.
    onMutate: async ({ id, direction }) => {
      await qc.cancelQueries({ queryKey: qk.habits });
      const snapshot = qc.getQueryData<HabitDTO[]>(qk.habits);
      qc.setQueryData<HabitDTO[]>(qk.habits, (old) =>
        old?.map((h) =>
          h.id === id
            ? {
                ...h,
                positiveCount:
                  direction === "+" ? h.positiveCount + 1 : h.positiveCount,
                negativeCount:
                  direction === "-" ? h.negativeCount + 1 : h.negativeCount,
              }
            : h,
        ),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(qk.habits, ctx.snapshot);
    },
    onSuccess: (data, vars) => {
      if (vars.direction === "+") {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: 0,
          fate: 0,
          areaKey: data.reward.areaKey,
          label: "Habit +",
        });
      } else {
        push({
          xp: -data.habit.xpPerTick,
          gold: -data.habit.goldPerTick,
          gems: 0,
          fate: 0,
          areaKey: data.reward.areaKey,
          label: "Habit −",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.areas });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/habits/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.habits }),
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<RoutineDTO>("/api/routines", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.routines });
      qc.invalidateQueries({ queryKey: qk.commissions });
    },
  });
}

export function useCompleteRoutine() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (id: string) =>
      api<{ routine: RoutineDTO; reward: RewardResult; streak: number }>(
        `/api/routines/${id}/complete`,
        { method: "POST" }
      ),
    // Optimistic: replicate the server's streak math so the row flips to
    // "done today" + streak+1 instantly, instead of waiting on the
    // round-trip.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.routines });
      const snapshot = qc.getQueryData<RoutineDTO[]>(qk.routines);
      const today = todayYMD();
      const yesterday = addDaysYMD(today, -1);
      qc.setQueryData<RoutineDTO[]>(qk.routines, (old) =>
        old?.map((r) => {
          if (r.id !== id || r.completedToday) return r;
          const newStreak =
            r.lastCompletedDate === yesterday ? r.streakCurrent + 1 : 1;
          return {
            ...r,
            streakCurrent: newStreak,
            streakBest: Math.max(r.streakBest, newStreak),
            lastCompletedDate: today,
            completedToday: true,
          };
        }),
      );
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(qk.routines, ctx.snapshot);
    },
    onSuccess: (data) => {
      push({
        xp: data.reward.xpGranted,
        gold: data.reward.goldGranted,
        gems: 0,
        fate: 0,
        areaKey: data.reward.areaKey,
        label: `Routine · streak ${data.streak}`,
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.routines });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.areas });
      qc.invalidateQueries({ queryKey: qk.commissions });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/routines/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.routines }),
  });
}

export function useCompleteCommission() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (itemId: string) =>
      api<{
        items: unknown;
        completedCount: number;
        bonusClaimed: boolean;
        reward: RewardResult;
        bonusReward: RewardResult | null;
        allDone: boolean;
      }>(`/api/commissions/complete`, {
        method: "POST",
        json: { itemId },
      }),
    // Optimistic: flip the item to done + recompute completedCount +
    // pre-claim the 4/4 bonus state so the schedule card responds
    // immediately. Reward toast still waits for the server confirm.
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: qk.commissions });
      const snapshot = qc.getQueryData<CommissionsTodayDTO>(qk.commissions);
      qc.setQueryData<CommissionsTodayDTO>(qk.commissions, (old) => {
        if (!old) return old;
        const nextItems = old.items.map((it) =>
          it.id === itemId ? { ...it, done: true } : it,
        );
        const completedCount = nextItems.filter((it) => it.done).length;
        const allDone =
          completedCount === nextItems.length && nextItems.length > 0;
        return {
          ...old,
          items: nextItems,
          completedCount,
          bonusClaimed: allDone ? true : old.bonusClaimed,
        };
      });
      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(qk.commissions, ctx.snapshot);
    },
    onSuccess: (data) => {
      push({
        xp: data.reward.xpGranted,
        gold: data.reward.goldGranted,
        gems: 0,
        fate: 0,
        areaKey: data.reward.areaKey,
        label: "Commission",
      });
      if (data.bonusReward) {
        push({
          xp: data.bonusReward.xpGranted,
          gold: data.bonusReward.goldGranted,
          gems: data.bonusReward.gemsGranted ?? 0,
          fate: data.bonusReward.fateGranted ?? 0,
          areaKey: null,
          label: "🎉 All 4 Complete!",
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.commissions });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.areas });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.routines });
    },
  });
}

export function useRegenerateCommissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/commissions/today", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.commissions }),
  });
}

// ---------- Phase 2/3 ----------

export const useGoals = () =>
  useQuery({ queryKey: qk.goals, queryFn: () => api<GoalDTO[]>("/api/goals") });

export const useProjects = (status?: string) =>
  useQuery({
    queryKey: qk.projects(status),
    queryFn: () => api<ProjectDTO[]>(`/api/projects${status ? `?status=${status}` : ""}`),
  });

export const useRewards = () =>
  useQuery({ queryKey: qk.rewards, queryFn: () => api<RewardItemDTO[]>("/api/rewards") });

export const useAssets = () =>
  useQuery({ queryKey: qk.assets, queryFn: () => api<AssetsSnapshotDTO>("/api/assets") });

export function useCreateFinanceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<FinanceAccountDTO>("/api/assets/accounts", { method: "POST", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.assets }),
  });
}

export function useCreateFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<FinanceTransactionDTO>("/api/assets/transactions", { method: "POST", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.assets }),
  });
}

export function useDeleteFinanceTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/assets/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.assets }),
  });
}

export const useAchievements = () =>
  useQuery({ queryKey: qk.achievements, queryFn: () => api<AchievementDTO[]>("/api/achievements") });

export function useCreateCustomAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ id: string }>("/api/achievements/custom", { method: "POST", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.achievements }),
  });
}

export function useDeleteCustomAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/achievements/custom/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.achievements }),
  });
}

export function useUnlockAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/achievements/${id}/unlock`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.achievements });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}

export const useGacha = () =>
  useQuery({ queryKey: qk.gacha, queryFn: () => api<GachaState>("/api/gacha"), staleTime: 5_000 });

export const useFreeze = () =>
  useQuery({ queryKey: qk.freeze, queryFn: () => api<FreezeState>("/api/freeze") });

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<GoalDTO>("/api/goals", { method: "POST", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<{ goal: GoalDTO; reward: RewardResult | null }>(`/api/goals/${id}`, {
        method: "PATCH",
        json: body,
      }),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: data.reward.gemsGranted ?? 0,
          fate: data.reward.fateGranted ?? 0,
          areaKey: data.reward.areaKey,
          label: "🎯 Goal Done",
        });
      }
      qc.invalidateQueries({ queryKey: qk.goals });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.achievements });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}

export function useUpdateKR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, krId, body }: { goalId: string; krId: string; body: Record<string, unknown> }) =>
      api(`/api/goals/${goalId}/kr/${krId}`, { method: "PATCH", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.goals }),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<ProjectDTO>("/api/projects", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: qk.goals });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<{ project: ProjectDTO; reward: RewardResult | null }>(`/api/projects/${id}`, {
        method: "PATCH",
        json: body,
      }),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: data.reward.gemsGranted ?? 0,
          fate: data.reward.fateGranted ?? 0,
          areaKey: data.reward.areaKey,
          label: "🏗️ Project Done",
        });
      }
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.achievements });
      qc.invalidateQueries({ queryKey: qk.goals });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<RewardItemDTO>("/api/rewards", { method: "POST", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.gacha });
    },
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/rewards/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.gacha });
    },
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/rewards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.gacha });
    },
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (id: string) =>
      api<{ redemption: { id: string }; reward: RewardItemDTO }>(
        `/api/rewards/${id}/redeem`,
        { method: "POST" }
      ),
    onSuccess: (data) => {
      push({
        xp: 0,
        gold: -data.reward.costGold,
        gems: -data.reward.costGems,
        fate: 0,
        areaKey: null,
        label: `${data.reward.emoji} ${data.reward.name}`,
      });
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}

export function usePullGacha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (count: 1 | 10) =>
      api<GachaPullResult>("/api/gacha/pull", { method: "POST", json: { count } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.gacha });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.rewards });
    },
  });
}

export const useBattlePass = () =>
  useQuery({
    queryKey: qk.battlepass,
    queryFn: () => api<BPSnapshot>("/api/battlepass"),
    staleTime: 5_000,
  });

export function useClaimBPLevel() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (level: number) =>
      api<{ ok: true; reward: BPLevelReward; claimed: number[] }>(
        "/api/battlepass/claim",
        { method: "POST", json: { level } }
      ),
    onSuccess: (data) => {
      push({
        xp: 0,
        gold: data.reward.gold,
        gems: data.reward.gems,
        fate: data.reward.fate,
        areaKey: null,
        label: `🏆 BP Lv.${data.reward.level}`,
      });
      qc.invalidateQueries({ queryKey: qk.battlepass });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}

export function useBuyFreeze() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: () => api<{ stash: { count: number } }>("/api/freeze", { method: "POST" }),
    onSuccess: (data) => {
      push({ xp: 0, gold: -50, gems: 0, fate: 0, areaKey: null, label: "🧊 Streak Freeze ×1" });
      qc.invalidateQueries({ queryKey: qk.freeze });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ reward: RewardResult }>("/api/review", { method: "POST", json: body }),
    onSuccess: (data) => {
      push({
        xp: data.reward.xpGranted,
        gold: data.reward.goldGranted,
        gems: 0,
        fate: data.reward.fateGranted ?? 0,
        areaKey: null,
        label: "Daily Review 📝",
      });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}

// ---------- Phase 4: Principles + Decisions ----------

export const usePrinciples = (archived = false) =>
  useQuery({
    queryKey: qk.principles(archived),
    queryFn: () => api<PrincipleDTO[]>(`/api/principles${archived ? "?archived=1" : ""}`),
  });

export const useDecisions = (status?: string) =>
  useQuery({
    queryKey: qk.decisions(status),
    queryFn: () => api<DecisionDTO[]>(`/api/decisions${status ? `?status=${status}` : ""}`),
  });

export function useCreatePrinciple() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ principle: PrincipleDTO; reward: RewardResult }>("/api/principles", {
        method: "POST",
        json: body,
      }),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: 0,
          fate: 0,
          areaKey: null,
          label: "📜 Principle",
        });
      }
      qc.invalidateQueries({ queryKey: ["principles"] });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.achievements });
    },
  });
}

export function useUpdatePrinciple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/principles/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["principles"] }),
  });
}

export function useDeletePrinciple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/principles/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["principles"] }),
  });
}

export function useCreateDecision() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ decision: DecisionDTO; reward: RewardResult }>("/api/decisions", {
        method: "POST",
        json: body,
      }),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: 0,
          fate: 0,
          areaKey: data.reward.areaKey,
          label: "🧭 Decision logged",
        });
      }
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.achievements });
      qc.invalidateQueries({ queryKey: ["principles"] });
    },
  });
}

export function useUpdateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/decisions/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["principles"] });
    },
  });
}

export function useDeleteDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/decisions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });
}

export function useReviewDecision() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<{ decision: DecisionDTO; reward: RewardResult }>(
        `/api/decisions/${id}/review`,
        { method: "POST", json: body }
      ),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: data.reward.gemsGranted ?? 0,
          fate: data.reward.fateGranted ?? 0,
          areaKey: null,
          label: "🔍 Decision reviewed",
        });
      }
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.achievements });
      qc.invalidateQueries({ queryKey: qk.titles });
    },
  });
}

// ---------- Phase 3 收尾: Titles ----------

export const useTitles = () =>
  useQuery({
    queryKey: qk.titles,
    queryFn: () => api<TitlesSnapshot>("/api/titles"),
  });

export type ResinSnapshot = {
  current: number;
  max: number;
  isFull: boolean;
  msToNextRegen: number | null;
  msToFull: number | null;
  updatedAt: string;
  costs: { decisionCoach: number; weeklyCoach: number; monthlyReview: number; quarterlyReview: number };
};

export const useResin = () =>
  useQuery({
    queryKey: qk.resin,
    queryFn: () => api<ResinSnapshot>("/api/resin"),
    // Refetch every minute to keep the meter alive
    refetchInterval: 60_000,
  });

export type NoteFilters = {
  kind?: string;
  tag?: string;
  areaId?: string;
  projectId?: string;
  goalId?: string;
  q?: string;
  archived?: "1" | "0";
};

export const useNotes = (filters: NoteFilters = {}) =>
  useQuery({
    queryKey: qk.notes(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== "") params.set(k, v);
      }
      const qs = params.toString();
      return api<NoteDTO[]>(`/api/notes${qs ? `?${qs}` : ""}`);
    },
  });

export function useCreateNote() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ note: NoteDTO; reward: RewardResult }>("/api/notes", {
        method: "POST",
        json: body,
      }),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: 0,
          fate: 0,
          areaKey: data.reward.areaKey,
          label: "📓 Note",
        });
      }
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.achievements });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/api/notes/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

// ---------- Phase 3 收尾: Events ----------

export const useEvents = () =>
  useQuery({
    queryKey: qk.events,
    queryFn: () => api<EventSnapshotDTO[]>("/api/events"),
    refetchInterval: 60_000,
  });

export function useCreateCustomEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ id: string }>("/api/events/custom", { method: "POST", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

export function useDeleteCustomEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/events/custom/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

export function useClaimEventMission() {
  const qc = useQueryClient();
  const push = useRewardsStore((s) => s.push);
  return useMutation({
    mutationFn: ({ eventId, missionKey }: { eventId: string; missionKey: string }) =>
      api<{
        ok: true;
        reward: RewardResult;
        event: EventSnapshotDTO | null;
        unlockedEquipmentKey: string | null;
      }>(`/api/events/${eventId}/claim`, {
        method: "POST",
        json: { missionKey },
      }),
    onSuccess: (data) => {
      if (data.reward) {
        push({
          xp: data.reward.xpGranted,
          gold: data.reward.goldGranted,
          gems: data.reward.gemsGranted ?? 0,
          fate: data.reward.fateGranted ?? 0,
          areaKey: null,
          label: data.unlockedEquipmentKey
            ? "🎉 活动奖励 + 解锁相框"
            : "🎉 活动奖励",
        });
      }
      qc.invalidateQueries({ queryKey: qk.events });
      qc.invalidateQueries({ queryKey: qk.user });
      qc.invalidateQueries({ queryKey: qk.equipment });
      qc.invalidateQueries({ queryKey: qk.achievements });
    },
  });
}

// ---------- Equipment ----------

export const useEquipment = () =>
  useQuery({
    queryKey: qk.equipment,
    queryFn: () => api<EquipmentSnapshotDTO>("/api/equipment"),
  });

export function useEquipFrame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string | null) =>
      api<{ ok: true; equippedKey: string | null }>("/api/equipment/equip", {
        method: "POST",
        json: { key },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.equipment });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}

export function useEquipTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string | null) =>
      api<{ ok: true; equippedKey: string | null }>("/api/titles/equip", {
        method: "POST",
        json: { key },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.titles });
      qc.invalidateQueries({ queryKey: qk.user });
    },
  });
}
