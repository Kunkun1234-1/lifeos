"use client";

import Image from "next/image";
import { useUser, useAreas } from "@/hooks/queries";
import { deriveLevel } from "@/lib/gamification";
import { Heart, Smile, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Left profile — flat on parchment (no outer panel), matches final reference.
 * Header: 个人信息 INFORMATION with gold hairline
 * — avatar (gold ring) + name + star + age chip
 * — 3 meta rows (性别/生日/地区)
 * — 4 colored stat bars (健康/心情/精力/灵感)
 * — 人格特质 TRAITS radar (6 axes, labels + numbers)
 * — 人生信条 MOTTO block
 */
export function ProfilePanel() {
  const { data: user } = useUser();
  const { data: areas } = useAreas();

  const vitals = mapVitals(user?.xpByArea ?? {});
  const age = 18; // Phase 2: derive from user.dob

  return (
    <aside className="space-y-5 px-1">
      {/* Section heading */}
      <div>
        <div className="section-label">
          <span className="cn text-lg">个人信息</span>
          <span className="en text-[10px]">Information</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)]/80 via-[var(--gold)]/40 to-transparent" />
      </div>

      {/* Avatar + name */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {/* Gold compass ring */}
          <div className="absolute inset-0 -m-0.5 rounded-full border border-[var(--gold)]/40" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[var(--gold)]">
            <Sparkles size={10} />
          </div>
          <div className="relative h-[64px] w-[64px] overflow-hidden rounded-full border-2 border-[var(--gold)] shadow-[0_0_0_2px_var(--bg),inset_0_0_0_1px_rgba(255,255,255,0.4)]">
            <Image
              src="/lifeos/profile_avatar.png"
              alt="avatar"
              width={64}
              height={64}
              className="object-cover"
              priority
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[22px] font-bold leading-none text-[var(--fg-strong)]">
              {user?.name ?? "Player"}
            </span>
            <Sparkles size={14} className="text-[var(--gold)]" />
          </div>
          <div className="mt-1.5">
            <span className="inline-flex items-center rounded-sm border border-[var(--accent-strong)] bg-gradient-to-b from-[var(--accent)] to-[var(--accent-strong)] px-2 py-0.5 font-display text-[11px] font-bold text-white">
              {age}岁
            </span>
          </div>
          <div className="mt-2 space-y-0.5 font-display text-[12px] text-[var(--fg-muted)]">
            <MetaRow label="性别" value="男" />
            <MetaRow label="生日" value="07/15" />
            <MetaRow label="地区" value="蒙德城" />
          </div>
        </div>
      </div>

      {/* Stat bars */}
      <div className="space-y-2">
        {vitals.map((v) => (
          <StatBar key={v.key} vital={v} />
        ))}
      </div>

      {/* Gold divider */}
      <div className="divider-gold text-[10px] font-display-en tracking-[0.3em]">
        <span className="font-display text-[13px] font-bold tracking-[0.08em] text-[var(--fg-strong)]">
          人格特质
        </span>
        <span className="text-[9px]">TRAITS</span>
      </div>

      {/* Radar */}
      <div className="-mt-1">
        <RadarChart xp={user?.xpByArea ?? {}} />
      </div>

      {/* Motto */}
      <div className="divider-gold text-[10px] font-display-en tracking-[0.3em]">
        <span className="font-display text-[13px] font-bold tracking-[0.08em] text-[var(--fg-strong)]">
          人生信条
        </span>
        <span className="text-[9px]">MOTTO</span>
      </div>
      <blockquote className="relative pl-3 font-display text-[13px] leading-relaxed text-[var(--fg)]">
        <div className="absolute left-0 top-1 h-full w-0.5 bg-[var(--gold)]" />
        {user?.visionStatement ? (
          <>&ldquo;{user.visionStatement}&rdquo;</>
        ) : (
          <>
            &ldquo;旅途的意义不在于终点，
            <br />
            而在于沿途的选择与风景。&rdquo;
          </>
        )}
        {/* Decorative feather */}
        <div className="absolute -right-2 -bottom-2 text-[var(--gold)]/50">
          <Feather size={16} />
        </div>
      </blockquote>
    </aside>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-display-en text-[10px] tracking-[0.15em] text-[var(--fg-subtle)]">
        {label}:
      </span>
      <span className="font-mono text-[11px] text-[var(--fg)]">{value}</span>
    </div>
  );
}

