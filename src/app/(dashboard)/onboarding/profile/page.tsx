import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { profileAnswersService, profileSchemaService } from "@/lib/api/services";
import { ProfileForm } from "@/features/profile/components/profile-form";
import type { ResolvedProfileSchema } from "@/modules/profile/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Profile Facts | Migration Hub",
  description:
    "Enter your medical qualification and status facts to screen your pathway eligibility.",
};

export default async function OnboardingProfilePage() {
  const { user } = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const facts = await profileAnswersService.getUserProfileFacts(user.id);
  const profession = (facts.profession as string) || "doctor";
  const origin = (facts.originCountry as string) || (facts.trainedInCountry as string) || "NG";

  let schema: ResolvedProfileSchema | null = null;
  try {
    schema = await profileSchemaService.resolve({
      profession,
      origin,
      locale: "en",
    });
  } catch (err) {
    console.error("Failed to resolve profile schema", err);
  }

  const initialAnswers = {
    trainedInCountry: origin,
    qualificationCountry: origin,
    ...facts,
  };
  delete (initialAnswers as Record<string, unknown>).originCountry;
  delete (initialAnswers as Record<string, unknown>).profession;
  delete (initialAnswers as Record<string, unknown>).destinationCountry;
  delete (initialAnswers as Record<string, unknown>).residenceCountry;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <ProfileForm
        initialSchema={schema}
        initialAnswers={initialAnswers}
        onCompleteRedirectUrl="/matches"
      />
    </div>
  );
}
