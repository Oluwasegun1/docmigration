import { describe, it, expect } from "vitest";
import {
  createOnboardingSchema,
  checkSoftWarnings,
  onboardingSchema,
} from "@/lib/onboarding/schema";

describe("Onboarding Answers Schema", () => {
  const validAnswers = {
    currentCountry: "NG",
    destinationCountry: "GB",
    graduationYear: 2018,
    highestQualification: "primary_degree",
    internshipStatus: "completed" as const,
    careerStage: "medical_officer",
    experienceYears: 5,
    specialty: "internal-medicine",
    currentWorkCountry: "NG",
    timeline: "within_6_months" as const,
  };

  it("accepts valid answers", () => {
    const parsed = onboardingSchema.parse(validAnswers);
    expect(parsed.currentCountry).toBe("NG");
    expect(parsed.destinationCountry).toBe("GB");
    expect(parsed.experienceYears).toBe(5);
  });

  it("accepts optional fields as null or undefined", () => {
    const minimal = {
      currentCountry: "ng",
      destinationCountry: "gb",
      graduationYear: 2020,
      highestQualification: "primary_degree",
      internshipStatus: "completed",
      careerStage: "medical_officer",
      experienceYears: 2,
      specialty: null,
      currentWorkCountry: null,
      timeline: null,
    };
    const parsed = onboardingSchema.parse(minimal);
    expect(parsed.currentCountry).toBe("NG");
    expect(parsed.specialty).toBeNull();
  });

  it("trims and upper-cases country codes", () => {
    const parsed = onboardingSchema.parse({
      ...validAnswers,
      currentCountry: " ng ",
      destinationCountry: " gb ",
    });
    expect(parsed.currentCountry).toBe("NG");
    expect(parsed.destinationCountry).toBe("GB");
  });

  it("rejects graduation year in the future", () => {
    const currentYear = new Date().getFullYear();
    const schema = createOnboardingSchema({ nowYear: currentYear });
    const result = schema.safeParse({
      ...validAnswers,
      graduationYear: currentYear + 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("future");
    }
  });

  it("rejects graduation year before 1950", () => {
    const result = onboardingSchema.safeParse({
      ...validAnswers,
      graduationYear: 1948,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("1950");
    }
  });

  it("rejects when destination country equals current country and names both", () => {
    const result = onboardingSchema.safeParse({
      ...validAnswers,
      currentCountry: "NG",
      destinationCountry: "NG",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Both answers disagree");
    }
  });

  it("rejects experience greater than years since graduation and states disagreement", () => {
    const schema = createOnboardingSchema({ nowYear: 2026 });
    const result = schema.safeParse({
      ...validAnswers,
      graduationYear: 2024, // 2 years since graduation in 2026
      experienceYears: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Both answers disagree");
      expect(result.error.issues[0].message).toContain("cannot exceed years since graduation");
    }
  });

  it("detects soft warning for student with experience > 0 without blocking validation", () => {
    const schema = createOnboardingSchema({ nowYear: 2026 });
    const data = {
      ...validAnswers,
      graduationYear: 2025,
      careerStage: "student",
      experienceYears: 1,
    };
    const parsed = schema.safeParse(data);
    expect(parsed.success).toBe(true);

    const warnings = checkSoftWarnings(data);
    expect(warnings.length).toBe(1);
    expect(warnings[0].code).toBe("student_with_experience");
    expect(warnings[0].message).toContain("Does this look right?");
  });
});
