"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboardData } from "@/components/dashboard-data";
import { useAreas, useUser } from "@/hooks/queries";
import { deriveLevel } from "@/lib/gamification";
import { AREA_META, AREA_ORDER, type AreaName } from "@/lib/area-meta";

/**
 * 6 life-module cards — display order matches the 6 attributes (STR/INT/CHA/WIS/CRE/GOLD).
 * Names align with /help and ProfilePanel: 健康/学习/关系/心智/创造/财富.
 */

export function ModuleRow() {
  const dashboard = useDashboardData();
  const { data: queryAreas } = useAreas({ enabled: !dashboard.active });
  const { data: queryUser } = useUser({ enabled: !dashboard.active });
  const areas = dashboard.data?.areas ?? queryAreas;
  const user = dashboard.data?.user ?? queryUser;

  const xpByArea = user?.xpByArea ?? {};
  const ordered = AREA_ORDER
    .map((n) => areas?.find((a) => a.name === n))
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <section className="h-full min-h-0">
      <div className="mb-3 flex items-center gap-2 xl:mb-2">
        <span className="diamond-gold" />
        <div className="section-label">
          <span className="cn text-[15px]">人生模块</span>
          <span className="en text-[10px]">Modules</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:h-[calc(100%-28px)] xl:grid-cols-6 xl:gap-3 2xl:gap-4">
        {ordered.map((a, i) => {
          const meta = AREA_META[a.name as AreaName];
          if (!meta) return null;
          const xp = xpByArea[a.attributeKey] ?? 0;
          const { level, xpIntoLevel, xpForNext, progress } = deriveLevel(xp);
          const card = (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="panel-cream framed group flex h-full min-h-0 flex-col overflow-hidden rounded-sm transition-all hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_22px_42px_-28px_rgba(5,18,36,0.72)]"
            >
              <div className="relative mx-3 mt-3 aspect-[16/9] shrink-0 overflow-hidden rounded-sm border border-[var(--gold)]/70 xl:mx-2 xl:mt-2 2xl:mx-3 2xl:mt-3">
                <Image
                  src={meta.art}
                  alt={meta.cn}
                  fill
                  sizes="(min-width: 1536px) 300px, (min-width: 1024px) 28vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-sm border border-[var(--gold)] bg-[rgba(252,247,234,0.92)] px-2 py-1">
                  <Starburst size={12} />
                  <span className="font-display-en text-[9px] tracking-[0.18em] text-[var(--gold-deep)]">
                    {a.attributeKey}
                  </span>
                </div>
              </div>

              <div className="px-4 pt-3 xl:px-3 xl:pt-2 2xl:px-4">
                <div className="font-display text-[18px] font-bold tracking-[0.06em] text-[var(--fg-strong)] xl:text-[15px] 2xl:text-[18px]">
                  {meta.cn}
                </div>
                <div className="mt-0.5 font-display-en text-[9px] tracking-[0.22em] text-[var(--gold-deep)]/70">
                  {meta.en}
                </div>
              </div>

              <div className="mt-auto px-4 pb-4 pt-3 xl:px-3 xl:pb-3 xl:pt-2 2xl:px-4 2xl:pb-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-[12px] text-[var(--fg-muted)]">
                    等级: <span className="text-[var(--fg-strong)] font-bold">Lv.{level}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
                    {xpIntoLevel}/{xpForNext}
                  </span>
                </div>
                <div className="mt-2 h-[6px] overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-panel-ink)]/15">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0.1, progress) * 100}%`,
                      background: "linear-gradient(90deg, var(--success), #8bc7a4)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                    }}
                  />
                </div>
                <div className="mt-2 text-right font-display text-[11px] text-[var(--gold-deep)] opacity-70 transition-opacity group-hover:opacity-100">
                  查看领域 →
                </div>
              </div>
            </motion.div>
          );
          return (
            <Link
              key={a.id}
              href={`/areas/${a.id}`}
              aria-label={`查看${meta.cn}领域`}
              className="block h-full min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/70"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Starburst({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path
        d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z"
        fill="var(--gold)"
      />
    </svg>
  );
}
