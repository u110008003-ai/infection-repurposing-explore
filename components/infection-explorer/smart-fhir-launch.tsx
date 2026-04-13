"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { buildSmartRedirectUri, getSmartLaunchConfig } from "@/lib/smart-fhir";

type SmartModule = {
  oauth2: {
    authorize: (options: Record<string, unknown>) => Promise<void> | void;
  };
};

async function loadSmartClient(): Promise<SmartModule> {
  const mod = await import("fhirclient");
  return (mod.default ?? mod) as SmartModule;
}

export function SmartFhirLaunch() {
  const config = useMemo(() => getSmartLaunchConfig(), []);
  const [issuer, setIssuer] = useState(config.issuer);
  const [launchContext, setLaunchContext] = useState("");
  const [launchMode, setLaunchMode] = useState<"ehr" | "standalone">("standalone");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasSmartConfig = Boolean(config.clientId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const launchIssuer = params.get("iss");
    const launchToken = params.get("launch");

    if (launchIssuer) {
      setIssuer(launchIssuer);
      setLaunchMode("ehr");
    }

    if (launchToken) {
      setLaunchContext(launchToken);
    }
  }, []);

  function startLaunch() {
    setError(null);

    startTransition(async () => {
      try {
        if (!hasSmartConfig) {
          throw new Error("Missing NEXT_PUBLIC_SMART_CLIENT_ID.");
        }

        if (!issuer) {
          throw new Error("Add a FHIR base URL or launch with iss from the EHR.");
        }

        const SMART = await loadSmartClient();
        const redirectUri = buildSmartRedirectUri(window.location.origin);

        await SMART.oauth2.authorize({
          clientId: config.clientId,
          scope: config.scope,
          redirectUri,
          iss: issuer,
          launch: launchContext || undefined,
        });
      } catch (launchError) {
        const message =
          launchError instanceof Error ? launchError.message : "SMART launch failed.";
        setError(message);
      }
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <article className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          SMART launch
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Connect a FHIR workspace to the infection review app
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          This app uses SMART on FHIR client-js to launch against an EHR or a standalone FHIR
          sandbox, then opens a clinician-facing workspace with patient demographics, encounter
          context, and recent observations.
        </p>

        <div className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            FHIR issuer
            <input
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              placeholder="https://launch.smarthealthit.org/v/r4/fhir"
              className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3 outline-none transition focus:border-cyan-500"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Launch context
            <input
              value={launchContext}
              onChange={(event) => setLaunchContext(event.target.value)}
              placeholder="Optional launch token from the EHR"
              className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-panel-soft)] px-4 py-3 outline-none transition focus:border-cyan-500"
            />
          </label>

          <button
            type="button"
            onClick={startLaunch}
            disabled={isPending}
            className="mt-2 inline-flex w-fit items-center rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--color-accent-ink)] transition hover:-translate-y-0.5 hover:bg-[color:var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Launching SMART session..." : "Launch SMART on FHIR"}
          </button>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      </article>

      <aside className="grid gap-4">
        <div className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-panel-deep)] p-6 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
            Launch status
          </p>
          <div className="mt-4 grid gap-4">
            <StatusRow label="Mode" value={launchMode === "ehr" ? "EHR launch" : "Standalone launch"} />
            <StatusRow label="Client ID" value={config.clientId || "Not configured"} />
            <StatusRow label="Redirect path" value={config.redirectPath} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-[color:var(--color-line)] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Default scope
          </p>
          <p className="mt-3 rounded-2xl bg-[color:var(--color-panel-soft)] px-4 py-3 font-mono text-xs leading-6 text-slate-700">
            {config.scope}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Use a SMART sandbox or your own EHR launch URL. The callback page will complete the
            handshake, then route you into a patient summary workspace inside this app.
          </p>
        </div>
      </aside>
    </section>
  );
}

function StatusRow(props: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">{props.label}</p>
      <p className="mt-2 text-sm leading-7 text-slate-100">{props.value}</p>
    </div>
  );
}
