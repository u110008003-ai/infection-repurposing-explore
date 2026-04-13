import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  drugs,
  getCase,
  getResult,
  getStandardOfCareBlocks,
  saveResult,
  type AnalysisOptions,
  type AnalysisResult,
  type CandidateBucket,
  type CaseType,
  type ClinicalFlag,
  type DrugRecord,
  type EvidenceTier,
  type ExplorerCase,
  type GeneAssociationPoint,
  type MechanisticGene,
  type PathwayEvidence,
  type PhenotypeMapping,
  type PredictedRole,
  type QQPoint,
  type RankedCandidate,
  type TissueAssociationVisual,
  type UseContext,
} from "@/lib/infection-explorer";
import {
  buildPathwaySupportFromGenes,
  getFormalMappingProvenance,
  getLinkedGenesForDrug,
} from "@/lib/formal-mappings";
import { getDigitalTwinSummary } from "@/lib/digital-twin";
import { getDrkgCasePanel, listRepoIntegrations } from "@/lib/repo-integrations";

type PredixcanManifest = {
  datasets: Array<{
    caseType: CaseType;
    tissue: string;
    label: string;
    sourceType: "PrediXcan" | "S-PrediXcan" | "TWAS";
    dataset: string;
    file: string;
    note: string;
  }>;
};

type PredixcanRow = {
  gene_symbol: string;
  tissue: string;
  chromosome: number;
  position_mb: number;
  z_score: number;
  p_value: number;
  direction: "up" | "down" | "mixed";
  source_type: "PrediXcan" | "S-PrediXcan" | "TWAS";
  source_dataset: string;
  source_label: string;
  colocalization_supported: boolean;
  interpretation: string;
  pathways: string[];
};

type ImportedEvidence = {
  host_genes: MechanisticGene[];
  pathways: PathwayEvidence[];
  association_visuals: {
    tissues: TissueAssociationVisual[];
    default_tissue: string;
  };
  evidence_sources: AnalysisResult["evidence_sources"];
};

const dataRoot = path.join(process.cwd(), "research", "predixcan");

const pathwayLabels: Record<string, string> = {
  endothelial_activation: "Endothelial activation and barrier dysfunction",
  cytokine_signaling: "Cytokine signaling",
  innate_immune_regulation: "Innate immune regulation",
  interferon_jak_stat: "Interferon / JAK-STAT signaling",
  fungal_host_defense: "Fungal host-defense and neutrophil response",
};

function parseBoolean(value: string) {
  return value.trim().toLowerCase() === "true";
}

function parseDelimitedFile(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
}

function readManifest(): PredixcanManifest {
  const manifestPath = path.join(dataRoot, "manifest.json");
  return JSON.parse(readFileSync(manifestPath, "utf8")) as PredixcanManifest;
}

function readDatasetRows(caseType: CaseType): PredixcanRow[] {
  const manifest = readManifest();
  const matchedDatasets = manifest.datasets.filter((dataset) => dataset.caseType === caseType);

  return matchedDatasets.flatMap((dataset) => {
    const absolutePath = path.join(dataRoot, dataset.file);
    const rows = parseDelimitedFile(readFileSync(absolutePath, "utf8"));

    return rows.map((row) => ({
      gene_symbol: row.gene_symbol,
      tissue: row.tissue,
      chromosome: Number(row.chromosome),
      position_mb: Number(row.position_mb),
      z_score: Number(row.z_score),
      p_value: Number(row.p_value),
      direction: (row.direction as PredixcanRow["direction"]) || "mixed",
      source_type: dataset.sourceType,
      source_dataset: dataset.dataset,
      source_label: dataset.label,
      colocalization_supported: parseBoolean(row.colocalization_supported),
      interpretation: row.interpretation,
      pathways: row.pathways ? row.pathways.split(";").map((entry) => entry.trim()).filter(Boolean) : [],
    }));
  });
}

