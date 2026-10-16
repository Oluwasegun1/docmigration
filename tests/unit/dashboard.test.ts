import { describe, expect, it } from "vitest";
import {
  assessProfile,
  buildDashboardModel,
  computeProgress,
  deriveNextStep,
  sortTasks,
  type TaskView,
} from "@/features/dashboard/model";
import { canCompleteTask } from "@/server/policies/tasks";
import type {
  CountryRow,
  DependencyRow,
  GoalRow,
  PathwayRow,
  PlanRow,
  ProfileRow,
  RegulatorRow,
  TaskRow,
} from "@/types/db";

describe("assessProfile", () => {
  it("identifies missing required screening fields", () => {
    const res = assessProfile(null);
    expect(res.complete).toBe(false);
    expect(res.missing).toContain("Country of medical school");
    expect(res.missing).toContain("Graduation year");
    expect(res.missing).toContain("Internship status");
  });

  it("marks complete when core medical details are present", () => {
    const profile: ProfileRow = {
      user_id: "user-1",
      preferred_name: "Tunde",
      residence_country: "NG",
      medical_school: "Unilag",
      medical_school_country: "NG",
      graduation_year: 2021,
      internship_status: "completed",
      specialty: "General Medicine",
      language_test_status: "passed",
      timeline: "within_6_months",
    };
    const res = assessProfile(profile);
    expect(res.complete).toBe(true);
    expect(res.missing.length).toBe(0);
  });
});

describe("canCompleteTask policy", () => {
  it("disallows completing an already completed task", () => {
    const decision = canCompleteTask({ status: "completed" }, []);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("already_completed");
  });

  it("disallows completion if dependencies are incomplete", () => {
    const decision = canCompleteTask({ status: "not_started" }, [
      { title: "Pass IELTS or OET", status: "not_started" },
      { title: "Primary source verification (EPIC)", status: "completed" },
    ]);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("dependencies_incomplete");
    expect(decision.waitingFor).toEqual(["Pass IELTS or OET"]);
  });

  it("allows completion when all dependencies are completed", () => {
    const decision = canCompleteTask({ status: "in_progress" }, [
      { title: "Primary source verification (EPIC)", status: "completed" },
      { title: "Language requirement", status: "completed" },
    ]);
    expect(decision.allowed).toBe(true);
  });
});

describe("computeProgress", () => {
  it("returns null percent when total tasks is 0", () => {
    const prog = computeProgress([]);
    expect(prog.total).toBe(0);
    expect(prog.completed).toBe(0);
    expect(prog.percent).toBeNull();
  });

  it("calculates accurate percent from task status", () => {
    const prog = computeProgress([
      { displayStatus: "completed" },
      { displayStatus: "completed" },
      { displayStatus: "in_progress" },
      { displayStatus: "not_started" },
    ]);
    expect(prog.total).toBe(4);
    expect(prog.completed).toBe(2);
    expect(prog.percent).toBe(50);
  });
});

describe("sortTasks", () => {
  it("prioritizes actionable tasks over blocked and completed", () => {
    const base: Omit<TaskView, "id" | "title" | "displayStatus" | "sortOrder"> =
      {
        planId: "p1",
        description: null,
        storedStatus: "not_started",
        dueDate: null,
        overdue: false,
        destinationName: "UK",
        pathwayName: "PLAB",
        blockedByTitles: [],
        canComplete: true,
      };

    const tasks: TaskView[] = [
      {
        ...base,
        id: "1",
        title: "Completed task",
        displayStatus: "completed",
        sortOrder: 1,
      },
      {
        ...base,
        id: "2",
        title: "Blocked task",
        displayStatus: "blocked",
        sortOrder: 2,
      },
      {
        ...base,
        id: "3",
        title: "Active task",
        displayStatus: "in_progress",
        sortOrder: 3,
      },
      {
        ...base,
        id: "4",
        title: "Not started task",
        displayStatus: "not_started",
        sortOrder: 4,
      },
    ];

    const sorted = sortTasks(tasks);
    expect(sorted[0].displayStatus).toBe("in_progress");
    expect(sorted[1].displayStatus).toBe("not_started");
    expect(sorted[2].displayStatus).toBe("blocked");
    expect(sorted[3].displayStatus).toBe("completed");
  });
});

describe("deriveNextStep", () => {
  it("recommends profile completion when profile is incomplete", () => {
    const step = deriveNextStep({
      profileComplete: false,
      missingProfileFields: ["Graduation year"],
      destinations: [],
      activePlans: [],
      allTasks: [],
      nextTask: null,
      hasActionable: false,
    });
    expect(step.kind).toBe("complete_profile");
    expect(step.title).toContain("Complete your professional profile");
  });

  it("recommends choosing a destination if no destinations are saved", () => {
    const step = deriveNextStep({
      profileComplete: true,
      missingProfileFields: [],
      destinations: [],
      activePlans: [],
      allTasks: [],
      nextTask: null,
      hasActionable: false,
    });
    expect(step.kind).toBe("choose_destination");
  });
});

describe("buildDashboardModel", () => {
  it("builds a coherent model from normalized DB tables", () => {
    const countries: CountryRow[] = [{ code: "GB", name: "United Kingdom" }];
    const regulators: RegulatorRow[] = [
      { id: "reg-1", name: "General Medical Council", short_name: "GMC" },
    ];
    const pathways: PathwayRow[] = [
      {
        id: "pw-1",
        country: "GB",
        regulator_id: "reg-1",
        name: "PLAB / MLA",
        profession: "doctor",
      },
    ];
    const plans: PlanRow[] = [
      {
        id: "plan-1",
        pathway_id: "pw-1",
        status: "active",
        created_at: "2026-10-15T00:00:00Z",
      },
    ];
    const tasks: TaskRow[] = [
      {
        id: "t-1",
        plan_id: "plan-1",
        pathway_id: "pw-1",
        title: "IELTS / OET",
        description: "Achieve requisite score",
        status: "completed",
        sort_order: 1,
        due_date: null,
      },
      {
        id: "t-2",
        plan_id: "plan-1",
        pathway_id: "pw-1",
        title: "Book PLAB 1",
        description: null,
        status: "not_started",
        sort_order: 2,
        due_date: "2026-12-01",
      },
    ];
    const dependencies: DependencyRow[] = [
      { task_id: "t-2", depends_on_task_id: "t-1" },
    ];
    const goals: GoalRow[] = [{ id: "g-1", country: "GB", pathway_id: "pw-1" }];
    const profile: ProfileRow = {
      user_id: "u-1",
      preferred_name: "Chidi",
      residence_country: "NG",
      medical_school: "University of Ibadan",
      medical_school_country: "NG",
      graduation_year: 2020,
      internship_status: "completed",
      specialty: "Surgery",
      language_test_status: "passed",
      timeline: "within_6_months",
    };

    const model = buildDashboardModel({
      today: "2026-10-15",
      profile,
      goals,
      plans,
      tasks,
      dependencies,
      pathways,
      countries,
      regulators,
    });

    expect(model.profileComplete).toBe(true);
    expect(model.activePlans.length).toBe(1);
    expect(model.tasksCompleted).toBe(1);
    expect(model.tasksRemaining).toBe(1);
    expect(model.progress?.percent).toBe(50);
    expect(model.nextTask?.title).toBe("Book PLAB 1");
    expect(model.nextTask?.canComplete).toBe(true);
    expect(model.nextStep.kind).toBe("review_tasks");
    expect(model.destinations.length).toBe(1);
    expect(model.destinations[0].name).toBe("United Kingdom");
  });
});
