import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-6"
    >
      <div className="flex items-center gap-3 text-[#164E43]">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        <span className="text-sm font-medium text-slate-600">Loading...</span>
      </div>

      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 rounded bg-slate-100" />
        <div className="h-36 w-full rounded-2xl bg-white border border-slate-200 shadow-xs" />
      </div>
    </div>
  );
}
