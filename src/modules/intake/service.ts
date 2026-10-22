import "server-only";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import type { AuditSink } from "@/modules/audit/service";
import {
  computePlanReadiness,
  mapIntakeChoiceToTaskStatus,
} from "@/modules/engine/plan/readiness";
import type {
  IntakeAnswerInput,
  PlanTaskModel,
  TaskDependencyDef,
} from "@/modules/engine/plan/types";

export interface IntakeQuestionView {
  id: string; // taskTemplateId
  templateKey: string;
  category: string;
  intakeGroup: string;
  intakeOrder: number;
  questionText: string;
  bodyText: string;
  whyAsked: string;
  sourceUrl?: string | null;
  isIrreversiblePayment: boolean;
  currentAnswer?: {
    answer: string;
    completedMonth?: string | null;
    note?: string | null;
  } | null;
}

export interface IntakeGroupView {
  groupKey: string;
  groupTitle: string;
  questions: IntakeQuestionView[];
}

export function createIntakeService(db: PrismaClient, audit: AuditSink) {
  return {
    async getIntakeQuestions(userId: string, planId: string): Promise<IntakeGroupView[]> {
      const plan = await db.migrationPlan.findUnique({
        where: { id: planId },
        include: {
          pathwayVersionRel: {
            include: {
              templates: {
                where: { askAtIntake: true },
                include: { sourceRel: true },
                orderBy: { intakeOrder: "asc" },
              },
            },
          },
          intakeAnswers: true,
        },
      });

      if (!plan || plan.userId !== userId) {
        throw new AppError("not_found", "Migration plan not found.");
      }

      const answerMap = new Map(
        plan.intakeAnswers.map((a) => [a.taskTemplateId, a]),
      );

      const templates = plan.pathwayVersionRel.templates;
      const groupsMap = new Map<string, IntakeQuestionView[]>();

      for (const tmpl of templates) {
        const groupKey = tmpl.intakeGroup || tmpl.category || "general";
        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, []);
        }

        const answer = answerMap.get(tmpl.id);

        groupsMap.get(groupKey)!.push({
          id: tmpl.id,
          templateKey: tmpl.key,
          category: tmpl.category,
          intakeGroup: groupKey,
          intakeOrder: tmpl.intakeOrder,
          questionText: tmpl.intakeKey || tmpl.titleKey,
          bodyText: tmpl.bodyKey,
          whyAsked: "Required to accurately determine your starting point and unblock subsequent actions.",
          sourceUrl: tmpl.sourceRel?.url ?? null,
          isIrreversiblePayment: tmpl.isIrreversiblePayment,
          currentAnswer: answer
            ? {
                answer: answer.answer,
                completedMonth: answer.completedMonth,
                note: answer.note,
              }
            : null,
        });
      }

      return Array.from(groupsMap.entries()).map(([groupKey, questions]) => ({
        groupKey,
        groupTitle: groupKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        questions: questions.sort((a, b) => a.intakeOrder - b.intakeOrder),
      }));
    },

    async saveIntakeAnswers(
      userId: string,
      planId: string,
      answersBatch: IntakeAnswerInput[],
    ) {
      const plan = await db.migrationPlan.findUnique({
        where: { id: planId },
        include: {
          tasks: true,
          pathwayVersionRel: {
            include: {
              templates: {
                include: { dependencies: true },
              },
            },
          },
        },
      });

      if (!plan || plan.userId !== userId) {
        throw new AppError("not_found", "Migration plan not found.");
      }

      const dependencies: TaskDependencyDef[] = [];
      for (const tmpl of plan.pathwayVersionRel.templates) {
        for (const dep of tmpl.dependencies) {
          dependencies.push({
            taskTemplateId: dep.taskTemplateId,
            dependsOnId: dep.dependsOnId,
          });
        }
      }

      // Upsert raw answers & update tasks inside transaction
      await db.$transaction(async (tx) => {
        for (const ans of answersBatch) {
          await tx.intakeAnswer.upsert({
            where: {
              planId_taskTemplateId: {
                planId,
                taskTemplateId: ans.taskTemplateId,
              },
            },
            create: {
              planId,
              taskTemplateId: ans.taskTemplateId,
              answer: ans.answer,
              completedMonth: ans.completedMonth ?? null,
              note: ans.note ?? null,
            },
            update: {
              answer: ans.answer,
              completedMonth: ans.completedMonth ?? null,
              note: ans.note ?? null,
            },
          });

          const mapped = mapIntakeChoiceToTaskStatus(ans.answer);
          const task = plan.tasks.find(
            (t) => t.originTemplateTaskId === ans.taskTemplateId,
          );

          if (task) {
            await tx.planTask.update({
              where: { id: task.id },
              data: {
                status: mapped.status,
                verificationType: mapped.verificationType,
                needsConfirmation: mapped.needsConfirmation,
                completedMonth: ans.completedMonth ?? null,
                note: ans.note ?? task.note,
                notApplicableReason: ans.notApplicableReason ?? null,
                waitingOnText: ans.waitingOnText ?? null,
              },
            });
          }
        }

        // Recompute readiness across all tasks in the plan
        const allTasks = await tx.planTask.findMany({
          where: { planId },
          orderBy: { sortOrder: "asc" },
        });

        const taskModels: PlanTaskModel[] = allTasks.map((t) => ({
          id: t.id,
          planId: t.planId,
          originTemplateTaskId: t.originTemplateTaskId,
          templateKey: t.templateKey,
          title: t.title,
          category: t.category,
          status: t.status as PlanTaskModel["status"],
          verificationType: t.verificationType as PlanTaskModel["verificationType"],
          userEdited: t.userEdited,
          reviewNeeded: t.reviewNeeded,
          needsConfirmation: t.needsConfirmation,
          completedMonth: t.completedMonth,
          dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
          note: t.note,
          notApplicableReason: t.notApplicableReason,
          waitingOnText: t.waitingOnText,
          blockedBy: (t.blockedBy as string[]) ?? null,
          sortOrder: t.sortOrder,
          isIrreversiblePayment: t.isIrreversiblePayment,
          sourceId: t.sourceId,
        }));

        const computed = computePlanReadiness(taskModels, dependencies);

        for (const c of computed) {
          await tx.planTask.update({
            where: { id: c.id },
            data: {
              blockedBy: c.blockedBy as object,
            },
          });
        }
      });

      await audit.record([
        {
          action: "intake.answers.submitted",
          entityType: "migration_plan",
          entityKey: planId,
          actorRef: userId,
          metadata: { batchSize: answersBatch.length },
        },
      ]);
    },
  };
}

export type IntakeService = ReturnType<typeof createIntakeService>;
