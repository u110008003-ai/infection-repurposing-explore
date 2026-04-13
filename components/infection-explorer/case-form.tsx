"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseType, CandidemiaCaseInput, SepsisCaseInput } from "@/lib/infection-explorer";

type Props = {
  caseType: CaseType;
};

const defaultCommon = {
  title: "",
  patient_age: 58,
  sex: "female",
  care_setting: "ICU",
  immunocompromised: false,
  malignancy: false,
  pregnancy: false,
  renal_function_egfr: 62,
  creatinine: 1.1,
  ast: 35,
  alt: 28,
  bilirubin: 1,
  platelet: 142,
  wbc: 12.1,
  crp: 17.8,
  pct: 2.4,
  lactate: 2.1,
  notes: "",
} as const;

const productSteps = [
  "Case intake",
  "Graph ranking",
  "Mechanistic enrichment",
  "Safety filtering",
  "Result review",
];

export function CaseForm({ caseType }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SepsisCaseInput | CandidemiaCaseInput>(() =>
    caseType === "sepsis"
      ? {
          ...defaultCommon,
          title: "ICU sepsis with shock, suspected abdominal source",
          patient_age: 67,
          sex: "male",
          renal_function_egfr: 38.5,
          creatinine: 1.9,
          ast: 52,
          alt: 43,
          bilirubin: 1.8,
          platelet: 96,
          wbc: 18.4,
          crp: 24.5,
          pct: 18.2,
          lactate: 4.1,
          notes: "Persistent hypotension despite fluids.",
          sepsis_details: {
            infection_source: "abdomen",
            sofa_score: 10,
            qsofa_score: 3,
            septic_shock: true,
            vasopressor_required: true,
            mechanical_ventilation: true,
            known_pathogen: "unknown",
            resistance_profile: "",
            current_antimicrobials: "meropenem, vancomycin",
            current_steroids: false,
            anticoagulation: false,
            organ_support: "vasopressor, ventilator",
          },
        }
      : {
          ...defaultCommon,
          title: "Persistent candidemia with central line",
          immunocompromised: true,
          malignancy: true,
          candidemia_details: {
            candida_species: "Candida tropicalis",
            first_positive_blood_culture: "2026-04-10",
            persistent_bacteremia: true,
            culture_cleared: false,
            central_line_present: true,
            central_line_removed: false,
            endocarditis_suspected: false,
            endophthalmitis_suspected: false,
            deep_focus_suspected: true,
            neutropenia: true,
            tpn: true,
            recent_broad_spectrum_antibiotics: true,
            abdominal_surgery_recent: false,
            current_antifungal: "echinocandin",
            qt_risk: false,
          },
        },
  );
  const sepsisForm = caseType === "sepsis" ? (form as SepsisCaseInput) : null;
  const candidemiaForm = caseType === "candidemia" ? (form as CandidemiaCaseInput) : null;

  function updateCommon(name: string, value: string | number | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateNested(section: "sepsis_details" | "candidemia_details", name: string, value: string | number | boolean) {
    setForm((current) => {
      if (section === "sepsis_details" && "sepsis_details" in current) {
        return {
          ...current,
          sepsis_details: {
            ...current.sepsis_details,
            [name]: value,
          },
        };
      }

      if (section === "candidemia_details" && "candidemia_details" in current) {
        return {
          ...current,
          candidemia_details: {
            ...current.candidemia_details,
            [name]: value,
          },
        };
      }

      return current;
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const createResponse = await fetch(`/api/v1/cases/${caseType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!createResponse.ok) {
          throw new Error("Unable to create case.");
        }

        const created = (await createResponse.json()) as { case_id: string };

        const analyzeResponse = await fetch(`/api/v1/cases/${created.case_id}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            include_txgnn: true,
            include_twas: true,
            include_rule_engine: true,
            include_evidence_summary: true,
          }),
        });

        if (!analyzeResponse.ok) {
          throw new Error("Unable to analyze case.");
        }

        router.push(`/explorer/cases/${created.case_id}`);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error ? submissionError.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <form id="infection-case-form" onSubmit={onSubmit} className="grid gap-6">
        <SurfaceCard>
          <SectionHeader
            eyebrow="Patient context"
            title={caseType === "sepsis" ? "Clinical baseline" : "Clinical baseline"}
            description="Collect the patient frame first so later evidence is interpreted against real bedside constraints."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Input label="Case title" value={form.title} onChange={(value) => updateCommon("title", value)} />
            <Input
              label="Age"
              type="number"
              value={String(form.patient_age)}
              onChange={(value) => updateCommon("patient_age", Number(value))}
            />
            <Input label="Sex" value={form.sex} onChange={(value) => updateCommon("sex", value)} />
            <Input
              label="Care setting"
              value={form.care_setting}
              onChange={(value) => updateCommon("care_setting", value)}
            />
            <Toggle
              label="Immunocompromised"
              checked={form.immunocompromised}
              onChange={(value) => updateCommon("immunocompromised", value)}
            />
            <Toggle label="Malignancy" checked={form.malignancy} onChange={(value) => updateCommon("malignancy", value)} />
            <Toggle label="Pregnancy" checked={form.pregnancy} onChange={(value) => updateCommon("pregnancy", value)} />
          </div>
        </SurfaceCard>

        {caseType === "sepsis" ? (
          <SurfaceCard>
            <SectionHeader
              eyebrow="Infection and severity"
              title="Sepsis severity profile"
              description="Capture the bedside state that most strongly affects candidate feasibility and interpretation."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Suspected source"
                value={sepsisForm!.sepsis_details.infection_source}
                onChange={(value) => updateNested("sepsis_details", "infection_source", value)}
              />
              <Input
                label="SOFA"
                type="number"
                value={String(sepsisForm!.sepsis_details.sofa_score)}
                onChange={(value) => updateNested("sepsis_details", "sofa_score", Number(value))}
              />
              <Input
                label="qSOFA"
                type="number"
                value={String(sepsisForm!.sepsis_details.qsofa_score)}
                onChange={(value) => updateNested("sepsis_details", "qsofa_score", Number(value))}
              />
              <Toggle
                label="Septic shock"
                checked={sepsisForm!.sepsis_details.septic_shock}
                onChange={(value) => updateNested("sepsis_details", "septic_shock", value)}
              />
              <Toggle
                label="Vasopressor requirement"
                checked={sepsisForm!.sepsis_details.vasopressor_required}
                onChange={(value) => updateNested("sepsis_details", "vasopressor_required", value)}
              />
              <Toggle
                label="Mechanical ventilation"
                checked={sepsisForm!.sepsis_details.mechanical_ventilation}
                onChange={(value) => updateNested("sepsis_details", "mechanical_ventilation", value)}
              />
              <Input
                label="Known pathogen"
                value={sepsisForm!.sepsis_details.known_pathogen}
                onChange={(value) => updateNested("sepsis_details", "known_pathogen", value)}
              />
              <Input
                label="Current antimicrobials"
                value={sepsisForm!.sepsis_details.current_antimicrobials}
                onChange={(value) => updateNested("sepsis_details", "current_antimicrobials", value)}
              />
              <Input
                label="Organ support"
                value={sepsisForm!.sepsis_details.organ_support}
                onChange={(value) => updateNested("sepsis_details", "organ_support", value)}
              />
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <SectionHeader
              eyebrow="Candida infection details"
              title="Candidemia profile"
              description="Capture persistence, source control, and antifungal context before any host-directed ideas are surfaced."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input
                label="Candida species"
                value={candidemiaForm!.candidemia_details.candida_species}
                onChange={(value) => updateNested("candidemia_details", "candida_species", value)}
              />
              <Input
                label="First positive blood culture"
                type="date"
                value={candidemiaForm!.candidemia_details.first_positive_blood_culture}
                onChange={(value) => updateNested("candidemia_details", "first_positive_blood_culture", value)}
              />
              <Input
                label="Current antifungal"
                value={candidemiaForm!.candidemia_details.current_antifungal}
                onChange={(value) => updateNested("candidemia_details", "current_antifungal", value)}
              />
              <Toggle
                label="Persistent candidemia"
                checked={candidemiaForm!.candidemia_details.persistent_bacteremia}
                onChange={(value) => updateNested("candidemia_details", "persistent_bacteremia", value)}
              />
              <Toggle
                label="Culture cleared"
                checked={candidemiaForm!.candidemia_details.culture_cleared}
                onChange={(value) => updateNested("candidemia_details", "culture_cleared", value)}
              />
              <Toggle
                label="Central line present"
                checked={candidemiaForm!.candidemia_details.central_line_present}
                onChange={(value) => updateNested("candidemia_details", "central_line_present", value)}
              />
              <Toggle
                label="Central line removed"
                checked={candidemiaForm!.candidemia_details.central_line_removed}
                onChange={(value) => updateNested("candidemia_details", "central_line_removed", value)}
              />
              <Toggle
                label="Deep focus suspected"
                checked={candidemiaForm!.candidemia_details.deep_focus_suspected}
                onChange={(value) => updateNested("candidemia_details", "deep_focus_suspected", value)}
              />
              <Toggle
                label="Neutropenia"
                checked={candidemiaForm!.candidemia_details.neutropenia}
                onChange={(value) => updateNested("candidemia_details", "neutropenia", value)}
              />
              <Toggle
                label="TPN"
                checked={candidemiaForm!.candidemia_details.tpn}
                onChange={(value) => updateNested("candidemia_details", "tpn", value)}
              />
              <Toggle
                label="QT risk"
                checked={candidemiaForm!.candidemia_details.qt_risk}
                onChange={(value) => updateNested("candidemia_details", "qt_risk", value)}
              />
            </div>
          </SurfaceCard>
        )}

        <SurfaceCard>
          <SectionHeader
            eyebrow="Labs and organ function"
            title="Safety-sensitive context"
            description="These values feed the mock safety filter so biologically interesting candidates still respect bedside constraints."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="eGFR" type="number" value={String(form.renal_function_egfr)} onChange={(value) => updateCommon("renal_function_egfr", Number(value))} />
            <Input label="Creatinine" type="number" value={String(form.creatinine)} onChange={(value) => updateCommon("creatinine", Number(value))} />
            <Input label="AST" type="number" value={String(form.ast)} onChange={(value) => updateCommon("ast", Number(value))} />
            <Input label="ALT" type="number" value={String(form.alt)} onChange={(value) => updateCommon("alt", Number(value))} />
            <Input label="Bilirubin" type="number" value={String(form.bilirubin)} onChange={(value) => updateCommon("bilirubin", Number(value))} />
            <Input label="Platelet" type="number" value={String(form.platelet)} onChange={(value) => updateCommon("platelet", Number(value))} />
            <Input label="WBC" type="number" value={String(form.wbc)} onChange={(value) => updateCommon("wbc", Number(value))} />
            <Input label="CRP" type="number" value={String(form.crp)} onChange={(value) => updateCommon("crp", Number(value))} />
            <Input label="PCT" type="number" value={String(form.pct)} onChange={(value) => updateCommon("pct", Number(value))} />
            <Input label="Lactate" type="number" value={String(form.lactate)} onChange={(value) => updateCommon("lactate", Number(value))} />
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateCommon("notes", event.target.value)}
              rows={4}
              className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[color:var(--color-accent)] focus:bg-white"
            />
          </label>
        </SurfaceCard>
      </form>

      <aside className="grid h-fit gap-4 xl:sticky xl:top-8">
        <div className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-deep)] p-6 text-white shadow-[0_24px_80px_-45px_rgba(8,17,31,0.82)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Workflow status</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Ready to analyze</h2>
          <div className="mt-5 grid gap-3">
            {productSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  index === 0 ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]" : "bg-white/10 text-slate-100"
                }`}>
                  {index + 1}
                </div>
                <span className="text-sm text-slate-100">{step}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            form="infection-case-form"
            disabled={pending}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--color-accent)] px-6 py-3 text-sm font-semibold text-[color:var(--color-accent-ink)] transition hover:-translate-y-0.5 hover:bg-[color:var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Analyzing case..." : "Analyze Case"}
          </button>
        </div>

        <div className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-900">Clinical guardrail</p>
          <p className="mt-3 text-sm leading-7 text-cyan-950">
            This workflow is for hypothesis prioritization and evidence review only. It does not replace
            antimicrobial therapy, antifungal therapy, source control, guideline-based care, or specialist
            consultation.
          </p>
          {error ? <p className="mt-4 text-sm font-medium text-[color:var(--color-danger)]">{error}</p> : null}
        </div>
      </aside>
    </div>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
      {children}
    </section>
  );
}

function SectionHeader(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{props.eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{props.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{props.description}</p>
    </div>
  );
}

function Input(props: {
  label: string;
  value: string;
  type?: React.HTMLInputTypeAttribute;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[color:var(--color-accent)] focus:bg-white"
      />
    </label>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{props.label}</span>
      <button
        type="button"
        aria-pressed={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={`inline-flex h-7 w-14 items-center rounded-full border transition ${
          props.checked
            ? "border-cyan-500 bg-cyan-500/15"
            : "border-slate-300 bg-white"
        }`}
      >
        <span
          className={`mx-1 h-5 w-5 rounded-full transition ${
            props.checked ? "translate-x-7 bg-cyan-600" : "translate-x-0 bg-slate-400"
          }`}
        />
      </button>
    </label>
  );
}
