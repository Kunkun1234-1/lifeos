import type { NoteDTO, NoteKind } from "./types";

type DBNote = {
  id: string;
  kind: string;
  title: string;
  body: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  author: string | null;
  tags: string;
  pinned: boolean;
  archived: boolean;
  areaId: string | null;
  area: { id: string; name: string; icon: string; color: string } | null;
  projectId: string | null;
  project: { id: string; title: string } | null;
  goalId: string | null;
  goal: { id: string; objective: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Tag storage uses leading + trailing commas so a SQL `LIKE '%,foo,%'` query
 * matches `foo` exactly without false-positive substring hits across other tags
 * (e.g. `de` vs `decision` / `dalio`).
 *
 * Stored format example: `,decision,dalio,lifeos,`
 * Empty list stored as ``.
 */
export function tagsToString(tags: string[]): string {
  const cleaned = Array.from(
    new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0))
  );
  if (cleaned.length === 0) return "";
  return `,${cleaned.join(",")},`;
}

export function tagsFromString(raw: string): string[] {
  if (!raw) return [];
  // Tolerate both wrapped (",a,b,") and legacy unwrapped ("a,b") formats
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Build the SQL substring for a `tag` filter. Escapes LIKE meta-chars. */
export function tagFilterPattern(tag: string): string {
  const safe = tag.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  return `,${safe},`;
}

export function serializeNote(n: DBNote): NoteDTO {
  return {
    id: n.id,
    kind: (n.kind as NoteKind) ?? "note",
    title: n.title,
    body: n.body,
    sourceUrl: n.sourceUrl,
    sourceTitle: n.sourceTitle,
    author: n.author,
    tags: tagsFromString(n.tags),
    pinned: n.pinned,
    archived: n.archived,
    areaId: n.areaId,
    area: n.area,
    projectId: n.projectId,
    project: n.project,
    goalId: n.goalId,
    goal: n.goal ? { id: n.goal.id, objective: n.goal.objective } : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
