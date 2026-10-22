import { describe, it, expect } from "vitest";
import { evaluateMatches } from "@/lib/matching/engine";
import type {
  MatchProfile,
  PublishedPathway,
  PublishedRequirement,
} from "@/lib/matching/types";

describe("Pure Matching Engine (Part 4 Fixture Scenarios)", () => {
  const FIXED_NOW = new Date("2026-10-19T12:00:00Z"); // current year: 2026

  const baseProfile: MatchProfile = {
    currentCountry: "NG",
    destinationCountry: "GB",
    graduationYear: 2022,
    highestQualification: "primary_degree",
    internshipStatus: "completed",
    careerStage: "medical_officer",
    experienceYears: 4,
    specialty: "internal-medicine",
    currentWorkCountry: "NG",
    timeline: "within_6_months",
  };

  const reqInternship: PublishedRequirement = {
    id: "req-internship",
    key: "internship_completed",
    label: "Completed 12 months supervised internship",
    severity: "required",
    usedAnswers: ["internshipStatus"],
    operator: "equals",
    expectedValue: "completed",
    source: {
      url: "https://www.gmc-uk.org/registration-and-licensing",
      verifiedAt: "2026-09-01",
    },
  };

  const reqGraduationRecent: PublishedRequirement = {
    id: "req-grad",
    key: "recent_graduation",
    label: "Graduated within the last 5 years",
    severity: "may_block",
    usedAnswers: ["graduationYear"],
    operator: "max_years_since",
    expectedValue: 5,
    source: {
      url: "https://www.gmc-uk.org/registration-and-licensing",
      verifiedAt: "2026-09-01",
    },
  };

  const reqExperience: PublishedRequirement = {
    id: "req-exp",
    key: "minimum_experience",
    label: "At least 3 years experience",
    severity: "required",
    usedAnswers: ["experienceYears"],
    operator: "gte",
    expectedValue: 3,
    source: {
      url: "https://www.gmc-uk.org/registration-and-licensing",
      verifiedAt: "2026-09-01",
    },
  };

  const reqSpecialty: PublishedRequirement = {
    id: "req-specialty",
    key: "recognized_specialty",
    label: "Must have a recognized specialty",
    severity: "may_block",
    usedAnswers: ["specialty"],
    operator: "in",
    expectedValue: ["internal-medicine", "surgery", "paediatrics"],
    source: {
      url: "https://www.gmc-uk.org/registration-and-licensing",
      verifiedAt: "2026-09-01",
    },
  };

  const reqWorkCountry: PublishedRequirement = {
    id: "req-work-country",
    key: "practising_in_origin",
    label: "Currently practising in origin country",
    severity: "may_block",
    usedAnswers: ["currentWorkCountry"],
    operator: "equals",
    expectedValue: "NG",
    source: {
      url: "https://www.gmc-uk.org/registration-and-licensing",
      verifiedAt: "2026-09-01",
    },
  };

  function createTestPathway(
    id: string,
    requirements: PublishedRequirement[],
    overrides?: Partial<PublishedPathway>
  ): PublishedPathway {
    return {
      id,
      versionId: `${id}-v1`,
      slug: `${id}-slug`,
      title: `Pathway ${id}`,
      sourceCountry: "NG",
      destinationCountry: "GB",
      routeType: "professional_registration",
      status: "published",
      publishedAt: "2026-09-15T00:00:00Z",
      typicalDurationMonths: 6,
      requirements,
      ...overrides,
    };
  }

  it("Scenario 1: All requirements satisfied -> Potential match", () => {
    const pathway = createTestPathway("pw-1", [reqInternship, reqGraduationRecent, reqExperience]);
    const res = evaluateMatches(baseProfile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("potential_match");
    expect(res.results[0].criteria.every((c) => c.outcome === "met")).toBe(true);
    expect(res.results[0].timelineNote).toContain("6 months");
  });

  it("Scenario 2: Required internship not completed -> Requirement appears unmet", () => {
    const profile: MatchProfile = {
      ...baseProfile,
      internshipStatus: "not_started",
    };
    const pathway = createTestPathway("pw-2", [reqInternship, reqGraduationRecent]);
    const res = evaluateMatches(profile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("requirement_unmet");
    const internCrit = res.results[0].criteria.find((c) => c.key === "internship_completed");
    expect(internCrit?.outcome).toBe("not_met");
  });

  it("Scenario 3: Graduation older than a may-block limit -> Potential blocker", () => {
    const profile: MatchProfile = {
      ...baseProfile,
      graduationYear: 2018, // 8 years ago in 2026, limit is 5
    };
    const pathway = createTestPathway("pw-3", [reqInternship, reqGraduationRecent]);
    const res = evaluateMatches(profile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("potential_blocker");
    const gradCrit = res.results[0].criteria.find((c) => c.key === "recent_graduation");
    expect(gradCrit?.outcome).toBe("not_met");
  });

  it("Scenario 4: Specialty needed but left blank -> More information needed", () => {
    const profile: MatchProfile = {
      ...baseProfile,
      specialty: null,
    };
    const pathway = createTestPathway("pw-4", [reqInternship, reqSpecialty]);
    const res = evaluateMatches(profile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("more_info_needed");
    expect(res.results[0].missing).toContain("specialty");
    const specCrit = res.results[0].criteria.find((c) => c.key === "recognized_specialty");
    expect(specCrit?.outcome).toBe("unknown");
  });

  it("Scenario 5: Unmet required plus an unknown -> Requirement appears unmet (precedence)", () => {
    const profile: MatchProfile = {
      ...baseProfile,
      internshipStatus: "not_started", // required not_met
      specialty: null, // unknown
    };
    const pathway = createTestPathway("pw-5", [reqInternship, reqSpecialty]);
    const res = evaluateMatches(profile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("requirement_unmet");
  });

  it("Scenario 6: Unmet may-block plus an unknown -> Potential blocker (precedence)", () => {
    const profile: MatchProfile = {
      ...baseProfile,
      internshipStatus: "completed", // met
      graduationYear: 2018, // may_block not_met
      specialty: null, // unknown
    };
    const pathway = createTestPathway("pw-6", [reqInternship, reqGraduationRecent, reqSpecialty]);
    const res = evaluateMatches(profile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    expect(res.results[0].status).toBe("potential_blocker");
  });

  it("Scenario 7: Requirement uses an optional answer left blank -> Criterion unknown, never met", () => {
    const profile: MatchProfile = {
      ...baseProfile,
      currentWorkCountry: null, // optional left blank
    };
    const pathway = createTestPathway("pw-7", [reqWorkCountry]);
    const res = evaluateMatches(profile, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(1);
    const workCrit = res.results[0].criteria[0];
    expect(workCrit.outcome).toBe("unknown");
    expect(workCrit.outcome).not.toBe("met");
  });

  it("Scenario 8: Experience exactly at the threshold -> Criterion met; one year below is not met", () => {
    // Exactly at threshold: 3 years
    const profileExact: MatchProfile = {
      ...baseProfile,
      experienceYears: 3,
    };
    const pathway = createTestPathway("pw-8", [reqExperience]);
    const resExact = evaluateMatches(profileExact, [pathway], FIXED_NOW);
    expect(resExact.results[0].criteria[0].outcome).toBe("met");

    // One year below threshold: 2 years
    const profileBelow: MatchProfile = {
      ...baseProfile,
      experienceYears: 2,
    };
    const resBelow = evaluateMatches(profileBelow, [pathway], FIXED_NOW);
    expect(resBelow.results[0].criteria[0].outcome).toBe("not_met");
  });

  it("Scenario 9: No published pathway for the pair -> Nothing evaluated; empty state", () => {
    // Valid pair CA -> US, no content
    const profileOtherPair: MatchProfile = {
      ...baseProfile,
      currentCountry: "CA",
      destinationCountry: "US",
    };
    const pathway = createTestPathway("pw-9", [reqInternship]); // NG -> GB
    const res = evaluateMatches(profileOtherPair, [pathway], FIXED_NOW);

    expect(res.results.length).toBe(0);
  });

  it("Scenario 10: Same input twice, pathways shuffled -> Byte-identical output and order", () => {
    const pwA = createTestPathway("pw-A", [reqInternship], {
      title: "Pathway Alpha",
      routeType: "professional_registration",
    });
    const pwB = createTestPathway("pw-B", [reqInternship, reqGraduationRecent], {
      title: "Pathway Beta",
      routeType: "skilled_work",
    });
    const pwC = createTestPathway("pw-C", [reqInternship, reqSpecialty], {
      title: "Pathway Gamma",
      routeType: "study",
    });

    const run1 = evaluateMatches(baseProfile, [pwA, pwB, pwC], FIXED_NOW);
    const run2 = evaluateMatches(baseProfile, [pwC, pwA, pwB], FIXED_NOW);

    const json1 = JSON.stringify(run1);
    const json2 = JSON.stringify(run2);

    expect(json1).toBe(json2);
  });
});
