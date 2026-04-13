import Link from "next/link";
import { SmartFhirLaunch } from "@/components/infection-explorer/smart-fhir-launch";

export default function SmartLaunchPage() {
  return (
    <main className="min-h-screen bg-[color:var(--color-background)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-[color:var(--color-line)] bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              SMART on FHIR
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              Launch the infection explorer as a FHIR-connected app
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-cyan-600 hover:text-cyan-700"
          >
            Back to home
          </Link>
        </header>

        <SmartFhirLaunch />
      </div>
    </main>
  );
}
