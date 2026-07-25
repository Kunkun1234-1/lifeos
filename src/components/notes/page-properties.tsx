"use client";

import { Pin, PinOff, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { AreaSelect } from "@/components/area-select";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NoteDTO, NoteKind, GoalDTO, ProjectDTO } from "@/lib/types";
import styles from "./notes-workspace.module.css";

const KIND_OPTIONS: { value: NoteKind; label: string }[] = [
  { value: "note", label: "笔记" },
  { value: "highlight", label: "高亮" },
  { value: "quote", label: "语录" },
  { value: "link", label: "链接" },
  { value: "inspiration", label: "灵感" },
];

type PagePropertiesProps = {
  note: NoteDTO;
  goals: GoalDTO[];
  projects: ProjectDTO[];
  onChange: (patch: Record<string, unknown>) => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  saving?: boolean;
};

export function PageProperties({
  note,
  goals,
  projects,
  onChange,
  onTogglePin,
  onToggleArchive,
  onDelete,
  saving,
}: PagePropertiesProps) {
  return (
    <aside className={styles.props}>
      <div className={styles.propsHead}>
        <span>属性</span>
        {saving ? <em className={styles.saving}>保存中…</em> : null}
      </div>

      <div className={styles.propsField}>
        <Label>类型</Label>
        <Select
          value={note.kind}
          onChange={(e) => onChange({ kind: e.target.value })}
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.propsField}>
        <Label>标签（逗号分隔）</Label>
        <Input
          value={note.tags.join(", ")}
          placeholder="decision, learning"
          onChange={(e) =>
            onChange({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 12),
            })
          }
        />
      </div>

      <div className={styles.propsField}>
        <Label>领域</Label>
        <AreaSelect
          value={note.areaId}
          onChange={(areaId) => onChange({ areaId })}
          allowNone
        />
      </div>

      <div className={styles.propsField}>
        <Label>目标</Label>
        <Select
          value={note.goalId ?? ""}
          onChange={(e) => onChange({ goalId: e.target.value || null })}
        >
          <option value="">—</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.objective}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.propsField}>
        <Label>项目</Label>
        <Select
          value={note.projectId ?? ""}
          onChange={(e) => onChange({ projectId: e.target.value || null })}
        >
          <option value="">—</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.propsField}>
        <Label>来源标题</Label>
        <Input
          value={note.sourceTitle ?? ""}
          onChange={(e) => onChange({ sourceTitle: e.target.value || null })}
        />
      </div>

      <div className={styles.propsField}>
        <Label>来源链接</Label>
        <Input
          value={note.sourceUrl ?? ""}
          placeholder="https://"
          onChange={(e) => onChange({ sourceUrl: e.target.value || null })}
        />
      </div>

      <div className={styles.propsField}>
        <Label>作者</Label>
        <Input
          value={note.author ?? ""}
          onChange={(e) => onChange({ author: e.target.value || null })}
        />
      </div>

      <div className={styles.propsField}>
        <Label>封面 URL</Label>
        <Textarea
          rows={2}
          value={note.coverUrl ?? ""}
          placeholder="可选"
          onChange={(e) => onChange({ coverUrl: e.target.value || null })}
        />
      </div>

      <div className={styles.propsActions}>
        <Button type="button" variant="ghost" size="sm" onClick={onTogglePin}>
          {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          {note.pinned ? "取消置顶" : "置顶"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onToggleArchive}>
          {note.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          {note.archived ? "取消归档" : "归档"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 size={14} />
          删除
        </Button>
      </div>
    </aside>
  );
}
