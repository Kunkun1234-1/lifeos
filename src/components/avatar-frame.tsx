"use client";

import { useId } from "react";
import Image from "next/image";

export type AvatarFrameStyle = {
  gradient: [string, string];
  strokeWidth: number;
  ornament?: "diamond" | "stars" | "wave" | "ring" | "spark";
  glow?: string;
};

const DEFAULT_STYLE: AvatarFrameStyle = {
  gradient: ["#b68838", "#d4a94d"],
  strokeWidth: 1,
};

/**
 * Avatar with optional decorative frame ring + ornament.
 * Used in TopNav and /equipment preview.
 */
export function AvatarFrame({
  src = "/lifeos/profile_avatar.png",
  size = 36,
  style,
  alt = "avatar",
}: {
  src?: string;
  size?: number;
  style?: AvatarFrameStyle | null;
  alt?: string;
}) {
  const s = style ?? DEFAULT_STYLE;
  const padding = Math.max(2, s.strokeWidth + 1);
  const outer = size + padding * 2;
  // useId guarantees a stable, per-instance id so multiple frames on the same
  // page (TopNav + equipped panel + grid card) don't collide on `<linearGradient>` IDs.
  const reactId = useId();
  const id = `frame-${reactId.replace(/[:]/g, "")}`;
  const ornamentEls = renderOrnament(s.ornament, outer);

  return (
    <div
      className="relative shrink-0"
      style={{ width: outer, height: outer }}
      aria-label={alt}
    >
      {/* Glow halo */}
      {s.glow && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 ${Math.max(6, s.strokeWidth * 4)}px ${s.glow}88, 0 0 0 1px ${s.glow}33`,
          }}
        />
      )}

      <svg
        width={outer}
        height={outer}
        viewBox={`0 0 ${outer} ${outer}`}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={s.gradient[0]} />
            <stop offset="100%" stopColor={s.gradient[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={outer / 2 - s.strokeWidth / 2}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={s.strokeWidth}
        />
        {ornamentEls}
      </svg>

      <div
        className="absolute overflow-hidden rounded-full bg-[var(--bg-card)]"
        style={{
          top: padding,
          left: padding,
          width: size,
          height: size,
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          priority
        />
      </div>
    </div>
  );
}

function renderOrnament(kind: AvatarFrameStyle["ornament"], outer: number) {
  if (!kind) return null;
  const cx = outer / 2;
  const cy = outer / 2;
  const r = outer / 2;
  const color = "currentColor";
  switch (kind) {
    case "diamond":
      return (
        <g fill={color} opacity={0.85}>
          <polygon points={`${cx},${cy - r + 1} ${cx + 3},${cy - r + 4} ${cx},${cy - r + 7} ${cx - 3},${cy - r + 4}`} />
          <polygon points={`${cx},${cy + r - 1} ${cx + 3},${cy + r - 4} ${cx},${cy + r - 7} ${cx - 3},${cy + r - 4}`} />
        </g>
      );
    case "stars":
      return (
        <g fill={color} opacity={0.7}>
          <circle cx={cx} cy={cy - r + 2} r={1.4} />
          <circle cx={cx + r - 2} cy={cy} r={1.4} />
          <circle cx={cx} cy={cy + r - 2} r={1.4} />
          <circle cx={cx - r + 2} cy={cy} r={1.4} />
        </g>
      );
    case "ring":
      return (
        <circle
          cx={cx}
          cy={cy}
          r={r - 4}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          strokeDasharray="2,2"
          opacity={0.6}
        />
      );
    case "spark":
      return (
        <g fill={color} opacity={0.9}>
          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1={cx}
              y1={cy - r + 1}
              x2={cx}
              y2={cy - r + 5}
              stroke={color}
              strokeWidth={1.2}
              transform={`rotate(${deg} ${cx} ${cy})`}
            />
          ))}
        </g>
      );
    case "wave":
      return (
        <path
          d={`M ${cx - r * 0.6} ${cy + r - 3} q ${r * 0.3} -3, ${r * 0.6} 0 q ${r * 0.3} 3, ${r * 0.6} 0`}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          opacity={0.7}
        />
      );
  }
}
