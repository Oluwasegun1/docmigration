import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CountryRowSchema,
  DependencyRowSchema,
  GoalRowSchema,
  PathwayRowSchema,
  PlanRowSchema,
  ProfileRowSchema,
  RegulatorRowSchema,
  ResourceRowSchema,
  TaskRowSchema,
} from "@/types/db";

/**
 * The only place that reads these tables. Every result is validated with Zod,
 * so malformed rows fail loudly instead of rendering wrong data. All reads run
 * as the signed-in user, so RLS applies in addition to explicit user_id filters.
 */

function parse<T extends z.ZodType>(schema: T, rows: unknown): z.infer<T>[] {
  return z.array(schema).parse(rows ?? []);
}

async function unwrap<T>(
  q: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchProfile(db: SupabaseClient, userId: string) {
  const row = await unwrap(
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  );
  return row ? ProfileRowSchema.parse(row) : null;
}

export async function fetchGoals(db: SupabaseClient, userId: string) {
  return parse(
    GoalRowSchema,
    await unwrap(
      db
        .from("destination_goals")
        .select("id,country,pathway_id")
        .eq("user_id", userId),
    ),
  );
}

export async function fetchPlans(db: SupabaseClient, userId: string) {
  return parse(
    PlanRowSchema,
    await unwrap(
      db
        .from("plans")
        .select("id,pathway_id,status,created_at")
        .eq("user_id", userId),
    ),
  );
}

export async function fetchTasks(db: SupabaseClient, userId: string) {
  const tasks = parse(
    TaskRowSchema,
    await unwrap(
      db
        .from("plan_tasks")
        .select(
          "id,plan_id,pathway_id,title,description,status,sort_order,due_date",
        )
        .eq("user_id", userId),
    ),
  );
  const ids = tasks.map((t) => t.id);
  const dependencies =
    ids.length === 0
      ? []
      : parse(
          DependencyRowSchema,
          await unwrap(
            db
              .from("plan_task_dependencies")
              .select("task_id,depends_on_task_id")
              .in("task_id", ids),
          ),
        );
  return { tasks, dependencies };
}

export async function fetchPathways(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  return parse(
    PathwayRowSchema,
    await unwrap(
      db
        .from("pathways")
        .select("id,country,regulator_id,name,profession")
        .in("id", ids),
    ),
  );
}

export async function fetchCountries(db: SupabaseClient, codes: string[]) {
  if (codes.length === 0) return [];
  return parse(
    CountryRowSchema,
    await unwrap(db.from("countries").select("code,name").in("code", codes)),
  );
}

export async function fetchRegulators(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  return parse(
    RegulatorRowSchema,
    await unwrap(
      db.from("regulators").select("id,name,short_name").in("id", ids),
    ),
  );
}

/** Published resources only, for the given pathways or countries. */
export async function fetchPublishedResources(
  db: SupabaseClient,
  scope: { pathwayIds: string[]; countryCodes: string[] },
  limit: number,
) {
  const clauses: string[] = [];
  if (scope.pathwayIds.length)
    clauses.push(`pathway_id.in.(${scope.pathwayIds.join(",")})`);
  if (scope.countryCodes.length)
    clauses.push(`country.in.(${scope.countryCodes.join(",")})`);
  if (clauses.length === 0) return [];
  return parse(
    ResourceRowSchema,
    await unwrap(
      db
        .from("resources")
        .select(
          "id,regulator_id,country,pathway_id,title,resource_type,source_url,verified_date",
        )
        .eq("status", "published")
        .or(clauses.join(","))
        .order("verified_date", { ascending: false })
        .limit(limit),
    ),
  );
}

export async function fetchTaskForUser(
  db: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const row = await unwrap(
    db
      .from("plan_tasks")
      .select(
        "id,plan_id,pathway_id,title,description,status,sort_order,due_date",
      )
      .eq("id", taskId)
      .eq("user_id", userId)
      .maybeSingle(),
  );
  return row ? TaskRowSchema.parse(row) : null;
}

export async function fetchDependencyStatuses(
  db: SupabaseClient,
  taskId: string,
) {
  const deps = parse(
    DependencyRowSchema,
    await unwrap(
      db
        .from("plan_task_dependencies")
        .select("task_id,depends_on_task_id")
        .eq("task_id", taskId),
    ),
  );
  if (deps.length === 0) return [];
  return parse(
    z.object({ id: z.string(), title: z.string(), status: z.string() }),
    await unwrap(
      db
        .from("plan_tasks")
        .select("id,title,status")
        .in(
          "id",
          deps.map((d) => d.depends_on_task_id),
        ),
    ),
  );
}

export async function markTaskCompleted(
  db: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const { data, error } = await db
    .from("plan_tasks")
    .update({ status: "completed" })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length === 1;
}
