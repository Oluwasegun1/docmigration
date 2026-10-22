import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { assessmentService, profileAnswersService } from "@/lib/api/services";
import { ScreeningView } from "@/features/pathways/components/screening-view";
import { toAssessmentItemView } from "@/features/pathways/model";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pathway Screening | Migration Hub",
  description:
    "Evaluate official international medical registration routes deterministically based on your profile facts.",
};

export default async function OnboardingScreeningPage() {
  const { user } = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [results, facts] = await Promise.all([
    assessmentService.evaluateAllAvailablePathways(user.id),
    profileAnswersService.getUserProfileFacts(user.id),
  ]);

  const initialAssessments = results.map(toAssessmentItemView);

  const userProfession = (facts.profession as string) || "doctor";
  const userOrigin = (facts.originCountry as string) || (facts.trainedInCountry as string) || "NG";

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <ScreeningView
        initialAssessments={initialAssessments}
        userProfession={userProfession}
        userOrigin={userOrigin}
      />
    </div>
  );
}
