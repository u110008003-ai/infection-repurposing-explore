import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

export type ProteinResidueHotspot = {
  residue_label: string;
  x: number;
  y: number;
  intensity: "supportive" | "caution" | "neutral";
};

export type ProteinStructureRecord = {
  gene_symbol: string;
  protein_name: string;
  source: string;
  structure_model: string;
  note: string;
  hotspots: ProteinResidueHotspot[];
};

type StructureManifest = {
  records: Array<{
    gene_symbol: string;
    protein_name: string;
    source: string;
    structure_model: string;
    note: string;
    hotspots: ProteinResidueHotspot[];
  }>;
};

const structureRoot = path.join(process.cwd(), "research", "protein-structures");

function readManifest() {
  return JSON.parse(
    readFileSync(path.join(structureRoot, "manifest.json"), "utf8"),
  ) as StructureManifest;
}

export function getProteinStructuresForGenes(genes: string[]) {
  const geneSet = new Set(genes);
  return readManifest().records.filter((record) => geneSet.has(record.gene_symbol));
}

export function getProteinStructureProvenance() {
  return {
    provider: "FungAMR-style structural overlay seed",
    dataset: "research/protein-structures/manifest.json",
    note: "This panel is designed to ingest exported structure annotations from FungAMR, AlphaFold, PDB, or similar offline pipelines rather than computing tertiary structures live in Vercel.",
  };
}
