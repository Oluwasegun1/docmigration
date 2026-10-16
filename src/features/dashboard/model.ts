import type {
  CountryRow,
  DependencyRow,
  GoalRow,
  PathwayRow,
  PlanRow,
  ProfileRow,
  RegulatorRow,
  ResourceRow,
  TaskRow,
} from "@/types/db";

/**
 * Pure, deterministic dashboard logic. No I/O and no AI. Everything shown on
 * the dashboard is derived here from real records.
 */

export type DisplayTaskStatus =
  "not_started" | "in_progress" | "waiting" | "blocked" | "completed";

export interface TaskView {
  id: string;
  planId: string;
  title: string;
  description: string | null;
  storedStatus: TaskRow["status"];
  /** Stored status, except incomplete tasks with unmet dependencies show as blocked. */
  displayStatus: DisplayTaskStatus;
  dueDate: string | null;
  overdue: boolean;
  destinationName: string;
  pathwayName: string;
  blockedByTitles: string[];
  canComplete: boolean;
  sortOrder: number;
}

export interface PlanView {
  id: string;
  status: PlanRow["status"];
  createdAt: string;
  pathwayName: string;
  profession: string;
  countryCode: string;
  destinationName: string;
  regulatorName: string | null;
  tasks: TaskView[];
}

export interface Progress {
  completed: number;
  total: number;
  /** null when there are no tasks, so we never show a misleading 0% or 100%. */
  percent: number | null;
}

export interface DeadlineSummary {
  upcoming: number;
  overdue: number;
  nextDate: string | null;
}

export interface DestinationView {
  code: string;
  name: string;
  pathwayNames: string[];
  planStatus: "none" | PlanRow["status"];
}

export interface ResourceView {
  id: string;
  title: string;
  regulatorName: string;
  destinationName: string;
  type: ResourceRow["resource_type"];
  url: string;
  verifiedDate: string | null;
}

export type NextStepKind =
  | "complete_profile"
  | "choose_destination"
  | "create_plan"
  | "no_tasks"
  | "review_tasks"
  | "tasks_waiting"
  | "plan_complete";

export interface NextStep {
  kind: NextStepKind;
  title: string;
  why: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export interface DashboardInput {
  today: string; // YYYY-MM-DD
  profile: ProfileRow | null;
  goals: GoalRow[];
  plans: PlanRow[];
  tasks: TaskRow[];
  dependencies: DependencyRow[];
  pathways: PathwayRow[];
  countries: CountryRow[];
  regulators: RegulatorRow[];
}

export interface DashboardModel {
  profileComplete: boolean;
  missingProfileFields: string[];
  activePlans: PlanView[];
  primaryPlan: PlanView | null;
  progress: Progress | null;
  tasksCompleted: number;
  tasksRemaining: number;
  deadlines: DeadlineSummary | null;
  upcomingTasks: TaskView[];
  nextTask: TaskView | null;
  destinations: DestinationView[];
  nextStep: NextStep;
}

const SELECT_ROUTE = "/destinations";
const PROFILE_ROUTE = "/more/profile";

export function assessProfile(profile: ProfileRow | null) {
  const missing: string[] = [];
  if (!profile?.medical_school_country)
    missing.push("Country of medical school");
  if (!profile?.graduation_year) missing.push("Graduation year");
  if (!profile || profile.internship_status === "unknown") {
    missing.push("Internship status");
  }
  return { complete: missing.length === 0, missing };
}

export function computeProgress(
  tasks: Pick<TaskView, "displayStatus">[],
): Progress {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.displayStatus === "completed").length;
  return {
    completed,
    total,
    percent: total === 0 ? null : Math.round((completed / total) * 100),
  };
}

const GROUP: Record<DisplayTaskStatus, number> = {
  in_progress: 0,
  not_started: 0,
  waiting: 1,
  blocked: 1,
  completed: 2,
};

/** Actionable work first, then by genuine due date, then plan order. */
export function sortTasks(tasks: TaskView[]): TaskView[] {
  return [...tasks].sort((a, b) => {
    const g = GROUP[a.displayStatus] - GROUP[b.displayStatus];
    if (g !== 0) return g;
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    if (a.displayStatus !== b.displayStatus) {
      if (a.displayStatus === "in_progress") return -1;
      if (b.displayStatus === "in_progress") return 1;
    }
    return a.sortOrder - b.sortOrder;
  });
}

