import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NextStep } from "@/features/dashboard/model";

export interface NextStepCardProps {
  nextStep: NextStep;
}

export function NextStepCard({ nextStep }: NextStepCardProps) {
  return (
    <section
      aria-labelledby="next-step-heading"
      className="rounded-2xl border-2 border-teal-700/20 bg-linear-to-br from-teal-50/70 via-white to-slate-50 p-6 shadow-xs sm:p-7"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-teal-800 uppercase">
            <Compass className="size-4" />
            <span>Recommended Next Step</span>
          </div>
          <h2
            id="next-step-heading"
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            {nextStep.title}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {nextStep.why}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto"
            data-primary-action
          >
            <Link href={nextStep.primary.href}>
              <span>{nextStep.primary.label}</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>

          {nextStep.secondary && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link href={nextStep.secondary.href}>
                {nextStep.secondary.label}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
