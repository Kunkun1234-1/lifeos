/**
 * Equipment / 装备 — collectible cosmetic frames for the avatar pill.
 * Catalogued and seeded; users unlock via achievements / events / seed grants.
 */

export type FrameStyle = {
  /** CSS gradient stops for the outer ring */
  gradient: [string, string];
  /** Outer-ring stroke width in px */
  strokeWidth: number;
  /** Optional decorative ornament name */
  ornament?: "diamond" | "stars" | "wave" | "ring" | "spark";
  /** Optional CSS color for soft glow */
  glow?: string;
};

export const DEFAULT_FRAME_STYLE: FrameStyle = {
  gradient: ["#b68838", "#d4a94d"],
  strokeWidth: 2,
};

export function parseFrameStyle(raw: string): FrameStyle {
  try {
    const o = JSON.parse(raw) as Partial<FrameStyle>;
    return {
      gradient: Array.isArray(o.gradient) && o.gradient.length === 2
        ? [String(o.gradient[0]), String(o.gradient[1])]
        : DEFAULT_FRAME_STYLE.gradient,
      strokeWidth: typeof o.strokeWidth === "number" ? o.strokeWidth : DEFAULT_FRAME_STYLE.strokeWidth,
      ornament: o.ornament,
      glow: typeof o.glow === "string" ? o.glow : undefined,
    };
  } catch {
    return DEFAULT_FRAME_STYLE;
  }
}

export const TIER_RANK: Record<string, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};
