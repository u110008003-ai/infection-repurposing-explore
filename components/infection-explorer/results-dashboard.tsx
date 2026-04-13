import Link from "next/link";
import { AssociationPlots } from "@/components/infection-explorer/association-plots";
import type {
  AnalysisResult,
  ClinicalFlagSeverity,
  DrugRecord,
  ExplorerCase,
} from "@/lib/infection-explorer";

type Props = {
  caseRecord: ExplorerCase;
  result: AnalysisResult;
  drugsById: Map<string, DrugRecord>;
};

const bucketLabel = {
  most_biologically_supported: "Most biologically supported",
  most_clinically_feasible: "Most clinically feasible",
  most_speculative: "Most speculative",
};

const severityTone: Record<ClinicalFlagSeverity, string> = {
  low: "bg-amber-50 text-amber-900 border-amber-200",
  medium: "bg-orange-50 text-orange-900 border-orange-200",
  high: "bg-rose-50 text-rose-900 border-rose-200",
};

export function ResultsDashboard({ caseRecord, result, drugsById }: Props) {
  const primaryCandidate = result.ranked_candidates[0];
  const highRiskCount = result.ranked_candidates.flatMap((candidate) => candidate.clinical_flags)
    .filter((flag) => flag.severity === "high").length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="rounded-[2.2rem] border border-[color:var(--color-line)] bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Case results</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-slate-950">
              Exploratory repurposing review
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              {caseRecord.title}. Standard-of-care anchors, host-response evidence, and safety filters are shown
              together so the product reads like a structured review surface, not a black-box output.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CaseChip>{caseRecord.case_type}</CaseChip>
            <CaseChip>{caseRecord.care_setting}</CaseChip>
            <CaseChip>eGFR {caseRecord.renal_function_egfr}</CaseChip>
            <CaseChip>Lactate {caseRecord.lactate}</CaseChip>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="relative overflow-hidden rounded-[2.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-deep)] p-8 text-white shadow-[0_36px_120px_-52px_rgba(8,17,31,0.85)]">
          <div className="absolute right-[-4rem] top-[-4rem] h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-[-5rem] left-1/3 h-40 w-40 rounded-full bg-white/8 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Bottom-line interpretation</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.045em]">
              {primaryCandidate
                ? `${primaryCandidate.drug_name} currently leads this exploratory review.`
                : "Exploratory review completed."}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{result.bottom_line}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/api/v1/cases/${caseRecord.id}/export`}
                className="rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--color-accent-ink)]"
              >
                Export report
              </Link>
              <Link
                href={caseRecord.case_type === "sepsis" ? "/explorer/new/sepsis" : "/explorer/new/candidemia"}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white"
              >
                Start another case
              </Link>
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <SummaryMetric
            label="Top candidate"
            value={primaryCandidate?.drug_name ?? "None"}
            caption={primaryCandidate?.bucket ? bucketLabel[primaryCandidate.bucket] : "No candidate ranked"}
          />
          <SummaryMetric
            label="Phenotype mappings"
            value={String(result.summary.normalized_phenotypes.length)}
            caption="Normalized disease / phenotype context for the mock pipeline"
          />
          <SummaryMetric
            label="High-risk conflicts"
            value={String(highRiskCount)}
            caption="High-severity rule-engine conflicts surfaced across ranked candidates"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {result.standard_of_care.map((block) => (
          <article
            key={block.title}
            className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Standard-of-care anchor</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">{block.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{block.content}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ranked exploratory candidates</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Decision-oriented candidate list</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Candidates are ranked by graph-based prioritization, then adjusted by host-mechanistic support and
            clinical safety filters before they reach the visible list.
          </p>
        </div>

        <div className="grid gap-4">
          {result.ranked_candidates.map((candidate) => (
            <article
              key={candidate.drug_id}
              className="grid gap-6 rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-900">
                    Rank {candidate.rank}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    {bucketLabel[candidate.bucket]}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-slate-950">{candidate.drug_name}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{candidate.model_explanation}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill>{candidate.predicted_role}</StatusPill>
                  <StatusPill>{candidate.use_context}</StatusPill>
                  <StatusPill>{candidate.evidence_tier}</StatusPill>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <ScoreCard label="Indication" value={candidate.indication_score} />
                  <ScoreCard label="Contraindication" value={candidate.contraindication_score} />
                  <ScoreCard label="Net priority" value={candidate.net_priority_score} />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4">
                  <p className="text-sm font-semibold text-slate-900">Safety and feasibility</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.clinical_flags.length === 0 ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                        No major case-specific conflicts surfaced in the mock rule engine
                      </span>
                    ) : (
                      candidate.clinical_flags.map((flag) => (
                        <span
                          key={`${candidate.drug_id}-${flag.type}`}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityTone[flag.severity]}`}
                        >
                          {flag.type}: {flag.message}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Mechanism quick view</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {drugsById.get(candidate.drug_id)?.mechanism_summary ??
                      "Mechanism summary will be filled by the drug knowledge layer."}
                  </p>
                </div>

                <Link
                  href={`/explorer/drugs/${candidate.drug_id}?caseId=${caseRecord.id}`}
                  className="inline-flex w-fit items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-cyan-600 hover:text-cyan-700"
                >
                  View drug details
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Host-response evidence</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Genes and tissues implicated</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            These signals support biological plausibility and prioritization, but they do not establish causality.
          </p>
          <div className="mt-5 grid gap-3">
            {result.mechanistic_evidence.host_genes.map((gene) => (
              <div
                key={`${gene.gene_symbol}-${gene.tissue}`}
                className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{gene.gene_symbol}</h3>
                  <StatusPill>{gene.tissue}</StatusPill>
                  <StatusPill>{gene.direction}</StatusPill>
                  <StatusPill>{gene.source_type}</StatusPill>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{gene.interpretation}</p>
                <p className="mt-3 font-mono text-xs text-slate-600">
                  z-score {gene.z_score} | p-value {gene.p_value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mechanistic evidence</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Pathways and evidence status</h2>
          <div className="mt-5 grid gap-3">
            {result.mechanistic_evidence.pathways.map((pathway) => (
              <div
                key={pathway.pathway_name}
                className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{pathway.pathway_name}</h3>
                  <StatusPill>{pathway.direction}</StatusPill>
                  <StatusPill>{pathway.evidence_strength}</StatusPill>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{pathway.summary}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm font-semibold text-cyan-950">TWAS / PrediXcan caution</p>
            <p className="mt-2 text-sm leading-7 text-cyan-900">
              Gene-based association signals may support biological plausibility, but they do not establish causality
              or treatment efficacy.
            </p>
          </div>
        </article>
      </section>

      {result.association_visuals && result.association_visuals.tissues.length > 0 ? (
        <AssociationPlots visuals={result.association_visuals} />
      ) : null}

      {result.evidence_sources && result.evidence_sources.length > 0 ? (
        <section className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Imported evidence sources</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">PrediXcan / TWAS provenance</h2>
          <div className="mt-5 grid gap-3">
            {result.evidence_sources.map((source) => (
              <div
                key={`${source.source_type}-${source.dataset}`}
                className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{source.label}</h3>
                  <StatusPill>{source.source_type}</StatusPill>
                </div>
                <p className="mt-3 font-mono text-xs text-slate-600">{source.dataset}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{source.note}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function SummaryMetric(props: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-[1.8rem] border border-[color:var(--color-line)] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{props.value}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{props.caption}</p>
    </div>
  );
}

function ScoreCard(props: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-[-0.04em] text-slate-950">
        {props.value.toFixed(2)}
      </p>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
      {children}
    </span>
  );
}

function CaseChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[color:var(--color-panel-soft)] px-4 py-2 text-sm font-medium text-slate-700">
      {children}
    </span>
  );
}
