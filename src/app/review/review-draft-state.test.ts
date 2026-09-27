import assert from "node:assert/strict";
import test from "node:test";
import {
  canChangeReviewContext,
  hasUnsavedReview,
  reviewDraftStorageKey,
  savedStateAfterRequest,
} from "./review-draft-state";

test("edits made while a save is pending remain unsaved", () => {
  assert.equal(savedStateAfterRequest(2, 2), "saved");
  assert.equal(savedStateAfterRequest(2, 3), "dirty");
});

test("leave warning covers draft, pending, and failed saves", () => {
  for (const state of ["dirty", "saving", "failed"] as const) {
    assert.equal(hasUnsavedReview({ daily: "saved", weekly: state }), true);
  }
  assert.equal(hasUnsavedReview({ daily: "clean", weekly: "saved" }), false);
});

test("local draft keys are isolated by user", () => {
  assert.notEqual(reviewDraftStorageKey("user-a"), reviewDraftStorageKey("user-b"));
});

test("context changes are blocked during save or image upload", () => {
  assert.equal(canChangeReviewContext(false, false), true);
  assert.equal(canChangeReviewContext(true, false), false);
  assert.equal(canChangeReviewContext(false, true), false);
});
