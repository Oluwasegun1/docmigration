/**
 * Pure Domain Engine: Plan Engine Types
 * Zero database, network, or AI dependencies.
 */

export type IntakeAnswerChoice =
  | "done"
  | "in_progress"
  | "waiting_on_external_party"
  | "not_started"
  | "not_applicable"
  | "not_sure";

export type PlanTaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting_on_external_party"
  | "done"
  | "not_applicable";

export type VerificationType = "user_reported" | "regulator_confirmed";

export interface TaskTemplateDef {
  id: string;
  key: string;
  category: string;
  titleKey: string;
  bodyKey: string;
  intakeKey?: string | null;
  intakeGroup?: string | null;
  intakeOrder: number;
  askAtIntake: boolean;
  isIrreversiblePayment: boolean;
  sourceId: string;
  isPlaceholder?: boolean;
}

export interface TaskDependencyDef {
  taskTemplateId: string; // The dependent task that requires dependsOnId
  dependsOnId: string;    // The prerequisite task
}

export interface PlanTaskModel {
  id: string;
  planId: string;
  originTemplateTaskId?: string | null;
  templateKey: string;
  title: string;
  category: string;
  status: PlanTaskStatus;
  verificationType: VerificationType;
  userEdited: boolean;
  reviewNeeded: boolean;
  needsConfirmation: boolean;
  completedMonth?: string | null;
  dueDate?: string | null;
  note?: string | null;
  notApplicableReason?: string | null;
  waitingOnText?: string | null;
  blockedBy?: string[] | null;
  sortOrder: number;
  isIrreversiblePayment: boolean;
  sourceId?: string | null;
  outOfOrderHint?: string | null;
}

export interface IntakeAnswerInput {
  taskTemplateId: string;
  answer: IntakeAnswerChoice;
  completedMonth?: string | null;
  note?: string | null;
  notApplicableReason?: string | null;
  waitingOnText?: string | null;
}

export interface ProgressSummary {
  applicableTotal: number;
  userReportedDone: number;
  externallyConfirmedMilestones: number;
  percentComplete: number;
  reportLabel: string;
  confirmedLabel: string;
}

export interface PlanSummaryPayload {
  pathway: {
    id: string;
    slug: string;
    name: string;
    pinnedVersion: number;
    lastVerifiedDate: string;
    assessmentStatus: string;
    assessmentStatusLabel: string;
    disclaimer: string;
  };
  progress: ProgressSummary;
  nextUp: Array<{
    id: string;
    templateKey: string;
    title: string;
    category: string;
    sourceUrl?: string | null;
    isIrreversiblePayment: boolean;
  }>;
  blocked: Array<{
    id: string;
    templateKey: string;
    title: string;
    category: string;
    blockedByTitles: string[];
  }>;
  needsChecking: {
    notSureTasks: Array<{ id: string; title: string; category: string }>;
    missingProfileFields: string[];
  };
  moneyWarning?: {
    taskId: string;
    title: string;
    warningMessage: string;
    sourceUrl?: string | null;
  } | null;
  notAskedYet: {
    count: number;
    canContinue: boolean;
  };
}
