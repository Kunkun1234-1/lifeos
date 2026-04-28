"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, Edit3, Archive, ArchiveRestore, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import {
  usePrinciples,
  useCreatePrinciple,
  useUpdatePrinciple,
  useDeletePrinciple,
} from "@/hooks/queries";
import type { PrincipleDTO } from "@/lib/types";

const CATEGORY_LABEL: Record<PrincipleDTO["category"], string> = {
  life: "人生",
  decision: "决策",
  health: "健康",
  money: "财务",
  relationship: "关系",
  career: "职业",
};

const CATEGORY_ORDER: PrincipleDTO["category"][] = [
  "life",
  "decision",
  "health",
  "money",
  "relationship",
  "career",
];

const SOURCE_PRESETS = [
  "Dalio · Principles",
  "Heath · WRAP",
  "Atomic Habits",
  "Personal",
  "Buffett",
  "Stoic",
];

export default function PrinciplesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data: principles, isLoading } = usePrinciples(showArchived);

  const grouped = (principles ?? []).reduce<Record<string, PrincipleDTO[]>>((acc, p) => {
    const key = p.category;
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="section-label">
            <span className="cn text-2xl">原则库</span>
            <span className="en text-[11px]">Principles · Decision Anchors</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            把你信奉的原则写下来。每次重大决策时引用它们 · 长期形成自己的「Dalio 算法」。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showArchived ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            {showArchived ? "Active" : "Archived"}
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            {showForm ? "Close" : "New Principle"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NewPrincipleForm onDone={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : (principles ?? []).length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          {showArchived
            ? "尚无归档原则。"
            : "原则库为空。先写下 3-5 条你最信奉的人生准则，再开始用它们做决策。"}
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((category) => (
            <section key={category}>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="diamond-gold" />
                <h3 className="font-display text-lg font-bold text-[var(--fg-strong)]">
                  {CATEGORY_LABEL[category]}
                </h3>
                <span className="font-display-en text-[10px] uppercase tracking-[0.22em] text-[var(--gold-deep)]">
                  · {category} · {grouped[category].length}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/30 to-transparent" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped[category].map((p) => (
                  <PrincipleCard key={p.id} principle={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPrincipleForm({ onDone }: { onDone: () => void }) {
  const create = useCreatePrinciple();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emoji, setEmoji] = useState("📜");
  const [category, setCategory] = useState<PrincipleDTO["category"]>("life");
  const [source, setSource] = useState("Personal");

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      body: body.trim(),
      emoji,
      category,
      source: source.trim() || null,
    });
    onDone();
  };

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">新增原则</span>
        <span className="en text-[10px]">New Principle</span>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div className="grid gap-1.5">
            <Label>Emoji</Label>
            <Input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
              className="text-center text-lg"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pain + Reflection = Progress"
              autoFocus
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>原则正文</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="把这条原则展开说清楚 · 越具体越好"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>分类</Label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as PrincipleDTO["category"])}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]} · {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>来源</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="书 · 人 · Personal"
              list="source-presets"
            />
            <datalist id="source-presets">
              {SOURCE_PRESETS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !title.trim() || !body.trim()}>
            {create.isPending ? "Saving…" : "Add Principle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrincipleCard({ principle }: { principle: PrincipleDTO }) {
  const update = useUpdatePrinciple();
  const remove = useDeletePrinciple();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(principle.body);
  const [title, setTitle] = useState(principle.title);

  const saveEdit = async () => {
    if (!title.trim() || !body.trim()) return;
    await update.mutateAsync({
      id: principle.id,
      body: { title: title.trim(), body: body.trim() },
    });
    setEditing(false);
  };

  return (
    <div
      className={`panel-cream framed rounded-sm p-4 ${
        principle.archived ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none">{principle.emoji}</div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-2"
            />
          ) : (
            <h3 className="font-display text-[15px] font-bold leading-snug text-[var(--fg-strong)]">
              {principle.title}
            </h3>
          )}
          <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <ScrollText size={11} className="text-[var(--gold-deep)]" />
            <span>{principle.source ?? "Personal"}</span>
            {principle.usageCount > 0 && (
              <span className="chip-gold">引用 ×{principle.usageCount}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!principle.archived && (
            <>
              {editing ? (
                <Button size="icon" variant="primary" onClick={saveEdit} title="Save">
                  ✓
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  title="Edit"
                >
                  <Edit3 size={14} />
                </Button>
              )}
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            title={principle.archived ? "Unarchive" : "Archive"}
            onClick={() =>
              update.mutate({
                id: principle.id,
                body: { archived: !principle.archived },
              })
            }
          >
            {principle.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            onClick={() => {
              if (confirm("Delete this principle? Past decisions will keep their reference.")) {
                remove.mutate(principle.id);
              }
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        {editing ? (
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        ) : (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--fg)]">
            {principle.body}
          </p>
        )}
      </div>
    </div>
  );
}