export function summariseDeadlines(
  tasks: TaskView[],
  today: string,
): DeadlineSummary | null {
  const dated = tasks.filter(
    (t) => t.displayStatus !== "completed" && t.dueDate,
  );
  if (dated.length === 0) return null;
  const overdue = dated.filter((t) => (t.dueDate as string) < today).length;
  const upcomingDates = dated
    .map((t) => t.dueDate as string)
    .filter((d) => d >= today)
    .sort();
  return {
    upcoming: upcomingDates.length,
    overdue,
    nextDate: upcomingDates[0] ?? null,
  };
}

export function buildDashboardModel(input: DashboardInput): DashboardModel {
  const countryName = new Map(input.countries.map((c) => [c.code, c.name]));
  const pathwayById = new Map(input.pathways.map((p) => [p.id, p]));
  const regulatorById = new Map(input.regulators.map((r) => [r.id, r]));
  const taskById = new Map(input.tasks.map((t) => [t.id, t]));
  const depsByTask = new Map<string, string[]>();
  for (const d of input.dependencies) {
    depsByTask.set(d.task_id, [
      ...(depsByTask.get(d.task_id) ?? []),
      d.depends_on_task_id,
    ]);
  }

  const name = (code: string) => countryName.get(code) ?? code;

  const taskView = (row: TaskRow): TaskView => {
    const pathway = pathwayById.get(row.pathway_id);
    const unmet = (depsByTask.get(row.id) ?? [])
      .map((id) => taskById.get(id))
      .filter((t): t is TaskRow => !!t && t.status !== "completed");
    const completed = row.status === "completed";
    const displayStatus: DisplayTaskStatus = completed
      ? "completed"
      : unmet.length > 0
        ? "blocked"
        : row.status;
    return {
      id: row.id,
      planId: row.plan_id,
      title: row.title,
      description: row.description,
      storedStatus: row.status,
      displayStatus,
      dueDate: row.due_date,
      overdue: !completed && !!row.due_date && row.due_date < input.today,
      destinationName: pathway ? name(pathway.country) : "",
      pathwayName: pathway?.name ?? "",
      blockedByTitles: unmet.map((t) => t.title),
      canComplete: !completed && unmet.length === 0,
      sortOrder: row.sort_order,
    };
  };

  const activePlans: PlanView[] = input.plans
    .filter((p) => p.status === "active")
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .flatMap((p) => {
      const pathway = pathwayById.get(p.pathway_id);
      if (!pathway) return []; // pathway no longer published: do not guess
      return [
        {
          id: p.id,
          status: p.status,
          createdAt: p.created_at,
          pathwayName: pathway.name,
          profession: pathway.profession,
          countryCode: pathway.country,
          destinationName: name(pathway.country),
          regulatorName: regulatorById.get(pathway.regulator_id)?.name ?? null,
          tasks: sortTasks(
            input.tasks.filter((t) => t.plan_id === p.id).map(taskView),
          ),
        },
      ];
    });

  const primaryPlan = activePlans[0] ?? null;
  const allTasks = activePlans.flatMap((p) => p.tasks);
  const incomplete = sortTasks(
    allTasks.filter((t) => t.displayStatus !== "completed"),
  );
  const actionable = incomplete.filter((t) => t.canComplete);
  const nextTask = actionable[0] ?? incomplete[0] ?? null;

  // Destinations: union of saved goals and plans, per country.
  const byCountry = new Map<string, DestinationView>();
  const ensure = (code: string) => {
    const existing = byCountry.get(code);
    if (existing) return existing;
    const created: DestinationView = {
      code,
      name: name(code),
      pathwayNames: [],
      planStatus: "none",
    };
    byCountry.set(code, created);
    return created;
  };
  for (const g of input.goals) {
    const d = ensure(g.country);
    const pw = g.pathway_id ? pathwayById.get(g.pathway_id) : undefined;
    if (pw && !d.pathwayNames.includes(pw.name)) d.pathwayNames.push(pw.name);
  }
  for (const p of input.plans.filter((p) => p.status !== "archived")) {
    const pw = pathwayById.get(p.pathway_id);
    if (!pw) continue;
    const d = ensure(pw.country);
    if (!d.pathwayNames.includes(pw.name)) d.pathwayNames.push(pw.name);
    if (d.planStatus === "none" || p.status === "active")
      d.planStatus = p.status;
  }

  const profile = assessProfile(input.profile);
  const destinations = [...byCountry.values()];

  return {
    profileComplete: profile.complete,
    missingProfileFields: profile.missing,
    activePlans,
    primaryPlan,
    progress: primaryPlan ? computeProgress(primaryPlan.tasks) : null,
    tasksCompleted: allTasks.filter((t) => t.displayStatus === "completed")
      .length,
    tasksRemaining: incomplete.length,
    deadlines: summariseDeadlines(allTasks, input.today),
    upcomingTasks: incomplete.slice(0, 5),
    nextTask,
    destinations,
    nextStep: deriveNextStep({
      profileComplete: profile.complete,
      missingProfileFields: profile.missing,
      destinations,
      activePlans,
      allTasks,
      nextTask,
      hasActionable: actionable.length > 0,
    }),
  };
}

