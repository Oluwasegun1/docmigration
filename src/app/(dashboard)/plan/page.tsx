import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { planService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export default async function PlanIndexPage() {
  const { user } = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const plans = await planService.getUserPlans(user.id);

  if (plans && plans.length > 0) {
    redirect(`/plans/${plans[0].id}`);
  }

  // No active plan yet: route to screening
  redirect("/onboarding/screening");
}
