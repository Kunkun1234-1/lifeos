export type ReviewSaveState = "clean" | "dirty" | "saving" | "saved" | "failed";

export function savedStateAfterRequest(startVersion: number, currentVersion: number): ReviewSaveState {
  return startVersion === currentVersion ? "saved" : "dirty";
}

export function hasUnsavedReview(states: Record<string, ReviewSaveState>): boolean {
  return Object.values(states).some((state) =>
    state === "dirty" || state === "saving" || state === "failed"
  );
}

export function reviewDraftStorageKey(userId: string): string {
  return `lifeos.review.drafts.v1:${userId}`;
}

export function canChangeReviewContext(saving: boolean, uploading: boolean): boolean {
  return !saving && !uploading;
}
