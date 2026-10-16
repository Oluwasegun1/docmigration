import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StatusNotice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning";
  title: string;
  children?: React.ReactNode;
}) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        tone === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-teal-200 bg-teal-50 text-teal-950",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        {children ? <div className="mt-1">{children}</div> : null}
      </div>
    </div>
  );
}
