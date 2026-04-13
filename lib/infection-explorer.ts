import { randomUUID } from "node:crypto";

export type CaseType = "sepsis" | "candidemia";
export type CareSetting = "ward" | "ICU" | "ED";
export type PredictedRole = "beneficial" | "caution" | "contraindication";
export type UseContext = "adjunctive" | "host-directed" | "supportive";
export type EvidenceTier = "exploratory" | "weak" | "moderate" | "strong";
export type CandidateBucket =
  | "most_biologically_supported"
  | "most_clinically_feasible"
  | "most_speculative";

export type ClinicalFlagType =
  | "renal"
  | "hepatic"
  | "qt"
  | "ddi"
  | "immunosuppression"
  | "bleeding";

export type ClinicalFlagSeverity = "low" | "medium" | "high";

export type CaseInputBase = {
  title: string;
  patient_age: number;
  sex: string;
  care_setting: CareSetting;
  immunocompromised: boolean;
  malignancy: boolean;
  pregnancy: boolean;
  renal_function_egfr: number;
  creatinine: number;
  ast: number;
  alt: number;
  bilirubin: number;
  platelet: number;
  wbc: number;
  crp: number;
  pct: number;
  lactate: number;
  notes: string;
};

export type SepsisDetails = {
  infection_source: string;
  sofa_score: number;
  qsofa_score: number;
  septic_shock: boolean;
  vasopressor_required: boolean;
  mechanical_ventilation: boolean;
  known_pathogen: string;
  resistance_profile: string;
  current_antimicrobials: string;
  current_steroids: boolean;
  anticoagulation: boolean;
  organ_support: string;
};

export type CandidemiaDetails = {
  candida_species: string;
  first_positive_blood_culture: string;
  persistent_bacteremia: boolean;
  culture_cleared: boolean;
  central_line_present: boolean;
  central_line_removed: boolean;
  endocarditis_suspected: boolean;
  endophthalmitis_suspected: boolean;
  deep_focus_suspected: boolean;
  neutropenia: boolean;
  tpn: boolean;
  recent_broad_spectrum_antibiotics: boolean;
  abdominal_surgery_recent: boolean;
  current_antifungal: string;
  qt_risk: boolean;
};

export type SepsisCaseInput = CaseInputBase & {
  sepsis_details: SepsisDetails;
};

export type CandidemiaCaseInput = CaseInputBase & {
  candidemia_details: CandidemiaDetails;
};

type ExplorerCaseBase = {
  id: string;
  created_at: string;
  updated_at: string;
} & CaseInputBase;

export type ExplorerCase =
  | (ExplorerCaseBase & { case_type: "sepsis"; sepsis_details: SepsisDetails })
  | (ExplorerCaseBase & { case_type: "candidemia"; candidemia_details: CandidemiaDetails });

export type PhenotypeMapping = {
  label: string;
  ontology_id: string;
  confidence: number;
};

export type ClinicalFlag = {
  type: ClinicalFlagType;
  severity: ClinicalFlagSeverity;
  message: string;
  action_hint?: string;
};

export type MechanisticGene = {
  gene_symbol: string;
  tissue: string;
  direction: "up" | "down" | "mixed";
  source_type: "PrediXcan" | "S-PrediXcan" | "TWAS" | "RNAseq";
  source_dataset?: string;
  z_score: number;
  p_value: number;
  colocalization_supported: boolean;
  interpretation: string;
};

export type PathwayEvidence = {
  pathway_name: string;
  direction: "up" | "down" | "mixed";
  evidence_strength: "weak" | "moderate" | "strong";
  summary: string;
  supporting_genes?: string[];
};

export type DrugGeneLink = {
  gene_symbol: string;
  link_type: "direct_target" | "pathway_overlap" | "transcriptomic_rescue";
  confidence_level: "weak" | "moderate" | "strong";
  rationale: string;
};

export type DrugRecord = {
  id: string;
  generic_name: string;
  brand_names: string;
  drug_class: string;
  mechanism_summary: string;
  route: string;
  renal_adjustment_required: boolean;
  hepatic_caution: boolean;
  qt_risk: boolean;
  immunosuppressive_risk: boolean;
  bleeding_risk: boolean;
  ddi_summary: string;
  linked_genes: DrugGeneLink[];
};

export type RankedCandidate = {
  rank: number;
  drug_id: string;
  drug_name: string;
  indication_score: number;
  contraindication_score: number;
  net_priority_score: number;
  predicted_role: PredictedRole;
  use_context: UseContext;
  bucket: CandidateBucket;
  evidence_tier: EvidenceTier;
  model_explanation: string;
  clinical_flags: ClinicalFlag[];
  matched_genes?: string[];
};

