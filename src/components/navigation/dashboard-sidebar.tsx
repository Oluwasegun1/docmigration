"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileCheck2,
  MapPin,
  Compass,
  FileText,
  BookOpen,
  UserCog,
  Stethoscope,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status?: "active" | "available" | "unavailable";
  badge?: string;
  matchPrefix?: string;
}

export const MIGRATION_NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    status: "available",
  },
  {
    title: "Matches",
    href: "/matches",
    icon: Compass,
    status: "available",
  },
  {
    title: "My Migration Plan",
    href: "/plan",
    icon: FileCheck2,
    status: "available",
  },
  {
    title: "Explore Destinations",
    href: "/destinations",
    icon: MapPin,
    status: "available",
  },
  {
    title: "Pathways & Requirements",
    href: "/explore",
    icon: Compass,
    status: "available",
  },
  {
    title: "Documents",
    href: "#",
    icon: FileText,
    status: "unavailable",
    badge: "Checklist (V1)",
  },
  {
    title: "Resources",
    href: "/dashboard#resources",
    icon: BookOpen,
    status: "available",
  },
  {
    title: "Profile & Settings",
    href: "/more/profile",
    icon: UserCog,
    status: "available",
    matchPrefix: "/more",
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white px-5 py-6 text-slate-800">
      {/* Top Brand / Logo */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
            <Stethoscope className="size-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900">
              Migration Hub
            </div>
            <div className="text-xs font-medium text-teal-800">
              Healthcare Pathways
            </div>
          </div>
        </div>

        {/* Main Navigation List */}
        <nav aria-label="Migration Navigation" className="space-y-1.5 pt-2">
          {MIGRATION_NAV_ITEMS.map((item) => {
            const isAvailable = item.status !== "unavailable";
            const isActive =
              isAvailable &&
              (pathname === item.href ||
                (item.matchPrefix && pathname.startsWith(item.matchPrefix)));

            const Icon = item.icon;

            if (!isAvailable) {
              return (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs text-slate-400"
                  title="Document checklist is under development for V1"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4.5 shrink-0 text-slate-300" />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-slate-900 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-4.5 shrink-0",
                      isActive ? "text-teal-400" : "text-slate-400",
                    )}
                  />
                  <span>{item.title}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Help & Sign Out */}
      <div className="space-y-1 border-t border-slate-100 pt-5">
        <Link
          href="/dashboard#support"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <HelpCircle className="size-4 text-slate-400" />
          <span>Support & Official Regulators</span>
        </Link>
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut className="size-4 text-slate-400" />
          <span>Log Out</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-100/90 bg-white lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer (Overlaid) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-64 flex-1 flex-col bg-white">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
