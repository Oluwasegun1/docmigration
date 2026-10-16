import * as React from "react";
import { DashboardSidebar } from "@/components/navigation/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-[#f4f7fb] text-slate-800 antialiased">
      {/* Migration Hub Left Sidebar */}
      <DashboardSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <main id="main" className="flex-1 p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