function buildImportedEvidence(caseType: CaseType): ImportedEvidence | null {
  const manifest = readManifest();
  const matchedDatasets = manifest.datasets.filter((dataset) => dataset.caseType === caseType);

  if (matchedDatasets.length === 0) {
    return null;
  }

  const rows = readDatasetRows(caseType)
    .filter((row) => Number.isFinite(row.z_score) && Number.isFinite(row.p_value))
    .sort((left, right) => Math.abs(right.z_score) - Math.abs(left.z_score));

  const host_genes: MechanisticGene[] = rows.slice(0, 6).map((row) => ({
    gene_symbol: row.gene_symbol,
    tissue: row.tissue,
    direction: row.direction,
    source_type: row.source_type,
    source_dataset: row.source_dataset,
    z_score: row.z_score,
    p_value: row.p_value,
    colocalization_supported: row.colocalization_supported,
    interpretation: row.interpretation,
  }));

  const pathwayAccumulator = new Map<
    string,
    { genes: Set<string>; maxScore: number; directions: Set<string> }
  >();

  rows.forEach((row) => {
    row.pathways.forEach((pathway) => {
      const current = pathwayAccumulator.get(pathway) ?? {
        genes: new Set<string>(),
        maxScore: 0,
        directions: new Set<string>(),
      };

      current.genes.add(row.gene_symbol);
      current.maxScore = Math.max(current.maxScore, Math.abs(row.z_score));
      current.directions.add(row.direction);
      pathwayAccumulator.set(pathway, current);
    });
  });

  const pathways: PathwayEvidence[] = Array.from(pathwayAccumulator.entries())
    .map(([pathway, value]) => ({
      pathway_name: pathwayLabels[pathway] ?? pathway,
      direction:
        value.directions.size === 1
          ? (Array.from(value.directions)[0] as PathwayEvidence["direction"])
          : "mixed",
      evidence_strength:
        (value.maxScore >= 3 ? "strong" : value.maxScore >= 2.4 ? "moderate" : "weak") as PathwayEvidence["evidence_strength"],
      summary: `Imported from ${matchedDatasets.length} PrediXcan/TWAS result file(s) with support from ${value.genes.size} prioritized gene(s).`,
      supporting_genes: Array.from(value.genes).sort(),
    }))
    .sort((left, right) => {
      const order = { strong: 3, moderate: 2, weak: 1 };
      return order[right.evidence_strength] - order[left.evidence_strength];
    })
    .slice(0, 6);

  const tissueVisuals: TissueAssociationVisual[] = matchedDatasets
    .map((dataset) => {
      const tissueRows = rows.filter((row) => row.tissue === dataset.tissue);
      const geneAssociations: GeneAssociationPoint[] = tissueRows
        .filter((row) => Number.isFinite(row.chromosome) && Number.isFinite(row.position_mb))
        .map((row) => ({
          gene_symbol: row.gene_symbol,
          chromosome: row.chromosome,
          position_mb: row.position_mb,
          p_value: row.p_value,
          z_score: row.z_score,
          source_type: row.source_type,
        }))
        .sort((left, right) =>
          left.chromosome === right.chromosome
            ? left.position_mb - right.position_mb
            : left.chromosome - right.chromosome,
        );

      const qqPoints: QQPoint[] = tissueRows
        .map((row) => row.p_value)
        .filter((pvalue) => pvalue > 0 && Number.isFinite(pvalue))
        .sort((left, right) => left - right)
        .map((pvalue, index, values) => ({
          expected: -Math.log10((index + 1) / (values.length + 1)),
          observed: -Math.log10(pvalue),
        }));

      return {
        tissue: dataset.tissue,
        source_label: dataset.label,
        gene_associations: geneAssociations,
        qq_points: qqPoints,
        significance_threshold_logp: -Math.log10(0.05 / Math.max(geneAssociations.length, 1)),
        top_hit_gene: tissueRows[0]?.gene_symbol,
        labeled_genes: tissueRows
          .filter((row) => row.p_value <= 0.02)
          .sort((left, right) => left.p_value - right.p_value)
          .slice(0, 4)
          .map((row) => row.gene_symbol),
      };
    })
    .filter((entry) => entry.gene_associations.length > 0);

  return {
    host_genes,
    pathways,
    association_visuals: {
      tissues: tissueVisuals,
      default_tissue: tissueVisuals[0]?.tissue ?? matchedDatasets[0]?.tissue ?? "whole_blood",
    },
    evidence_sources: matchedDatasets.map((dataset) => ({
      label: dataset.label,
      source_type: dataset.sourceType,
      dataset: dataset.dataset,
      note: dataset.note,
    })),
  };
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

  if (
    drug.hepatic_caution &&
    (caseRecord.ast >= 80 || caseRecord.alt >= 80 || caseRecord.bilirubin >= 2)
  ) {
    flags.push({
      type: "hepatic",
      severity: caseRecord.bilirubin >= 2 ? "medium" : "low",
      message: "Baseline liver signal suggests added caution for hepatically sensitive agents.",
      action_hint: "Trend AST, ALT, and bilirubin if considered for review.",
    });
  }

  if (
    drug.qt_risk &&
    caseRecord.case_type === "candidemia" &&
    caseRecord.candidemia_details.qt_risk
  ) {
    flags.push({
      type: "qt",
      severity: "high",
      message: "Current case already carries QT liability that may be amplified by this candidate.",
      action_hint: "Check baseline ECG and interacting QT-prolonging therapies.",
    });
  }

  const hasAzoleContext =
    caseRecord.case_type === "candidemia" &&
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

  if (
    drug.bleeding_risk &&
    (caseRecord.platelet < 100 ||
      (caseRecord.case_type === "sepsis" && caseRecord.sepsis_details.anticoagulation))
  ) {
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

function fallbackEvidence(caseRecord: ExplorerCase): ImportedEvidence {
  const host_genes: MechanisticGene[] =
    caseRecord.case_type === "sepsis"
      ? [
          {
            gene_symbol: "ANGPT2",
            tissue: "whole_blood",
            direction: "up",
            source_type: "S-PrediXcan",
            source_dataset: "Fallback demo seed",
            z_score: 3.44,
            p_value: 0.0006,
            colocalization_supported: false,
            interpretation: "Fallback support for endothelial stress and vascular leak biology in severe sepsis.",
          },
          {
            gene_symbol: "IL10",
            tissue: "whole_blood",
            direction: "up",
            source_type: "TWAS",
            source_dataset: "Fallback demo seed",
            z_score: 2.91,
            p_value: 0.0036,
            colocalization_supported: false,
            interpretation: "Fallback immunoregulatory host-response signal.",
          },
        ]
      : [
          {
            gene_symbol: "IL10",
            tissue: "whole_blood",
            direction: "up",
            source_type: "S-PrediXcan",
            source_dataset: "Fallback demo seed",
            z_score: 3.12,
            p_value: 0.0018,
            colocalization_supported: false,
            interpretation: "Fallback immunoregulatory host-response involvement in persistent candidemia.",
          },
          {
            gene_symbol: "VCAM1",
            tissue: "vascular_endothelium",
            direction: "up",
            source_type: "RNAseq",
            source_dataset: "Fallback demo seed",
            z_score: 2.48,
            p_value: 0.013,
            colocalization_supported: false,
            interpretation: "Fallback endothelial stress and inflammatory adhesion signal.",
          },
        ];

  const pathways: PathwayEvidence[] =
    caseRecord.case_type === "sepsis"
      ? [
          {
            pathway_name: "Endothelial activation and barrier dysfunction",
            direction: "up",
            evidence_strength: "strong",
            summary: "Fallback pathway support for shock physiology and vascular leak.",
            supporting_genes: ["ANGPT2", "VCAM1"],
          },
          {
            pathway_name: "Cytokine signaling",
            direction: "up",
            evidence_strength: "moderate",
            summary: "Fallback host-directed inflammation pathway signal.",
            supporting_genes: ["IL10", "STAT1"],
          },
        ]
      : [
          {
            pathway_name: "Fungal host-defense and neutrophil response",
            direction: "up",
            evidence_strength: "moderate",
            summary: "Fallback pathway emphasizing host-defense tone in candidemia.",
            supporting_genes: ["CXCL8", "CSF3R"],
          },
          {
            pathway_name: "Innate immune regulation",
            direction: "mixed",
            evidence_strength: "weak",
            summary: "Fallback pathway support when imported result files are unavailable.",
            supporting_genes: ["IL10", "VCAM1"],
          },
        ];

  return {
    host_genes,
    pathways,
    association_visuals: {
      tissues: [
        {
          tissue: "whole_blood",
          source_label: "Fallback evidence seed",
          gene_associations: host_genes.map((gene, index) => ({
            gene_symbol: gene.gene_symbol,
            chromosome: index + 1,
            position_mb: 10 + index * 12,
            p_value: gene.p_value,
            z_score: gene.z_score,
            source_type: gene.source_type === "RNAseq" ? "TWAS" : gene.source_type,
          })),
          qq_points: host_genes.map((gene, index, genes) => ({
            expected: -Math.log10((index + 1) / (genes.length + 1)),
            observed: -Math.log10(gene.p_value),
          })),
          significance_threshold_logp: -Math.log10(0.05 / Math.max(host_genes.length, 1)),
          top_hit_gene: host_genes[0]?.gene_symbol,
          labeled_genes: host_genes.slice(0, 2).map((gene) => gene.gene_symbol),
        },
      ],
      default_tissue: "whole_blood",
    },
    evidence_sources: [
      {
        label: "Fallback evidence seed",
        source_type: "internal",
        dataset: "No imported PrediXcan result file detected",
        note: "Replace research/predixcan/*.csv with real exported result files to activate the full integration path.",
      },
    ],
  };
}

function evidenceTierFromScore(score: number): EvidenceTier {
  if (score >= 0.72) return "moderate";
  if (score >= 0.55) return "weak";
  return "exploratory";
}

function buildCandidates(
  caseRecord: ExplorerCase,
  importedEvidence: ImportedEvidence,
): RankedCandidate[] {
  const evidenceGenes = new Set(importedEvidence.host_genes.map((gene) => gene.gene_symbol));
  const pathwayGenes = new Set(
    importedEvidence.pathways.flatMap((pathway) => pathway.supporting_genes ?? []),
  );

  const raw = drugs.map((drug, index) => {
    const indicationBase =
      caseRecord.case_type === "sepsis" ? 0.8 - index * 0.06 : 0.82 - index * 0.055;
    const contraindicationBase =
      caseRecord.case_type === "sepsis" ? 0.1 + index * 0.05 : 0.11 + index * 0.045;
    const flags = inferClinicalFlags(caseRecord, drug);
    const linkedGenes = getLinkedGenesForDrug(drug.id);
    const matchedGenes = linkedGenes
      .map((link) => link.gene_symbol)
      .filter((gene) => evidenceGenes.has(gene) || pathwayGenes.has(gene));

    const mechanisticSupportScore = Math.min(
      0.32,
      matchedGenes.length * 0.08 + (matchedGenes.length > 0 ? 0.04 : 0),
    );
    const riskPenalty = flags.reduce((sum, flag) => {
      if (flag.severity === "high") return sum + 0.22;
      if (flag.severity === "medium") return sum + 0.12;
      return sum + 0.05;
    }, 0);

    const indicationScore = Number(indicationBase.toFixed(2));
    const contraindicationScore = Number(contraindicationBase.toFixed(2));
    const netPriorityScore = Number(
      (
        indicationScore * 0.6 -
        contraindicationScore * 0.4 +
        mechanisticSupportScore * 0.8 -
        riskPenalty * 0.3
      ).toFixed(2),
    );

    const predictedRole: PredictedRole =
      netPriorityScore >= 0.45
        ? "beneficial"
        : netPriorityScore >= 0.2
          ? "caution"
          : "contraindication";

    const bucket: CandidateBucket =
      flags.some((flag) => flag.severity === "high")
        ? "most_speculative"
        : matchedGenes.length >= 2
          ? "most_biologically_supported"
          : "most_clinically_feasible";

    const useContext: UseContext =
      matchedGenes.length >= 2 ? "host-directed" : index % 2 === 0 ? "adjunctive" : "supportive";

    return {
      rank: 0,
      drug_id: drug.id,
      drug_name: drug.generic_name,
      indication_score: indicationScore,
      contraindication_score: contraindicationScore,
      net_priority_score: netPriorityScore,
      predicted_role: predictedRole,
      use_context: useContext,
      bucket,
      evidence_tier: evidenceTierFromScore(netPriorityScore),
      model_explanation:
        matchedGenes.length > 0
          ? `Matched imported host-response evidence through ${matchedGenes.join(", ")}.`
          : "No direct imported gene match was found, so this candidate is ranked mostly by the graph prior and safety filters.",
      clinical_flags: flags,
      matched_genes: matchedGenes,
    };
  });

  return raw
    .sort((left, right) => right.net_priority_score - left.net_priority_score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function buildBottomLine(caseRecord: ExplorerCase, importedEvidence: ImportedEvidence) {
  const sourceLabels = importedEvidence.evidence_sources
    ?.map((source) => source.source_type)
    .join(", ");

  return `This ${caseRecord.case_type} case uses imported ${sourceLabels ?? "mechanistic"} evidence to prioritize adjunctive or host-directed candidates. These outputs can support deeper review, but they should not be interpreted as treatment recommendations, and standard infection management remains the primary decision frame.`;
}

export function analyzeCase(caseId: string, options?: AnalysisOptions) {
  const cached = getResult(caseId);
  if (cached) {
    return cached;
  }

  const caseRecord = getCase(caseId);

  if (!caseRecord) {
    return null;
  }

  const importedEvidence =
    options?.include_twas === false
      ? fallbackEvidence(caseRecord)
      : buildImportedEvidence(caseRecord.case_type) ?? fallbackEvidence(caseRecord);

  const result: AnalysisResult = {
    case_id: caseId,
    status: "completed",
    summary: {
      case_type: caseRecord.case_type,
      normalized_phenotypes: buildPhenotypes(caseRecord),
    },
    standard_of_care: getStandardOfCareBlocks(caseRecord.case_type),
    ranked_candidates: buildCandidates(caseRecord, importedEvidence),
    mechanistic_evidence: {
      host_genes: importedEvidence.host_genes,
      pathways: importedEvidence.pathways,
    },
    association_visuals: importedEvidence.association_visuals,
    digital_twin: getDigitalTwinSummary(caseRecord.case_type),
    drkg_panel: getDrkgCasePanel(caseRecord.case_type),
    repo_integrations: listRepoIntegrations(),
    evidence_sources: [
      ...(importedEvidence.evidence_sources ?? []),
      ...getFormalMappingProvenance().map((source) => ({
        label: `${source.provider} mapping source`,
        source_type: source.type,
        dataset: source.dataset,
        note: source.note,
      })),
    ],
    bottom_line: buildBottomLine(caseRecord, importedEvidence),
  };

  const augmentedPathways = buildPathwaySupportFromGenes(
    result.ranked_candidates.flatMap((candidate) => candidate.matched_genes ?? []),
  );

  result.mechanistic_evidence.pathways = [
    ...result.mechanistic_evidence.pathways,
    ...augmentedPathways
      .filter(
        (entry) =>
          !result.mechanistic_evidence.pathways.some(
            (pathway) => pathway.pathway_name === entry.pathway_name,
          ),
      )
      .map((entry) => ({
        pathway_name: entry.pathway_name,
        direction: "mixed" as const,
        evidence_strength: "weak" as const,
        summary: "Formal gene-pathway registry support derived from imported drug-target and Reactome-style mappings.",
        supporting_genes: entry.supporting_genes,
      })),
  ];

  return saveResult(caseId, result);
}
