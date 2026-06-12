"use client";

import Link from "next/link";
import Image from "next/image";
import { useDashboardData } from "@/components/dashboard-data";
import { useUser } from "@/hooks/queries";
import { Sparkles } from "lucide-react";

/**
 * Left profile — flat on parchment (no outer panel).
 * Six attributes match the project's 6 dimensions (per docs §4.1 + /help):
 *   STR→健康  INT→学习  CHA→关系  WIS→心智  CRE→创造  GOLD→财富
 * The radar renders cumulative `xpByArea` and links to /analytics.
 */
export function ProfilePanel() {
  const dashboard = useDashboardData();
  const { data: queryUser } = useUser({ enabled: !dashboard.active });
  const user = dashboard.data?.user ?? queryUser;
  const xpByArea = user?.xpByArea ?? {};

  const birthday = user?.birthday ? new Date(user.birthday) : null;
  const age = birthday ? deriveAge(birthday) : null;
  const birthdayLabel = birthday
    ? `${pad2(birthday.getMonth() + 1)}/${pad2(birthday.getDate())}`
    : null;
  const avatarSrc = user ? user.avatarUrl || "/lifeos/profile_avatar.png" : null;

  return (
    <aside className="space-y-5 px-1">
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
          <div className="absolute inset-0 -m-0.5 rounded-full border border-[var(--gold)]/40" />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[var(--gold)]">
            <Sparkles size={10} />
          </div>
          {avatarSrc ? (
            <div className="relative h-[64px] w-[64px] overflow-hidden rounded-full border-2 border-[var(--gold)] shadow-[0_0_0_2px_var(--bg),inset_0_0_0_1px_rgba(255,255,255,0.4)]">
              <Image
                src={avatarSrc}
                alt="avatar"
                width={64}
                height={64}
                className="h-full w-full object-cover"
                priority
                unoptimized
              />
            </div>
          ) : (
            <div className="h-[64px] w-[64px] rounded-full border-2 border-[var(--gold)] bg-[var(--gold-tint)] shadow-[0_0_0_2px_var(--bg),inset_0_0_0_1px_rgba(255,255,255,0.4)]" />
          )}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[22px] font-bold leading-none text-[var(--fg-strong)]">
              {user?.name ?? "Player"}
            </span>
            <Sparkles size={14} className="text-[var(--gold)]" />
          </div>
          {age !== null && (
            <div className="mt-1.5">
              <span className="inline-flex items-center rounded-sm border border-[var(--accent-strong)] bg-gradient-to-b from-[var(--accent)] to-[var(--accent-strong)] px-2 py-0.5 font-display text-[11px] font-bold text-white">
                {age}岁
              </span>
            </div>
          )}
          <div className="mt-2 space-y-0.5 font-display text-[12px] text-[var(--fg-muted)]">
            {user?.gender && <MetaRow label="性别" value={user.gender} />}
            {birthdayLabel && <MetaRow label="生日" value={birthdayLabel} />}
            {user?.region && <MetaRow label="地区" value={user.region} />}
            {!user?.gender && !birthdayLabel && !user?.region && (
              <a
                href="/settings"
                className="text-[10px] italic text-[var(--gold-deep)] underline-offset-2 hover:underline"
              >
                前往设置完善个人信息 →
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="divider-gold text-[10px] font-display-en tracking-[0.3em]">
        <span className="font-display text-[13px] font-bold tracking-[0.08em] text-[var(--fg-strong)]">
          六维属性
        </span>
        <span className="text-[9px]">ATTRIBUTES</span>
      </div>

      <div className="-mt-1">
        <RadarChart xp={xpByArea} />
      </div>

      <div className="divider-gold text-[10px] font-display-en tracking-[0.3em]">
        <span className="font-display text-[13px] font-bold tracking-[0.08em] text-[var(--fg-strong)]">
          人生信条
        </span>
        <span className="text-[9px]">MOTTO</span>
      </div>
      <blockquote className="relative pl-3 font-display text-[13px] leading-relaxed text-[var(--fg)]">
        <div className="absolute left-0 top-1 h-full w-0.5 bg-[var(--gold)]" />
        {user?.motto ? (
          <>&ldquo;{user.motto}&rdquo;</>
        ) : user?.visionStatement ? (
          <>&ldquo;{user.visionStatement}&rdquo;</>
        ) : (
          <>
            &ldquo;旅途的意义不在于终点，
            <br />
            而在于沿途的选择与风景。&rdquo;
            <a
              href="/settings"
              className="ml-1 text-[10px] italic text-[var(--gold-deep)] underline-offset-2 hover:underline"
            >
              （设置 →）
            </a>
          </>
        )}
        <div className="absolute -right-2 -bottom-2 text-[var(--gold)]/50">
          <Feather size={16} />
        </div>
      </blockquote>
    </aside>
  );
}

function deriveAge(birthday: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const m = now.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age -= 1;
  return Math.max(0, age);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
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

type Dimension = {
  key: "STR" | "INT" | "CHA" | "WIS" | "CRE" | "GOLD";
  cn: string;
};

const DIMENSIONS: Dimension[] = [
  { key: "STR", cn: "健康" },
  { key: "INT", cn: "学习" },
  { key: "CHA", cn: "关系" },
  { key: "WIS", cn: "心智" },
  { key: "CRE", cn: "创造" },
  { key: "GOLD", cn: "财富" },
];

function normalizeXp(xp: number): number {
  return Math.max(0, Math.round(xp));
}

function xpToAttributeScore(xp: number, maxXp: number): number {
  if (maxXp <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((normalizeXp(xp) / maxXp) * 100)));
}

function formatXp(xp: number): string {
  return normalizeXp(xp).toLocaleString("zh-CN");
}

/** 6-axis attribute radar — one axis per dimension, real data only. */
function RadarChart({ xp }: { xp: Record<string, number> }) {
  const axes = DIMENSIONS.map((d, i) => ({
    ...d,
    angle: -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length,
  }));
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 78;
  const levels = 4;

  const rawValues = axes.map((a) => normalizeXp(xp[a.key] ?? 0));
  const maxXp = Math.max(0, ...rawValues);
  const values = rawValues.map((v) => xpToAttributeScore(v, maxXp));

  const point = (i: number, r: number) => {
    const { angle } = axes[i];
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const polyPoints = values
    .map((v, i) => point(i, (v / 100) * maxR).join(","))
    .join(" ");

  return (
    <Link
      href="/analytics"
      title="累计属性 XP · 最大值映射到外圈 · 查看 90 天属性分布"
      className="block transition-opacity hover:opacity-90"
    >
      <div
        className="relative mx-auto cursor-pointer"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
                {a.cn}
              </div>
              <div className="font-mono text-[10px] text-[var(--fg)]">{formatXp(rawValues[i])}</div>
            </div>
          );
        })}
      </div>
    </Link>
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
