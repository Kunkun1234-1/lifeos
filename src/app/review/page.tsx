"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Heading1,
  ImagePlus,
  ListChecks,
  PenLine,
  Plus,
  Quote,
  Save,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useCreateReview, useReviews } from "@/hooks/queries";
import type { ReviewDTO } from "@/lib/types";

type Tab = "daily" | "weekly" | "monthly" | "quarterly";

type ReflectionImage = {
  id: string;
  url: string;
  name: string;
};

type ReflectionDraft = {
  title: string;
  body: string;
  images: ReflectionImage[];
};

type ReflectionTemplate = {
  name: string;
  questions: string[];
};

type ParsedContent = {
  title?: string;
  body?: string;
  images?: ReflectionImage[];
  templateName?: string;
  templateQuestions?: string[];
  top3Done?: string;
  oneLiner?: string;
  notes?: string;
  okrProgress?: string;
  biggestWin?: string;
  biggestRegret?: string;
  principlesUsed?: string;
  decisionsToReview?: string;
  nextWeekTop3?: string;
  keep?: string;
  more?: string;
  less?: string;
  stop?: string;
  identityShift?: string;
  nextQuarterTop3?: string;
};

const TABS: Array<{
  value: Tab;
  cn: string;
  en: string;
  icon: typeof BookOpen;
}> = [
  { value: "daily", cn: "每日", en: "Daily", icon: BookOpen },
  { value: "weekly", cn: "每周", en: "Weekly", icon: CalendarDays },
  { value: "monthly", cn: "每月", en: "Monthly", icon: CalendarRange },
  { value: "quarterly", cn: "每季", en: "Quarterly", icon: CalendarClock },
];

const DEFAULT_TEMPLATES: Record<Tab, ReflectionTemplate> = {
  daily: {
    name: "Daily Mirror",
    questions: [
      "今天真正推进了什么？",
      "哪一个瞬间最值得被记住？",
      "明天最小但关键的一步是什么？",
    ],
  },
  weekly: {
    name: "Weekly Review",
    questions: [
      "本周最重要的进展是什么？",
      "哪些承诺被拖延了，真实原因是什么？",
      "下周只保留 3 件事，会是哪 3 件？",
    ],
  },
  monthly: {
    name: "Monthly Synthesis",
    questions: [
      "这个月的主线是什么？",
      "哪些事情应该 Keep / More / Less / Stop？",
      "这个月的行为更靠近还是更偏离我的身份认同？",
    ],
  },
  quarterly: {
    name: "Quarterly Strategy",
    questions: [
      "这个季度的关键弧线是什么？",
      "OKR 评分是多少，为什么？",
      "下季度最值得押注的 3 个方向是什么？",
    ],
  },
};

const TEMPLATE_STORAGE_KEY = "lifeos.review.templates.v1";