export type AnalysisResult = {
  case_id: string;
  status: "completed";
  summary: {
    case_type: CaseType;
    normalized_phenotypes: PhenotypeMapping[];
  };
  standard_of_care: Array<{
    title: string;
    content: string;
  }>;
  ranked_candidates: RankedCandidate[];
  mechanistic_evidence: {
    host_genes: MechanisticGene[];
    pathways: PathwayEvidence[];
  };
  evidence_sources?: Array<{
    label: string;
    source_type: string;
    dataset: string;
    note: string;
  }>;
  bottom_line: string;
};

export type AnalysisOptions = {
  include_txgnn: boolean;
  include_twas: boolean;
  include_rule_engine: boolean;
  include_evidence_summary: boolean;
};

type Store = {
  cases: Map<string, ExplorerCase>;
  results: Map<string, AnalysisResult>;
};

const globalStore = globalThis as typeof globalThis & {
  __infectionExplorerStore__?: Store;
};

function getStore(): Store {
  if (!globalStore.__infectionExplorerStore__) {
    globalStore.__infectionExplorerStore__ = {
      cases: new Map<string, ExplorerCase>(),
      results: new Map<string, AnalysisResult>(),
    };
  }

  return globalStore.__infectionExplorerStore__;
}

export const drugs: DrugRecord[] = [
  {
    id: "drug-stat1-modulator",
    generic_name: "Baricitinib",
    brand_names: "Olumiant",
    drug_class: "JAK inhibitor",
    mechanism_summary:
      "Modulates JAK-STAT signaling and may temper dysregulated host inflammatory cascades.",
    route: "PO",
    renal_adjustment_required: true,
    hepatic_caution: false,
    qt_risk: false,
    immunosuppressive_risk: true,
    bleeding_risk: false,
    ddi_summary: "Review additive immunosuppression with corticosteroids or other immune agents.",
    linked_genes: [
      {
        gene_symbol: "IL10",
        link_type: "pathway_overlap",
        confidence_level: "moderate",
        rationale: "Touches the immunoregulatory axis highlighted by host-response evidence.",
      },
      {
        gene_symbol: "STAT1",
        link_type: "pathway_overlap",
        confidence_level: "moderate",
        rationale: "Intersects a JAK-STAT inflammatory program often prioritized in sepsis host-response studies.",
      },
    ],
  },
  {
    id: "drug-endothelial-stabilizer",
    generic_name: "Atorvastatin",
    brand_names: "Lipitor",
    drug_class: "Statin",
    mechanism_summary:
      "May support endothelial stabilization and inflammatory tone modulation in severe infection.",
    route: "PO",
    renal_adjustment_required: false,
    hepatic_caution: true,
    qt_risk: false,
    immunosuppressive_risk: false,
    bleeding_risk: false,
    ddi_summary: "Check CYP3A4 interactions, especially with azoles and macrolides.",
    linked_genes: [
      {
        gene_symbol: "VCAM1",
        link_type: "pathway_overlap",
        confidence_level: "moderate",
        rationale: "Aligns with endothelial activation pathways surfaced in host-response evidence.",
      },
      {
        gene_symbol: "ANGPT2",
        link_type: "transcriptomic_rescue",
        confidence_level: "weak",
        rationale: "May be useful when endothelial leak and vascular stress genes dominate the imported profile.",
      },
    ],
  },
  {
    id: "drug-thromboinflammation",
    generic_name: "Dipyridamole",
    brand_names: "Persantine",
    drug_class: "Antiplatelet",
    mechanism_summary:
      "May alter thromboinflammatory signaling and microvascular stress in severe infection states.",
    route: "PO",
    renal_adjustment_required: false,
    hepatic_caution: false,
    qt_risk: false,
    immunosuppressive_risk: false,
    bleeding_risk: true,
    ddi_summary: "Review concurrent anticoagulation or thrombocytopenia before prioritization.",
    linked_genes: [
      {
        gene_symbol: "SELE",
        link_type: "transcriptomic_rescue",
        confidence_level: "weak",
        rationale: "Rescue-style overlap with endothelial and platelet activation signatures.",
      },
      {
        gene_symbol: "VCAM1",
        link_type: "pathway_overlap",
        confidence_level: "weak",
        rationale: "Aligns with thrombo-inflammatory vascular adhesion programs.",
      },
    ],
  },
  {
    id: "drug-calcineurin-modulator",
    generic_name: "Tacrolimus",
    brand_names: "Prograf",
    drug_class: "Calcineurin inhibitor",
    mechanism_summary:
      "Strong immune modulation creates biological interest but may carry major infectious safety tradeoffs.",
    route: "PO",
    renal_adjustment_required: false,
    hepatic_caution: true,
    qt_risk: true,
    immunosuppressive_risk: true,
    bleeding_risk: false,
    ddi_summary: "Major CYP3A4 interaction liability, especially with azole antifungals.",
    linked_genes: [
      {
        gene_symbol: "NFATC1",
        link_type: "direct_target",
        confidence_level: "strong",
        rationale: "Direct target relation but constrained by infectious and pharmacologic risk.",
      },
      {
        gene_symbol: "IL10",
        link_type: "pathway_overlap",
        confidence_level: "weak",
        rationale: "Can superficially match immune-regulatory signals while remaining clinically risky.",
      },
    ],
  },
  {
    id: "drug-tie2-support",
    generic_name: "Losartan",
    brand_names: "Cozaar",
    drug_class: "ARB",
    mechanism_summary:
      "Provides a supportive host-directed hypothesis around endothelial stress and renin-angiotensin signaling.",
    route: "PO",
    renal_adjustment_required: false,
    hepatic_caution: false,
    qt_risk: false,
    immunosuppressive_risk: false,
    bleeding_risk: false,
    ddi_summary: "Monitor renal perfusion and potassium in hemodynamically unstable patients.",
    linked_genes: [
      {
        gene_symbol: "ANGPT2",
        link_type: "pathway_overlap",
        confidence_level: "weak",
        rationale: "Graph signal overlaps with endothelial leak and vascular stress pathways.",
      },
      {
        gene_symbol: "CXCL8",
        link_type: "transcriptomic_rescue",
        confidence_level: "weak",
        rationale: "May align with inflammatory vascular stress and chemokine signaling programs.",
      },
    ],
  },
];

