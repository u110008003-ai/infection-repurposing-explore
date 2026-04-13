import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import type { CaseType, DrkgGraphPanel, GraphEvidenceTriple } from "@/lib/infection-explorer";

type DrkgManifest = {
  datasets: Array<{
    id: string;
    label: string;
    file: string;
    note: string;
  }>;
};

type GraphNode = {
  node_id: string;
  node_type: string;
  label: string;
};

type GraphRelation = {
  relation: string;
  description: string;
};

const drkgRoot = path.join(process.cwd(), "research", "drkg-local");

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

function readManifest() {
  return JSON.parse(
    readFileSync(path.join(drkgRoot, "manifest.json"), "utf8"),
  ) as DrkgManifest;
}

function readTriples(): GraphEvidenceTriple[] {
  const manifest = readManifest();
  const dataset = manifest.datasets[0];

  if (!dataset) {
    return [];
  }

  const rows = parseDelimitedFile(
    readFileSync(path.join(drkgRoot, dataset.file), "utf8"),
  );

  return rows.map((row) => ({
    head: row.head,
    head_type: row.head_type,
    relation: row.relation,
    tail: row.tail,
    tail_type: row.tail_type,
    case_type: (row.case_type as GraphEvidenceTriple["case_type"]) || "shared",
    rationale: row.rationale,
  }));
}

export function queryLocalDrkg(params: {
  caseType?: CaseType;
  entities?: string[];
  relation?: string;
  limit?: number;
}) {
  const entities = new Set((params.entities ?? []).map((entity) => entity.toLowerCase()));
  const triples = readTriples().filter((triple) => {
    const matchesCaseType =
      !params.caseType ||
      triple.case_type === "shared" ||
      triple.case_type === params.caseType;

    const matchesEntity =
      entities.size === 0 ||
      entities.has(triple.head.toLowerCase()) ||
      entities.has(triple.tail.toLowerCase());

    const matchesRelation =
      !params.relation || triple.relation.toLowerCase() === params.relation.toLowerCase();

    return matchesCaseType && matchesEntity && matchesRelation;
  });

  return triples.slice(0, params.limit ?? 12);
}

export function buildDrkgGraphPanel(caseType: CaseType, entities: string[]): DrkgGraphPanel {
  const triples = queryLocalDrkg({ caseType, entities, limit: 6 });

  return {
    title: caseType === "sepsis" ? "DRKG-backed sepsis graph panel" : "DRKG-backed candidemia graph panel",
    summary:
      "This panel is now generated from a local, queryable graph-evidence dataset rather than only from a fixed UI seed block.",
    triples: triples.map((triple) => ({
      head: triple.head,
      relation: triple.relation,
      tail: triple.tail,
      rationale: triple.rationale,
    })),
  };
}

export function getDrkgDatasetInfo() {
  return readManifest().datasets;
}

export function getDrkgNodes() {
  const manifest = readManifest();
  const dataset = manifest.datasets.find((entry) => entry.id.includes("nodes"));

  if (!dataset) {
    return [] as GraphNode[];
  }

  return parseDelimitedFile(
    readFileSync(path.join(drkgRoot, dataset.file), "utf8"),
  ) as GraphNode[];
}

export function getDrkgRelations() {
  const manifest = readManifest();
  const dataset = manifest.datasets.find((entry) => entry.id.includes("relations"));

  if (!dataset) {
    return [] as GraphRelation[];
  }

  return parseDelimitedFile(
    readFileSync(path.join(drkgRoot, dataset.file), "utf8"),
  ) as GraphRelation[];
}
