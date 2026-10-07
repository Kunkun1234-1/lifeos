import type { NoteDTO, NoteKind, NoteTreeNodeDTO } from "./types";

export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_BODY_MAX_LENGTH = 100_000;
export const NOTE_MAX_DEPTH = 8;
export const NOTE_ICON_MAX_LENGTH = 16;

type DBNote = {
  id: string;
  parentId?: string | null;
  position?: number;
  icon?: string | null;
  coverUrl?: string | null;
  kind: string;
  title: string;
  body: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  author: string | null;
  tags: string;
  pinned: boolean;
  archived: boolean;
  deletedAt?: Date | null;
  areaId: string | null;
  area: { id: string; name: string; icon: string; color: string } | null;
  projectId: string | null;
  project: { id: string; title: string } | null;
  goalId: string | null;
  goal: { id: string; objective: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

type NoteTitleInput = {
  title?: string | null;
  body?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
};

function truncateTitle(value: string): string {
  if (value.length <= NOTE_TITLE_MAX_LENGTH) return value;
  return `${value.slice(0, NOTE_TITLE_MAX_LENGTH - 3)}...`;
}

function firstBodyLine(body?: string | null): string {
  return (
    body
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ""
  );
}

export function hasNoteWritableContent(input: NoteTitleInput): boolean {
  return Boolean(
    input.title?.trim() ||
      input.body?.trim() ||
      input.sourceTitle?.trim() ||
      input.sourceUrl?.trim()
  );
}

export function normalizeNoteTitle(input: NoteTitleInput): string {
  const candidate =
    input.title?.trim() ||
    input.sourceTitle?.trim() ||
    firstBodyLine(input.body) ||
    input.sourceUrl?.trim() ||
    "未命名页面";

  return truncateTitle(candidate);
}

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
    parentId: n.parentId ?? null,
    position: n.position ?? 0,
    icon: n.icon ?? null,
    coverUrl: n.coverUrl ?? null,
    kind: (n.kind as NoteKind) ?? "note",
    title: n.title,
    body: n.body,
    sourceUrl: n.sourceUrl,
    sourceTitle: n.sourceTitle,
    author: n.author,
    tags: tagsFromString(n.tags),
    pinned: n.pinned,
    archived: n.archived,
    deletedAt: n.deletedAt?.toISOString() ?? null,
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

export function serializeNoteTreeNode(
  n: {
    id: string;
    parentId: string | null;
    position: number;
    icon: string | null;
    kind: string;
    title: string;
    pinned: boolean;
    archived: boolean;
    updatedAt: Date;
    _count?: { children: number };
  }
): NoteTreeNodeDTO {
  return {
    id: n.id,
    parentId: n.parentId,
    position: n.position,
    icon: n.icon,
    kind: (n.kind as NoteKind) ?? "note",
    title: n.title,
    pinned: n.pinned,
    archived: n.archived,
    childCount: n._count?.children ?? 0,
    updatedAt: n.updatedAt.toISOString(),
  };
}

/** Walk ancestors to compute 0-based depth of a node (roots = 0). */
export async function getNoteDepth(
  getParentId: (id: string) => Promise<string | null | undefined>,
  noteId: string | null | undefined
): Promise<number> {
  if (!noteId) return -1;
  let depth = 0;
  let current: string | null | undefined = noteId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) throw new Error("CYCLE");
    seen.add(current);
    depth += 1;
    if (depth > NOTE_MAX_DEPTH + 2) throw new Error("CYCLE");
    current = await getParentId(current);
  }
  return depth - 1;
}

/**
 * Returns true if `candidateParentId` is the same as `noteId` or a descendant
 * of it (would create a cycle if used as the new parent).
 */
