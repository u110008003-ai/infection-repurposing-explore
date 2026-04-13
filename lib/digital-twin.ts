import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import type { CaseType, DigitalTwinSummary } from "@/lib/infection-explorer";

type TwinManifest = {
  primaryFramework: string;
  cases: Record<
    CaseType,
    {
      twinState: DigitalTwinSummary["twin_state"];
      updateMode: string;
      layers: Array<{
        id: string;
        title: string;
        role: string;
        status: "active" | "planned";
        sources: string[];
        note: string;
      }>;
    }
  >;
};

const twinRoot = path.join(process.cwd(), "research", "digital-twin");

function readManifest() {
  return JSON.parse(
    readFileSync(path.join(twinRoot, "manifest.json"), "utf8"),
  ) as TwinManifest;
}

export function getDigitalTwinSummary(caseType: CaseType): DigitalTwinSummary {
  const manifest = readManifest();
  const config = manifest.cases[caseType];

  return {
    twin_state: config.twinState,
    primary_framework: manifest.primaryFramework,
    update_mode: config.updateMode,
    layers: config.layers,
  };
}
