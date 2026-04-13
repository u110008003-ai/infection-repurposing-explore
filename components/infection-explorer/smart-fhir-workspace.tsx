"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type FhirEncounter,
  type FhirObservation,
  type FhirPatient,
  summarizeEncounter,
  summarizeObservation,
  summarizePatient,
  type SmartEncounterSummary,
  type SmartObservationSummary,
  type SmartPatientSummary,
} from "@/lib/smart-fhir";

type SmartClient = {
  patient?: { id?: string };
  encounter?: { id?: string };
  request: <T = FhirPatient | FhirEncounter | FhirObservation[]>(
    path: string,
    options?: Record<string, unknown>,
  ) => Promise<T>;
  state?: {
    serverUrl?: string;
    scope?: string;
  };
};

type SmartWorkspaceState = {
  patient: SmartPatientSummary | null;
  encounter: SmartEncounterSummary | null;
  observations: SmartObservationSummary[];
  serverUrl: string | null;
  scope: string | null;
};

async function loadSmartClient() {
  const mod = await import("fhirclient");
  return (mod.default ?? mod) as {
    oauth2: {
      ready: () => Promise<SmartClient>;
    };
  };
}

export function SmartFhirWorkspace() {
  const [workspace, setWorkspace] = useState<SmartWorkspaceState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateWorkspace() {
      try {
        const SMART = await loadSmartClient();
        const client = await SMART.oauth2.ready();
        const patientId = client.patient?.id;

        const patientPromise = patientId
          ? client.request<FhirPatient>(`Patient/${patientId}`)
          : Promise.resolve(null);
        const encounterPromise = client.encounter?.id
          ? client.request<FhirEncounter>(`Encounter/${client.encounter.id}`)
          : Promise.resolve(null);
        const observationPromise = patientId
          ? client.request<FhirObservation[]>(
              `Observation?patient=${patientId}&_count=8&_sort=-date`,
              {
              pageLimit: 0,
              flat: true,
              },
            )
          : Promise.resolve([]);

        const [patient, encounter, observations] = await Promise.all([
          patientPromise,
          encounterPromise,
          observationPromise,
        ]);

        if (!isMounted) {
          return;
        }

        setWorkspace({
          patient: patient ? summarizePatient(patient) : null,
          encounter: encounter ? summarizeEncounter(encounter) : null,
          observations: Array.isArray(observations)
            ? observations.slice(0, 8).map(summarizeObservation)
            : [],
          serverUrl: client.state?.serverUrl ?? null,
          scope: client.state?.scope ?? null,
        });
      } catch (workspaceError) {
        if (!isMounted) {
          return;
        }

        const message =
          workspaceError instanceof Error
            ? workspaceError.message
            : "Unable to read the SMART on FHIR session.";
        setError(message);
      }
    }

    void hydrateWorkspace();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
            SMART session error
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-rose-900">
            The patient workspace could not be opened
          </h1>
          <p className="mt-4 text-sm leading-7 text-rose-800">{error}</p>
          <Link
            href="/smart"
            className="mt-6 inline-flex rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
          >
            Return to SMART launch
          </Link>
        </div>
      </section>
    );
  }

  if (!workspace) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-6 py-10">
        <div className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            SMART workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            Loading patient context
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Pulling SMART launch context, demographics, encounter context, and recent observations.
          </p>
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--color-background)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-deep)] p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
            SMART on FHIR app
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            FHIR-connected patient workspace
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
            This surface verifies the SMART launch, reads core patient context, and gives you a clean
            place to connect bedside data into the infection review product.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Patient</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {workspace.patient?.displayName || "No patient in launch context"}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Patient ID" value={workspace.patient?.id || "Unavailable"} />
              <Field label="Gender" value={workspace.patient?.gender || "Unavailable"} />
              <Field label="Birth date" value={workspace.patient?.birthDate || "Unavailable"} />
              <Field label="FHIR server" value={workspace.serverUrl || "Unavailable"} />
            </div>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Encounter</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {workspace.encounter?.classLabel || "No encounter context"}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Encounter ID" value={workspace.encounter?.id || "Unavailable"} />
              <Field label="Status" value={workspace.encounter?.status || "Unavailable"} />
              <Field label="Period start" value={workspace.encounter?.periodStart || "Unavailable"} />
              <Field label="Period end" value={workspace.encounter?.periodEnd || "Unavailable"} />
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Observations
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                  Recent clinical signals
                </h2>
              </div>
              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-900">
                {workspace.observations.length} loaded
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {workspace.observations.length ? (
                workspace.observations.map((observation) => (
                  <div
                    key={observation.id}
                    className="grid gap-2 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-4 md:grid-cols-[1.1fr_0.6fr_0.8fr]"
                  >
                    <div>
                      <p className="text-base font-semibold text-slate-900">{observation.code}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{observation.valueLabel}</p>
                    </div>
                    <Field label="Issued" value={observation.issued || "Unavailable"} compact />
                    <Field label="Status" value={observation.status || "Unavailable"} compact />
                  </div>
                ))
              ) : (
                <p className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3 text-sm leading-7 text-slate-600">
                  No recent observations were returned for this launch context.
                </p>
              )}
            </div>
          </article>

          <aside className="grid gap-4">
            <div className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Session scope
              </p>
              <p className="mt-3 rounded-2xl bg-white px-4 py-3 font-mono text-xs leading-6 text-slate-700">
                {workspace.scope || "Unavailable"}
              </p>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Next integration step
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                This SMART workspace is the bridge into your infection review app. From here we can map
                patient context into sepsis or candidemia intake, pre-fill case fields, or attach FHIR
                observations to the twin-state timeline.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/explorer/new/sepsis"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-cyan-600 hover:text-cyan-700"
                >
                  Open sepsis intake
                </Link>
                <Link
                  href="/explorer/new/candidemia"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-cyan-600 hover:text-cyan-700"
                >
                  Open candidemia intake
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Field(props: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3 ${props.compact ? "" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-800">{props.value}</p>
    </div>
  );
}
