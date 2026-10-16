import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDashboardModel,
  buildResourceViews,
  type DashboardModel,
  type ResourceView,
} from "@/features/dashboard/model";
import {
  fetchCountries,
  fetchGoals,
  fetchPathways,
  fetchPlans,
  fetchProfile,
  fetchPublishedResources,
  fetchRegulators,
  fetchTasks,
} from "@/server/repositories/dashboard";

export type DashboardResult =
  | { ok: true; model: DashboardModel; resources: ResourceView[] | null }
  | { ok: false };

/**
 * Loads everything the dashboard needs. If any core data (profile, goals,
 * plans, tasks) fails to load, the whole result fails: we never render a
 * next step or progress figure from partial data. Resources are optional and
 * degrade on their own (resources: null means "could not load").
 */
export async function loadDashboard(
  db: SupabaseClient,
  userId: string,
): Promise<DashboardResult> {
  try {
    const [profile, goals, plans, taskData] = await Promise.all([
      fetchProfile(db, userId),
      fetchGoals(db, userId),
      fetchPlans(db, userId),
      fetchTasks(db, userId),
    ]);

    const pathwayIds = [
      ...new Set([
        ...goals.flatMap((g) => (g.pathway_id ? [g.pathway_id] : [])),
        ...plans.map((p) => p.pathway_id),
        ...taskData.tasks.map((t) => t.pathway_id),
      ]),
    ];
    const pathways = await fetchPathways(db, pathwayIds);
    const countryCodes = [
      ...new Set([
        ...goals.map((g) => g.country),
        ...pathways.map((p) => p.country),
      ]),
    ];
    const regulatorIds = [...new Set(pathways.map((p) => p.regulator_id))];
    const [countries, regulators] = await Promise.all([
      fetchCountries(db, countryCodes),
      fetchRegulators(db, regulatorIds),
    ]);

    const model = buildDashboardModel({
      today: new Date().toISOString().slice(0, 10),
      profile,
      goals,
      plans,
      tasks: taskData.tasks,
      dependencies: taskData.dependencies,
      pathways,
      countries,
      regulators,
    });

    let resources: ResourceView[] | null = null;
    try {
      const rows = await fetchPublishedResources(
        db,
        {
          pathwayIds: model.activePlans.length
            ? plans
                .filter((p) => p.status === "active")
                .map((p) => p.pathway_id)
            : pathwayIds,
          countryCodes,
        },
        4,
      );
      const resRegulators = await fetchRegulators(db, [
        ...new Set(rows.map((r) => r.regulator_id)),
      ]);
      const resCountries = await fetchCountries(db, [
        ...new Set(rows.map((r) => r.country)),
      ]);
      resources = buildResourceViews(rows, resRegulators, resCountries);
    } catch {
      resources = null;
    }

    return { ok: true, model, resources };
  } catch (err) {
    console.error(
      "Dashboard load failed",
      err instanceof Error ? err.name : "unknown",
    );
    return { ok: false };
  }
}
