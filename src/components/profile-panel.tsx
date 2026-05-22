"use client";

import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/hooks/queries";
import { deriveLevel } from "@/lib/gamification";
import {
  Heart,
  BookOpen,
  Users,
  Brain,
  Palette,
  Coins,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * Left profile — flat on parchment (no outer panel).
 * Six attributes match the project's 6 dimensions (per docs §4.1 + /help):
 *   STR→健康  INT→学习  CHA→关系  WIS→心智  CRE→创造  GOLD→财富
 * Stat bars + radar both render real `xpByArea`. Both link to /analytics.
 */
export function ProfilePanel() {
  const { data: user } = useUser();
  const xpByArea = user?.xpByArea ?? {};

  const birthday = user?.birthday ? new Date(user.birthday) : null;
  const age = birthday ? deriveAge(birthday) : null;
  const birthdayLabel = birthday
    ? `${pad2(birthday.getMonth() + 1)}/${pad2(birthday.getDate())}`
    : null;
  const avatarSrc = user?.avatarUrl || "/lifeos/profile_avatar.png";

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

      {/* 6 attribute stat bars — STR/INT/CHA/WIS/CRE/GOLD */}
      <div className="space-y-1">
        {DIMENSIONS.map((d) => (
          <StatBar key={d.key} dim={d} xp={xpByArea[d.key] ?? 0} />
        ))}
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
  icon: React.ReactNode;
  color: string;
};

const DIMENSIONS: Dimension[] = [
  { key: "STR",  cn: "健康", icon: <Heart size={13} />,    color: "var(--attr-str)" },
  { key: "INT",  cn: "学习", icon: <BookOpen size={13} />, color: "var(--attr-int)" },
  { key: "CHA",  cn: "关系", icon: <Users size={13} />,    color: "var(--attr-cha)" },
  { key: "WIS",  cn: "心智", icon: <Brain size={13} />,    color: "var(--attr-wis)" },
  { key: "CRE",  cn: "创造", icon: <Palette size={13} />,  color: "var(--attr-cre)" },
  { key: "GOLD", cn: "财富", icon: <Coins size={13} />,    color: "var(--attr-gold)" },
];

/** Map raw XP → current-level progress percent, matching module cards. */
function xpToProgressScore(xp: number): number {
  const { progress } = deriveLevel(xp);
  return Math.min(100, Math.max(0, Math.round(progress * 100)));
}

function StatBar({ dim, xp }: { dim: Dimension; xp: number }) {
  const { level, xpIntoLevel, xpForNext } = deriveLevel(xp);
  const value = xpToProgressScore(xp);
  return (
    <Link
      href={`/analytics`}
      title={`${dim.cn} · ${dim.key} · Lv.${level} ${xpIntoLevel}/${xpForNext} XP — 查看属性分布`}
      className="group flex items-center gap-2 rounded-sm px-1 py-0.5 transition-colors hover:bg-[var(--gold-tint)]"
    >
      <span className="shrink-0" style={{ color: dim.color }}>
        {dim.icon}
      </span>
      <span className="w-9 shrink-0 font-display text-[13px] font-semibold text-[var(--fg-strong)]">
        {dim.cn}
      </span>
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--bg-panel-ink)]/15 border border-[var(--border)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${dim.color}CC, ${dim.color})`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[11px] text-[var(--fg)]">
        {value}/100
      </span>
    </Link>
  );
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

  const values = axes.map((a) => xpToProgressScore(xp[a.key] ?? 0));

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
      title="查看 90 天属性分布"
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
              <div className="font-mono text-[10px] text-[var(--fg)]">{values[i]}</div>
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
