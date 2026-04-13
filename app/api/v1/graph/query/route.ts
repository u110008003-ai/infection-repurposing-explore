import { NextResponse } from "next/server";
import type { CaseType } from "@/lib/infection-explorer";
import {
  getDrkgDatasetInfo,
  getDrkgNodes,
  getDrkgRelations,
  queryLocalDrkg,
} from "@/lib/drkg-local";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const caseType = searchParams.get("caseType") as CaseType | null;
  const entities = searchParams.getAll("entity");
  const limit = Number(searchParams.get("limit") ?? "12");
  const relation = searchParams.get("relation");

  const triples = queryLocalDrkg({
    caseType: caseType ?? undefined,
    entities,
    relation: relation ?? undefined,
    limit: Number.isFinite(limit) ? limit : 12,
  });

  return NextResponse.json({
    datasets: getDrkgDatasetInfo(),
    nodes: getDrkgNodes(),
    relations: getDrkgRelations(),
    count: triples.length,
    triples,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    caseType?: CaseType;
    entities?: string[];
    limit?: number;
    relation?: string;
  };

  const triples = queryLocalDrkg({
    caseType: payload.caseType,
    entities: payload.entities ?? [],
    relation: payload.relation,
    limit: payload.limit ?? 12,
  });

  return NextResponse.json({
    datasets: getDrkgDatasetInfo(),
    nodes: getDrkgNodes(),
    relations: getDrkgRelations(),
    count: triples.length,
    triples,
  });
}
