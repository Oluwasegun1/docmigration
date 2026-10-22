import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  STATUS_LABELS,
  CRITERION_OUTCOMES,
  USER_REPORTED_PREFIX,
  REASON_TEMPLATES,
  formatReason,
} from "@/lib/matching/copy";

describe("Copy Catalogue & Anti-Spam / Anti-Guarantee Safeguards", () => {
  const BANNED_PATTERNS = [
    /\beligib/i,
    /\bqualif/i, // except when part of qualification name in config, banned from copy words
    /\bapproved\b/i,
    /\bguarantee/i,
    /\bchance\b/i,
    /\bchances\b/i,
    /\blikely\b/i,
    /\blikelihood\b/i,
    /\bscore\b/i,
    /\bscores\b/i,
    /\bscoring\b/i,
    /%/,
    /\bpercent/i,
    /\bpercentage\b/i,
    /\bstar\b/i,
    /\bstars\b/i,
    /\bmeter\b/i,
  ];

  it("contains all 4 exact status labels", () => {
    expect(STATUS_LABELS.requirement_unmet).toBe("Requirement appears unmet");
    expect(STATUS_LABELS.potential_blocker).toBe("Potential blocker");
    expect(STATUS_LABELS.more_info_needed).toBe("More information needed");
    expect(STATUS_LABELS.potential_match).toBe("Potential match");
  });

  it("contains exact outcome words per criterion", () => {
    expect(CRITERION_OUTCOMES.met).toBe("Met");
    expect(CRITERION_OUTCOMES.not_met).toBe("Not met");
    expect(CRITERION_OUTCOMES.unknown).toBe("Need information");
  });

  it("uses exact user reported prefix", () => {
    expect(USER_REPORTED_PREFIX).toBe("You reported:");
  });

  it("scans copy.ts for prohibited/banned words", () => {
    const copyPath = path.resolve(process.cwd(), "src/lib/matching/copy.ts");
    const content = fs.readFileSync(copyPath, "utf-8");

    // Remove code comments and function identifiers before checking user-facing strings
    const lines = content.split("\n");
    for (const line of lines) {
      // Check each line against banned words
      for (const pattern of BANNED_PATTERNS) {
        // If line is not a comment and has banned pattern
        if (
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("/*") &&
          !line.trim().startsWith("*")
        ) {
          const match = line.match(pattern);
          if (match) {
            throw new Error(
              `Banned pattern ${pattern} found in copy.ts line: "${line}"`
            );
          }
        }
      }
    }
  });

  it("formats all defined reason codes without error", () => {
    const reasonCodes = Object.keys(REASON_TEMPLATES);
    expect(reasonCodes.length).toBeGreaterThan(10);

    for (const code of reasonCodes) {
      const formatted = formatReason(code, {
        actual: "NG",
        expected: "GB",
        threshold: 3,
        min: 2,
        limit: 5,
        years: 4,
        field: "experienceYears",
        options: "Option A, Option B",
      });
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    }
  });
});
