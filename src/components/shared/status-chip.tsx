import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type StatusTone =
  "confirmed" | "conditional" | "estimate" | "critical" | "pending";

const ICONS: Record<StatusTone, LucideIcon> = {
  confirmed: CheckCircle2,
  conditional: AlertTriangle,
  estimate: Info,
  critical: AlertOctagon,
  pending: Clock,
};

const STYLES: Record<StatusTone, string> = {
  confirmed: "border-emerald-600 text-emerald-800 bg-white",
  conditional: "border-amber-600 text-amber-800 bg-white",
  estimate: "border-blue-600 text-blue-800 bg-white",
  critical: "border-rose-600 text-rose-800 bg-white",
  pending: "border-slate-400 text-slate-700 bg-white",
};

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  label: string;
  icon?: LucideIcon;
}

/**
 * Standard Status Chip adhering to design-system.md (WCAG 2.2 AA compliant).
 * Uses icon + text, white background for guaranteed contrast on all surfaces.
 */
export function StatusChip({
  tone,
  label,
  icon,
  className,
  ...props
}: StatusChipProps) {
  const Icon = icon ?? ICONS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight shadow-2xs",
        STYLES[tone],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
