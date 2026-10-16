"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoBackButton() {
  const router = useRouter();

  const handleGoBack = () => {
    // Only read document.referrer and window in the event handler to ensure safety
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      if (referrer) {
        try {
          const isSameOrigin = new URL(referrer).origin === window.location.origin;
          if (isSameOrigin && window.history.length > 1) {
            router.back();
            return;
          }
        } catch {
          // ignore invalid referrer URL
        }
      }
    }

    // Safe fallback to home
    router.push("/");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleGoBack}
      className="w-full sm:w-auto min-h-[44px] transition-transform active:scale-[0.98]"
    >
      <ArrowLeft className="size-4" />
      <span>Go Back</span>
    </Button>
  );
}
