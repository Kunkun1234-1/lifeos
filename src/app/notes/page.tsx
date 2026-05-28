"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit3,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Search,
  ExternalLink,
  BookOpen,
  Quote,
  Link2,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { AreaSelect } from "@/components/area-select";
import { hasNoteWritableContent, normalizeNoteTitle } from "@/lib/notes";
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useGoals,
  useProjects,
} from "@/hooks/queries";
import type { NoteDTO, NoteKind } from "@/lib/types";

const KIND_META: Record<NoteKind, { cn: string; en: string; icon: typeof StickyNote; color: string }> = {
  note:        { cn: "笔记",   en: "Note",        icon: StickyNote, color: "var(--gold-deep)" },
  highlight:   { cn: "高亮",   en: "Highlight",   icon: BookOpen,   color: "#c5554a" },
  quote:       { cn: "语录",   en: "Quote",       icon: Quote,      color: "#3a6b8e" },
  link:        { cn: "链接",   en: "Link",        icon: Link2,      color: "#4c8a74" },
  inspiration: { cn: "灵感",   en: "Inspiration", icon: Sparkles,   color: "#9b6bc1" },
};

const KIND_ORDER: NoteKind[] = ["note", "highlight", "quote", "link", "inspiration"];

export default function NotesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NoteDTO | null>(null);
  const [kindFilter, setKindFilter] = useState<NoteKind | "all">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filters = {
    kind: kindFilter === "all" ? undefined : kindFilter,
    tag: tagFilter || undefined,
    q: q || undefined,
    archived: showArchived ? ("1" as const) : ("0" as const),
  };
  const { data: notes, isLoading } = useNotes(filters);

  // Collect all tags for the chip palette (only from active set)
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes ?? []) for (const t of n.tags) set.add(t);
    return Array.from(set).sort();
  }, [notes]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="section-label">
            <span className="cn text-2xl">知识库</span>
            <span className="en text-[11px]">Knowledge · Second Brain</span>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-[var(--gold)] via-[var(--gold)]/40 to-transparent" />
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">
            笔记 · 高亮 · 语录 · 链接 · 灵感 ——
            PARA 的 Resources 层。每条挂到 Area / Project / Goal，让大脑只用来思考，不用来记住。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={showArchived ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            {showArchived ? "Active" : "Archived"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm((v) => !v);
            }}
          >
            <Plus size={16} />
            {showForm ? "Close" : "New Note"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-[var(--border)]">
          <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
            全部
          </FilterChip>
          {KIND_ORDER.map((k) => {
            const m = KIND_META[k];
            const Icon = m.icon;
            return (
              <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
                <Icon size={11} /> {m.cn}
              </FilterChip>
            );
          })}
        </div>
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 标题 / 正文 / 作者…"
            className="h-8 pl-7 text-xs"
          />
        </div>
        {tagFilter && (
          <button
            onClick={() => setTagFilter("")}
            className="flex items-center gap-1 rounded-sm border border-[var(--gold)] bg-[var(--gold-tint)] px-2 py-1 text-[11px] text-[var(--gold-deep)]"
          >
            #{tagFilter} <X size={11} />
          </button>
        )}
      </div>

      {allTags.length > 0 && !tagFilter && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-[var(--fg-subtle)]">标签:</span>
          {allTags.slice(0, 30).map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className="rounded-sm border border-[var(--border)] bg-[var(--bg-page)] px-2 py-0.5 text-[var(--fg-muted)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)]"
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* key forces fresh state when switching between editing different notes */}
            <NoteForm
              key={editing?.id ?? "new"}
              initial={editing}
              onDone={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--fg-muted)]">Loading…</div>
      ) : (notes ?? []).length === 0 ? (
        <div className="panel-cream framed rounded-sm py-12 text-center text-sm text-[var(--fg-muted)]">
          {showArchived
            ? "尚无归档笔记。"
            : q || tagFilter || kindFilter !== "all"
            ? "没有匹配的笔记。换一组过滤条件试试。"
            : "知识库为空。从一条 Highlight 开始：你最近读到的一句话。"}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(notes ?? []).map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={() => {
                setEditing(n);
                setShowForm(true);
              }}
              onTagClick={(t) => setTagFilter(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 text-[11px] transition-colors ${
        active
          ? "bg-[var(--gold-tint)] text-[var(--gold-deep)]"
          : "text-[var(--fg-muted)] hover:bg-[var(--bg-raised)]"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Form ---------- */

function NoteForm({ initial, onDone }: { initial: NoteDTO | null; onDone: () => void }) {
  const create = useCreateNote();
  const update = useUpdateNote();
  const { data: goals } = useGoals();
  const { data: projects } = useProjects();

  const [kind, setKind] = useState<NoteKind>(initial?.kind ?? "note");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [sourceTitle, setSourceTitle] = useState(initial?.sourceTitle ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(", ") ?? "");
  const [areaId, setAreaId] = useState<string | null>(initial?.areaId ?? null);
  const [projectId, setProjectId] = useState<string | null>(initial?.projectId ?? null);
  const [goalId, setGoalId] = useState<string | null>(initial?.goalId ?? null);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [error, setError] = useState<string | null>(null);

  const editing = !!initial;
  const hasContent = hasNoteWritableContent({ title, body, sourceTitle, sourceUrl });

  const submit = async () => {
    if (!hasContent) {
      setError("请先填写标题、正文或来源信息");
      return;
    }
    setError(null);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 12);
    const payload = {
      kind,
      title: normalizeNoteTitle({ title, body, sourceTitle, sourceUrl }),
      body: body.trim(),
      sourceUrl: sourceUrl.trim() || null,
      sourceTitle: sourceTitle.trim() || null,
      author: author.trim() || null,
      tags,
      areaId,
      projectId,
      goalId,
      pinned,
    };
    try {
      if (editing && initial) {
        await update.mutateAsync({ id: initial.id, body: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onDone();
    } catch (e) {
      setError((e as Error).message || "保存失败，请稍后重试");
    }
  };

  return (
    <div className="panel-cream framed rounded-sm p-5">
      <div className="mb-3 section-label">
        <span className="cn text-base">{editing ? "编辑笔记" : "新增笔记"}</span>
        <span className="en text-[10px]">{editing ? "Edit Note" : "New Note"}</span>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <div className="grid gap-1.5">
            <Label>类型</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_META[k].cn} · {KIND_META[k].en}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="一句话主旨 · 书名 · 文章标题"
              autoFocus
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>正文 / 摘录</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === "quote" ? "原话" : kind === "highlight" ? "你划下的那段" : "写下来..."}
            rows={kind === "quote" || kind === "highlight" ? 4 : 6}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>作者 (optional)</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="谁说的 / 写的" />
          </div>
          <div className="grid gap-1.5">
            <Label>来源标题 (optional)</Label>
            <Input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="书名 / 文章名 / 视频标题"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>来源 URL (optional)</Label>
            <Input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>标签 (逗号分隔)</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例 productivity, dalio, decision"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>关联 Area</Label>
            <AreaSelect value={areaId} onChange={setAreaId} />
          </div>
          <div className="grid gap-1.5">
            <Label>关联 Goal</Label>
            <Select
              value={goalId ?? ""}
              onChange={(e) => setGoalId(e.target.value || null)}
            >
              <option value="">— 无 —</option>
              {(goals ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.objective.slice(0, 40)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>关联 Project</Label>
            <Select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value || null)}
            >
              <option value="">— 无 —</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--fg-muted)]">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="accent-[var(--gold)]"
            />
            <Pin size={12} /> 置顶
          </label>
          {error && (
            <div aria-live="polite" className="min-w-0 flex-1 text-right text-[12px] text-[var(--danger)]">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDone}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={create.isPending || update.isPending || !hasContent}
            >
              {create.isPending || update.isPending
                ? "Saving…"
                : editing
                ? "Save"
                : "Create (+15 XP)"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Card ---------- */

function NoteCard({
  note,
  onEdit,
  onTagClick,
}: {
  note: NoteDTO;
  onEdit: () => void;
  onTagClick: (tag: string) => void;
}) {
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const meta = KIND_META[note.kind];
  const Icon = meta.icon;

  return (
    <div className={`panel-cream framed group flex flex-col rounded-sm p-4 ${note.archived ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border"
          style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}10` }}
          title={meta.en}
        >
          <Icon size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            {note.pinned && (
              <Pin size={11} className="shrink-0 text-[var(--gold-deep)]" />
            )}
            <h3 className="font-display text-[14px] font-bold leading-snug text-[var(--fg-strong)]">
              {note.title}
            </h3>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <span style={{ color: meta.color }}>{meta.en}</span>
            {note.author && <span>· {note.author}</span>}
            {note.sourceTitle && <span>· {note.sourceTitle}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() =>
              update.mutate({ id: note.id, body: { pinned: !note.pinned } })
            }
            className="grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-[var(--gold-tint)] hover:text-[var(--gold-deep)]"
            title={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={onEdit}
            className="grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-[var(--gold-tint)] hover:text-[var(--gold-deep)]"
            title="Edit"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() =>
              update.mutate({ id: note.id, body: { archived: !note.archived } })
            }
            className="grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-[var(--gold-tint)] hover:text-[var(--gold-deep)]"
            title={note.archived ? "Unarchive" : "Archive"}
          >
            {note.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this note?")) remove.mutate(note.id);
            }}
            className="grid h-7 w-7 place-items-center rounded-sm text-[var(--fg-muted)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {note.body && (
        <p
          className={`mt-2 line-clamp-5 text-[12px] leading-relaxed text-[var(--fg)] ${
            note.kind === "quote" ? "border-l-2 pl-3 italic" : ""
          }`}
          style={note.kind === "quote" ? { borderColor: meta.color } : {}}
        >
          {note.body}
        </p>
      )}

      {note.sourceUrl && (
        <a
          href={note.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-[11px] text-[var(--gold-deep)] hover:underline"
        >
          <ExternalLink size={10} />
          打开原文
        </a>
      )}

      <div className="mt-auto pt-3">
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((t) => (
              <button
                key={t}
                onClick={() => onTagClick(t)}
                className="rounded-sm bg-[var(--gold-tint)] px-1.5 py-0.5 text-[10px] text-[var(--gold-deep)] hover:bg-[var(--gold)]/30"
              >
                #{t}
              </button>
            ))}
          </div>
        )}
        {(note.area || note.project || note.goal) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--fg-subtle)]">
            {note.area && (
              <span className="flex items-center gap-1">
                {note.area.icon} {note.area.name}
              </span>
            )}
            {note.project && (
              <Link
                href="/projects"
                className="rounded-sm border border-[var(--border)] px-1.5 hover:border-[var(--gold)]"
              >
                🏗️ {note.project.title}
              </Link>
            )}
            {note.goal && (
              <Link
                href="/goals"
                className="rounded-sm border border-[var(--border)] px-1.5 hover:border-[var(--gold)]"
              >
                🎯 {note.goal.objective.slice(0, 30)}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
