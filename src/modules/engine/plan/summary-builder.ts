import { calculatePlanProgress } from "./progress";
import type { PlanSummaryPayload, PlanTaskModel } from "./types";
import type { AssessmentEvaluation } from "../rules/types";

export interface PathwayMetaInput {
  id: string;
  slug: string;
  name: string;
  pinnedVersion: number;
  lastVerifiedDate: string;
}

export interface SourceLookup {
  [sourceId: string]: { url: string; title: string };
}

/**
 * Pure builder for the "Where you are" summary payload.
 *
 * Assembles the 7 sections specified by PRD v1.1 and the prompt:
 * 1. Pathway meta & assessment chip with disclaimer
 * 2. Progress: user-reported done vs externally confirmed milestones
 * 3. Next up: up to 3 ready tasks with source links
 * 4. Blocked: tasks that cannot start, naming blockers
 * 5. Needs checking: 'Not sure' answers + missing profile fields
 * 6. Money warning: first uncompleted task with isIrreversiblePayment
 * 7. Not asked yet: count of skipped intake tasks with continue action
 */
export function buildPlanSummary(
  pathwayMeta: PathwayMetaInput,
  assessment: AssessmentEvaluation,
  tasks: PlanTaskModel[],
  sources: SourceLookup = {},
  skippedIntakeCount: number = 0,
): PlanSummaryPayload {
  const progress = calculatePlanProgress(tasks);

  // Ready tasks: not_started and no blockers (or blockedBy empty)
  const readyTasks = tasks.filter(
    (t) => t.status === "not_started" && (!t.blockedBy || t.blockedBy.length === 0),
  );

  const nextUp = readyTasks.slice(0, 3).map((t) => ({
    id: t.id,
    templateKey: t.templateKey,
    title: t.title,
    category: t.category,
    sourceUrl: t.sourceId ? sources[t.sourceId]?.url : null,
    isIrreversiblePayment: t.isIrreversiblePayment,
  }));

  // Blocked tasks: not_started and has blockers
  const blockedTasks = tasks
    .filter((t) => t.status === "not_started" && t.blockedBy && t.blockedBy.length > 0)
    .map((t) => ({
      id: t.id,
      templateKey: t.templateKey,
      title: t.title,
      category: t.category,
      blockedByTitles: t.blockedBy ?? [],
    }));

  // Needs checking: 'not_sure' flag (needsConfirmation = true) + missing profile fields
  const notSureTasks = tasks
    .filter((t) => t.needsConfirmation)
    .map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
    }));

  // Money warning: first not-done task with isIrreversiblePayment
  const firstUnpaidIrreversible = tasks.find(
    (t) => t.isIrreversiblePayment && t.status !== "done" && t.status !== "not_applicable",
  );

  const moneyWarning = firstUnpaidIrreversible
    ? {
        taskId: firstUnpaidIrreversible.id,
        title: firstUnpaidIrreversible.title,
        warningMessage: "Confirm you meet the requirements before paying",
        sourceUrl: firstUnpaidIrreversible.sourceId
          ? sources[firstUnpaidIrreversible.sourceId]?.url
          : null,
      }
    : null;

  return {
    pathway: {
      id: pathwayMeta.id,
      slug: pathwayMeta.slug,
      name: pathwayMeta.name,
      pinnedVersion: pathwayMeta.pinnedVersion,
      lastVerifiedDate: pathwayMeta.lastVerifiedDate,
      assessmentStatus: assessment.outcome,
      assessmentStatusLabel: assessment.outcomeLabel,
      disclaimer: "Product guidance, not an official determination.",
    },
    progress,
    nextUp,
    blocked: blockedTasks,
    needsChecking: {
      notSureTasks,
      missingProfileFields: assessment.missingFields,
    },
    moneyWarning,
    notAskedYet: {
      count: skippedIntakeCount,
      canContinue: skippedIntakeCount > 0,
    },
  };
}
