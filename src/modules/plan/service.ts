import "server-only";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import type { AuditSink } from "@/modules/audit/service";
import { validateAndSortTaskTemplates } from "@/modules/engine/plan/dag";
import {
  computePlanReadiness,
  initializePlanTasksFromTemplates,
} from "@/modules/engine/plan/readiness";
import { buildPlanSummary } from "@/modules/engine/plan/summary-builder";
import type {
  PlanSummaryPayload,
  PlanTaskModel,
  TaskDependencyDef,
  TaskTemplateDef,
} from "@/modules/engine/plan/types";
import {
  applyVersionUpdate,
  computeVersionDiff,
} from "@/modules/engine/plan/versioning";
import type { AssessmentEvaluation } from "@/modules/engine/rules/types";

export interface TaskUpdatePatch {
  status?: PlanTaskModel["status"];
  dueDate?: string | null;
  note?: string | null;
  notApplicableReason?: string | null;
}

export function createPlanService(db: PrismaClient, audit: AuditSink) {
  return {
    async createPlan(
      userId: string,
      pathwayVersionId: string,
      idempotencyKey?: string,
    ) {
      // Idempotency check: if plan already exists for this user and pathway version, return it
      const existing = await db.migrationPlan.findUnique({
        where: {
          userId_pathwayVersionId: {
            userId,
            pathwayVersionId,
          },
        },
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          pathwayVersionRel: {
            include: { pathwayRel: true },
          },
        },
      });

      if (existing) {
        return existing;
      }

      // Fetch version with templates and dependencies
      const version = await db.pathwayVersion.findUnique({
        where: { id: pathwayVersionId },
        include: {
          pathwayRel: true,
          templates: {
            include: { dependencies: true },
          },
        },
      });

      if (!version) {
        throw new AppError("not_found", "Pathway version not found.");
      }

      const templateDefs: TaskTemplateDef[] = version.templates.map((t) => ({
        id: t.id,
        key: t.key,
        category: t.category,
        titleKey: t.titleKey,
        bodyKey: t.bodyKey,
        intakeKey: t.intakeKey,
        intakeGroup: t.intakeGroup,
        intakeOrder: t.intakeOrder,
        askAtIntake: t.askAtIntake,
        isIrreversiblePayment: t.isIrreversiblePayment,
        sourceId: t.sourceId,
        isPlaceholder: t.isPlaceholder,
      }));

      const dependencyDefs: TaskDependencyDef[] = [];
      for (const t of version.templates) {
        for (const dep of t.dependencies) {
          dependencyDefs.push({
            taskTemplateId: dep.taskTemplateId,
            dependsOnId: dep.dependsOnId,
          });
        }
      }

      // Validate DAG & sort
      const sortedTemplates = validateAndSortTaskTemplates(templateDefs, dependencyDefs);

      // Create plan and tasks inside transaction
      const plan = await db.$transaction(async (tx) => {
        const newPlan = await tx.migrationPlan.create({
          data: {
            userId,
            pathwayVersionId,
          },
        });

        // Initialize tasks (not_started)
        const initialTasks = initializePlanTasksFromTemplates(
          newPlan.id,
          sortedTemplates,
          [],
          (key) => key,
        );

        // Derive initial readiness
        const readyTasks = computePlanReadiness(initialTasks, dependencyDefs);

        await tx.planTask.createMany({
          data: readyTasks.map((t, index) => ({
            planId: newPlan.id,
            originTemplateTaskId: t.originTemplateTaskId,
            templateKey: t.templateKey,
            title: t.title,
            category: t.category,
            status: t.status,
            verificationType: t.verificationType,
            userEdited: false,
            reviewNeeded: false,
            needsConfirmation: false,
            sortOrder: index,
            isIrreversiblePayment: t.isIrreversiblePayment,
            sourceId: t.sourceId,
            blockedBy: t.blockedBy as object,
          })),
        });

        return tx.migrationPlan.findUniqueOrThrow({
          where: { id: newPlan.id },
          include: {
            tasks: { orderBy: { sortOrder: "asc" } },
            pathwayVersionRel: { include: { pathwayRel: true } },
          },
        });
      });

      await audit.record([
        {
          action: "plan.created",
          entityType: "migration_plan",
          entityKey: plan.id,
          actorRef: userId,
          metadata: { pathwayVersionId, idempotencyKey: idempotencyKey ?? null },
        },
      ]);

      return plan;
    },

    async getPlan(userId: string, planId: string) {
      const plan = await db.migrationPlan.findUnique({
        where: { id: planId },
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          pathwayVersionRel: {
            include: {
              pathwayRel: {
                include: {
                  professionRel: true,
                  originRel: true,
                  destRel: true,
                  regulatorRel: true,
                },
              },
            },
          },
        },
      });

      if (!plan || plan.userId !== userId) {
        throw new AppError("not_found", "Migration plan not found.");
      }

      return plan;
    },

    async getUserPlans(userId: string) {
      return db.migrationPlan.findMany({
        where: { userId },
        include: {
          pathwayVersionRel: {
            include: {
              pathwayRel: {
                include: {
                  professionRel: true,
                  originRel: true,
                  destRel: true,
                  regulatorRel: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    async getPlanSummary(userId: string, planId: string): Promise<PlanSummaryPayload> {
      const plan = await db.migrationPlan.findUnique({
        where: { id: planId },
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          intakeAnswers: true,
          pathwayVersionRel: {
            include: {
              pathwayRel: true,
              templates: {
                include: { sourceRel: true },
              },
            },
          },
        },
      });

      if (!plan || plan.userId !== userId) {
        throw new AppError("not_found", "Migration plan not found.");
      }

      // Fetch latest assessment run for this version
      const assessmentRun = await db.assessmentRun.findFirst({
        where: {
          userId,
          pathwayVersionId: plan.pathwayVersionId,
        },
        orderBy: { assessedAt: "desc" },
      });

      const assessmentEvaluation: AssessmentEvaluation = {
        outcome: (assessmentRun?.status as AssessmentEvaluation["outcome"]) ?? "potential_match",
        outcomeLabel: assessmentRun?.status === "potential_blocker"
          ? "Potential blocker"
          : assessmentRun?.status === "more_information_needed"
          ? "More information needed"
          : assessmentRun?.status === "unmet"
          ? "Requirement appears unmet"
          : "Potential match",
        criteriaResults:
          (assessmentRun?.criteriaResults as unknown as AssessmentEvaluation["criteriaResults"]) ??
          [],
        missingFields: (assessmentRun?.missingFields as string[]) ?? [],
        sourceIds: [],
        assessedAt: assessmentRun?.assessedAt.toISOString() ?? new Date().toISOString(),
      };

      const sources: Record<string, { url: string; title: string }> = {};
      for (const t of plan.pathwayVersionRel.templates) {
        if (t.sourceRel) {
          sources[t.sourceRel.id] = {
            url: t.sourceRel.url,
            title: t.sourceRel.title,
          };
        }
      }

      const taskModels: PlanTaskModel[] = plan.tasks.map((t) => ({
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

      // Calculate count of intake tasks not yet answered
      const intakeTemplates = plan.pathwayVersionRel.templates.filter((t) => t.askAtIntake);
      const answeredTemplateIds = new Set(plan.intakeAnswers.map((a) => a.taskTemplateId));
      const skippedIntakeCount = intakeTemplates.filter(
        (t) => !answeredTemplateIds.has(t.id),
      ).length;

      return buildPlanSummary(
        {
          id: plan.pathwayVersionRel.pathwayRel.id,
          slug: plan.pathwayVersionRel.pathwayRel.slug,
          name: plan.pathwayVersionRel.pathwayRel.name,
          pinnedVersion: plan.pathwayVersionRel.version,
          lastVerifiedDate: plan.pathwayVersionRel.publishedAt
            ? plan.pathwayVersionRel.publishedAt.toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        },
        assessmentEvaluation,
        taskModels,
        sources,
        skippedIntakeCount,
      );
    },

    async updateTask(
      userId: string,
      planId: string,
      taskId: string,
      patch: TaskUpdatePatch,
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

      const targetTask = plan.tasks.find((t) => t.id === taskId);
      if (!targetTask) {
        throw new AppError("not_found", "Task not found in plan.");
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

      await db.$transaction(async (tx) => {
        await tx.planTask.update({
          where: { id: taskId },
          data: {
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.dueDate !== undefined
              ? { dueDate: patch.dueDate ? new Date(patch.dueDate) : null }
              : {}),
            ...(patch.note !== undefined ? { note: patch.note } : {}),
            ...(patch.notApplicableReason !== undefined
              ? { notApplicableReason: patch.notApplicableReason }
              : {}),
            userEdited: true,
          },
        });

        // Recalculate readiness
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
          action: "plan.task.updated",
          entityType: "plan_task",
          entityKey: taskId,
          actorRef: userId,
          metadata: { planId, patch },
        },
      ]);
    },

    async getChanges(userId: string, planId: string) {
      const plan = await db.migrationPlan.findUnique({
        where: { id: planId },
        include: {
          tasks: true,
          pathwayVersionRel: {
            include: {
              pathwayRel: {
                include: {
                  versions: {
                    where: { status: "published" },
                    orderBy: { version: "desc" },
                    take: 1,
                    include: {
                      templates: { include: { dependencies: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!plan || plan.userId !== userId) {
        throw new AppError("not_found", "Migration plan not found.");
      }

      const latestVersion = plan.pathwayVersionRel.pathwayRel.versions[0];
      if (!latestVersion || latestVersion.id === plan.pathwayVersionId) {
        return {
          hasNewerVersion: false,
          currentVersion: plan.pathwayVersionRel.version,
          latestVersion: plan.pathwayVersionRel.version,
          diff: null,
        };
      }

      const currentTaskModels: PlanTaskModel[] = plan.tasks.map((t) => ({
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

      const targetTemplates: TaskTemplateDef[] = latestVersion.templates.map((t) => ({
        id: t.id,
        key: t.key,
        category: t.category,
        titleKey: t.titleKey,
        bodyKey: t.bodyKey,
        intakeKey: t.intakeKey,
        intakeGroup: t.intakeGroup,
        intakeOrder: t.intakeOrder,
        askAtIntake: t.askAtIntake,
        isIrreversiblePayment: t.isIrreversiblePayment,
        sourceId: t.sourceId,
        isPlaceholder: t.isPlaceholder,
      }));

      const diff = computeVersionDiff(currentTaskModels, targetTemplates);

      return {
        hasNewerVersion: true,
        currentVersion: plan.pathwayVersionRel.version,
        latestVersion: latestVersion.version,
        targetVersionId: latestVersion.id,
        diff,
      };
    },

    async acceptUpdate(userId: string, planId: string, targetVersionId: string) {
      const plan = await db.migrationPlan.findUnique({
        where: { id: planId },
        include: {
          tasks: true,
          pathwayVersionRel: true,
        },
      });

      if (!plan || plan.userId !== userId) {
        throw new AppError("not_found", "Migration plan not found.");
      }

      const targetVersion = await db.pathwayVersion.findUnique({
        where: { id: targetVersionId },
        include: {
          templates: { include: { dependencies: true } },
        },
      });

      if (!targetVersion) {
        throw new AppError("not_found", "Target version not found.");
      }

      const currentTaskModels: PlanTaskModel[] = plan.tasks.map((t) => ({
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

      const targetTemplates: TaskTemplateDef[] = targetVersion.templates.map((t) => ({
        id: t.id,
        key: t.key,
        category: t.category,
        titleKey: t.titleKey,
        bodyKey: t.bodyKey,
        intakeKey: t.intakeKey,
        intakeGroup: t.intakeGroup,
        intakeOrder: t.intakeOrder,
        askAtIntake: t.askAtIntake,
        isIrreversiblePayment: t.isIrreversiblePayment,
        sourceId: t.sourceId,
        isPlaceholder: t.isPlaceholder,
      }));

      const migrated = applyVersionUpdate(currentTaskModels, targetTemplates);

      await db.$transaction(async (tx) => {
        // Delete old tasks and replace with migrated
        await tx.planTask.deleteMany({ where: { planId } });

        await tx.planTask.createMany({
          data: migrated.map((m, idx) => ({
            planId,
            originTemplateTaskId: m.originTemplateTaskId,
            templateKey: m.templateKey,
            title: m.title,
            category: m.category,
            status: m.status,
            verificationType: m.verificationType,
            userEdited: m.userEdited,
            reviewNeeded: m.reviewNeeded,
            needsConfirmation: m.needsConfirmation,
            completedMonth: m.completedMonth,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            note: m.note,
            notApplicableReason: m.notApplicableReason,
            waitingOnText: m.waitingOnText,
            blockedBy: m.blockedBy as object,
            sortOrder: idx,
            isIrreversiblePayment: m.isIrreversiblePayment,
            sourceId: m.sourceId,
          })),
        });

        await tx.migrationPlan.update({
          where: { id: planId },
          data: {
            pathwayVersionId: targetVersionId,
            pendingUpdate: false,
          },
        });
      });

      await audit.record([
        {
          action: "plan.version.accepted",
          entityType: "migration_plan",
          entityKey: planId,
          actorRef: userId,
          metadata: {
            fromVersion: plan.pathwayVersionRel.version,
            toVersion: targetVersion.version,
          },
        },
      ]);
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;
