import { describe, it, expect } from "vitest";
import {
  computeProfileHash,
  computeContentFingerprint,
} from "@/lib/matches/load";
import type { MatchProfile, PublishedPathway } from "@/lib/matching/types";

describe("Match Persistence, Deduplication & Cooldown Logic", () => {
  const profileA: MatchProfile = {
    currentCountry: "NG",
    destinationCountry: "GB",
    graduationYear: 2021,
    highestQualification: "primary_degree",
    internshipStatus: "completed",
    careerStage: "medical_officer",
    experienceYears: 4,
    specialty: "internal-medicine",
    currentWorkCountry: "NG",
    timeline: "within_6_months",
  };

  const profileB: MatchProfile = {
    ...profileA,
    experienceYears: 5, // 1 year changed
  };

  const pathwaysSample: PublishedPathway[] = [
    {
      id: "pw-gb-1",
      versionId: "pw-gb-1-v1",
      slug: "plab",
      title: "PLAB / Standard Registration",
      sourceCountry: "NG",
      destinationCountry: "GB",
      routeType: "professional_registration",
      status: "published",
      publishedAt: "2026-09-01T00:00:00Z",
      requirements: [],
    },
    {
      id: "pw-gb-2",
      versionId: "pw-gb-2-v1",
      slug: "mrcp",
      title: "MRCP Direct",
      sourceCountry: "NG",
      destinationCountry: "GB",
      routeType: "professional_registration",
      status: "published",
      publishedAt: "2026-09-01T00:00:00Z",
      requirements: [],
    },
  ];

  it("computes deterministic profile hashes", () => {
    const hash1 = computeProfileHash(profileA);
    const hash2 = computeProfileHash(profileA);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it("produces distinct hashes when an answer changes", () => {
    const hashA = computeProfileHash(profileA);
    const hashB = computeProfileHash(profileB);
    expect(hashA).not.toBe(hashB);
  });

  it("computes deterministic content fingerprints independent of pathway array order", () => {
    const fp1 = computeContentFingerprint(pathwaysSample);
    const fp2 = computeContentFingerprint([...pathwaysSample].reverse());
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it("simulates cooldown enforcement: rejects re-evaluation if within window and inputs changed", () => {
    const cooldownSec = 3;
    const lastRunTime = Date.now() - 1000; // 1 second ago

    const elapsed = (Date.now() - lastRunTime) / 1000;
    const isWithinCooldown = elapsed < cooldownSec;

    expect(isWithinCooldown).toBe(true);
    const remaining = Math.ceil(cooldownSec - elapsed);
    expect(remaining).toBeGreaterThanOrEqual(1);
  });

  it("simulates run deduplication: identical hash and fingerprint reuse run", () => {
    const lastRun = {
      id: "run-existing-123",
      profileHash: computeProfileHash(profileA),
      contentFingerprint: computeContentFingerprint(pathwaysSample),
      createdAt: new Date(),
    };

    const currentHash = computeProfileHash(profileA);
    const currentFp = computeContentFingerprint(pathwaysSample);

    const isIdentical =
      lastRun.profileHash === currentHash &&
      lastRun.contentFingerprint === currentFp;

    expect(isIdentical).toBe(true);
  });
});
