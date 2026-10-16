import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusNotice } from "@/components/shared/status-notice";
import { readPublicEnv } from "@/lib/env/public";

// Configuration status must reflect runtime env, not build-time env.
export const dynamic = "force-dynamic";

const pillars = [
  {
    title: "Explore pathways",
    body: "Browse destinations and registration pathways once verified regulatory content is published.",
  },
  {
    title: "Plan your steps",
    body: "Turn a pathway into a personal, dependency-aware task plan you can track.",
  },
  {
    title: "Estimate costs",
    body: "Compare source-backed cost estimates with your own budget and expenses.",
  },
];

export default function HomePage() {
  const env = readPublicEnv();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:py-20">
      <section className="space-y-6">
        <p className="text-sm font-medium tracking-wide text-teal-800 uppercase">
          For Nigerian-trained and internationally trained doctors
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Naija Doctor Migration Hub
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Understand medical registration and migration pathways, plan your next
          steps, track tasks and estimate costs, with every requirement traced
          to its official source.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/destinations">Explore destinations and pathways</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="pillars" className="space-y-4">
        <h2 id="pillars" className="text-xl font-semibold text-slate-900">
          What the platform will help you do
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title}>
              <h3 className="font-medium text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <StatusNotice tone="info" title="Placeholder content">
          Regulatory requirements, costs and eligibility information are not yet
          available. Initial content for the UK and Ireland will appear here
          only after human verification against official sources.
        </StatusNotice>
        {!env.ok && (
          <StatusNotice tone="warning" title="Supabase is not configured">
            Missing: {env.missing.join(", ")}. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code> and add your project values. See
            docs/development.md.
          </StatusNotice>
        )}
      </section>
    </div>
  );
}
