/**
 * Refactoring recommendation status constants
 *
 * Flow: pending → ready_for_review → completed
 * - pending:          AI analyzed the domain, refactoring identified but not yet applied
 * - ready_for_review: AI task completed the refactoring, waiting for user review
 * - completed:        User manually confirmed the refactoring is done
 */
export const REFACTORING_STATUS = {
  PENDING: "pending",
  READY_FOR_REVIEW: "ready_for_review",
  COMPLETED: "completed",
};
