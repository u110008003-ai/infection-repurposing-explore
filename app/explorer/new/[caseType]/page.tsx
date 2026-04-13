import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseForm } from "@/components/infection-explorer/case-form";
import type { CaseType } from "@/lib/infection-explorer";

const validTypes: CaseType[] = ["sepsis", "candidemia"];

const scenarioCopy: Record<
  CaseType,
  {
    title: string;
    eyebrow: string;
    intro: string;
    chips: string[];
  }
> = {
  sepsis: {
    title: "Sepsis case intake",
    eyebrow: "Structured clinical intake",
    intro:
      "Capture bedside severity, treatment context, and organ-function constraints before ranking any exploratory adjunctive ideas.",
    chips: ["Standard care anchor", "Shock-aware context", "Safety-aware ranking"],
  },
  candidemia: {
    title: "Candidemia case intake",
    eyebrow: "Structured fungal infection intake",
    intro:
      "Capture persistence, source-control status, and antifungal context so exploratory outputs remain grounded in candidemia fundamentals.",
    chips: ["Antifungal anchor", "Source-control context", "Host-response review"],
  },
};

export default async function NewCasePage({
  params,
}: {
  params: Promise<{ caseType: string }>;
}) {
  const { caseType } = await params;

  if (!validTypes.includes(caseType as CaseType)) {
    notFound();
  }

  const copy = scenarioCopy[caseType as CaseType];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="rounded-[2rem] border border-[color:var(--color-line)] bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{copy.eyebrow}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{copy.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{copy.intro}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {copy.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-[color:var(--color-panel-soft)] px-4 py-2 text-sm font-medium text-slate-700"
              >
                {chip}
              </span>
            ))}
            <Link
              href="/"
              className="rounded-full border border-[color:var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <CaseForm caseType={caseType as CaseType} />
    </main>
  );
}
