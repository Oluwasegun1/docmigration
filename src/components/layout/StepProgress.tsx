export type StepProgressProps = {
  currentStep: 1 | 2 | 3;
  label: string;
};

export function StepProgress({ currentStep, label }: StepProgressProps) {
  return (
    <div className="space-y-3 pt-1 pb-4">
      <div className="flex gap-2">
        <div
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            currentStep >= 1 ? "bg-[#164E43]" : "bg-[#D1DDD7]"
          }`}
        />
        <div
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            currentStep >= 2 ? "bg-[#164E43]" : "bg-[#D1DDD7]"
          }`}
        />
        <div
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            currentStep >= 3 ? "bg-[#164E43]" : "bg-[#D1DDD7]"
          }`}
        />
      </div>
      <p className="text-xs font-semibold text-[#324941]">{label}</p>
    </div>
  );
}
