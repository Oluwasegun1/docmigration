import { Card } from "@/components/ui/card";

export default function MatchesLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading pathway matches"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-pulse"
    >
      <div className="space-y-2">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="h-4 w-48 bg-slate-100 rounded"></div>
      </div>

      <div className="h-16 w-full bg-slate-100 rounded-lg"></div>

      <div className="h-14 w-full bg-slate-100 rounded-xl"></div>

      <div className="h-5 w-56 bg-slate-200 rounded"></div>

      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-1/2">
                <div className="h-3 w-28 bg-slate-200 rounded"></div>
                <div className="h-6 w-56 bg-slate-300 rounded"></div>
              </div>
              <div className="h-7 w-32 bg-slate-200 rounded-full"></div>
            </div>
            <div className="h-4 w-40 bg-slate-100 rounded"></div>
            <div className="h-10 w-full bg-slate-50 rounded"></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
