import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrugWithFormalMappings, getFormalMappingProvenance } from "@/lib/formal-mappings";

export default async function DrugDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ drugId: string }>;
  searchParams: Promise<{ caseId?: string }>;
}) {
  const { drugId } = await params;
  const { caseId } = await searchParams;
  const drug = getDrugWithFormalMappings(drugId);
  const mappingSources = getFormalMappingProvenance();

  if (!drug) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="rounded-[2.2rem] border border-[color:var(--color-line)] bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Drug detail</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-slate-950">{drug.generic_name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Product-style drug review page for mechanism context, safety posture, and why this candidate surfaced
              in the case-level ranking.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[color:var(--color-panel-soft)] px-4 py-2 text-sm font-medium text-slate-700">
              {drug.drug_class}
            </span>
            <span className="rounded-full bg-[color:var(--color-panel-soft)] px-4 py-2 text-sm font-medium text-slate-700">
              {drug.route}
            </span>
            <Link
              href={caseId ? `/explorer/cases/${caseId}` : "/"}
              className="rounded-full border border-[color:var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              {caseId ? "Back to case" : "Back to home"}
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-deep)] p-8 text-white shadow-[0_32px_110px_-56px_rgba(8,17,31,0.85)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Mechanism summary</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">{drug.drug_class}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{drug.mechanism_summary}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <MetricCard label="Route" value={drug.route} />
            <MetricCard label="Brand" value={drug.brand_names} />
            <MetricCard label="DDI summary" value={drug.ddi_summary} />
            <MetricCard label="Evidence status" value="Exploratory to weak support in MVP mock layer" />
          </div>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Key safety considerations</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Clinical safety profile</h2>
          <div className="mt-5 grid gap-3">
            <SafetyRow label="Renal adjustment" value={drug.renal_adjustment_required} />
            <SafetyRow label="Hepatic caution" value={drug.hepatic_caution} />
            <SafetyRow label="QT risk" value={drug.qt_risk} />
            <SafetyRow label="Immunosuppression risk" value={drug.immunosuppressive_risk} />
            <SafetyRow label="Bleeding risk" value={drug.bleeding_risk} />
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why it appeared in this case</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Drug-pathway match</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          This section translates the surfaced candidate into pathway-level language so the ranking can be reviewed
          alongside translational rationale instead of a single opaque score.
        </p>
        <div className="mt-5 grid gap-3">
          {drug.linked_genes.map((link) => (
            <div
              key={`${drug.id}-${link.gene_symbol}`}
              className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{link.gene_symbol}</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  {link.link_type}
                </span>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-900">
                  {link.confidence_level}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{link.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Formal mapping provenance</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Source registry</h2>
        <div className="mt-5 grid gap-3">
          {mappingSources.map((source) => (
            <div
              key={`${source.type}-${source.dataset}`}
              className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{source.provider}</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                  {source.type}
                </span>
              </div>
              <p className="mt-3 font-mono text-xs text-slate-600">{source.dataset}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{source.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">Interpretation</p>
        <p className="mt-3 text-sm leading-7 text-cyan-950">
          This candidate may be biologically interesting in this case, but its use should be interpreted cautiously
          and never as a replacement for standard care.
        </p>
      </section>
    </main>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">{props.label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-100">{props.value}</p>
    </div>
  );
}

function SafetyRow(props: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3">
      <span className="text-sm font-semibold text-slate-800">{props.label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
          props.value ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
        }`}
      >
        {props.value ? "Present" : "Not surfaced"}
      </span>
    </div>
  );
}
