"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Trophy, Sparkles, Hourglass, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePicker } from "@/components/image-picker";
import {
  useEvents,
  useClaimEventMission,
  useCreateCustomEvent,
  useDeleteCustomEvent,
} from "@/hooks/queries";
import type { EventSnapshotDTO, EventStatus } from "@/lib/types";

const STATUS_ORDER: EventStatus[] = ["active", "upcoming", "ended"];
const STATUS_LABEL: Record<EventStatus, string> = {
  active: "进行中",
  upcoming: "即将开启",
  ended: "已结束",
};

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();
  const [showForm, setShowForm] = useState(false);
  const grouped = useMemo(() => {
    const out: Record<EventStatus, EventSnapshotDTO[]> = { active: [], upcoming: [], ended: [] };
    for (const e of events ?? []) out[e.status].push(e);
    return out;
  }, [events]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">限时活动</span>
            <span className="en text-[11px]">Events · Genshin 5-layer rhythm</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            每个活动有 4-5 个任务 + 一个最终大奖（XP/Gems/Fate 包，可能附赠限定相框）。错过会过期。
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? "Close" : "新建活动"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CustomEventForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : (events ?? []).length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          目前没有活动。
        </div>
      ) : (
        STATUS_ORDER.filter((s) => grouped[s].length > 0).map((status) => (
          <section key={status}>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="diamond-gold" />
              <h3 className="font-display text-lg font-bold text-[var(--fg-strong)]">
                {STATUS_LABEL[status]}
              </h3>
              <span className="font-display-en text-[10px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
                · {status} · {grouped[status].length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/30 to-transparent" />
            </div>
            <div className="grid gap-5">
              {grouped[status].map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventSnapshotDTO }) {
  const claim = useClaimEventMission();
  const remove = useDeleteCustomEvent();
  const isUpcoming = event.status === "upcoming";
  const isEnded = event.status === "ended";
  const themeBg = `linear-gradient(140deg, ${event.themeColor}22, ${event.themeColor}05 60%)`;

  const claimedCount = event.missions.filter((m) => m.claimed).length;

  return (
    <div
      className="panel-cream framed relative overflow-hidden rounded-sm"
      style={{ background: themeBg }}
    >
      {/* Banner image (custom events only) */}
      {event.imageUrl && (
        <div className="relative h-32 w-full overflow-hidden border-b border-[var(--border)]">
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            className="object-cover"
            sizes="1200px"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
        </div>
      )}

      {/* Hero */}
      <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="font-display-en text-[10px] uppercase tracking-[0.25em]"
              style={{ color: event.themeColor }}
            >
              EVENT · {STATUS_LABEL[event.status]}
            </div>
            {event.isCustom && (
              <>
                <span className="rounded-sm border border-[var(--gold)]/50 px-1 text-[8px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
                  Custom
                </span>
                <button
                  type="button"
                  className="ml-auto text-[var(--fg-subtle)] hover:text-[var(--danger)]"
                  title="删除该自定义活动"
                  onClick={() => {
                    if (confirm(`Delete custom event "${event.name}"? This will also remove its claims.`)) {
                      remove.mutate(event.id);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
          <h2 className="mt-1 flex items-baseline gap-2 font-display text-2xl font-bold text-[var(--fg-strong)]">
            <span>{event.emoji}</span>
            <span>{event.name}</span>
          </h2>
          <p className="mt-2 text-[13px] text-[var(--fg)]">{event.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
            <span className="font-mono text-[var(--fg-muted)]">
              {fmtDate(event.startsAt)} → {fmtDate(event.endsAt)}
            </span>
            {event.status === "active" && event.msToEnd !== null && (
              <span className="chip-gold flex items-center gap-1">
                <Hourglass size={11} /> 剩 {fmtDuration(event.msToEnd)}
              </span>
            )}
            {event.status === "upcoming" && event.msToStart !== null && (
              <span className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] px-2 py-0.5 text-[var(--fg-muted)]">
                <Lock size={10} className="mr-1 inline" />
                {fmtDuration(event.msToStart)} 后开始
              </span>
            )}
          </div>
        </div>

        {/* Bonus pill */}
        <BonusPill event={event} onClaim={() => claim.mutate({ eventId: event.id, missionKey: "__bonus__" })} disabled={!event.allMissionsClaimed || event.bonusClaimed || claim.isPending || isEnded} />
      </div>

      {/* Missions track */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-page)]/40 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--gold-deep)]">
            Missions · {claimedCount}/{event.missions.length}
          </div>
          {isUpcoming && (
            <span className="text-[11px] text-[var(--fg-muted)]">活动开始后自动计数</span>
          )}
        </div>
        <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {event.missions.map((m) => (
            <li
              key={m.key}
              className={`rounded-sm border p-3 ${
                m.claimed
                  ? "border-[var(--success,#3a7d56)]/40 bg-[var(--success,#3a7d56)]/8"
                  : m.done
                  ? "border-[var(--gold)] bg-[var(--gold-tint)]/40 shadow-[0_0_0_1px_var(--gold)]"
                  : "border-[var(--border)] bg-[var(--bg-card)]/70"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-baseline gap-1.5">
                  <span>{m.emoji}</span>
                  <span className="font-display text-[13px] font-bold text-[var(--fg-strong)]">
                    {m.title}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-[var(--fg-muted)]">
                  {m.current}/{m.target}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${m.progress * 100}%`,
                    background: m.claimed ? "var(--success,#3a7d56)" : event.themeColor,
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <span className="text-[var(--fg-muted)]">
                  {m.xpReward > 0 && <span>+{m.xpReward} XP </span>}
                  {m.goldReward > 0 && <span>+{m.goldReward}⭐ </span>}
                  {m.gemsReward > 0 && <span>+{m.gemsReward}💎 </span>}
                  {m.fateReward > 0 && <span>+{m.fateReward}🎫</span>}
                </span>
                {m.claimed ? (
                  <span className="font-display-en text-[10px] uppercase tracking-[0.18em] text-[var(--success,#3a7d56)]">
                    ✓ 已领取
                  </span>
                ) : m.done && !isEnded ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => claim.mutate({ eventId: event.id, missionKey: m.key })}
                    disabled={claim.isPending}
                  >
                    领取
                  </Button>
                ) : isEnded && m.done ? (
                  <span className="text-[10px] text-[var(--fg-subtle)]">活动已结束</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BonusPill({
  event,
  onClaim,
  disabled,
}: {
  event: EventSnapshotDTO;
  onClaim: () => void;
  disabled: boolean;
}) {
  const hasFrame = !!event.bonus.equipmentKey;
  return (
    <div className="panel-ink ornate min-w-[220px] rounded-sm p-4">
      <div className="font-display-en text-[10px] uppercase tracking-[0.22em] text-[var(--gold-pale)]">
        Bonus Reward
      </div>
      <div className="mt-1 flex items-center gap-2 text-[var(--fg-on-ink)]">
        <Trophy size={16} className="text-[var(--gold-pale)]" />
        <span className="font-display text-[14px] font-bold">完成全部任务</span>
      </div>
      <ul className="mt-2 space-y-0.5 font-mono text-[12px] text-[var(--fg-on-ink)]/90">
        {event.bonus.xp > 0 && <li>+{event.bonus.xp} XP</li>}
        {event.bonus.gold > 0 && <li>+{event.bonus.gold}⭐</li>}
        {event.bonus.gems > 0 && <li>+{event.bonus.gems}💎</li>}
        {event.bonus.fate > 0 && <li>+{event.bonus.fate}🎫</li>}
        {hasFrame && <li>+ 限定相框</li>}
      </ul>
      {event.bonusClaimed ? (
        <div className="mt-3 rounded-sm border border-[var(--gold-pale)]/40 px-2 py-1 text-center text-[11px] text-[var(--gold-pale)]">
          ✓ 已领取
        </div>
      ) : event.status === "ended" ? (
        <div className="mt-3 rounded-sm border border-[var(--border)]/30 px-2 py-1 text-center text-[11px] text-[var(--gold-pale)]/70">
          活动已结束
        </div>
      ) : (
        <Button
          size="sm"
          variant="primary"
          onClick={onClaim}
          disabled={disabled}
          className="mt-3 w-full"
        >
          <Sparkles size={14} />
          {event.allMissionsClaimed ? "领取大奖" : "完成全部任务后解锁"}
        </Button>
      )}
      {hasFrame && (
        <Link
          href="/equipment"
          className="mt-2 block text-center text-[10px] text-[var(--gold-pale)]/80 hover:underline"
        >
          查看相框 →
        </Link>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const METRIC_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "task_done", label: "完成任务 task_done" },
  { value: "routine_done", label: "完成日程 routine_done" },
  { value: "habit_pos", label: "正向习惯打卡 habit_pos" },
  { value: "review_daily", label: "每日复盘 review_daily" },
  { value: "review_weekly", label: "每周复盘 review_weekly" },
  { value: "decision_added", label: "新增决策 decision_added" },
  { value: "decision_reviewed", label: "决策复盘 decision_reviewed" },
  { value: "principle_added", label: "新增原则 principle_added" },
  { value: "note_added", label: "新增笔记 note_added" },
  { value: "project_done", label: "完成项目 project_done" },
  { value: "goal_done", label: "完成目标 goal_done" },
];

type DraftMission = {
  key: string;
  title: string;
  metric: string;
  target: number;
  xpReward: number;
  goldReward: number;
  gemsReward: number;
  fateReward: number;
  emoji: string;
};

function makeDefaultMission(idx: number): DraftMission {
  return {
    key: `m${idx + 1}`,
    title: "",
    metric: "task_done",
    target: 5,
    xpReward: 100,
    goldReward: 30,
    gemsReward: 0,
    fateReward: 0,
    emoji: "✅",
  };
}

function CustomEventForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎉");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState("#b68838");
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [missions, setMissions] = useState<DraftMission[]>([makeDefaultMission(0)]);
  const [bonusXp, setBonusXp] = useState(500);
  const [bonusGold, setBonusGold] = useState(150);
  const [bonusGems, setBonusGems] = useState(5);
  const [bonusFate, setBonusFate] = useState(3);
  const create = useCreateCustomEvent();
  const [err, setErr] = useState<string | null>(null);

  const updateMission = (idx: number, patch: Partial<DraftMission>) => {
    setMissions((ms) => ms.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };
  const addMission = () => {
    if (missions.length >= 10) return;
    setMissions((ms) => [...ms, makeDefaultMission(ms.length)]);
  };
  const removeMission = (idx: number) => {
    if (missions.length <= 1) return;
    setMissions((ms) => ms.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr("活动名称不能为空");
      return;
    }
    if (missions.some((m) => !m.title.trim())) {
      setErr("每个任务都需要标题");
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        emoji: emoji || "🎉",
        imageUrl,
        themeColor,
        startsAt: new Date(startsAt + "T00:00:00").toISOString(),
        endsAt: new Date(endsAt + "T23:59:59").toISOString(),
        missions: missions.map((m) => ({ ...m, title: m.title.trim() })),
        bonusXp,
        bonusGold,
        bonusGems,
        bonusFate,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Card>
      <CardContent className="grid gap-4 pt-5">
        <div className="grid gap-1.5">
          <Label>活动横幅图（可选）</Label>
          <ImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            fallbackEmoji={emoji || "🎉"}
            label="上传 Banner"
            hint="建议比例 5:1，留空使用 emoji + 主题色"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>活动名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="如：30 天写作冲刺" />
          </div>
          <div className="grid gap-1.5">
            <Label>Emoji</Label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={280}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>开始日期</Label>
            <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>结束日期</Label>
            <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>主题色（十六进制 / CSS 颜色）</Label>
            <Input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              maxLength={20}
              placeholder="#b68838"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>任务（{missions.length}/10）</Label>
            <Button type="button" size="sm" variant="outline" onClick={addMission} disabled={missions.length >= 10}>
              <Plus size={12} /> 新任务
            </Button>
          </div>
          {missions.map((m, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-page)]/40 p-3 sm:grid-cols-[auto_1fr_1fr_120px_120px_auto]"
            >
              <Input
                value={m.emoji}
                onChange={(e) => updateMission(idx, { emoji: e.target.value })}
                className="w-12 text-center"
                maxLength={4}
                title="emoji"
              />
              <Input
                value={m.title}
                onChange={(e) => updateMission(idx, { title: e.target.value })}
                placeholder="任务标题"
                maxLength={80}
              />
              <Select
                value={m.metric}
                onChange={(e) => updateMission(idx, { metric: e.target.value })}
                title="metric — 自动跟踪的指标"
              >
                {METRIC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                value={m.target}
                onChange={(e) => updateMission(idx, { target: Number(e.target.value) })}
                title="目标次数"
              />
              <Input
                type="number"
                min={0}
                value={m.xpReward}
                onChange={(e) => updateMission(idx, { xpReward: Number(e.target.value) })}
                title="XP 奖励"
              />
              <button
                type="button"
                onClick={() => removeMission(idx)}
                disabled={missions.length <= 1}
                className="text-[var(--fg-subtle)] hover:text-[var(--danger)] disabled:opacity-30"
                title="删除任务"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-sm border border-[var(--gold)]/50 bg-[var(--gold-tint)]/40 p-3">
          <Label>完成全部任务的奖励 · Bonus</Label>
          <div className="grid grid-cols-4 gap-2">
            <div className="grid gap-1">
              <Label className="text-[10px]">XP</Label>
              <Input type="number" min={0} value={bonusXp} onChange={(e) => setBonusXp(Number(e.target.value))} />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px]">⭐ Mora</Label>
              <Input type="number" min={0} value={bonusGold} onChange={(e) => setBonusGold(Number(e.target.value))} />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px]">💎 Gems</Label>
              <Input type="number" min={0} value={bonusGems} onChange={(e) => setBonusGems(Number(e.target.value))} />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px]">🎫 Fate</Label>
              <Input type="number" min={0} value={bonusFate} onChange={(e) => setBonusFate(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {err && <div className="text-[12px] text-[var(--danger)]">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            {create.isPending ? "保存中…" : "创建活动"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "0";
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
