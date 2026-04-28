"use client";

import { useEffect, useState } from "react";
import { Activity, Flame, Heart, Compass } from "lucide-react";
import { api } from "@/lib/fetcher";

type AnalyticsData = {
  heatmap: Record<string, number>;
  areaXp: Record<string, number>;
  areas: Array<{ name: string; icon: string; color: string; attributeKey: string; attributeXp: number; healthScore: number }>;
  moodTrend: Array<{ date: string; mood: number | null; energy: number | null; focus: number | null }>;
  taskByArea: Record<string, number>;
  ratingDist: number[];
  decisionsTotal: number;
  period: { since90: string; since30: string; now: string };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AnalyticsData>("/api/analytics")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "load failed"));
  }, []);

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-8 py-8">
      <div>
        <div className="section-label">
          <span className="cn text-2xl">数据洞察</span>
          <span className="en text-[11px]">Analytics</span>
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
        <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
          看见自己的节奏 · 90 天 XP 热力图 · 6 大属性分布 · 心情/精力/专注趋势 · 决策评分分布。
        </p>
      </div>

      {error && (
        <div className="panel-cream framed rounded-sm p-4 text-sm text-[var(--danger)]">
          数据加载失败: {error}
        </div>
      )}
      {!data && !error && (
        <div className="py-16 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      )}

      {data && (
        <>
          <Heatmap data={data.heatmap} />
          <div className="grid gap-5 lg:grid-cols-2">
            <AreaXpChart areas={data.areas} areaXp={data.areaXp} />
            <TaskByAreaChart byArea={data.taskByArea} />
          </div>
          <MoodTrend trend={data.moodTrend} />
          <RatingDistribution dist={data.ratingDist} total={data.decisionsTotal} />
        </>
      )}
    </div>
  );
}

/* ---------- Heatmap (GitHub-style) ---------- */

