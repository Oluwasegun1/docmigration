"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAgainAction } from "../actions";

interface CheckAgainButtonProps {
  lastCheckedDate: string;
  contentVersion?: number | string;
  onRefreshed?: () => void;
}

export function CheckAgainButton({
  lastCheckedDate,
  contentVersion = 1,
  onRefreshed,
}: CheckAgainButtonProps) {
  const [isChecking, setIsChecking] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleCheckAgain = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    setAnnouncement("Checking for updated pathway content and profile answers...");

    const res = await checkAgainAction();
    setIsChecking(false);

    if (res.success) {
      setAnnouncement(res.message);
      if (onRefreshed) onRefreshed();
    } else {
      setErrorMessage(res.message);
      setAnnouncement(`Check again error: ${res.message}`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
      <div>
        <p>
          Checked on {new Date(lastCheckedDate).toLocaleString()} against pathway content version {contentVersion}.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleCheckAgain}
          disabled={isChecking}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`size-3.5 ${isChecking ? "animate-spin" : ""}`} aria-hidden />
          <span>{isChecking ? "Checking..." : "Check again"}</span>
        </Button>
      </div>

      {/* Screen reader polite announcement live region (Part 5 & Part 8) */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </div>

      {errorMessage && (
        <div role="alert" className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 mt-2 sm:mt-0">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
