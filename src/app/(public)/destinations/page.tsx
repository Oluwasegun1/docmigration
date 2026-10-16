import type { Metadata } from "next";
import { StatusNotice } from "@/components/shared/status-notice";

export const metadata: Metadata = { title: "Destinations" };

export default function DestinationsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Destinations and pathways
      </h1>
      <StatusNotice title="No destinations published yet">
        Destination and pathway data will be loaded from verified regulatory
        content once it is available. Nothing here is an official requirement.
      </StatusNotice>
    </div>
  );
}
