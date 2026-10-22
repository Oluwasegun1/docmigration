import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { intakeService } from "@/lib/api/services";
import { ProgressIntakeFlow } from "@/features/plans/components/progress-intake-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Where are you now? | Migration Hub",
  description:
    "Answer progress intake questions to set your baseline and unblock your personalized registration roadmap.",
};

export default async function PlanIntakePage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { user } = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { planId } = await props.params;

  let groups;
  try {
    groups = await intakeService.getIntakeQuestions(user.id, planId);
  } catch (err) {
    console.error("Failed to load intake questions", err);
    notFound();
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <ProgressIntakeFlow planId={planId} initialGroups={groups} />
    </div>
  );
}
