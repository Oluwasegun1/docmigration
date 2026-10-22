import { z } from "zod";

/**
 * Valid ISO 3166-1 alpha-2 country codes.
 * Upper-cased two-letter codes.
 */
export const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/;

export const INTERNSHIP_STATUS_CODES = [
  "not_started",
  "in_progress",
  "completed",
  "not_applicable",
] as const;

export type InternshipStatusCode = (typeof INTERNSHIP_STATUS_CODES)[number];

export const TIMELINE_CODES = [
  "within_6_months",
  "6_to_12_months",
  "1_to_2_years",
  "more_than_2_years",
  "not_sure",
] as const;

export type TimelineCode = (typeof TIMELINE_CODES)[number];

/**
 * Standard medical qualifications list.
 * Extensible for other professions.
 */
export const STANDARD_QUALIFICATIONS = [
  "primary_degree",
  "postgraduate_diploma",
  "masters",
  "doctorate",
  "other",
] as const;

/**
 * Standard career stages list.
 * Extensible for other professions.
 */
export const STANDARD_CAREER_STAGES = [
  "student",
  "house_officer",
  "medical_officer",
  "registrar",
  "senior_registrar",
  "consultant",
  "other",
] as const;

export const STANDARD_SPECIALTIES = [
  "anaesthesia",
  "emergency-medicine",
  "family-medicine",
  "internal-medicine",
  "obstetrics-gynaecology",
  "ophthalmology",
  "orthopaedics",
  "paediatrics",
  "pathology",
  "psychiatry",
  "radiology",
  "surgery",
  "other",
] as const;

export interface SoftWarning {
  field: string;
  code: string;
  message: string;
}

/**
 * Schema for the ten onboarding answers.
 */
export function createOnboardingSchema(options?: {
  nowYear?: number;
  validCountries?: string[];
  allowedQualifications?: readonly string[];
  allowedCareerStages?: readonly string[];
  allowedSpecialties?: readonly string[];
}) {
  const currentYear = options?.nowYear ?? new Date().getFullYear();
  const validCountries = options?.validCountries
    ? new Set(options.validCountries.map((c) => c.toUpperCase()))
    : null;

  const qualifications = options?.allowedQualifications ?? STANDARD_QUALIFICATIONS;
  const careerStages = options?.allowedCareerStages ?? STANDARD_CAREER_STAGES;
  const specialties = options?.allowedSpecialties ?? STANDARD_SPECIALTIES;

  const countryValidator = (fieldName: string) =>
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(ISO_COUNTRY_REGEX, {
        message: `${fieldName} must be a valid 2-letter ISO country code.`,
      })
      .refine(
        (val) => (validCountries ? validCountries.has(val) : true),
        { message: `${fieldName} is not in the recognized country list.` }
      );

  return z
    .object({
      // 1. Country you are in (Required, ISO 3166-1 alpha-2)
      currentCountry: countryValidator("Country you are in"),

      // 2. Country you want to travel to (Required, ISO 3166-1 alpha-2, differs from currentCountry)
      destinationCountry: countryValidator("Destination country"),

      // 3. Year you graduated (Required, Integer year 1950..currentYear)
      graduationYear: z
        .number({ message: "Graduation year must be a number." })
        .int("Graduation year must be an integer.")
        .min(1950, "Graduation year cannot be before 1950.")
        .max(
          currentYear,
          `Graduation year cannot be in the future (current year: ${currentYear}).`
        ),

      // 4. Highest qualification (Required, from list)
      highestQualification: z.enum(qualifications as [string, ...string[]], {
        message: "Please select a valid qualification.",
      }),

      // 5. Internship status (Required)
      internshipStatus: z.enum(INTERNSHIP_STATUS_CODES, {
        message: "Please select a valid internship status.",
      }),

      // 6. Where you are in your career (Required)
      careerStage: z.enum(careerStages as [string, ...string[]], {
        message: "Please select a valid career stage.",
      }),

      // 7. Years of experience (Required, 0..60)
      experienceYears: z
        .number({ message: "Years of experience must be a number." })
        .int("Years of experience must be an integer.")
        .min(0, "Years of experience cannot be negative.")
        .max(60, "Years of experience cannot exceed 60."),

      // 8. Specialty (Optional, null or valid code)
      specialty: z
        .string()
        .trim()
        .nullable()
        .optional()
        .refine(
          (val) => !val || (specialties as readonly string[]).includes(val),
          { message: "Please select a valid specialty." }
        ),

      // 9. Country where you work now (Optional, null or valid ISO code)
      currentWorkCountry: z
        .string()
        .trim()
        .toUpperCase()
        .nullable()
        .optional()
        .refine(
          (val) =>
            !val ||
            (ISO_COUNTRY_REGEX.test(val) &&
              (validCountries ? validCountries.has(val) : true)),
          { message: "Country where you work now must be a valid country code." }
        ),

      // 10. When you hope to move (Optional, null or valid timeline code)
      timeline: z
        .enum(TIMELINE_CODES)
        .nullable()
        .optional(),

      // Optional metadata (treated as unknown if not provided, per Part 3 rules)
      profession: z.string().trim().nullable().optional(),
      trainedCountry: z
        .string()
        .trim()
        .toUpperCase()
        .nullable()
        .optional(),
    })
    .superRefine((data, ctx) => {
      // Rule 1 & 2: Destination country must differ from current country
      if (
        data.currentCountry &&
        data.destinationCountry &&
        data.currentCountry === data.destinationCountry
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationCountry"],
          message:
            "Country you want to travel to must differ from the country you are in. Both answers disagree.",
        });
      }

      // Rule 3 & 7: Experience cannot exceed years since graduation
      if (data.graduationYear !== undefined && data.experienceYears !== undefined) {
        const yearsSinceGrad = currentYear - data.graduationYear;
        if (data.experienceYears > yearsSinceGrad) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["experienceYears"],
            message: `Years of experience (${data.experienceYears}) cannot exceed years since graduation (${yearsSinceGrad} years since ${data.graduationYear}). Both answers disagree.`,
          });
        }
      }
    });
}

export type OnboardingAnswers = z.infer<ReturnType<typeof createOnboardingSchema>>;

/**
 * Inspects parsed answers for soft warnings (never blocks saving).
 */
export function checkSoftWarnings(
  answers: Partial<OnboardingAnswers>
): SoftWarning[] {
  const warnings: SoftWarning[] = [];

  // Career stage of student with experience > 0
  if (
    answers.careerStage === "student" &&
    typeof answers.experienceYears === "number" &&
    answers.experienceYears > 0
  ) {
    warnings.push({
      field: "experienceYears",
      code: "student_with_experience",
      message:
        "You reported you are a student with over 0 years of experience. Does this look right?",
    });
  }

  return warnings;
}

export const onboardingSchema = createOnboardingSchema();