type Vital = {
  key: string;
  cn: string;
  icon: React.ReactNode;
  value: number;
  color: string;
};

function mapVitals(xpByArea: Record<string, number>): Vital[] {
  const normalize = (xp: number) => {
    const { level, progress } = deriveLevel(xp);
    return Math.min(100, level * 10 + Math.round(progress * 10));
  };
  const withFloor = (n: number, floor: number) => Math.max(floor, n);
  return [
    { key: "STR", cn: "健康", icon: <Heart size={13} />,   value: withFloor(normalize(xpByArea.STR ?? 0),  86), color: "var(--attr-str)" },
    { key: "CHA", cn: "心情", icon: <Smile size={13} />,   value: withFloor(normalize(xpByArea.CHA ?? 0),  72), color: "#d9a23a" },
    { key: "WIS", cn: "精力", icon: <Zap size={13} />,     value: withFloor(normalize(xpByArea.WIS ?? 0),  68), color: "var(--attr-int)" },
    { key: "CRE", cn: "灵感", icon: <Sparkles size={13} />, value: withFloor(normalize(xpByArea.CRE ?? 0), 61), color: "var(--attr-cre)" },
  ];
}

function StatBar({ vital }: { vital: Vital }) {
  const { cn, icon, value, color } = vital;
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0" style={{ color }}>
        {icon}
      </span>
      <span className="w-9 shrink-0 font-display text-[13px] font-semibold text-[var(--fg-strong)]">
        {cn}
      </span>
      <div
        className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}CC, ${color})`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[11px] text-[var(--fg)]">
        {value}/100
      </span>
    </div>
  );
}

/** 6-axis personality radar */
function RadarChart({ xp }: { xp: Record<string, number> }) {
  const axes = [
    { key: "INT", label: "乐观", angle: -Math.PI / 2 },
    { key: "STR", label: "理性", angle: -Math.PI / 2 + Math.PI / 3 },
    { key: "CHA", label: "社交", angle: -Math.PI / 2 + (2 * Math.PI) / 3 },
    { key: "WIS", label: "自律", angle: -Math.PI / 2 + Math.PI },
    { key: "CRE", label: "创造", angle: -Math.PI / 2 + (4 * Math.PI) / 3 },
    { key: "GOLD", label: "勇气", angle: -Math.PI / 2 + (5 * Math.PI) / 3 },
  ];
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 78;
  const levels = 4;
  const minScores = [78, 72, 65, 80, 85, 88]; // reference display values

  const values = axes.map((a, i) => {
    const xpVal = xp[a.key] ?? 0;
    const { level } = deriveLevel(xpVal);
    const computed = Math.min(100, level * 10);
    return Math.max(computed, minScores[i]);
  });

  const point = (i: number, r: number) => {
    const { angle } = axes[i];
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const polyPoints = values
    .map((v, i) => point(i, (v / 100) * maxR).join(","))
    .join(" ");

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* concentric hexagons */}
        {Array.from({ length: levels }).map((_, l) => (
          <polygon
            key={l}
            points={axes.map((_, i) => point(i, (maxR * (l + 1)) / levels).join(",")).join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth={0.8}
            opacity={0.5}
          />
        ))}
        {/* spokes */}
        {axes.map((_, i) => {
          const [x, y] = point(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.8}
              opacity={0.5}
            />
          );
        })}
        {/* filled polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(42, 54, 72, 0.55)"
          stroke="var(--accent-strong)"
          strokeWidth={1.4}
        />
        {values.map((v, i) => {
          const [x, y] = point(i, (v / 100) * maxR);
          return <circle key={i} cx={x} cy={y} r={2.4} fill="var(--gold)" />;
        })}
      </svg>
      {axes.map((a, i) => {
        const [x, y] = point(i, maxR + 18);
        return (
          <div
            key={a.key}
            className="absolute flex flex-col items-center"
            style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
          >
            <div className="font-display text-[11px] font-bold text-[var(--fg-strong)]">
              {a.label}
            </div>
            <div className="font-mono text-[10px] text-[var(--fg)]">{values[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

function Feather({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M12 3 C 9 3 5 6 3 10 C 3 12 4 13 5 13 C 7 11 10 8 12 5 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M3 13 L 1 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
