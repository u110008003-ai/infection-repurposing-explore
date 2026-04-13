export type SmartLaunchConfig = {
  clientId: string;
  scope: string;
  redirectPath: string;
  issuer: string;
};

type FhirHumanName = {
  text?: string;
  family?: string;
  given?: string[];
};

type FhirCoding = {
  code?: string;
  display?: string;
};

type FhirCodeableConcept = {
  text?: string;
  coding?: FhirCoding[];
};

export type FhirPatient = {
  id?: string;
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
};

export type FhirEncounter = {
  id?: string;
  status?: string;
  class?: {
    code?: string;
    display?: string;
  };
  period?: {
    start?: string;
    end?: string;
  };
};

export type FhirObservation = {
  id?: string;
  code?: FhirCodeableConcept;
  issued?: string;
  effectiveDateTime?: string;
  valueQuantity?: {
    value?: number | string;
    unit?: string;
  };
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  status?: string;
};

export type SmartPatientSummary = {
  id: string | null;
  displayName: string;
  gender: string | null;
  birthDate: string | null;
};

export type SmartEncounterSummary = {
  id: string;
  status: string | null;
  classLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type SmartObservationSummary = {
  id: string;
  code: string;
  issued: string | null;
  valueLabel: string;
  status: string | null;
};

export function getSmartLaunchConfig(): SmartLaunchConfig {
  return {
    clientId: process.env.NEXT_PUBLIC_SMART_CLIENT_ID || "",
    scope:
      process.env.NEXT_PUBLIC_SMART_SCOPE ||
      "launch/patient openid fhirUser patient/*.read user/*.read",
    redirectPath: process.env.NEXT_PUBLIC_SMART_REDIRECT_PATH || "/smart/callback",
    issuer: process.env.NEXT_PUBLIC_SMART_FHIR_BASE_URL || "",
  };
}

export function buildSmartRedirectUri(origin: string) {
  const config = getSmartLaunchConfig();
  return new URL(config.redirectPath, origin).toString();
}

export function formatHumanName(name: FhirHumanName[] | undefined) {
  if (!name?.length) {
    return "Unnamed patient";
  }

  const primary = name[0];
  const given = Array.isArray(primary?.given) ? primary.given.join(" ") : "";
  const family = primary?.family || "";
  return `${given} ${family}`.trim() || primary?.text || "Unnamed patient";
}

export function summarizePatient(patient: FhirPatient): SmartPatientSummary {
  return {
    id: patient?.id ?? null,
    displayName: formatHumanName(patient?.name),
    gender: patient?.gender ?? null,
    birthDate: patient?.birthDate ?? null,
  };
}

export function summarizeEncounter(encounter: FhirEncounter): SmartEncounterSummary {
  return {
    id: encounter?.id ?? "unknown",
    status: encounter?.status ?? null,
    classLabel: encounter?.class?.display ?? encounter?.class?.code ?? null,
    periodStart: encounter?.period?.start ?? null,
    periodEnd: encounter?.period?.end ?? null,
  };
}

export function summarizeObservation(observation: FhirObservation): SmartObservationSummary {
  const coding = observation?.code?.coding?.[0];
  const code =
    coding?.display ||
    observation?.code?.text ||
    coding?.code ||
    "Observation";

  const quantityValue = observation?.valueQuantity?.value;
  const quantityUnit = observation?.valueQuantity?.unit;
  const valueLabel =
    typeof quantityValue !== "undefined"
      ? `${quantityValue}${quantityUnit ? ` ${quantityUnit}` : ""}`
      : observation?.valueString ||
        observation?.valueCodeableConcept?.coding?.[0]?.display ||
        observation?.valueCodeableConcept?.text ||
        "No scalar value";

  return {
    id: observation?.id ?? crypto.randomUUID(),
    code,
    issued: observation?.issued ?? observation?.effectiveDateTime ?? null,
    valueLabel,
    status: observation?.status ?? null,
  };
}
