import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight text-slate-900">
          Naija Doctor Migration Hub
        </Link>
        <nav
          aria-label="Primary"
          className="flex items-center gap-4 text-sm text-slate-600"
        >
          <Link href="/destinations" className="hover:text-teal-800">
            Destinations
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
