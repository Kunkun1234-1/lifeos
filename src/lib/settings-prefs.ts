export type ThemeColorKey = "green" | "blue" | "purple" | "yellow" | "pink";
export type TaskPriorityKey = "low" | "medium" | "high";

export type SettingsPrefs = {
  appearance: {
    color: ThemeColorKey;
  };
  tasks: {
    defaultPriority: TaskPriorityKey;
  };
};

export const SETTINGS_PREFS_KEY = "life-game-settings-prefs-v1";

export const THEME_COLORS: Array<{
  key: ThemeColorKey;
  color: string;
  label: string;
}> = [
  { key: "green", color: "#249d6d", label: "翠绿" },
  { key: "blue", color: "#3b82c4", label: "晴蓝" },
  { key: "purple", color: "#8b6bb8", label: "暮紫" },
  { key: "yellow", color: "#b9ca31", label: "金翠" },
  { key: "pink", color: "#d4788a", label: "桃粉" },
];

export const THEME_LABELS: Record<ThemeColorKey, string> = {
  green: "金翠清新",
  blue: "晴空蓝",
  purple: "暮色紫",
  yellow: "鎏金翠",
  pink: "柔桃粉",
};

/** Shell CSS token sets keyed by accent swatch. */
export const THEME_TOKENS: Record<
  ThemeColorKey,
  {
    accent: string;
    accentStrong: string;
    accentGlow: string;
    accentStrongRgb: string;
    panelInk: string;
    gold: string;
    goldDeep: string;
    goldBright: string;
    goldPale: string;
    borderStrong: string;
    success: string;
  }
> = {
  green: {
    accent: "#249d6d",
    accentStrong: "#096149",
    accentGlow: "rgba(36, 157, 109, 0.22)",
    accentStrongRgb: "9, 97, 73",
    panelInk: "#063b2f",
    gold: "#b9ca31",
    goldDeep: "#668b27",
    goldBright: "#dce93d",
    goldPale: "#edf38b",
    borderStrong: "#9eb764",
    success: "#249d6d",
  },
  blue: {
    accent: "#3b82c4",
    accentStrong: "#1e4f7a",
    accentGlow: "rgba(59, 130, 196, 0.22)",
    accentStrongRgb: "30, 79, 122",
    panelInk: "#0f2a45",
    gold: "#7ec8e3",
    goldDeep: "#3a7ea0",
    goldBright: "#b8e4f5",
    goldPale: "#dff3fa",
    borderStrong: "#6aa3c9",
    success: "#3b82c4",
  },
  purple: {
    accent: "#8b6bb8",
    accentStrong: "#5a3f7a",
    accentGlow: "rgba(139, 107, 184, 0.22)",
    accentStrongRgb: "90, 63, 122",
    panelInk: "#2a1a3d",
    gold: "#c4a3e0",
    goldDeep: "#7a5a9e",
    goldBright: "#e4d0f5",
    goldPale: "#f3e9fb",
    borderStrong: "#a88bc9",
    success: "#8b6bb8",
  },
  yellow: {
    accent: "#8faa28",
    accentStrong: "#5a7018",
    accentGlow: "rgba(185, 202, 49, 0.28)",
    accentStrongRgb: "90, 112, 24",
    panelInk: "#2f3a12",
    gold: "#b9ca31",
    goldDeep: "#668b27",
    goldBright: "#dce93d",
    goldPale: "#edf38b",
    borderStrong: "#9eb764",
    success: "#8faa28",
  },
  pink: {
    accent: "#d4788a",
    accentStrong: "#9a4458",
    accentGlow: "rgba(212, 120, 138, 0.22)",
    accentStrongRgb: "154, 68, 88",
    panelInk: "#3d1f28",
    gold: "#e8a0ad",
    goldDeep: "#b05a6c",
    goldBright: "#f5c8d0",
    goldPale: "#fce8ec",
    borderStrong: "#d49aaa",
    success: "#d4788a",
  },
};

export const DEFAULT_SETTINGS_PREFS: SettingsPrefs = {
  appearance: { color: "green" },
  tasks: { defaultPriority: "medium" },
};

export function loadSettingsPrefs(): SettingsPrefs {
  if (typeof window === "undefined") {
    return structuredClone(DEFAULT_SETTINGS_PREFS);
  }
  try {
    const raw = localStorage.getItem(SETTINGS_PREFS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS_PREFS);
    const parsed = JSON.parse(raw) as {
      appearance?: { color?: string };
      tasks?: { defaultPriority?: string };
    };
    const color = parsed.appearance?.color;
    const priority = parsed.tasks?.defaultPriority;
    return {
      appearance: {
        color: isThemeColorKey(color) ? color : DEFAULT_SETTINGS_PREFS.appearance.color,
      },
      tasks: {
        defaultPriority: isTaskPriorityKey(priority)
          ? priority
          : DEFAULT_SETTINGS_PREFS.tasks.defaultPriority,
      },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS_PREFS);
  }
}

export function saveSettingsPrefs(prefs: SettingsPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(prefs));
}

/** Task API: 1 = high, 2 = medium, 3 = low. */
export function priorityKeyToNumber(key: TaskPriorityKey): number {
  if (key === "high") return 1;
  if (key === "low") return 3;
  return 2;
}

export function defaultTaskPriorityNumber(): number {
  return priorityKeyToNumber(loadSettingsPrefs().tasks.defaultPriority);
}

export function applyThemeAccent(color: ThemeColorKey, root?: HTMLElement | null) {
  const el =
    root ??
    (typeof document !== "undefined"
      ? document.querySelector<HTMLElement>("[data-life-game-shell]")
      : null);
  if (!el) return;
  const tokens = THEME_TOKENS[color];
  el.style.setProperty("--accent", tokens.accent);
  el.style.setProperty("--accent-strong", tokens.accentStrong);
  el.style.setProperty("--accent-glow", tokens.accentGlow);
  el.style.setProperty("--accent-strong-rgb", tokens.accentStrongRgb);
  el.style.setProperty("--bg-panel-ink", tokens.panelInk);
  el.style.setProperty("--gold", tokens.gold);
  el.style.setProperty("--gold-deep", tokens.goldDeep);
  el.style.setProperty("--gold-bright", tokens.goldBright);
  el.style.setProperty("--gold-pale", tokens.goldPale);
  el.style.setProperty("--border-strong", tokens.borderStrong);
  el.style.setProperty("--success", tokens.success);
  el.dataset.themeColor = color;
}

function isThemeColorKey(value: unknown): value is ThemeColorKey {
  return (
    value === "green" ||
    value === "blue" ||
    value === "purple" ||
    value === "yellow" ||
    value === "pink"
  );
}

function isTaskPriorityKey(value: unknown): value is TaskPriorityKey {
  return value === "low" || value === "medium" || value === "high";
}