interface NextStepInput {
  profileComplete: boolean;
  missingProfileFields: string[];
  destinations: DestinationView[];
  activePlans: PlanView[];
  allTasks: TaskView[];
  nextTask: TaskView | null;
  hasActionable: boolean;
}

export function deriveNextStep(i: NextStepInput): NextStep {
  if (!i.profileComplete) {
    return {
      kind: "complete_profile",
      title: "Complete your professional profile",
      why: `We need ${i.missingProfileFields.join(", ").toLowerCase()} to check pathways against your situation. Until then, nothing is assumed about you.`,
      primary: { label: "Complete your profile", href: PROFILE_ROUTE },
    };
  }
  if (i.activePlans.length === 0) {
    if (i.destinations.length === 0) {
      return {
        kind: "choose_destination",
        title: "Choose a destination country",
        why: "Pick where you may want to practise so we can show the official routes available there.",
        primary: { label: "Explore destinations", href: SELECT_ROUTE },
      };
    }
    return {
      kind: "create_plan",
      title: "Create your migration plan",
      why: "You have saved a destination. A plan turns its pathway into an ordered list of steps you can track.",
      primary: { label: "Review pathways", href: SELECT_ROUTE },
    };
  }
  if (i.allTasks.length === 0) {
    return {
      kind: "no_tasks",
      title: "Review the registration requirements",
      why: "Your plan has no tasks yet. Read the official requirements for your pathway to see what comes first.",
      primary: { label: "Review requirements", href: SELECT_ROUTE },
    };
  }
  if (!i.nextTask) {
    return {
      kind: "plan_complete",
      title: "You've completed every task in your plan",
      why: "Completing tasks records your own progress. It does not mean you are registered, licensed or approved. Confirm outcomes with the regulator.",
      primary: { label: "Explore other pathways", href: SELECT_ROUTE },
    };
  }
  if (!i.hasActionable) {
    return {
      kind: "tasks_waiting",
      title: "Your remaining tasks are waiting on other steps",
      why: "Each open task depends on something not yet done, or is marked waiting or blocked. Review them to see what is holding things up.",
      primary: { label: "Review your tasks", href: "#my-tasks" },
    };
  }
  return {
    kind: "review_tasks",
    title: `Continue your migration plan: ${i.nextTask.title}`,
    why: i.nextTask.overdue
      ? "This task is past its due date. Finishing it unlocks the steps that depend on it."
      : "This is the next task in your plan that you can act on now.",
    primary: { label: "Go to your next task", href: "#my-tasks" },
  };
}

export function buildResourceViews(
  rows: ResourceRow[],
  regulators: RegulatorRow[],
  countries: CountryRow[],
): ResourceView[] {
  const reg = new Map(regulators.map((r) => [r.id, r.name]));
  const cn = new Map(countries.map((c) => [c.code, c.name]));
  return rows.flatMap((r) => {
    const regulatorName = reg.get(r.regulator_id);
    if (!regulatorName) return []; // never show a source without its publisher
    return [
      {
        id: r.id,
        title: r.title,
        regulatorName,
        destinationName: cn.get(r.country) ?? r.country,
        type: r.resource_type,
        url: r.source_url,
        verifiedDate: r.verified_date,
      },
    ];
  });
}
