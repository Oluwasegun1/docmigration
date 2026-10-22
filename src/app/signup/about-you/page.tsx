"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { StepProgress } from "@/components/layout/StepProgress";
import { useTranslations } from "@/i18n";

type Sector = { slug: string; label: string };
type Profession = {
  slug: string;
  label: string;
  status: string;
  canOnboard: boolean;
};

export default function AboutYouPage() {
  const router = useRouter();
  const t = useTranslations("auth.aboutYou");

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);

  const [selectedSector, setSelectedSector] = useState<string>("healthcare");
  const [selectedProfession, setSelectedProfession] = useState<string>("doctor");
  const [trainedInCountry, setTrainedInCountry] = useState<string>("NG");
  const [loading, setLoading] = useState(false);

  // Load reference data from DB / API
  useEffect(() => {
    async function loadData() {
      try {
        const [secRes, profRes] = await Promise.allSettled([
          fetch("/api/v1/meta/sectors?locale=en"),
          fetch("/api/v1/meta/professions?locale=en"),
        ]);

        if (secRes.status === "fulfilled" && secRes.value.ok) {
          const secData = await secRes.value.json();
          if (secData.data) setSectors(secData.data);
        }

        if (profRes.status === "fulfilled" && profRes.value.ok) {
          const profData = await profRes.value.json();
          if (profData.data) {
            setProfessions(profData.data);
            const doctor = profData.data.find((p: Profession) => p.slug === "doctor" && p.canOnboard);
            const firstOpen = profData.data.find((p: Profession) => p.canOnboard);
            if (doctor) {
              setSelectedProfession(doctor.slug);
            } else if (firstOpen) {
              setSelectedProfession(firstOpen.slug);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load reference metadata", err);
      }
    }
    loadData();
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    const chosenProf = professions.find((p) => p.slug === selectedProfession);

    // Local offline autosave (OB-3)
    try {
      localStorage.setItem(
        "signup_draft_step_2",
        JSON.stringify({
          sector: selectedSector,
          profession: selectedProfession,
          trainedInCountry,
        })
      );
    } catch {
      // ignore localStorage quota errors
    }

    // Autosave draft step to server
    try {
      await fetch("/api/v1/signup-draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: 2,
          data: {
            sector: selectedSector,
            profession: selectedProfession,
            trainedInCountry,
          },
        }),
      });
    } catch {
      // Non-blocking save
    }

    setLoading(false);

    // If waitlist profession selected, transition seamlessly to waitlist capture screen
    if (chosenProf && !chosenProf.canOnboard) {
      router.push(
        `/waitlist?profession=${encodeURIComponent(
          chosenProf.slug
        )}&origin=${encodeURIComponent(trainedInCountry)}`
      );
    } else {
      router.push("/signup/where-to");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader rightAction={{ label: "Save and exit", href: "/" }} />

        <StepProgress currentStep={2} label={t("step")} />

        <div className="space-y-1.5">
          <h1 className="text-[28px] font-bold text-[#11241F] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-[#4E625A] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-5 pt-1">
          {/* Field / Sector Select */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[#182F28]">
              {t("fieldLabel")}
            </label>
            <div className="relative">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                style={{ colorScheme: "light" }}
                className="w-full appearance-none px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm text-[#11241F] focus:outline-none focus:ring-2 focus:ring-[#164E43] focus:border-transparent font-medium [color-scheme:light]"
              >
                {sectors.length > 0 ? (
                  sectors.map((s) => (
                    <option key={s.slug} value={s.slug} className="bg-white text-[#11241F]">
                      {s.label}
                    </option>
                  ))
                ) : (
                  <option value="healthcare" className="bg-white text-[#11241F]">Healthcare</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#5C7068]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Profession Radio Group with Waitlist Badges */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#182F28]">
              {t("professionLabel")}
            </label>
            <div className="space-y-2.5">
              {professions.map((prof) => {
                const isSelected = selectedProfession === prof.slug;
                const isWaitlist = !prof.canOnboard;

                return (
                  <label
                    key={prof.slug}
                    onClick={() => setSelectedProfession(prof.slug)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition ${
                      isSelected
                        ? "border-[#164E43] bg-[#E8F1EC]"
                        : "border-[#D1DCD6] bg-white hover:bg-[#F2F7F4]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-[#164E43] bg-white"
                            : "border-[#96A8A1] bg-white"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#164E43]" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[#11241F]">
                        {prof.label}
                      </span>
                    </div>

                    {isWaitlist && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FEF3D6] text-[#8C5400]">
                        Waitlist
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Country where you trained */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-sm font-semibold text-[#182F28]">
              {t("trainedInLabel")}
            </label>
            <div className="relative">
              <select
                value={trainedInCountry}
                onChange={(e) => setTrainedInCountry(e.target.value)}
                style={{ colorScheme: "light" }}
                className="w-full appearance-none px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm text-[#11241F] focus:outline-none focus:ring-2 focus:ring-[#164E43] focus:border-transparent font-medium [color-scheme:light]"
              >
                <option value="NG" className="bg-white text-[#11241F]">
                  Nigeria
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#5C7068]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-[#526860] leading-relaxed pt-1">
              {t("whyTrainedIn")}
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleContinue}
              className="w-full py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
            >
              {loading ? "Saving..." : t("continueButton")}
            </button>
            <p className="text-center text-xs text-[#637770]">
              Saved automatically as you go.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
