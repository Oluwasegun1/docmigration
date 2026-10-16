import Link from "next/link";
import { CheckSquare, ArrowRight, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/features/dashboard/components/task-item";
import type { TaskView } from "@/features/dashboard/model";

export interface TaskListProps {
  tasks: TaskView[];
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <section
      aria-labelledby="my-tasks-heading"
      id="my-tasks"
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="size-5 text-teal-700" />
          <h2
            id="my-tasks-heading"
            className="text-lg font-bold text-slate-900 sm:text-xl"
          >
            My Actionable Tasks
          </h2>
        </div>
        {tasks.length > 0 && (
          <Button asChild variant="ghost" size="md">
            <Link
              href="/plan"
              className="inline-flex items-center gap-1 text-xs"
            >
              <span>View full plan</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CheckSquare className="mx-auto size-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">
            No pending tasks
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            You have no incomplete tasks in your active migration plan.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="md">
              <Link href="/destinations">Explore other pathways</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}
