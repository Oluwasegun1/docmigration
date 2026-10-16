"use client";

import * as React from "react";
import Link from "next/link";
import { User, Bell, LogOut, ChevronDown } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";

export interface DashboardHeaderProps {
  preferredName?: string | null;
  userEmail?: string | null;
}

export function DashboardHeader({
  preferredName,
  userEmail,
}: DashboardHeaderProps) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const greeting = preferredName
    ? `Welcome back, Dr. ${preferredName}`
    : "Welcome, Doctor";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Your migration dashboard
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">{greeting}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Area */}
          <button
            type="button"
            aria-label="Notifications (0 unread)"
            className="relative flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            title="No new notifications"
          >
            <Bell className="size-4" />
            <span className="sr-only">0 unread notifications</span>
          </button>

          {/* Profile Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="profile-menu-button"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                <User className="size-4" />
              </div>
              <span className="hidden max-w-[140px] truncate text-xs font-semibold sm:inline">
                {preferredName || userEmail || "Account"}
              </span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="profile-menu-button"
                className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5"
              >
                <div className="border-b border-slate-100 px-3 py-2 text-xs">
                  <p className="font-semibold text-slate-900">
                    {preferredName ? `Dr. ${preferredName}` : "Signed In"}
                  </p>
                  {userEmail && (
                    <p className="truncate text-slate-500">{userEmail}</p>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    href="/more/profile"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    <User className="size-3.5" />
                    Profile & Preferences
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      <LogOut className="size-3.5" />
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
