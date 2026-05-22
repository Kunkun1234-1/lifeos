"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAreas, useUser } from "@/hooks/queries";
import { deriveLevel } from "@/lib/gamification";

/**
 * 6 life-module cards — display order matches the 6 attributes (STR/INT/CHA/WIS/CRE/GOLD).
 * Names align with /help and ProfilePanel: 健康/学习/关系/心智/创造/财富.
 */

const AREA_META: Record<string, { cn: string; en: string; art: string }> = {
  Health:        { cn: "健康", en: "Health",        art: "/lifeos/module_skills.png" },
  Learning:      { cn: "学习", en: "Learning",      art: "/lifeos/module_academics.png" },
  Relationships: { cn: "关系", en: "Relationships", art: "/lifeos/module_relationships.png" },
  Wellbeing:     { cn: "心智", en: "Mind",          art: "/lifeos/module_mind.png" },
  Creative:      { cn: "创造", en: "Creative",      art: "/lifeos/module_reputation.png" },
  Finance:       { cn: "财富", en: "Wealth",        art: "/lifeos/module_wealth.png" },
};

const ORDER = ["Health", "Learning", "Relationships", "Wellbeing", "Creative", "Finance"];
const MODULE_HREF: Partial<Record<string, string>> = {
  Finance: "/assets",
};

export function ModuleRow() {
  const { data: areas } = useAreas();
  const { data: user } = useUser();

  const xpByArea = user?.xpByArea ?? {};
  const ordered = ORDER
    .map((n) => areas?.find((a) => a.name === n))
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="diamond-gold" />
        <div className="section-label">
          <span className="cn text-[15px]">人生模块</span>
          <span className="en text-[10px]">Modules</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((a, i) => {
          const meta = AREA_META[a.name];
          if (!meta) return null;
          const xp = xpByArea[a.attributeKey] ?? 0;
          const { level, xpIntoLevel, xpForNext, progress } = deriveLevel(xp);
          const card = (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="panel-cream framed group overflow-hidden rounded-sm transition-shadow hover:shadow-[0_18px_34px_-24px_rgba(70,48,24,0.45)]"
            >
              <div className="relative mx-3 mt-3 aspect-[16/9] overflow-hidden rounded-sm border border-[var(--gold)]/70">
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

              <div className="px-4 pt-3">
                <div className="font-display text-[18px] font-bold tracking-[0.06em] text-[var(--fg-strong)]">
                  {meta.cn}
                </div>
                <div className="mt-0.5 font-display-en text-[9px] tracking-[0.22em] text-[var(--gold-deep)]/70">
                  {meta.en}
                </div>
              </div>

              <div className="px-4 pb-4 pt-3">
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
              </div>
            </motion.div>
          );
          const href = MODULE_HREF[a.name];
          return href ? (
            <Link key={a.id} href={href} className="block">
              {card}
            </Link>
          ) : (
            card
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
