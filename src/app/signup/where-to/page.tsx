"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { StepProgress } from "@/components/layout/StepProgress";
import { Toast } from "@/components/ui/toast";
import { useTranslations } from "@/i18n";

type DestinationOption = {
  code: string;
  label: string;
  status: string;
  beta: boolean;
};

export default function WhereToPage() {
  const router = useRouter();
  const t = useTranslations("auth.whereTo");

  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  // Array of country codes ordered by ranking: index 0 = rank 1, index 1 = rank 2, index 2 = rank 3
  const [ranked, setRanked] = useState<string[]>(["GB"]);
  const [notSureYet, setNotSureYet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; title?: string }>({
    show: false,
    message: "",
  });

  useEffect(() => {
    async function loadDestinations() {
      try {
        const res = await fetch(
          "/api/v1/meta/countries?role=destination&profession=doctor&origin=NG&scope=all&locale=en"
        );
        const data = await res.json();
        if (data.data) {
          // Priority to supported countries (GB, IE)
          const supported = data.data.filter(
            (c: { supported: boolean | null }) => c.supported
          );
          const formatted: DestinationOption[] = supported.map(
            (c: { code: string; label: string }) => ({
              code: c.code,
              label: c.label,
              status: "beta",
              beta: true,
            })
          );
          setDestinations(formatted);
        }
      } catch (err) {
        console.error("Failed to load destinations", err);
      }
    }
    loadDestinations();
  }, []);

  const toggleCountry = (code: string) => {
    setNotSureYet(false);
    if (ranked.includes(code)) {
      // Remove and compact ranks
      setRanked(ranked.filter((c) => c !== code));
    } else {
      if (ranked.length >= 3) return; // Limit to up to three
      setRanked([...ranked, code]);
    }
  };

  const handleNotSureToggle = () => {
    if (!notSureYet) {
      setRanked([]);
      setNotSureYet(true);
    } else {
      setNotSureYet(false);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    // Local offline autosave (OB-3)
    try {
      localStorage.setItem(
        "signup_draft_step_3",
        JSON.stringify({
          destinations: ranked,
          notSureYet,
        })
      );
    } catch {
      // ignore localStorage quota errors
    }

    try {
      await fetch("/api/v1/signup-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 3,
          data: {
            destinations: ranked,
            notSureYet,
          },
        }),
      });
    } catch {
      // Non-blocking save
    }
    setLoading(false);
    setToast({
      show: true,
      title: "Account Created",
      message: "Let's set up your profile facts...",
    });
    setTimeout(() => {
      router.push("/onboarding/profile");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader onBack={() => router.back()} />

        <StepProgress currentStep={3} label={t("step")} />

        <div className="space-y-1.5">
          <h1 className="text-[28px] font-bold text-[#11241F] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-[#4E625A] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {destinations.map((dest) => {
            const rankIndex = ranked.indexOf(dest.code);
            const isSelected = rankIndex !== -1;
            const rankNumber = isSelected ? rankIndex + 1 : null;

            return (
              <div
                key={dest.code}
                onClick={() => toggleCountry(dest.code)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition ${
                  isSelected
                    ? "border-[#164E43] bg-[#E8F1EC]"
                    : "border-[#D1DCD6] bg-white hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      isSelected
                        ? "border-[#164E43] bg-[#164E43] text-white"
                        : "border-[#96A8A1] bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-semibold text-[#11241F]">
                    {dest.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#E1EBE6] text-[#194E3F]">
                    Beta
                  </span>
                  {rankNumber && (
                    <span className="w-5 h-5 rounded-full bg-[#164E43] text-white text-[11px] font-bold flex items-center justify-center">
                      {rankNumber}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Not sure yet option */}
          <div
            onClick={handleNotSureToggle}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition ${
              notSureYet
                ? "border-[#164E43] bg-[#E8F1EC]"
                : "border-[#D1DCD6] bg-white hover:bg-[#F2F7F4]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  notSureYet
                    ? "border-[#164E43] bg-[#164E43] text-white"
                    : "border-[#96A8A1] bg-white"
                }`}
              >
                {notSureYet && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span className="text-sm font-semibold text-[#11241F]">
                {t("notSureYet")}
              </span>
            </div>
          </div>

          {/* Waitlist callout card */}
          <div className="p-4 rounded-2xl border border-[#D5DFDA] bg-white space-y-1 mt-4">
            <p className="text-xs text-[#52665F] leading-relaxed">
              Your country is not here?{" "}
              <Link
                href="/waitlist?profession=doctor&origin=NG"
                className="underline font-semibold text-[#164E43] hover:text-[#113E35]"
              >
                Tell us and join the waitlist
              </Link>
              . It helps us decide where to go next.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="button"
              disabled={loading || (ranked.length === 0 && !notSureYet)}
              onClick={handleContinue}
              className="w-full py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
            >
              {loading ? "Saving..." : t("continueButton")}
            </button>
            <p className="text-center text-xs text-[#637770] leading-relaxed">
              {t("disclaimer")}
            </p>
          </div>
        </div>
      </div>

      <Toast
        show={toast.show}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}
