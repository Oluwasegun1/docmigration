import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { fetchProfile } from "@/server/repositories/dashboard";
import { DashboardTopBar } from "@/features/dashboard/components/dashboard-top-bar";
import { StatCards } from "@/features/dashboard/components/stat-cards";
import { HourSpentChart } from "@/features/dashboard/components/hour-spent-chart";
import { PerformanceGauge } from "@/features/dashboard/components/performance-gauge";
import { AssignmentsCard } from "@/features/dashboard/components/assignments-card";
import { MyCoursesCard } from "@/features/dashboard/components/my-courses-card";
import { ProfilePanel } from "@/features/dashboard/components/profile-panel";

export const metadata: Metadata = {
  title: "Dashboard | Migration Hub",
  description:
    "Track your international medical registration tasks, pathway progress, and verified requirements.",
};

export default async function DashboardPage() {
  let preferredName: string | null = null;

  try {
    const session = await getSession();
    if (session.status === "authenticated") {
      const profile = await fetchProfile(session.supabase, session.user.id);
      preferredName = profile?.preferred_name ?? null;
    }
  } catch {
    // Graceful fallback during setup or before credentials are populated
  }

  return (
    <div className="flex flex-col xl:flex-row gap-5 lg:gap-6 items-start max-w-7xl mx-auto">
      {/* Center Main Dashboard Column */}
      <div className="flex-1 w-full space-y-5">
        {/* Top Bar: Title, Search & Notifications */}
        <DashboardTopBar />

        {/* 1. Stat Summary Cards (In progress, Completed, Verified) */}
        <StatCards />

        {/* 2. Middle Row: Preparation Time Chart (left) & Pathway Readiness Gauge (right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className="md:col-span-7 lg:col-span-8">
            <HourSpentChart />
          </div>
          <div className="md:col-span-5 lg:col-span-4">
            <PerformanceGauge />
          </div>
        </div>

        {/* 3. Upcoming Milestone Card */}
        <AssignmentsCard />

        {/* 4. Active Pathways Progress List */}
        <MyCoursesCard />
      </div>

      {/* Right Column: Profile, Calendar, Upcoming Tasks & Upgrade Card */}
      <div className="w-full xl:w-auto">
        <ProfilePanel preferredName={preferredName} />
      </div>
    </div>
  );
}
