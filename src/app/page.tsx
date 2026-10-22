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
          <Button asChild size="lg" className="bg-[#164E43] hover:bg-[#113E35]">
            <Link href="/create-account">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#164E43] text-[#164E43]">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/destinations">Explore destinations and pathways</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="prototype-screens" className="p-6 rounded-2xl bg-white border border-[#C5D3CD] space-y-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-bold tracking-wider text-[#164E43] uppercase">Interactive Prototype</span>
          <h2 id="prototype-screens" className="text-2xl font-bold text-[#11241F]">
            Accounts & Onboarding Prototype Screens
          </h2>
          <p className="text-sm text-[#4E625A]">
            All 8 screens are fully interactive. Content for professions and countries is driven dynamically by reference data.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <Link
            href="/create-account"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Step 1</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">Create account</div>
            <div className="text-xs text-[#637770] pt-1">Show/hide password, terms & research consent</div>
          </Link>

          <Link
            href="/auth/check-email?email=doctor@example.com"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Verification</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">Check your email</div>
            <div className="text-xs text-[#637770] pt-1">30s countdown resend, masked email, open app link</div>
          </Link>

          <Link
            href="/signup/about-you"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Step 2</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">About you</div>
            <div className="text-xs text-[#637770] pt-1">Switch Doctor (live) vs Nurse/Pharmacist (waitlist)</div>
          </Link>

          <Link
            href="/signup/where-to"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Step 3</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">Where to</div>
            <div className="text-xs text-[#637770] pt-1">Rank up to 3 destinations (1, 2, 3) & Not sure yet</div>
          </Link>

          <Link
            href="/waitlist?profession=nurse&origin=NG&destination=Canada"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Waitlist</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">We are not live yet</div>
            <div className="text-xs text-[#637770] pt-1">Extensible waitlist capture & summary card</div>
          </Link>

          <Link
            href="/sign-in"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Authentication</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">Sign in</div>
            <div className="text-xs text-[#637770] pt-1">Show/hide password & trigger sign-in error demo</div>
          </Link>

          <Link
            href="/forgot-password"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Recovery</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">Forgot password</div>
            <div className="text-xs text-[#637770] pt-1">Trigger identical confirmation demo</div>
          </Link>

          <Link
            href="/auth/reset-password?token=demo"
            className="p-3.5 rounded-xl border border-[#D5DFDA] hover:border-[#164E43] hover:bg-[#F2F7F4] transition group"
          >
            <div className="text-xs text-[#526860] font-medium">Reset</div>
            <div className="font-semibold text-sm text-[#11241F] group-hover:text-[#164E43]">New password</div>
            <div className="text-xs text-[#637770] pt-1">Show/hide password & password confirmation</div>
          </Link>
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