const socBlocks: Record<CaseType, Array<{ title: string; content: string }>> = {
  sepsis: [
    {
      title: "Standard-of-care anchor",
      content:
        "Early infection control, hemodynamic stabilization, source control, and organ support remain the primary pillars of sepsis management. The candidates below are shown only as exploratory adjunctive hypotheses.",
    },
    {
      title: "Do not over-interpret exploratory outputs",
      content:
        "These rankings are not treatment recommendations and should never displace antimicrobial therapy, source control, or ICU-level supportive care.",
    },
  ],
  candidemia: [
    {
      title: "Standard-of-care anchor",
      content:
        "Appropriate antifungal therapy, blood culture clearance, and source control remain the primary pillars of candidemia management. The candidates below are shown only as exploratory adjunctive hypotheses.",
    },
    {
      title: "Do not over-interpret exploratory outputs",
      content:
        "These outputs are intended only for evidence review and mechanistic prioritization, not bedside substitution for antifungal care.",
    },
  ],
};

export function getStandardOfCareBlocks(caseType: CaseType) {
  return socBlocks[caseType];
}

export function createCase(
  caseType: "sepsis",
  input: SepsisCaseInput,
): ExplorerCase;
export function createCase(
  caseType: "candidemia",
  input: CandidemiaCaseInput,
): ExplorerCase;
export function createCase(
  caseType: CaseType,
  input: SepsisCaseInput | CandidemiaCaseInput,
): ExplorerCase {
  const now = new Date().toISOString();
  const record: ExplorerCase = {
    id: randomUUID(),
    case_type: caseType,
    created_at: now,
    updated_at: now,
    ...input,
  } as ExplorerCase;

  getStore().cases.set(record.id, record);
  return record;
}

export function getCase(caseId: string) {
  return getStore().cases.get(caseId) ?? null;
}

export function getResult(caseId: string) {
  return getStore().results.get(caseId) ?? null;
}

export function saveResult(caseId: string, result: AnalysisResult) {
  getStore().results.set(caseId, result);
  return result;
}

export function getDrug(drugId: string) {
  return drugs.find((drug) => drug.id === drugId) ?? null;
}

export function listCaseTypes() {
  return [
    {
      id: "sepsis" as const,
      name: "Sepsis",
      href: "/explorer/new/sepsis",
      summary: "Explore adjunctive and host-response-modulating candidates in sepsis.",
    },
    {
      id: "candidemia" as const,
      name: "Candidemia",
      href: "/explorer/new/candidemia",
      summary:
        "Review exploratory adjunctive candidates and mechanistic evidence in candidemia.",
    },
  ];
}

export function exportCaseReport(caseId: string, format: "pdf" | "json") {
  const caseRecord = getCase(caseId);
  const result = getResult(caseId);

  if (!caseRecord || !result) {
    return null;
  }

  return {
    report_id: randomUUID(),
    status: "generated" as const,
    format,
    download_url: `/api/v1/reports/${caseId}.${format}`,
    payload: {
      case: caseRecord,
      result,
    },
  };
}
