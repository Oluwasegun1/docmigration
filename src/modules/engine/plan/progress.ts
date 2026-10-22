import type { PlanTaskModel, ProgressSummary } from "./types";

/**
 * Pure progress calculator.
 *
 * Enforces the core PRD principle:
 * - User-reported is not verified.
 * - An intake "Done" never becomes a confirmed milestone.
 * - Progress is always displayed as "N of M applicable tasks marked done (your report)"
 *   side-by-side next to "N externally confirmed milestones".
 */
export function calculatePlanProgress(tasks: PlanTaskModel[]): ProgressSummary {
  const applicableTasks = tasks.filter((t) => t.status !== "not_applicable");
  const applicableTotal = applicableTasks.length;

  const userReportedDone = applicableTasks.filter(
    (t) => t.status === "done" && t.verificationType === "user_reported",
  ).length;

  const externallyConfirmedMilestones = applicableTasks.filter(
    (t) => t.status === "done" && t.verificationType === "regulator_confirmed",
  ).length;

  const percentComplete =
    applicableTotal > 0
      ? Math.round((userReportedDone / applicableTotal) * 100)
      : 0;

  return {
    applicableTotal,
    userReportedDone,
    externallyConfirmedMilestones,
    percentComplete,
    reportLabel: `${userReportedDone} of ${applicableTotal} applicable tasks marked done (your report)`,
    confirmedLabel: `${externallyConfirmedMilestones} externally confirmed milestones`,
  };
}