export default function ReviewPage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [drafts, setDrafts] = useState<Record<Tab, ReflectionDraft>>(() => makeInitialDrafts());
  const [templates, setTemplates] = useState<Record<Tab, ReflectionTemplate>>(DEFAULT_TEMPLATES);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [openYears, setOpenYears] = useState<Record<string, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const create = useCreateReview();
  const { data: reviews = [] } = useReviews();
  const draft = drafts[tab];
  const currentTemplate = templates[tab];

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [reviews],
  );
  const heatmapCells = useMemo(() => buildHeatmap(sortedReviews), [sortedReviews]);
  const reviewTree = useMemo(() => buildReviewTree(sortedReviews), [sortedReviews]);
  const selectedReview = useMemo(
    () => sortedReviews.find((review) => review.id === selectedReviewId) ?? null,
    [selectedReviewId, sortedReviews],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (stored) {
        setTemplates({ ...DEFAULT_TEMPLATES, ...JSON.parse(stored) });
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
    } finally {
      setTemplatesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!templatesLoaded) return;
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  }, [templates, templatesLoaded]);

  useEffect(() => {
    const normalized = normalizeMarkdownImageDraft(draft.body, draft.images);
    if (!normalized.changed) return;
    setDrafts((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        body: normalized.body,
        images: normalized.images,
      },
    }));
  }, [draft.body, draft.images, tab]);

  const updateDraft = (patch: Partial<ReflectionDraft>) => {
    setSaveMessage(null);
    setDrafts((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], ...patch },
    }));
  };

  const updateTemplate = (patch: Partial<ReflectionTemplate>) => {
    setTemplates((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], ...patch },
    }));
  };

  const newDraft = () => {
    setSelectedReviewId(null);
    setSaveMessage(null);
    setDrafts((prev) => ({
      ...prev,
      [tab]: makeDraft(tab),
    }));
  };

  const selectReview = (review: ReviewDTO) => {
    const nextTab = toTab(review.kind);
    const content = parseContent(review.content);
    setTab(nextTab);
    setSelectedReviewId(review.id);
    setSaveMessage("正在查看历史反思；再次保存会创建一条新的记录。");
    setDrafts((prev) => ({
      ...prev,
      [nextTab]: {
        title: content.title || fallbackTitle(nextTab, review.createdAt, content),
        body: content.body || legacyBody(content),
        images: normalizeImages(content.images),
      },
    }));
  };

  const applyTemplate = () => {
    const block = [
      `## ${currentTemplate.name}`,
      ...currentTemplate.questions.map((q) => `\n### ${q}\n`),
    ].join("\n");
    updateDraft({
      body: draft.body.trim() ? `${draft.body.trim()}\n\n${block}` : block,
    });
    setModelOpen(false);
  };

  const insertBlock = (kind: "heading" | "quote" | "list") => {
    const snippet =
      kind === "heading"
        ? "\n\n## "
        : kind === "quote"
          ? "\n\n> "
          : "\n\n- ";
    updateDraft({ body: `${draft.body}${snippet}` });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "图片上传失败");
      }
      const image = {
        id: `${Date.now()}-${file.name}`,
        url: data.url,
        name: file.name,
      };
      updateDraft({
        images: [...draft.images, image],
      });
      setSaveMessage("图片已插入到纸面。");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (id: string) => {
    updateDraft({ images: draft.images.filter((image) => image.id !== id) });
  };

  const saveReflection = async () => {
    const templateQuestions = currentTemplate.questions.filter(Boolean);
    await create.mutateAsync({
      kind: tab,
      content: {
        mode: "essay",
        title: draft.title,
        body: draft.body,
        images: draft.images,
        templateName: currentTemplate.name,
        templateQuestions,
        oneLiner: firstLine(draft.body),
        notes: draft.body,
        biggestWin: tab === "weekly" || tab === "monthly" ? draft.title : undefined,
        nextWeekTop3: tab === "weekly" ? templateQuestions.join("\n") : undefined,
        nextQuarterTop3: tab === "quarterly" ? templateQuestions.join("\n") : undefined,
      },
    });
    setSelectedReviewId(null);
    setSaveMessage("已保存为新的反思记录。");
  };

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5 lg:px-6">
      <div className="grid min-h-[calc(100vh-112px)] gap-3 md:grid-cols-[280px_1fr]">
        <aside className="panel-ink ornate flex min-h-[360px] flex-col overflow-hidden rounded-sm">
          <div className="border-b border-[var(--gold)]/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg tracking-[0.14em] text-[var(--fg-on-ink)]">
                  反思
                  <span className="ml-2 font-display-en text-[11px] text-[var(--gold-pale)]">
                    Recent
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--fg-on-ink)]/68">
                  最近 7 周记录热力
                </p>
              </div>
              <button
                type="button"
                title="新建反思"
                onClick={newDraft}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-[var(--gold)]/70 bg-white/5 text-[var(--gold-pale)] transition hover:bg-[var(--gold)]/15"
              >
                <Plus size={15} />
              </button>
            </div>

            <div
              className="mt-4 grid justify-start gap-1.5"
              style={{ gridTemplateColumns: "repeat(7, 14px)" }}
            >
              {heatmapCells.map((cell) => (
                <span
                  key={cell.ymd}
                  title={`${cell.ymd} · ${cell.count} 条反思`}
                  className={`h-3.5 w-3.5 rounded-[3px] border ${heatTone(cell.count)}`}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--fg-on-ink)]/62">
              <span>少</span>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((count) => (
                  <span key={count} className={`h-3.5 w-3.5 rounded-[2px] border ${heatTone(count)}`} />
                ))}
              </div>
              <span>多</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="font-display text-base tracking-[0.11em] text-[var(--fg-on-ink)]">
                反思目录
              </div>
              <span className="rounded-sm border border-[var(--gold)]/35 px-2 py-0.5 font-mono text-[11px] text-[var(--gold-pale)]">
                {sortedReviews.length}
              </span>
            </div>

            <div className="min-h-[280px] flex-1 overflow-y-auto pr-1">
              {reviewTree.length === 0 ? (
                <div className="grid min-h-[112px] place-items-center rounded-sm border border-dashed border-[var(--gold)]/32 bg-white/[0.04] px-4 text-center text-sm text-[var(--fg-on-ink)]/62">
                  还没有反思记录
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewTree.map((year) => {
                    const yearOpen = openYears[year.year] ?? true;
                    return (
                      <div key={year.year}>
                        <button
                          type="button"
                          onClick={() => setOpenYears((prev) => ({ ...prev, [year.year]: !yearOpen }))}
                          className="flex w-full items-center gap-1.5 font-display text-sm tracking-[0.08em] text-[var(--fg-on-ink)]"
                        >
                          {yearOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {year.year}
                        </button>
                        {yearOpen && (
                          <div className="mt-2 space-y-2 border-l border-[var(--gold)]/24 pl-3">
                            {year.months.map((month) => {
                              const monthKey = `${year.year}-${month.month}`;
                              const monthOpen = openMonths[monthKey] ?? true;
                              return (
                                <div key={monthKey}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMonths((prev) => ({ ...prev, [monthKey]: !monthOpen }))
                                    }
                                    className="flex w-full items-center gap-1.5 text-[12px] font-semibold text-[var(--gold-pale)]"
                                  >
                                    {monthOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                    {month.label}
                                  </button>
                                  {monthOpen && (
                                    <div className="mt-1 space-y-1">
                                      {month.days.map((day) => (
                                        <div key={day.key} className="space-y-1">
                                          <div className="px-2 pt-1 text-[10px] text-[var(--fg-on-ink)]/48">
                                            {day.label}
                                          </div>
                                          {day.entries.map((entry) => (
                                            <button
                                              key={entry.review.id}
                                              type="button"
                                              onClick={() => selectReview(entry.review)}
                                              className={`w-full rounded-sm border px-2.5 py-2 text-left transition ${
                                                selectedReviewId === entry.review.id
                                                  ? "border-[var(--gold)] bg-[var(--gold)]/16"
                                                  : "border-transparent hover:border-[var(--gold)]/30 hover:bg-white/[0.06]"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-[12px] font-semibold text-[var(--fg-on-ink)]">
                                                  {entry.title}
                                                </span>
                                                <span className="shrink-0 rounded-sm bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--gold-pale)]">
                                                  {entry.kindLabel}
                                                </span>
                                              </div>
                                              {entry.preview && (
                                                <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--fg-on-ink)]/55">
                                                  {entry.preview}
                                                </div>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        <article className="panel-cream framed flex min-w-0 flex-col overflow-hidden rounded-sm">
          <header className="border-b border-[var(--border)] px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl tracking-[0.12em] text-[var(--fg-strong)] md:text-4xl">
                    反思
                  </h1>
                  <PenLine size={22} className="text-[var(--gold-deep)]" />
                </div>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--fg-muted)]">
                  像写随笔一样记录：左侧回看时间线，右侧切换反思周期，中间保持一张完整纸面。
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="grid grid-cols-2 rounded-sm border border-[var(--border)] bg-white/54 p-1 sm:flex">
                  {TABS.map(({ value, cn, en, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setTab(value);
                        setSelectedReviewId(null);
                        setSaveMessage(null);
                      }}
                      className={`flex h-9 min-w-[84px] items-center justify-center gap-1.5 rounded-sm px-2.5 text-[13px] transition ${
                        tab === value
                          ? "bg-[var(--bg-panel-ink)] text-[var(--fg-on-ink)] shadow-sm"
                          : "text-[var(--fg-muted)] hover:bg-[var(--gold-tint)] hover:text-[var(--fg-strong)]"
                      }`}
                    >
                      <Icon size={15} />
                      <span className="font-display">{cn}</span>
                      <span className="hidden font-display-en text-[9px] md:inline">{en}</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant={modelOpen ? "primary" : "secondary"}
                    onClick={() => setModelOpen((value) => !value)}
                    className="h-9 min-w-[108px]"
                  >
                    <SlidersHorizontal size={15} />
                    Model
                  </Button>
                  <div className="text-[13px] text-[var(--fg-muted)]">
                    选择模板
                    <span className="mx-2 text-[var(--border-strong)]">·</span>
                    <span className="font-semibold text-[var(--gold-deep)]">自由书写</span>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {modelOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-3 rounded-sm border border-[var(--border)] bg-[var(--bg-page)]/75 p-3 lg:grid-cols-[260px_1fr_auto]">
                    <div>
                      <Label>Model Name</Label>
                      <Input
                        className="mt-1"
                        value={currentTemplate.name}
                        onChange={(event) => updateTemplate({ name: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Questions</Label>
                      <Textarea
                        className="mt-1 min-h-[96px]"
                        value={currentTemplate.questions.join("\n")}
                        onChange={(event) =>
                          updateTemplate({
                            questions: event.target.value
                              .split("\n")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" className="w-full" onClick={applyTemplate}>
                        <Sparkles size={15} />
                        套用
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </header>

          <section className="flex flex-1 flex-col px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-[var(--border)] bg-[rgba(255,252,242,0.76)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.48)]">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[rgba(247,240,220,0.72)] px-4 py-2.5 md:px-5">
                <ToolbarButton title="标题" onClick={() => insertBlock("heading")}>
                  <Heading1 size={15} />
                </ToolbarButton>
                <ToolbarButton title="引用" onClick={() => insertBlock("quote")}>
                  <Quote size={15} />
                </ToolbarButton>
                <ToolbarButton title="清单" onClick={() => insertBlock("list")}>
                  <ListChecks size={15} />
                </ToolbarButton>
                <ToolbarButton
                  title={uploading ? "上传中" : "插入图片"}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus size={15} />
                </ToolbarButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="ml-auto hidden text-[12px] text-[var(--fg-muted)] md:block">
                  {currentTemplate.name} · {currentTemplate.questions.length} 个问题
                </div>
              </div>

              <div className="flex-1 bg-[linear-gradient(180deg,rgba(255,252,242,0.98),rgba(247,239,218,0.96))] p-4 md:p-6">
                {draft.images.length > 0 && (
                  <div className={draft.images.length === 1 ? "mb-5 grid gap-3" : "mb-5 grid gap-3 lg:grid-cols-2"}>
                    {draft.images.map((image) => (
                      <figure
                        key={image.id}
                        className="group overflow-hidden rounded-sm border border-[var(--border)] bg-white/75 shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.name}
                          className="mx-auto block max-h-[420px] max-w-full bg-[rgba(255,252,242,0.82)] object-contain"
                        />
                        <figcaption className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--fg-muted)]">
                          <span className="truncate">{image.name}</span>
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="text-[var(--danger)] opacity-75 hover:opacity-100"
                          >
                            移除
                          </button>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}

                <Textarea
                  value={draft.body}
                  onChange={(event) => updateDraft({ body: event.target.value })}
                  rows={18}
                  placeholder="今天我观察到..."
                  className={`resize-y border-0 bg-transparent p-0 text-[17px] leading-9 shadow-none focus:shadow-none ${
                    draft.images.length > 0
                      ? "min-h-[300px] md:min-h-[360px]"
                      : "min-h-[500px] md:min-h-[calc(100vh-500px)]"
                  }`}
                />

                {uploadError && (
                  <div className="mt-3 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                    {uploadError}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-white/32 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-[var(--fg-muted)]">
                  <span>{saveMessage ?? (selectedReview ? "历史反思已载入，保存会创建新记录。" : "手动保存")}</span>
                  <span>字数：{countCjkAwareWords(draft.body)}</span>
                  <span>图片：{draft.images.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={newDraft}>
                    <Plus size={15} />
                    新建
                  </Button>
                  <Button
                    type="button"
                    onClick={saveReflection}
                    disabled={create.isPending || !draft.body.trim()}
                  >
                    <Save size={15} />
                    {create.isPending ? "Saving..." : "保存反思"}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-sm border border-[var(--border)] bg-white/60 text-[var(--gold-deep)] transition hover:border-[var(--gold)] hover:bg-[var(--gold-tint)] disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function makeInitialDrafts(): Record<Tab, ReflectionDraft> {
  return {
    daily: makeDraft("daily"),
    weekly: makeDraft("weekly"),
    monthly: makeDraft("monthly"),
    quarterly: makeDraft("quarterly"),
  };
}

function makeDraft(tab: Tab): ReflectionDraft {
  return {
    title: `${tabLabel(tab)}反思 · ${new Date().toLocaleDateString("zh-CN")}`,
    body: "",
    images: [],
  };
}

function normalizeMarkdownImageDraft(body: string, images: ReflectionImage[]) {
  const markdownImagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const extracted: ReflectionImage[] = [];
  const cleanedBody = body
    .replace(markdownImagePattern, (_match, alt: string, url: string) => {
      const imageUrl = url.trim();
      if (!imageUrl) return "";
      extracted.push({
        id: `markdown-${imageUrl}-${extracted.length}`,
        url: imageUrl,
        name: alt.trim() || imageNameFromUrl(imageUrl),
      });
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimStart();

  if (extracted.length === 0) {
    return { body, images, changed: false };
  }

  const existingUrls = new Set(images.map((image) => image.url));
  const mergedImages = [...images];
  for (const image of extracted) {
    if (!existingUrls.has(image.url)) {
      mergedImages.push(image);
      existingUrls.add(image.url);
    }
  }

  return {
    body: cleanedBody,
    images: mergedImages,
    changed: cleanedBody !== body || mergedImages.length !== images.length,
  };
}

function imageNameFromUrl(url: string): string {
  const fallback = "插入图片";
  try {
    const pathname = url.startsWith("http") ? new URL(url).pathname : url;
    const filename = pathname.split("/").filter(Boolean).pop();
    return filename ? decodeURIComponent(filename) : fallback;
  } catch {
    return fallback;
  }
}

function tabLabel(tab: Tab): string {
  return TABS.find((item) => item.value === tab)?.cn ?? "每日";
}

function toTab(kind: string): Tab {
  return kind === "weekly" || kind === "monthly" || kind === "quarterly" ? kind : "daily";
}

function parseContent(raw: string): ParsedContent {
  try {
    const parsed = JSON.parse(raw) as ParsedContent;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeImages(images: ParsedContent["images"]): ReflectionImage[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((image) => image && typeof image.url === "string")
    .map((image, index) => ({
      id: image.id || `${image.url}-${index}`,
      url: image.url,
      name: image.name || `image-${index + 1}`,
    }));
}

function legacyBody(content: ParsedContent): string {
  const parts = [
    content.oneLiner ? `# ${content.oneLiner}` : "",
    content.top3Done ? `## Top 3\n${content.top3Done}` : "",
    content.okrProgress ? `## OKR\n${content.okrProgress}` : "",
    content.biggestWin ? `## 最大收获\n${content.biggestWin}` : "",
    content.biggestRegret ? `## 最大遗憾\n${content.biggestRegret}` : "",
    content.principlesUsed ? `## Principles\n${content.principlesUsed}` : "",
    content.decisionsToReview ? `## 决策复看\n${content.decisionsToReview}` : "",
    content.nextWeekTop3 ? `## 下周 Top 3\n${content.nextWeekTop3}` : "",
    content.keep ? `## Keep\n${content.keep}` : "",
    content.more ? `## More\n${content.more}` : "",
    content.less ? `## Less\n${content.less}` : "",
    content.stop ? `## Stop\n${content.stop}` : "",
    content.identityShift ? `## 身份演变\n${content.identityShift}` : "",
    content.nextQuarterTop3 ? `## 下季度 Top 3\n${content.nextQuarterTop3}` : "",
    content.notes ?? "",
  ];
  return parts.filter(Boolean).join("\n\n");
}

function fallbackTitle(tab: Tab, date: string, content: ParsedContent): string {
  if (content.oneLiner) return content.oneLiner;
  if (content.biggestWin) return content.biggestWin;
  return `${tabLabel(tab)}反思 · ${new Date(date).toLocaleDateString("zh-CN")}`;
}

function firstLine(body: string): string {
  return body
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean)
    ?.slice(0, 120) ?? "";
}

function countCjkAwareWords(value: string): number {
  const compact = value.trim();
  if (!compact) return 0;
  const cjk = compact.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const latin = compact
    .replace(/[\u4e00-\u9fff]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latin;
}

function buildHeatmap(reviews: ReviewDTO[]) {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const key = ymd(new Date(review.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = startOfDay(new Date());
  return Array.from({ length: 49 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (48 - index));
    const key = ymd(date);
    return { ymd: key, count: counts.get(key) ?? 0 };
  });
}

function heatTone(count: number): string {
  if (count >= 3) return "border-[#e8c977]/80 bg-[#d4a94d]";
  if (count === 2) return "border-[#b68838]/70 bg-[#b68838]/70";
  if (count === 1) return "border-[#b68838]/50 bg-[#b68838]/35";
  return "border-white/10 bg-white/10";
}

function buildReviewTree(reviews: ReviewDTO[]) {
  const years = new Map<
    string,
    Map<
      string,
      Map<
        string,
        Array<{
          review: ReviewDTO;
          title: string;
          preview: string;
          kindLabel: string;
        }>
      >
    >
  >();

  for (const review of reviews) {
    const date = new Date(review.createdAt);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const content = parseContent(review.content);
    const kind = toTab(review.kind);
    const title = content.title || fallbackTitle(kind, review.createdAt, content);
    const preview = (content.body || legacyBody(content)).replace(/\s+/g, " ").slice(0, 90);

    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    if (!months.has(month)) months.set(month, new Map());
    const days = months.get(month)!;
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push({
      review,
      title,
      preview,
      kindLabel: tabLabel(kind),
    });
  }

  return [...years.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, days]) => ({
      month,
      label: `${Number(month)}月`,
      days: [...days.entries()].map(([day, entries]) => ({
        key: `${year}-${month}-${day}`,
        label: `${Number(day)}日`,
        entries,
      })),
    })),
  }));
}

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
