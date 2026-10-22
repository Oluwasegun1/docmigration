import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { profileAnswersService } from "@/lib/api/services";
import { evaluateMatches } from "@/lib/matching/engine";
import { STATUS_LABELS } from "@/lib/matching/copy";
import type {
  MatchProfile,
  PublishedPathway,
  PublishedRequirement,
  CriterionOperator,
  RouteType,
  EvaluationResult,
  MatchStatus,
} from "@/lib/matching/types";

export interface StatusChange {
  pathwayId: string;
  pathwayTitle: string;
  fromStatus: MatchStatus;
  toStatus: MatchStatus;
  message: string;
}

export interface MatchesLoadResult {
  state:
    | "ready"
    | "onboarding_incomplete"
    | "no_published_pathways"
    | "error";
  profile: MatchProfile | null;
  missingRequiredAnswers: string[];
  evaluation: EvaluationResult | null;
  savedRunId: string | null;
  savedAt: string | null;
  isNewRun: boolean;
  changes: StatusChange[];
  changeSummary: string | null;
  errorMessage?: string;
  userFacingError?: string;
}

export const REQUIRED_ANSWER_KEYS: Array<keyof MatchProfile> = [
  "currentCountry",
  "destinationCountry",
  "graduationYear",
  "highestQualification",
  "internshipStatus",
  "careerStage",
  "experienceYears",
];

