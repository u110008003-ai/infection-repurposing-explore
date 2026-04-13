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
  source_type: "S-PrediXcan" | "TWAS" | "RNAseq";
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
        rationale: "Aligns with endothelial activation pathways surfaced in the graph layer.",
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

export function getDrug(drugId: string) {
  return drugs.find((drug) => drug.id === drugId) ?? null;
}

export function listCaseTypes() {
  return [
    {
      id: "sepsis" as const,
      name: "Sepsis",
      href: "/explorer/new/sepsis",
      summary: "Explore adjunctive and host-response–modulating candidates in sepsis.",
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

function inferClinicalFlags(caseRecord: ExplorerCase, drug: DrugRecord): ClinicalFlag[] {
  const flags: ClinicalFlag[] = [];

  if (drug.renal_adjustment_required && caseRecord.renal_function_egfr <= 45) {
    flags.push({
      type: "renal",
      severity: caseRecord.renal_function_egfr <= 30 ? "high" : "medium",
      message: "Dose adjustment or closer renal review may be required at the current eGFR.",
      action_hint: "Review renal dosing before prioritization.",
    });
  }

  if (drug.hepatic_caution && (caseRecord.ast >= 80 || caseRecord.alt >= 80 || caseRecord.bilirubin >= 2)) {
    flags.push({
      type: "hepatic",
      severity: caseRecord.bilirubin >= 2 ? "medium" : "low",
      message: "Baseline liver signal suggests added caution for hepatically sensitive agents.",
      action_hint: "Trend AST, ALT, and bilirubin if considered for review.",
    });
  }

  if (drug.qt_risk) {
    const hasQtRisk =
      "candidemia_details" in caseRecord ? caseRecord.candidemia_details.qt_risk : false;

    if (hasQtRisk) {
      flags.push({
        type: "qt",
        severity: "high",
        message: "Current case already carries QT liability that may be amplified by this candidate.",
        action_hint: "Check baseline ECG and interacting QT-prolonging therapies.",
      });
    }
  }

  const hasAzoleContext =
    "candidemia_details" in caseRecord &&
    caseRecord.candidemia_details.current_antifungal.toLowerCase().includes("azole");

  if (hasAzoleContext && drug.ddi_summary.toLowerCase().includes("azole")) {
    flags.push({
      type: "ddi",
      severity: "high",
      message: "Potential interaction with the current antifungal regimen lowers clinical feasibility.",
      action_hint: "Review CYP-mediated interaction risk before deeper review.",
    });
  }

  if (drug.immunosuppressive_risk && caseRecord.immunocompromised) {
    flags.push({
      type: "immunosuppression",
      severity: "high",
      message: "Baseline immune vulnerability makes further immunosuppression difficult to justify.",
      action_hint: "Treat as exploratory-only unless a strong rationale emerges.",
    });
  }

  if (drug.bleeding_risk && (caseRecord.platelet < 100 || ("sepsis_details" in caseRecord && caseRecord.sepsis_details.anticoagulation))) {
    flags.push({
      type: "bleeding",
      severity: caseRecord.platelet < 100 ? "high" : "medium",
      message: "Bleeding liability is magnified by thrombocytopenia or concurrent anticoagulation.",
      action_hint: "Reassess feasibility if hemostatic reserve is limited.",
    });
  }

  return flags;
}

function buildPhenotypes(caseRecord: ExplorerCase): PhenotypeMapping[] {
  if (caseRecord.case_type === "sepsis") {
    const source = caseRecord.sepsis_details.infection_source || "unknown source";

    return [
      { label: "sepsis", ontology_id: "INTERNAL:SEPSIS", confidence: 0.97 },
      {
        label: `${source} infection with organ dysfunction`,
        ontology_id: "INTERNAL:SEPSIS_SOURCE_CONTEXT",
        confidence: 0.8,
      },
    ];
  }

  return [
    { label: "candidemia", ontology_id: "INTERNAL:CANDIDEMIA", confidence: 0.96 },
    {
      label: "persistent bloodstream fungal infection",
      ontology_id: "INTERNAL:PERSISTENT_FUNGAL_BSI",
      confidence: caseRecord.candidemia_details.persistent_bacteremia ? 0.87 : 0.72,
    },
  ];
}

function buildMechanisticEvidence(caseRecord: ExplorerCase) {
  if (caseRecord.case_type === "sepsis") {
    return {
      host_genes: [
        {
          gene_symbol: "ANGPT2",
          tissue: "whole_blood",
          direction: "up" as const,
          source_type: "S-PrediXcan" as const,
          z_score: 3.44,
          p_value: 0.0006,
          colocalization_supported: false,
          interpretation: "Supports endothelial stress and vascular leak biology in severe sepsis.",
        },
        {
          gene_symbol: "IL10",
          tissue: "whole_blood",
          direction: "up" as const,
          source_type: "TWAS" as const,
          z_score: 2.91,
          p_value: 0.0036,
          colocalization_supported: false,
          interpretation: "Highlights an immunoregulatory host-response axis relevant to adjunctive review.",
        },
      ],
      pathways: [
        {
          pathway_name: "Endothelial activation and barrier dysfunction",
          direction: "up" as const,
          evidence_strength: "strong" as const,
          summary: "Prioritized by graph context, shock physiology, and host-response support.",
        },
        {
          pathway_name: "Cytokine signaling",
          direction: "up" as const,
          evidence_strength: "moderate" as const,
          summary: "Supports host-directed hypotheses but does not establish causal treatment benefit.",
        },
      ],
    };
  }

  return {
    host_genes: [
      {
        gene_symbol: "IL10",
        tissue: "whole_blood",
        direction: "up" as const,
        source_type: "S-PrediXcan" as const,
        z_score: 3.12,
        p_value: 0.0018,
        colocalization_supported: false,
        interpretation: "Supports immunoregulatory host-response involvement in persistent candidemia.",
      },
      {
        gene_symbol: "VCAM1",
        tissue: "vascular_endothelium",
        direction: "up" as const,
        source_type: "RNAseq" as const,
        z_score: 2.48,
        p_value: 0.013,
        colocalization_supported: false,
        interpretation: "Suggests endothelial stress and inflammatory adhesion programs remain active.",
      },
    ],
    pathways: [
      {
        pathway_name: "Cytokine signaling",
        direction: "up" as const,
        evidence_strength: "moderate" as const,
        summary: "Prioritized by host-response evidence and persistent bloodstream infection context.",
      },
      {
        pathway_name: "Innate immune regulation",
        direction: "mixed" as const,
        evidence_strength: "weak" as const,
        summary: "Provides plausibility support but remains exploratory without causal confirmation.",
      },
    ],
  };
}

function evidenceTierFromScore(score: number): EvidenceTier {
  if (score >= 0.72) return "moderate";
  if (score >= 0.55) return "weak";
  return "exploratory";
}

function buildCandidates(caseRecord: ExplorerCase): RankedCandidate[] {
  const raw = drugs.map((drug, index) => {
    const indicationBase = caseRecord.case_type === "sepsis" ? 0.8 - index * 0.06 : 0.82 - index * 0.055;
    const contraindicationBase = caseRecord.case_type === "sepsis" ? 0.1 + index * 0.05 : 0.11 + index * 0.045;
    const flags = inferClinicalFlags(caseRecord, drug);
    const mechanisticBoost = Math.max(0.02, 0.18 - index * 0.03);
    const riskPenalty = flags.reduce((sum, flag) => {
      if (flag.severity === "high") return sum + 0.22;
      if (flag.severity === "medium") return sum + 0.12;
      return sum + 0.05;
    }, 0);
    const indicationScore = Number(indicationBase.toFixed(2));
    const contraindicationScore = Number(contraindicationBase.toFixed(2));
    const netPriorityScore = Number(
      (indicationScore * 0.6 - contraindicationScore * 0.4 + mechanisticBoost * 0.2 - riskPenalty * 0.3).toFixed(2),
    );
    const predictedRole: PredictedRole =
      netPriorityScore >= 0.45 ? "beneficial" : netPriorityScore >= 0.2 ? "caution" : "contraindication";
    const bucket: CandidateBucket =
      flags.some((flag) => flag.severity === "high")
        ? "most_speculative"
        : index <= 1
          ? "most_biologically_supported"
          : "most_clinically_feasible";

    return {
      rank: 0,
      drug_id: drug.id,
      drug_name: drug.generic_name,
      indication_score: indicationScore,
      contraindication_score: contraindicationScore,
      net_priority_score: netPriorityScore,
      predicted_role: predictedRole,
      use_context: (index % 2 === 0 ? "host-directed" : "adjunctive") as UseContext,
      bucket,
      evidence_tier: evidenceTierFromScore(netPriorityScore),
      model_explanation:
        bucket === "most_speculative"
          ? "Mechanistic overlap exists, but current clinical constraints reduce feasibility."
          : "Graph-based prioritization surfaced this candidate through host inflammatory and endothelial signaling overlap.",
      clinical_flags: flags,
    };
  });

  return raw
    .sort((left, right) => right.net_priority_score - left.net_priority_score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function analyzeCase(caseId: string, options?: AnalysisOptions) {
  const store = getStore();
  const caseRecord = store.cases.get(caseId);

  if (!caseRecord) {
    return null;
  }

  void options;

  const result: AnalysisResult = {
    case_id: caseId,
    status: "completed",
    summary: {
      case_type: caseRecord.case_type,
      normalized_phenotypes: buildPhenotypes(caseRecord),
    },
    standard_of_care: socBlocks[caseRecord.case_type],
    ranked_candidates: buildCandidates(caseRecord),
    mechanistic_evidence: buildMechanisticEvidence(caseRecord),
    bottom_line:
      "This case shows exploratory support for selected adjunctive or host-directed candidates. These outputs may help prioritize deeper review, but they should not be interpreted as treatment recommendations. Standard infection management remains the primary decision frame.",
  };

  store.results.set(caseId, result);
  return result;
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