function Heatmap({ data }: { data: Record<string, number> }) {
  const days = Object.keys(data).sort();
  const max = Math.max(1, ...Object.values(data));
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const activeDays = Object.values(data).filter((v) => v > 0).length;

  // 90 days = 13 weeks, render as columns of 7 (week starts Mon = day 1)
  const cols: { date: string; xp: number; weekday: number }[][] = [];
  let bucket: typeof cols[number] = [];
  for (const date of days) {
    const wd = (new Date(date).getDay() + 6) % 7; // Mon=0 ... Sun=6
    if (bucket.length === 0 && wd > 0) {
      // pad start
      for (let i = 0; i < wd; i++) bucket.push({ date: "", xp: -1, weekday: i });
    }
    bucket.push({ date, xp: data[date], weekday: wd });
    if (wd === 6) {
      cols.push(bucket);
      bucket = [];
    }
  }
  if (bucket.length) cols.push(bucket);

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="section-label">
          <span className="cn text-base">90 天活力</span>
          <span className="en text-[10px]">Activity Heatmap · XP per day</span>
        </div>
        <div className="text-[11px] text-[var(--fg-muted)]">
          活跃 <b className="font-mono text-[var(--gold-deep)]">{activeDays}</b> 天 · 累计 <b className="font-mono text-[var(--gold-deep)]">{total.toLocaleString()}</b> XP
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {cols.map((week, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {week.map((d, di) => {
                if (d.xp < 0) return <div key={di} className="h-3 w-3" />;
                const intensity = d.xp === 0 ? 0 : Math.min(1, d.xp / max);
                const bg = intensityToColor(intensity);
                return (
                  <div
                    key={di}
                    className="h-3 w-3 rounded-[2px] transition-transform hover:scale-150"
                    style={{ background: bg }}
                    title={`${d.date} · ${d.xp} XP`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--fg-subtle)]">
        <span>少</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-[2px]"
            style={{ background: intensityToColor(i) }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}

function intensityToColor(i: number): string {
  if (i === 0) return "var(--bg-elevated)";
  // Blend from gold-tint to gold-deep
  const a = 0.15 + i * 0.85;
  return `rgba(182, 136, 56, ${a.toFixed(2)})`;
}

/* ---------- Area XP horizontal bar chart ---------- */

const ATTR_COLOR: Record<string, string> = {
  STR: "#c5554a",
  INT: "#3a6b8e",
  CHA: "#c76d95",
  WIS: "#4c8a74",
  CRE: "#9b6bc1",
  GOLD: "#b68838",
};

function AreaXpChart({
  areas,
  areaXp,
}: {
  areas: AnalyticsData["areas"];
  areaXp: AnalyticsData["areaXp"];
}) {
  const max = Math.max(1, ...Object.values(areaXp));
  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">90 天属性 XP</span>
        <span className="en text-[10px]">XP by Attribute</span>
      </div>
      <ul className="space-y-2.5">
        {areas.map((a) => {
          const xp = areaXp[a.attributeKey] ?? 0;
          const w = (xp / max) * 100;
          const color = ATTR_COLOR[a.attributeKey] ?? a.color;
          return (
            <li key={a.attributeKey} className="grid grid-cols-[80px_1fr_60px] items-center gap-2 text-[12px]">
              <span className="flex items-center gap-1.5">
                <span>{a.icon}</span>
                <span className="font-display-en text-[10px] tracking-[0.18em] text-[var(--fg-muted)]">
                  {a.attributeKey}
                </span>
              </span>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${w}%`, background: color }}
                />
              </div>
              <span className="text-right font-mono text-[11px] text-[var(--fg-strong)]">{xp}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Tasks by area pie-ish (stacked bar) ---------- */

function TaskByAreaChart({ byArea }: { byArea: Record<string, number> }) {
  const entries = Object.entries(byArea).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="section-label">
          <span className="cn text-base">30 天任务分布</span>
          <span className="en text-[10px]">Tasks by Area</span>
        </div>
        <span className="font-mono text-[11px] text-[var(--gold-deep)]">{total} 个</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">最近 30 天没有完成任务。</p>
      ) : (
        <>
          <div className="flex h-4 overflow-hidden rounded-sm">
            {entries.map(([name, count], i) => (
              <div
                key={name}
                className="transition-all"
                style={{
                  width: `${(count / total) * 100}%`,
                  background: PALETTE[i % PALETTE.length],
                }}
                title={`${name}: ${count}`}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[12px]">
            {entries.map(([name, count], i) => (
              <li key={name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span className="flex-1 truncate">{name}</span>
                <span className="font-mono text-[var(--fg-muted)]">{count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const PALETTE = ["#b68838", "#3a6b8e", "#4c8a74", "#c76d95", "#9b6bc1", "#c5554a", "#6b6458"];

/* ---------- Mood / Energy / Focus trend (SVG sparkline) ---------- */

function MoodTrend({ trend }: { trend: AnalyticsData["moodTrend"] }) {
  if (trend.length === 0) {
    return (
      <div className="panel-cream framed rounded-sm p-5">
        <div className="section-label mb-2">
          <span className="cn text-base">心情 · 精力 · 专注</span>
          <span className="en text-[10px]">30-Day Trend</span>
        </div>
        <p className="text-sm text-[var(--fg-muted)]">最近 30 天还没填过每日复盘。</p>
      </div>
    );
  }
  const W = 800;
  const H = 180;
  const PAD = 24;
  const N = trend.length;
  const xStep = N > 1 ? (W - PAD * 2) / (N - 1) : 0;
  const yScale = (v: number) => H - PAD - (v - 1) / 9 * (H - PAD * 2);

  const path = (key: "mood" | "energy" | "focus") => {
    const points = trend
      .map((d, i) => {
        const v = d[key];
        if (v === null) return null;
        return `${PAD + i * xStep},${yScale(v)}`;
      })
      .filter(Boolean);
    return points.length > 0 ? `M${points.join(" L")}` : "";
  };

  const series: { key: "mood" | "energy" | "focus"; label: string; color: string; cn: string }[] = [
    { key: "mood",   label: "Mood",   color: "#c76d95", cn: "心情" },
    { key: "energy", label: "Energy", color: "#b68838", cn: "精力" },
    { key: "focus",  label: "Focus",  color: "#3a6b8e", cn: "专注" },
  ];

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="section-label">
          <span className="cn text-base">心情 · 精力 · 专注</span>
          <span className="en text-[10px]">30-Day Trend (1-10)</span>
        </div>
        <div className="flex gap-3 text-[11px]">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-[var(--fg-muted)]">{s.cn}</span>
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Y axis grid */}
        {[1, 5, 10].map((v) => (
          <g key={v}>
            <line
              x1={PAD}
              y1={yScale(v)}
              x2={W - PAD}
              y2={yScale(v)}
              stroke="var(--border)"
              strokeWidth={0.5}
              strokeDasharray="2,3"
            />
            <text x={4} y={yScale(v) + 3} fontSize="9" fill="var(--fg-subtle)">
              {v}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path
            key={s.key}
            d={path(s.key)}
            stroke={s.color}
            strokeWidth={2}
            fill="none"
            opacity={0.85}
          />
        ))}
        {/* Date markers — first/middle/last (deduped when N is small) */}
        {Array.from(new Set([0, Math.floor(N / 2), N - 1])).map((i) => (
          <text
            key={`tick-${i}`}
            x={PAD + i * xStep}
            y={H - 6}
            fontSize="9"
            textAnchor="middle"
            fill="var(--fg-subtle)"
          >
            {trend[i].date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Decision rating distribution ---------- */

function RatingDistribution({ dist, total }: { dist: number[]; total: number }) {
  const max = Math.max(1, ...dist);
  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="section-label">
          <span className="cn text-base">决策评分分布</span>
          <span className="en text-[10px]">Reviewed Decisions · Process Quality</span>
        </div>
        <span className="font-mono text-[11px] text-[var(--gold-deep)]">{total} 已复盘</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">还没有完成的决策复盘。</p>
      ) : (
        <>
          <div className="flex h-32 items-end gap-1.5">
            {dist.slice(1).map((count, i) => {
              const rating = i + 1;
              const h = (count / max) * 100;
              return (
                <div
                  key={rating}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${rating}/10: ${count} decisions`}
                >
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(4, h)}%`,
                      background:
                        rating >= 8 ? "#4c8a74" : rating >= 5 ? "var(--gold)" : "#c5554a",
                    }}
                  />
                  <span className="font-mono text-[10px] text-[var(--fg-muted)]">{rating}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-[var(--fg-subtle)] text-center">
            Dalio: 好结果 ≠ 好决策。低分代表后悔，高分代表 process 经得起复盘。
          </p>
        </>
      )}
    </div>
  );
}
