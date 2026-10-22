import { getSessionToken } from "@/lib/auth/cookies";
import { toErrorResponse } from "@/lib/errors";
import { authService, onboardingService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return Response.json({ data: null });
    }

    const user = await authService.getSessionUser(token);
    if (!user) {
      return Response.json({ data: null });
    }

    const draft = await onboardingService.getDraft(user.id);
    return Response.json({ data: draft });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const step = Number(body.step) || 2;
    const data = body.data || {};

    const token = await getSessionToken();
    if (!token) {
      // In guest / prototype preview mode, return graceful 200
      return Response.json({
        data: {
          step,
          data,
          savedLocally: true,
          authenticated: false,
        },
      });
    }

    const user = await authService.getSessionUser(token);
    if (!user) {
      return Response.json({
        data: {
          step,
          data,
          savedLocally: true,
          authenticated: false,
        },
      });
    }

    const draft = await onboardingService.saveDraft(user.id, step, data);

    if (step === 2 && data.trainedInCountry && data.profession) {
      await onboardingService.saveAboutYou(user.id, {
        profession: data.profession,
        trainedInCountry: data.trainedInCountry,
        sector: data.sector,
      });
    } else if (step === 3 && Array.isArray(data.destinations)) {
      await onboardingService.saveDestinations(user.id, data.destinations, Boolean(data.notSureYet));
    }

    return Response.json({ data: draft });
  } catch (err) {
    return toErrorResponse(err);
  }
}
