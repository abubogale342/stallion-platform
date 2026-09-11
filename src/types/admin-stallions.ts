export type AdminStallionPublishStatus = "draft" | "published";

export type AdminStallionListRow = {
  id: string;
  stallionName: string;
  slug: string | null;
  publishStatus: AdminStallionPublishStatus;
  horseType: "stallion" | "mare";
  updatedAt: string | null;
  /**
   * Milestone 17 — `stallions.needs_review`: agent output is waiting on a human.
   *
   * Named for the agent rather than left as a bare `needsReview` because this
   * codebase has a second, unrelated review flag on `stallion_pedigrees` (a
   * per-ancestor-row flag from the pedigree prefill work) that is set and
   * cleared by entirely different actions.
   */
  agentNeedsReview: boolean;
};

export type AdminStallionsStatusFilter = "all" | "published" | "draft";

export type AdminStallionsTypeFilter = "all" | "stallion" | "mare";