export async function wouldCreateNoteCycle(
  getParentId: (id: string) => Promise<string | null | undefined>,
  noteId: string,
  candidateParentId: string | null
): Promise<boolean> {
  if (!candidateParentId) return false;
  if (candidateParentId === noteId) return true;
  let current: string | null | undefined = candidateParentId;
  const seen = new Set<string>([noteId]);
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    if (seen.size > NOTE_MAX_DEPTH + 4) return true;
    current = await getParentId(current);
  }
  return false;
}

/** Build nested tree from a flat node list (sorted by position). */
export function buildNoteForest(nodes: NoteTreeNodeDTO[]): NoteTreeNodeDTO[] {
  const byParent = new Map<string | null, NoteTreeNodeDTO[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push({ ...node, children: [] });
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
  }

  const attach = (parentId: string | null): NoteTreeNodeDTO[] => {
    const list = byParent.get(parentId) ?? [];
    return list.map((node) => ({
      ...node,
      children: attach(node.id),
    }));
  };

  return attach(null);
}

/** Count descendants of a node in a flat list (excluding itself). */
export function countNoteDescendants(
  nodes: Pick<NoteTreeNodeDTO, "id" | "parentId">[],
  rootId: string
): number {
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n.id);
    childrenOf.set(n.parentId, list);
  }
  let count = 0;
  const stack = [...(childrenOf.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    count += 1;
    const kids = childrenOf.get(id);
    if (kids) stack.push(...kids);
  }
  return count;
}

export type NoteTrashNode = {
  id: string;
  parentId: string | null;
  deletedAt: Date | null;
  deletionBatchId: string | null;
};

export type NoteRestorePlan = {
  restoredIds: string[];
  detachRootIds: string[];
};

/** Return the root and every physical descendant, once, in parent-first order. */
export function collectNoteSubtreeIds(
  nodes: Pick<NoteTrashNode, "id" | "parentId">[],
  rootId: string
): string[] {
  const byId = new Set(nodes.map((node) => node.id));
  if (!byId.has(rootId)) return [];

  const childrenOf = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const children = childrenOf.get(node.parentId) ?? [];
    children.push(node.id);
    childrenOf.set(node.parentId, children);
  }

  const result: string[] = [];
  const seen = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return result;
}

/** Select only currently live rows so an older trash batch is never overwritten. */
export function planNoteSoftDelete(nodes: NoteTrashNode[], rootId: string): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return collectNoteSubtreeIds(nodes, rootId).filter((id) => {
    const node = byId.get(id);
    return node?.deletedAt === null;
  });
}

/**
 * Restore the selected subtree within one deletion batch. Its restored roots are
 * detached only when their original parent remains deleted, so valid tree links
 * and sibling order survive without resurrecting ancestors or sibling branches.
 */
export function planNoteRestore(nodes: NoteTrashNode[], selectedId: string): NoteRestorePlan {
  const selected = nodes.find((node) => node.id === selectedId);
  if (!selected?.deletedAt) return { restoredIds: [], detachRootIds: [] };

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const restoredIds = collectNoteSubtreeIds(nodes, selectedId).filter((id) => {
    const node = byId.get(id);
    if (!node?.deletedAt) return false;
    return selected.deletionBatchId
      ? node.deletionBatchId === selected.deletionBatchId
      : node.id === selected.id;
  });
  const restoredSet = new Set(restoredIds);
  const detachRootIds = restoredIds.filter((id) => {
    const node = byId.get(id);
    if (!node?.parentId || restoredSet.has(node.parentId)) return false;
    const parent = byId.get(node.parentId);
    return !parent || parent.deletedAt !== null;
  });

  return { restoredIds, detachRootIds };
}

/** Permanent removal is valid only when the entire physical subtree is trashed. */
export function planNotePermanentDelete(nodes: NoteTrashNode[], rootId: string): string[] {
  const ids = collectNoteSubtreeIds(nodes, rootId);
  if (ids.length === 0) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (ids.some((id) => byId.get(id)?.deletedAt === null)) {
    throw new Error("ACTIVE_NOTE_IN_SUBTREE");
  }
  return ids;
}
