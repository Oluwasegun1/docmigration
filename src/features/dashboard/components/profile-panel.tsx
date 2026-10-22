"use client";

import * as React from "react";
import Link from "next/link";
import {
  Edit3,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  Languages,
  Award,
  Stethoscope,
} from "lucide-react";

export interface ProfilePanelTask {
  id: string;
  title: string;
  date: string;
  status?: string;
}

export interface ProfilePanelProps {
  preferredName?: string | null;
  profession?: string | null;
  qualification?: string | null;
  originCountry?: string | null;
  tasks?: ProfilePanelTask[];
}

export function ProfilePanel({
  preferredName,
  profession = "Doctor",
  qualification = "MBBS",
  originCountry = "Nigeria",
  tasks: externalTasks,
}: ProfilePanelProps) {
  const [selectedDay, setSelectedDay] = React.useState("20");

  const calendarDays = [
    { day: "S", date: "24" },
    { day: "M", date: "5" },
    { day: "T", date: "14" },
    { day: "W", date: "10" },
    { day: "T", date: "20" },
    { day: "F", date: "22" },
    { day: "S", date: "27" },
  ];

  const defaultTasks = [
    {
      id: "epic-verification",
      title: "EPIC Primary Verification",
      date: "8 Sep. 2026",
      icon: FileCheck,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-100",
    },
    {
      id: "oet-ielts",
      title: "OET / IELTS English Test",
      date: "12 Nov. 2026",
      icon: Languages,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-100",
    },
    {
      id: "mdcn-good-standing",
      title: `${originCountry} Good Standing Certificate`,
      date: "20 Sep. 2026",
      icon: Award,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-100",
    },
    {
      id: "clinical-attachment",
      title: "Clinical Attachment Application",
      date: "22 Aug. 2026",
      icon: Stethoscope,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-700",
      borderColor: "border-teal-100",
    },
  ];

  const taskIcons = [FileCheck, Languages, Award, Stethoscope];
  const taskColors = [
    { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
    { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
  ];

  const upcomingTasks = (externalTasks && externalTasks.length > 0)
    ? externalTasks.map((t, idx) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        icon: taskIcons[idx % taskIcons.length],
        iconBg: taskColors[idx % taskColors.length].bg,
        iconColor: taskColors[idx % taskColors.length].text,
        borderColor: taskColors[idx % taskColors.length].border,
      }))
    : defaultTasks;

  return (
    <aside className="w-full xl:w-80 shrink-0 space-y-6 rounded-3xl bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100/90">
      {/* Header: Profile & Edit */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Doctor Profile</h2>
        <Link
          href="/more/profile"
          aria-label="Edit Profile"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <Edit3 className="size-4" />
        </Link>
      </div>

      {/* Profile Avatar & Info */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {/* Avatar Ring */}
          <div className="size-20 rounded-full p-1 ring-4 ring-teal-50 bg-white shadow-xs overflow-hidden">
            <svg
              viewBox="0 0 100 100"
              className="size-full rounded-full bg-gradient-to-tr from-teal-100 via-emerald-100 to-slate-100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="40" r="20" fill="#0f766e" opacity="0.8" />
              <path
                d="M 50 15 C 38 15, 30 25, 30 40 C 30 50, 36 55, 36 60 C 36 50, 42 45, 50 45 C 58 45, 64 50, 64 60 C 64 55, 70 50, 70 40 C 70 25, 62 15, 50 15 Z"
                fill="#134e4a"
              />
              <circle cx="50" cy="42" r="16" fill="#fde68a" />
              <path
                d="M 22 88 C 22 70, 35 62, 50 62 C 65 62, 78 70, 78 88 Z"
                fill="#0f766e"
              />
              <path
                d="M 40 62 L 50 74 L 60 62 Z"
                fill="#ffffff"
              />
            </svg>
          </div>
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-900">
          {preferredName
            ? preferredName.startsWith("Dr.")
              ? preferredName
              : `Dr. ${preferredName}`
            : "Dr. Medical Professional"}
        </h3>
        <p className="text-xs font-medium text-slate-500">
          {profession} · {qualification}
        </p>
      </div>

      {/* Mini Calendar Card */}
      <div className="space-y-3 pt-2">
        {/* Month selector */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:text-slate-700"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span>May 2026</span>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:text-slate-700"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((item, idx) => {
            const isSelected = item.date === selectedDay;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">
                  {item.day}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDay(item.date)}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-teal-700 text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.date}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Tasks Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Upcoming Tasks</h4>
          <Link
            href="/plan"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-400 hover:text-teal-800 transition-colors"
          >
            <span>View all</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {/* Task rows */}
        <div className="space-y-2.5">
          {upcomingTasks.map((task) => {
            const Icon = task.icon;
            return (
              <Link
                key={task.id}
                href="/plan"
                className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${task.iconBg} ${task.borderColor} ${task.iconColor}`}
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                      {task.title}
                    </h5>
                    <span className="text-[11px] font-medium text-slate-400">
                      {task.date}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Migration Guidance Card */}
      <div className="rounded-2xl bg-gradient-to-b from-teal-50/90 to-emerald-50/40 p-4 text-center border border-teal-100/70 shadow-2xs">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
          Get 1-on-1 Regulatory Guidance
        </h4>
        <p className="text-[11px] text-slate-500 mt-1">
          Unlock verified document checking and personalized pathway advisory.
        </p>
        <Link
          href="/destinations"
          className="mt-3 block w-full rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 active:scale-[0.99]"
        >
          Explore Pathways
        </Link>
      </div>
    </aside>
  );
}
