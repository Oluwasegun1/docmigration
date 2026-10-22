import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { brand } from "@/config/brand";

export type AuthHeaderProps = {
  rightAction?: {
    label: string;
    href: string;
  };
  onBack?: () => void;
};

export function AuthHeader({ rightAction, onBack }: AuthHeaderProps) {
  return (
    <header className="flex items-center justify-between pb-6 pt-2">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-[#164E43] text-white flex items-center justify-center shadow-xs group-hover:bg-[#113E35] transition">
          <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
        </div>
        <span className="font-bold text-[17px] text-[#132722] tracking-tight">
          {brand.name}
        </span>
      </Link>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#164E43] hover:underline"
        >
          Back
        </button>
      ) : rightAction ? (
        <Link
          href={rightAction.href}
          className="text-sm font-semibold text-[#164E43] hover:underline"
        >
          {rightAction.label}
        </Link>
      ) : null}
    </header>
  );
}
