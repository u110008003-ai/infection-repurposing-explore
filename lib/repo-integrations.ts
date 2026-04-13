import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import type { CaseType } from "@/lib/infection-explorer";

export type RepoIntegration = {
  id: string;
  name: string;
  repo_url: string;
  role: string;
  integration_status: "active" | "planned";
  note: string;
};

type RepoManifest = {
  repos: RepoIntegration[];
  drkg_case_panels: Record<
    CaseType,
    {
      title: string;
      summary: string;
      triples: Array<{
        head: string;
        relation: string;
        tail: string;
        rationale: string;
      }>;
    }
  >;
};

const repoRoot = path.join(process.cwd(), "research", "repo-integrations");

function readManifest() {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "manifest.json"), "utf8"),
  ) as RepoManifest;
}

export function listRepoIntegrations() {
  return readManifest().repos;
}

export function getDrkgCasePanel(caseType: CaseType) {
  return readManifest().drkg_case_panels[caseType];
}
