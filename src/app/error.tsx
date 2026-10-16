"use client";

import { Button } from "@/components/ui/button";
import { StatusNotice } from "@/components/shared/status-notice";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-12">
      <StatusNotice tone="warning" title="Something went wrong">
        Please try again. If the problem continues, contact support.
      </StatusNotice>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
