import assert from "node:assert/strict";
import {
  planNotePermanentDelete,
  planNoteRestore,
  planNoteSoftDelete,
  type NoteTrashNode,
} from "../src/lib/notes";

const deletedAt = new Date("2026-10-07T04:00:00.000Z");

function live(
  id: string,
  parentId: string | null,
  extra: Record<string, unknown> = {}
): NoteTrashNode & Record<string, unknown> {
  return { id, parentId, deletedAt: null, deletionBatchId: null, ...extra };
}

function trashed(
  id: string,
  parentId: string | null,
  deletionBatchId: string,
  extra: Record<string, unknown> = {}
): NoteTrashNode & Record<string, unknown> {
  return { id, parentId, deletedAt, deletionBatchId, ...extra };
}

// Nested live + archived pages are deleted as one subtree. Metadata is read-only
// to the planner, so archived/content/link/order fields remain untouched.
const nested = [
  live("root", null, { archived: false, body: "root", position: 4 }),
  live("child", "root", { archived: true, body: "archived", areaId: "area-1" }),
  live("grandchild", "child", { archived: false, projectId: "project-1" }),
];
const nestedBefore = structuredClone(nested);
assert.deepEqual(planNoteSoftDelete(nested, "root"), ["root", "child", "grandchild"]);
assert.deepEqual(nested, nestedBefore);

// A child trashed earlier keeps its original batch when the parent is trashed.
// Restoring the parent batch must not resurrect that older trash.
const withPriorTrash = [
  trashed("root", null, "parent-batch"),
  trashed("prior-child", "root", "older-batch"),
  trashed("new-child", "root", "parent-batch"),
  trashed("new-grandchild", "new-child", "parent-batch"),
];
assert.deepEqual(planNoteRestore(withPriorTrash, "root"), {
  restoredIds: ["root", "new-child", "new-grandchild"],
  detachRootIds: [],
});

// Choosing a descendant restores only its selected branch, not same-batch
// ancestors or siblings. Its deleted parent causes the child to become a root.
assert.deepEqual(planNoteRestore(withPriorTrash, "new-child"), {
  restoredIds: ["new-child", "new-grandchild"],
  detachRootIds: ["new-child"],
});

// Restoring an independently deleted child while its parent stays deleted moves
// only that deletion-batch root to the top level.
assert.deepEqual(planNoteRestore(withPriorTrash, "prior-child"), {
  restoredIds: ["prior-child"],
  detachRootIds: ["prior-child"],
});

// User-scoped route queries omit foreign rows, so a foreign target cannot be planned.
const ownedRows = [live("owned", null)];
assert.deepEqual(planNoteSoftDelete(ownedRows, "foreign"), []);
assert.deepEqual(planNoteRestore(ownedRows, "foreign"), {
  restoredIds: [],
  detachRootIds: [],
});

// Permanent deletion rejects a live target or any malformed trashed subtree that
// still contains a live row, while allowing separately trashed descendants.
assert.throws(
  () => planNotePermanentDelete([live("active", null)], "active"),
  /ACTIVE_NOTE_IN_SUBTREE/
);
assert.throws(
  () =>
    planNotePermanentDelete(
      [trashed("trash-root", null, "batch"), live("live-child", "trash-root")],
      "trash-root"
    ),
  /ACTIVE_NOTE_IN_SUBTREE/
);
assert.deepEqual(
  planNotePermanentDelete(
    [
      trashed("trash-root", null, "batch"),
      trashed("older-child", "trash-root", "older-batch"),
    ],
    "trash-root"
  ),
  ["trash-root", "older-child"]
);

console.log("Note trash lifecycle regression tests passed");
