import Link from "next/link";
import { listCaseTypes } from "@/lib/infection-explorer";

const platformPrinciples = [
  {
    title: "Clinician-centered framing",
    body: "Standard-of-care stays visible at every step so exploratory outputs never masquerade as bedside recommendations.",
  },
  {
    title: "Mechanism plus safety",
    body: "Graph ranking, host-response evidence, and rule-based clinical flags are reviewed in one product surface.",
  },
  {
    title: "Built for structured review",
    body: "Each case produces a coherent summary you can discuss with an ID team, translational collaborator, or protocol group.",
  },
];

const workflowSteps = [
  "Capture the infection scenario and core bedside context.",
  "Run graph ranking with host-mechanistic enrichment.",
  "Downgrade unsafe or infeasible candidates using clinical flags.",
  "Review a case-ready dashboard with exportable interpretation.",
];

export default function Home() {
  const scenarios = listCaseTypes();

  return (
    <main className="min-h-screen overflow-hidden bg-[color:var(--color-background)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[color:var(--color-line)] bg-white/90 px-6 py-4 shadow-[0_18px_60px_-38px_rgba(8,17,31,0.3)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-panel-deep)] text-lg font-semibold text-cyan-100">
                IR
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Infection Repurposing Explorer
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Safety-aware severe infection review workspace
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
              <a href="#scenarios" className="rounded-full px-4 py-2 transition hover:bg-slate-100">
                Scenarios
              </a>
              <a href="#workflow" className="rounded-full px-4 py-2 transition hover:bg-slate-100">
                Workflow
              </a>
              <a href="#guardrails" className="rounded-full px-4 py-2 transition hover:bg-slate-100">
                Guardrails
              </a>
            </nav>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2.8rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-deep)] p-8 text-white shadow-[0_38px_120px_-58px_rgba(8,17,31,0.85)] md:p-12">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <div className="absolute left-[-5rem] top-[-5rem] h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-[-3rem] top-24 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl" />
          <div className="absolute bottom-[-4rem] left-1/3 h-44 w-44 rounded-full bg-white/8 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Product preview
              </p>
              <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.065em] md:text-7xl">
                A more formal review surface for infection repurposing.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
                Explore severe infection cases with a product flow that keeps bedside anchors visible,
                elevates biologically plausible candidates, and pushes unsafe ideas down the list before
                they can distract a clinician.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {scenarios.map((scenario) => (
                  <Link
                    key={scenario.id}
                    href={scenario.href}
                    className="rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--color-accent-ink)] transition hover:-translate-y-0.5 hover:bg-[color:var(--color-accent-strong)]"
                  >
                    Start {scenario.name} Case
                  </Link>
                ))}
              </div>
            </div>

            <aside className="grid gap-4 rounded-[2.2rem] border border-white/10 bg-white/6 p-5">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Product promise</p>
                <p className="mt-3 text-sm leading-7 text-slate-100">
                  Distinguish standard care from exploratory adjunctive hypotheses without flattening the
                  biology, safety, and translational context into one opaque score.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <MetricCard label="Scenarios" value="2" caption="Sepsis and candidemia MVP lanes" />
                <MetricCard label="Evidence lenses" value="3" caption="Graph, host-response, safety" />
                <MetricCard label="Output style" value="Case-ready" caption="Review dashboard with export stub" />
              </div>
            </aside>
          </div>
        </section>

        <section id="scenarios" className="grid gap-4 lg:grid-cols-[1.05fr_1.2fr]">
          <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Platform framing</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              Formal product direction, not just a demo shell
            </h2>
            <div className="mt-5 grid gap-3">
              {platformPrinciples.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4"
                >
                  <h3 className="text-lg font-semibold text-slate-950">{principle.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{principle.body}</p>
                </div>
              ))}
            </div>
          </article>

          <div className="grid gap-4">
            {scenarios.map((scenario) => (
              <article
                key={scenario.id}
                className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-45px_rgba(8,17,31,0.32)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Scenario</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {scenario.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-900">
                    MVP active
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{scenario.summary}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={scenario.href}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-cyan-600 hover:text-cyan-700"
                  >
                    Open workflow
                  </Link>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                    Structured intake, candidate ranking, mechanism review
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workflow</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              What the user sees, in product terms
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              The MVP now reads like a focused internal clinical product: cleaner navigation, stronger hierarchy,
              fixed guardrails, and a more deliberate transition from case intake to ranked review.
            </p>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
            <div className="grid gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-[1.5rem] border border-[color:var(--color-line)] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-panel-deep)] text-sm font-semibold text-cyan-100">
                    0{index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-7 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="guardrails" className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">Clinical guardrail</p>
          <h2 className="mt-2 text-2xl font-semibold text-cyan-950">
            Hypothesis prioritization and evidence review only
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-cyan-950">
            This platform does not replace antimicrobial therapy, antifungal therapy, source control,
            hemodynamic stabilization, organ support, guideline-based care, or specialist consultation.
          </p>
        </section>
      </div>
    </main>
  );
}

function MetricCard(props: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">{props.label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{props.value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{props.caption}</p>
    </div>
  );
}
