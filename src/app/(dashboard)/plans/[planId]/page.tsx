import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { planService } from "@/lib/api/services";
import { PlanSummaryView } from "@/features/plans/components/plan-summary-view";
import type { PlanTaskModel } from "@/modules/engine/plan/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Migration Roadmap | Migration Hub",
  description:
    "Review your baseline plan, track unblocked tasks, and verify requirements for medical registration.",
};

export default async function PlanDetailsPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { user } = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { planId } = await props.params;

  let summary;
  let plan;
  try {
    [summary, plan] = await Promise.all([
      planService.getPlanSummary(user.id, planId),
      planService.getPlan(user.id, planId),
    ]);
  } catch (err) {
    console.error("Failed to load plan", err);
    notFound();
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

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PlanSummaryView
        planId={planId}
        initialSummary={summary}
        allTasks={taskModels}
      />
    </div>
  );
}
