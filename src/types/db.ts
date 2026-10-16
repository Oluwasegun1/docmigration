import { z } from "zod";

export const INTERNSHIP_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "not_applicable",
  "unknown",
] as const;
export const LANGUAGE_TEST_STATUSES = [
  "unknown",
  "not_required",
  "not_started",
  "booked",
  "passed",
  "expired",
  "exempt",
] as const;
export const TIMELINES = [
  "within_6_months",
  "6_12_months",
  "1_2_years",
  "exploring",
  "unknown",
] as const;
export const TASK_STATUSES = [
  "not_started",
  "in_progress",
  "waiting",
  "blocked",
  "completed",
] as const;
export const RESOURCE_TYPES = [
  "regulator_guidance",
  "application_portal",
  "examination",
  "language_test",
  "immigration",
  "fees",
  "other",
] as const;

export const ProfileRowSchema = z.object({
  user_id: z.string(),
  preferred_name: z.string().nullable(),
  residence_country: z.string().nullable(),
  medical_school: z.string().nullable(),
  medical_school_country: z.string().nullable(),
  graduation_year: z.number().nullable(),
  internship_status: z.enum(INTERNSHIP_STATUSES),
  specialty: z.string().nullable(),
  language_test_status: z.enum(LANGUAGE_TEST_STATUSES),
  timeline: z.enum(TIMELINES),
});
export type ProfileRow = z.infer<typeof ProfileRowSchema>;

export const CountryRowSchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type CountryRow = z.infer<typeof CountryRowSchema>;

export const RegulatorRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  short_name: z.string(),
});
export type RegulatorRow = z.infer<typeof RegulatorRowSchema>;

export const PathwayRowSchema = z.object({
  id: z.string(),
  country: z.string(),
  regulator_id: z.string(),
  name: z.string(),
  profession: z.string(),
});
export type PathwayRow = z.infer<typeof PathwayRowSchema>;

export const GoalRowSchema = z.object({
  id: z.string(),
  country: z.string(),
  pathway_id: z.string().nullable(),
});
export type GoalRow = z.infer<typeof GoalRowSchema>;

export const PlanRowSchema = z.object({
  id: z.string(),
  pathway_id: z.string(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  created_at: z.string(),
});
export type PlanRow = z.infer<typeof PlanRowSchema>;

export const TaskRowSchema = z.object({
  id: z.string(),
  plan_id: z.string(),
  pathway_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
  sort_order: z.number(),
  due_date: z.string().nullable(),
});
export type TaskRow = z.infer<typeof TaskRowSchema>;

export const DependencyRowSchema = z.object({
  task_id: z.string(),
  depends_on_task_id: z.string(),
});
export type DependencyRow = z.infer<typeof DependencyRowSchema>;

export const ResourceRowSchema = z.object({
  id: z.string(),
  regulator_id: z.string(),
  country: z.string(),
  pathway_id: z.string().nullable(),
  title: z.string(),
  resource_type: z.enum(RESOURCE_TYPES),
  source_url: z.string(),
  verified_date: z.string().nullable(),
});
export type ResourceRow = z.infer<typeof ResourceRowSchema>;