export function computeProfileHash(profile: MatchProfile): string {
  const sorted = Object.keys(profile)
    .sort()
    .reduce((acc, k) => {
      acc[k] = (profile as Record<string, unknown>)[k];
      return acc;
    }, {} as Record<string, unknown>);
  return crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

export function computeContentFingerprint(pathways: PublishedPathway[]): string {
  const tokens = pathways
    .map((p) => `${p.id}:${p.versionId}:${p.publishedAt}`)
    .sort()
    .join("|");
  return crypto.createHash("sha256").update(tokens).digest("hex");
}

/**
 * Loads published pathways from database, drops any requirement missing source or verified date,
 * and logs error per Part 6 rules.
 */
export async function loadPublishedPathways(): Promise<PublishedPathway[]> {
  const rows = await prisma.pathway.findMany({
    where: {
      status: { in: ["live", "beta"] },
    },
    include: {
      versions: {
        where: { status: "published" },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          criteria: {
            include: {
              sourceRel: true,
            },
          },
        },
      },
      professionRel: { select: { code: true, name: true } },
      originRel: { select: { code: true, name: true } },
      destRel: { select: { code: true, name: true } },
      regulatorRel: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: { slug: "asc" },
  });

  const published: PublishedPathway[] = [];

  for (const p of rows) {
    const version = p.versions[0];
    if (!version) continue;

    let hasDataError = false;
    const requirements: PublishedRequirement[] = [];

    for (const c of version.criteria) {
      // Part 6 Rule: A requirement without a source or verified date drops its pathway and is logged
      if (!c.sourceRel || !c.sourceRel.url || !c.verifiedAt) {
        console.error(
          `[Matches Engine] Dropping pathway ${p.id} (${p.slug}): criterion ${c.key} is missing a source URL or verified date.`
        );
        hasDataError = true;
        break;
      }

      requirements.push({
        id: c.id,
        key: c.key,
        label: c.key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        severity: c.mandatory ? "required" : "may_block",
        usedAnswers: [c.profileField as any],
        operator: (c.operator || "equals") as CriterionOperator,
        expectedValue: c.expected,
        source: {
          url: c.sourceRel.url,
          verifiedAt:
            c.verifiedAt instanceof Date
              ? c.verifiedAt.toISOString().slice(0, 10)
              : String(c.verifiedAt).slice(0, 10),
          publisher: c.sourceRel.publisher,
          title: c.sourceRel.title,
        },
      });
    }

    if (hasDataError) {
      continue;
    }

    published.push({
      id: p.id,
      versionId: version.id,
      slug: p.slug,
      title: p.name,
      sourceCountry: p.originCountry,
      destinationCountry: p.destinationCountry,
      routeType: (p.track as RouteType) || "professional_registration",
      profession: p.professionId,
      status: "published",
      publishedAt: version.publishedAt ? version.publishedAt.toISOString() : "",
      typicalDurationMonths: 6, // Sourced default window
      requirements,
    });
  }

  return published;
}

/**
 * Loads user answers, maps to the 10 inputs, runs engine, and persists the run.
 */
export async function loadMatchesForUser(
  userId: string,
  options?: { forceRecheck?: boolean; cooldownSeconds?: number }
): Promise<MatchesLoadResult> {
  const cooldownSec = options?.cooldownSeconds ?? 3;

  // 1. Fetch user profile answers
  const facts = await profileAnswersService.getUserProfileFacts(userId);
  const destPrefs = await profileAnswersService.getUserDestinationPreferences(userId);

  const currentCountry = (facts.originCountry as string) || (facts.trainedInCountry as string) || "NG";
  const destinationCountry = destPrefs[0] || (facts.destinationCountry as string) || "GB";

  const profile: MatchProfile = {
    currentCountry,
    destinationCountry,
    graduationYear: typeof facts.graduationYear === "number" ? facts.graduationYear : null,
    highestQualification: (facts.highestQualification as string) || null,
    internshipStatus: (facts.internshipStatus as string) || null,
    careerStage: (facts.careerStage as string) || null,
    experienceYears:
      typeof facts.experienceYears === "number"
        ? facts.experienceYears
        : typeof facts.clinicalExperienceYears === "number"
        ? facts.clinicalExperienceYears
        : null,
    specialty: (facts.specialty as string) || null,
    currentWorkCountry: (facts.currentWorkCountry as string) || (facts.residenceCountry as string) || null,
    timeline: (facts.timeline as string) || null,
    profession: (facts.profession as string) || "doctor",
    trainedCountry: (facts.trainedInCountry as string) || currentCountry,
  };

  // 2. Check for required answers (Part 6: Onboarding incomplete)
  const missingRequiredAnswers = REQUIRED_ANSWER_KEYS.filter((key) => {
    const val = profile[key];
    return val === null || val === undefined || val === "";
  });

  if (missingRequiredAnswers.length > 0) {
    return {
      state: "onboarding_incomplete",
      profile,
      missingRequiredAnswers: missingRequiredAnswers as string[],
      evaluation: null,
      savedRunId: null,
      savedAt: null,
      isNewRun: false,
      changes: [],
      changeSummary: null,
    };
  }

  // 3. Load published pathways
  const publishedPathways = await loadPublishedPathways();

  // 4. Run pure matching engine
  const now = new Date();
  const evaluation = evaluateMatches(profile, publishedPathways, now);

  if (evaluation.results.length === 0) {
    return {
      state: "no_published_pathways",
      profile,
      missingRequiredAnswers: [],
      evaluation,
      savedRunId: null,
      savedAt: null,
      isNewRun: false,
      changes: [],
      changeSummary: null,
    };
  }

  // 5. Compute hashes for deduplication and audit traceability
  const profileHash = computeProfileHash(profile);
  const contentFingerprint = computeContentFingerprint(publishedPathways);

  // 6. Check previous run for status changes
  const previousRun = await prisma.matchRun.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { results: true },
  });

  const changes: StatusChange[] = [];
  if (previousRun) {
    const prevMap = new Map<string, MatchStatus>();
    for (const r of previousRun.results) {
      prevMap.set(r.pathwayId, r.status as MatchStatus);
    }

    for (const current of evaluation.results) {
      const prevStatus = prevMap.get(current.pathwayId);
      if (prevStatus && prevStatus !== current.status) {
        changes.push({
          pathwayId: current.pathwayId,
          pathwayTitle: current.title,
          fromStatus: prevStatus,
          toStatus: current.status,
          message: `Moved from ${STATUS_LABELS[prevStatus]} to ${STATUS_LABELS[current.status]}`,
        });
      }
    }
  }

  // Cooldown / deduplication logic (Part 5 & Part 7)
  let savedRunId: string | null = null;
  let isNewRun = false;
  let changeSummary: string | null = null;

  if (
    previousRun &&
    previousRun.profileHash === profileHash &&
    previousRun.contentFingerprint === contentFingerprint &&
    !options?.forceRecheck
  ) {
    savedRunId = previousRun.id;
    isNewRun = false;
    const timeStr = previousRun.createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    changeSummary = `Nothing has changed since ${timeStr}.`;
  } else {
    // Check cooldown if force rechecking
    if (previousRun && options?.forceRecheck) {
      const elapsedSec = (Date.now() - previousRun.createdAt.getTime()) / 1000;
      if (elapsedSec < cooldownSec) {
        throw new Error(
          `Please wait ${Math.ceil(cooldownSec - elapsedSec)} seconds before checking again.`
        );
      }
    }

    // Insert new run and results in transaction (Part 7)
    const newRun = await prisma.$transaction(async (tx) => {
      const run = await tx.matchRun.create({
        data: {
          userId,
          profileSnapshot: profile as any,
          profileHash,
          engineVersion: evaluation.engineVersion,
          contentFingerprint,
        },
      });

      for (let i = 0; i < evaluation.results.length; i++) {
        const item = evaluation.results[i];
        await tx.matchResult.create({
          data: {
            runId: run.id,
            pathwayId: item.pathwayId,
            pathwayVersionId: item.pathwayVersionId,
            status: item.status,
            criteria: item.criteria as any,
            missing: item.missing as any,
            sortRank: i + 1,
          },
        });
      }

      return run;
    });

    savedRunId = newRun.id;
    isNewRun = true;
    changeSummary =
      changes.length > 0
        ? changes.map((c) => `${c.pathwayTitle}: ${c.message}`).join("; ")
        : "Evaluation updated.";
  }

  return {
    state: "ready",
    profile,
    missingRequiredAnswers: [],
    evaluation,
    savedRunId,
    savedAt: previousRun ? previousRun.createdAt.toISOString() : now.toISOString(),
    isNewRun,
    changes,
    changeSummary,
  };
}
