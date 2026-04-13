import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { drugs, type DrugGeneLink, type DrugRecord, type PathwayEvidence } from "@/lib/infection-explorer";

type MappingManifest = {
  sources: Array<{
    id: string;
    type: "drug_target" | "gene_pathway";
    provider: string;
    dataset: string;
    file: string;
    note: string;
  }>;
};

type DrugTargetRow = {
  drug_id: string;
  gene_symbol: string;
  link_type: DrugGeneLink["link_type"];
  confidence_level: DrugGeneLink["confidence_level"];
  rationale: string;
  source_provider: string;
  source_dataset: string;
};

type GenePathwayRow = {
  gene_symbol: string;
  pathway_id: string;
  pathway_name: string;
  pathway_source: string;
};

export type MappingProvenance = {
  provider: string;
  dataset: string;
  note: string;
  type: "drug_target" | "gene_pathway";
};

const mappingsRoot = path.join(process.cwd(), "research", "formal-mappings");

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

function readManifest(): MappingManifest {
  const manifestPath = path.join(mappingsRoot, "manifest.json");
  return JSON.parse(readFileSync(manifestPath, "utf8")) as MappingManifest;
}

function readDrugTargetRows(): DrugTargetRow[] {
  const manifest = readManifest();
  const source = manifest.sources.find((entry) => entry.type === "drug_target");

  if (!source) {
    return [];
  }

  const rows = parseDelimitedFile(
    readFileSync(path.join(mappingsRoot, source.file), "utf8"),
  );

  return rows.map((row) => ({
    drug_id: row.drug_id,
    gene_symbol: row.gene_symbol,
    link_type: row.link_type as DrugGeneLink["link_type"],
    confidence_level: row.confidence_level as DrugGeneLink["confidence_level"],
    rationale: row.rationale,
    source_provider: source.provider,
    source_dataset: source.dataset,
  }));
}

function readGenePathwayRows(): GenePathwayRow[] {
  const manifest = readManifest();
  const source = manifest.sources.find((entry) => entry.type === "gene_pathway");

  if (!source) {
    return [];
  }

  const rows = parseDelimitedFile(
    readFileSync(path.join(mappingsRoot, source.file), "utf8"),
  );

  return rows.map((row) => ({
    gene_symbol: row.gene_symbol,
    pathway_id: row.pathway_id,
    pathway_name: row.pathway_name,
    pathway_source: row.pathway_source,
  }));
}

function enrichLinkWithPathwayContext(link: DrugTargetRow, pathwayRows: GenePathwayRow[]): DrugGeneLink {
  const genePathways = pathwayRows.filter((row) => row.gene_symbol === link.gene_symbol);
  const pathwaySummary =
    genePathways.length > 0
      ? ` Supported by ${genePathways
          .slice(0, 2)
          .map((row) => row.pathway_name)
          .join(" and ")}.`
      : "";

  return {
    gene_symbol: link.gene_symbol,
    link_type: link.link_type,
    confidence_level: link.confidence_level,
    rationale: `${link.rationale}${pathwaySummary}`.trim(),
  };
}

export function getFormalMappingProvenance(): MappingProvenance[] {
  return readManifest().sources.map((source) => ({
    provider: source.provider,
    dataset: source.dataset,
    note: source.note,
    type: source.type,
  }));
}

export function getLinkedGenesForDrug(drugId: string): DrugGeneLink[] {
  const drugTargetRows = readDrugTargetRows();
  const pathwayRows = readGenePathwayRows();

  return drugTargetRows
    .filter((row) => row.drug_id === drugId)
    .map((row) => enrichLinkWithPathwayContext(row, pathwayRows));
}

export function getDrugWithFormalMappings(drugId: string): (DrugRecord & { linked_genes: DrugGeneLink[] }) | null {
  const drug = drugs.find((entry) => entry.id === drugId);

  if (!drug) {
    return null;
  }

  return {
    ...drug,
    linked_genes: getLinkedGenesForDrug(drugId),
  };
}

export function getPathwayNamesForGenes(genes: string[]) {
  const pathwayRows = readGenePathwayRows();
  const geneSet = new Set(genes);

  return pathwayRows
    .filter((row) => geneSet.has(row.gene_symbol))
    .map((row) => row.pathway_name);
}

export function buildPathwaySupportFromGenes(genes: string[]): Array<Pick<PathwayEvidence, "pathway_name" | "supporting_genes">> {
  const pathwayRows = readGenePathwayRows();
  const geneSet = new Set(genes);
  const accumulator = new Map<string, Set<string>>();

  pathwayRows.forEach((row) => {
    if (!geneSet.has(row.gene_symbol)) {
      return;
    }

    const current = accumulator.get(row.pathway_name) ?? new Set<string>();
    current.add(row.gene_symbol);
    accumulator.set(row.pathway_name, current);
  });

  return Array.from(accumulator.entries()).map(([pathway_name, supportingGenes]) => ({
    pathway_name,
    supporting_genes: Array.from(supportingGenes).sort(),
  }));
}
