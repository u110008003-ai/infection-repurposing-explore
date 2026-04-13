"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SmartReadyModule = {
  oauth2: {
    ready: () => Promise<{
      patient?: { id?: string };
      encounter?: { id?: string };
    }>;
  };
};

async function loadSmartClient(): Promise<SmartReadyModule> {
  const mod = await import("fhirclient");
  return (mod.default ?? mod) as SmartReadyModule;
}

export function SmartFhirCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing SMART on FHIR handshake...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function completeHandshake() {
      try {
        const SMART = await loadSmartClient();
        const client = await SMART.oauth2.ready();

        if (!isMounted) {
          return;
        }

        const query = new URLSearchParams();

        if (client.patient?.id) {
          query.set("patient", client.patient.id);
        }

        if (client.encounter?.id) {
          query.set("encounter", client.encounter.id);
        }

        setStatus("SMART session ready. Opening patient workspace...");
        router.replace(`/smart/app${query.toString() ? `?${query.toString()}` : ""}`);
      } catch (readyError) {
        if (!isMounted) {
          return;
        }

        const message =
          readyError instanceof Error ? readyError.message : "SMART callback failed.";
        setError(message);
      }
    }

    void completeHandshake();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-12">
      <div className="w-full rounded-[2rem] border border-[color:var(--color-line)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          SMART callback
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
          Finalizing the FHIR session
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{status}</p>

        {error ? (
          <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm leading-7 text-rose-700">{error}</p>
            <Link
              href="/smart"
              className="mt-3 inline-flex rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Back to SMART launch
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
