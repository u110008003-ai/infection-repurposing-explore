import { NextResponse } from "next/server";
import type { CaseType } from "@/lib/infection-explorer";
import { getDrkgDatasetInfo, queryLocalDrkg } from "@/lib/drkg-local";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const caseType = searchParams.get("caseType") as CaseType | null;
  const entities = searchParams.getAll("entity");
  const limit = Number(searchParams.get("limit") ?? "12");

  const triples = queryLocalDrkg({
    caseType: caseType ?? undefined,
    entities,
    limit: Number.isFinite(limit) ? limit : 12,
  });

  return NextResponse.json({
    datasets: getDrkgDatasetInfo(),
    count: triples.length,
    triples,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    caseType?: CaseType;
    entities?: string[];
    limit?: number;
  };

  const triples = queryLocalDrkg({
    caseType: payload.caseType,
    entities: payload.entities ?? [],
    limit: payload.limit ?? 12,
  });

  return NextResponse.json({
    datasets: getDrkgDatasetInfo(),
    count: triples.length,
    triples,
  });
}
