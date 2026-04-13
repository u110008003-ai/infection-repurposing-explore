import "server-only";

import {
  getCase,
  getResult,
  type AnalysisResult,
  type ExplorerCase,
  type TwinStateObservation,
  type TwinStateSnapshot,
} from "@/lib/infection-explorer";
import { queryLocalDrkg } from "@/lib/drkg-local";

function inferSeverityBand(caseRecord: ExplorerCase): TwinStateSnapshot["severity_band"] {
  if (
    caseRecord.lactate >= 4 ||
    caseRecord.care_setting === "ICU" ||
    (caseRecord.case_type === "sepsis" && caseRecord.sepsis_details.septic_shock)
  ) {
    return "critical";
  }

  if (caseRecord.lactate >= 2 || caseRecord.immunocompromised) {
    return "high";
  }

  return "moderate";
}

function inferTrajectorySignal(caseRecord: ExplorerCase): TwinStateSnapshot["trajectory_signal"] {
  if (
    caseRecord.lactate >= 4 ||
    (caseRecord.case_type === "sepsis" && caseRecord.sepsis_details.vasopressor_required) ||
    (caseRecord.case_type === "candidemia" && caseRecord.candidemia_details.persistent_bacteremia)
  ) {
    return "deteriorating";
  }

  if (
    caseRecord.case_type === "candidemia" &&
    caseRecord.candidemia_details.culture_cleared
  ) {
    return "stabilizing";
  }

  return "volatile";
}

function buildObservations(caseRecord: ExplorerCase, observations?: TwinStateObservation[]) {
  const base: TwinStateObservation[] = [
    { label: "care_setting", value: caseRecord.care_setting, source: "case-intake" },
    { label: "lactate", value: caseRecord.lactate, source: "case-intake" },
    { label: "egfr", value: caseRecord.renal_function_egfr, source: "case-intake" },
  ];

  if (caseRecord.case_type === "sepsis") {
    base.push(
      { label: "sofa_score", value: caseRecord.sepsis_details.sofa_score, source: "case-intake" },
      { label: "septic_shock", value: caseRecord.sepsis_details.septic_shock, source: "case-intake" },
    );
  } else {
    base.push(
      {
        label: "persistent_candidemia",
        value: caseRecord.candidemia_details.persistent_bacteremia,
        source: "case-intake",
      },
      {
        label: "current_antifungal",
        value: caseRecord.candidemia_details.current_antifungal,
        source: "case-intake",
      },
    );
  }

  return [...base, ...(observations ?? [])];
}

function buildPendingTriggers(caseRecord: ExplorerCase) {
  const triggers = ["Repeat host-response import after new transcriptomic or TWAS evidence becomes available."];

  if (caseRecord.case_type === "sepsis") {
    triggers.push("Update twin state after new lactate, vasopressor dose, or source-control events.");
  } else {
    triggers.push("Update twin state after blood-culture clearance, line removal, or antifungal regimen changes.");
  }

  return triggers;
}

export function buildTwinStateSnapshot(
  caseId: string,
  extraObservations?: TwinStateObservation[],
  existingResult?: AnalysisResult | null,
): TwinStateSnapshot | null {
  const caseRecord = getCase(caseId);

  if (!caseRecord) {
    return null;
  }

  const result = existingResult ?? getResult(caseId);

  if (!result?.digital_twin) {
    return null;
  }

  const graphEvidence = queryLocalDrkg({
    caseType: caseRecord.case_type,
    entities: [
      ...result.mechanistic_evidence.host_genes.map((gene) => gene.gene_symbol),
      ...result.ranked_candidates.slice(0, 3).map((candidate) => candidate.drug_name),
      caseRecord.case_type === "sepsis" ? "Sepsis" : "Candidemia",
    ],
    limit: 8,
  });

  return {
    case_id: caseId,
    case_type: caseRecord.case_type,
    generated_at: new Date().toISOString(),
    primary_framework: result.digital_twin.primary_framework,
    status: result.digital_twin.twin_state,
    severity_band: inferSeverityBand(caseRecord),
    trajectory_signal: inferTrajectorySignal(caseRecord),
    phenotype_state: result.summary.normalized_phenotypes.map((item) => item.label),
    host_response_state: result.mechanistic_evidence.host_genes.map(
      (gene) => `${gene.gene_symbol} (${gene.tissue})`,
    ),
    active_mechanistic_hypotheses: result.mechanistic_evidence.pathways.map(
      (pathway) => pathway.pathway_name,
    ),
    active_candidates: result.ranked_candidates.slice(0, 3).map((candidate) => ({
      drug_id: candidate.drug_id,
      drug_name: candidate.drug_name,
      net_priority_score: candidate.net_priority_score,
    })),
    graph_evidence: graphEvidence,
    pending_update_triggers: buildPendingTriggers(caseRecord),
    observations: buildObservations(caseRecord, extraObservations),
  };
}
