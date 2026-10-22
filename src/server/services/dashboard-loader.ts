import "server-only";
import { prisma } from "@/lib/prisma";
import { getSessionToken } from "@/lib/auth/cookies";
import { authService } from "@/lib/api/services";
import { getSession } from "@/lib/auth/session";

export interface DashboardMilestone {
  regulator: string;
  category: string;
  title: string;
  date: string;
  duration: string;
}

export interface DashboardPathwayItem {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  date: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  category?: string;
}

export interface DashboardBackendData {
  user: {
    id?: string;
    name: string;
    email?: string;
    profession: string;
    qualification: string;
    originCountry: string;
    destinations: string[];
  };
  stats: {
    inProgressTasks: number;
    completedMilestones: number;
    verifiedRecords: number;
  };
  readinessScore: number;
  preparationTime: {
    totalHours: string;
    days: { day: string; hours: number }[];
  };
  upcomingMilestone: DashboardMilestone;
  activePathways: DashboardPathwayItem[];
  upcomingTasks: DashboardTaskItem[];
}

export async function getDashboardData(): Promise<DashboardBackendData> {
  let userId: string | null = null;
  let userName = "Dr. Doctor";
  let userEmail = "";

  // 1. Check Better-Auth / Prisma session cookie
  try {
    const token = await getSessionToken();
    if (token) {
      const u = await authService.getSessionUser(token);
      if (u) {
        userId = u.id;
        userName = u.name || "Doctor";
        userEmail = u.email;
      }
    }
  } catch (err) {
    console.warn("Failed checking token session:", err);
  }

  // 2. Check Supabase session fallback
  if (!userId) {
    try {
      const session = await getSession();
      if (session.status === "authenticated") {
        userId = session.user.id;
        userEmail = session.user.email || "";
      }
    } catch {
      // ignore
    }
  }

  // Fallback defaults if no user is logged in
  let profession = "Doctor";
  let originCountry = "Nigeria";
  let destinations: string[] = ["United Kingdom"];
  let draftData: Record<string, unknown> = {};

  if (userId) {
    try {
      // Fetch user details, draft and countries from Prisma
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          professions: { include: { professionRel: true } },
          countries: { include: { countryRel: true } },
          signupDraft: true,
          profileAnswers: true,
        },
      });

      if (dbUser) {
        if (dbUser.name) userName = dbUser.name;
        if (dbUser.email) userEmail = dbUser.email;

        // Check draft data for onboarding answers
        if (dbUser.signupDraft?.dataJson && typeof dbUser.signupDraft.dataJson === "object") {
          draftData = dbUser.signupDraft.dataJson as Record<string, unknown>;
        }

        // Determine profession
        if (dbUser.professions.length > 0 && dbUser.professions[0].professionRel) {
          profession = dbUser.professions[0].professionRel.name;
        } else if (typeof draftData.profession === "string") {
          profession = draftData.profession.charAt(0).toUpperCase() + draftData.profession.slice(1);
        }

        // Determine origin country
        const trainedIn = dbUser.countries.find((c) => c.role === "trained_in");
        if (trainedIn?.countryRel?.name) {
          originCountry = trainedIn.countryRel.name;
        } else if (typeof draftData.trainedInCountry === "string") {
          originCountry = draftData.trainedInCountry === "NG" ? "Nigeria" : draftData.trainedInCountry;
        }

        // Determine destination countries
        const userDests = dbUser.countries.filter((c) => c.role === "destination");
        if (userDests.length > 0) {
          destinations = userDests.map((d) => d.countryRel?.name || d.countryCode);
        } else if (Array.isArray(draftData.destinations) && draftData.destinations.length > 0) {
          destinations = draftData.destinations.map((code: string) => {
            if (code === "GB") return "United Kingdom";
            if (code === "IE") return "Ireland";
            if (code === "CA") return "Canada";
            return code;
          });
        }
      }
    } catch (err) {
      console.warn("Failed fetching user details from Prisma:", err);
    }
  }

  // 3. Build Active Pathways based on user's selected destinations
  const activePathways: DashboardPathwayItem[] = [];
  if (destinations.some((d) => d.toLowerCase().includes("kingdom") || d === "GB")) {
    activePathways.push({
      id: "uk-gmc",
      title: "United Kingdom — GMC Registration",
      subtitle: "PLAB / Standard Pathway · 10 milestones",
      progress: 40,
    });
  }
  if (destinations.some((d) => d.toLowerCase().includes("ireland") || d === "IE")) {
    activePathways.push({
      id: "ie-imc",
      title: "Ireland — IMC Medical Registration",
      subtitle: "General Registration · 8 milestones",
      progress: 25,
    });
  }
  if (activePathways.length === 0) {
    activePathways.push({
      id: "uk-gmc",
      title: `${destinations[0] || "United Kingdom"} — Professional Registration`,
      subtitle: "Standard Route · 6 milestones",
      progress: 20,
    });
  }

  // 4. Calculate stats and readiness score
  const inProgressTasks = activePathways.length * 2;
  const completedMilestones = 3; // Registration + Step 1 + Step 2 completed
  const verifiedRecords = 2; // Identity + Degree recorded
  const readinessScore = Math.min(85, Math.max(35, Math.round((completedMilestones / 8) * 100)));

  // 5. Build dynamic upcoming tasks list
  const upcomingTasks: DashboardTaskItem[] = [
    {
      id: "epic-verification",
      title: "EPIC Primary Verification (ECFMG)",
      date: "Next Step",
      status: "in_progress",
      category: "Documents",
    },
    {
      id: "oet-ielts",
      title: "OET / IELTS English Test Preparation",
      date: "Book within 6 months",
      status: "not_started",
      category: "Language",
    },
    {
      id: "good-standing",
      title: `${originCountry} Regulatory Good Standing Certificate`,
      date: "Pending submission",
      status: "not_started",
      category: "Compliance",
    },
    {
      id: "application-submission",
      title: `${destinations[0] || "Destination"} Registration Dossier Submission`,
      date: "Milestone",
      status: "not_started",
      category: "Application",
    },
  ];

  const primaryDest = destinations[0] || "United Kingdom";

  return {
    user: {
      id: userId ?? undefined,
      name: userName,
      email: userEmail,
      profession,
      qualification: "Medical Practitioner · MBBS",
      originCountry,
      destinations,
    },
    stats: {
      inProgressTasks,
      completedMilestones,
      verifiedRecords,
    },
    readinessScore,
    preparationTime: {
      totalHours: "126h 48m total recorded",
      days: [
        { day: "Mon", hours: 4.5 },
        { day: "Tue", hours: 3.2 },
        { day: "Wed", hours: 5.0 },
        { day: "Thu", hours: 2.8 },
        { day: "Fri", hours: 6.2 },
        { day: "Sat", hours: 3.0 },
        { day: "Sun", hours: 1.5 },
      ],
    },
    upcomingMilestone: {
      regulator: primaryDest.includes("Kingdom") ? "GMC UK" : primaryDest,
      category: "Licensing Exam",
      title: primaryDest.includes("Kingdom")
        ? "PLAB 1 / UKMLA Examination Review"
        : "Presencing / Registration Verification",
      date: "20 June 2026, 10:30 AM",
      duration: "02 h 45 m",
    },
    activePathways,
    upcomingTasks,
  };
}
