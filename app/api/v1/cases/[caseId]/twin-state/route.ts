import { NextResponse } from "next/server";
import type { TwinStateObservation } from "@/lib/infection-explorer";
import { analyzeCase } from "@/lib/predixcan-integration";
import { buildTwinStateSnapshot } from "@/lib/twin-state";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const result = analyzeCase(caseId);

  if (!result) {
    return NextResponse.json({ message: "Case not found." }, { status: 404 });
  }

  const twinState = buildTwinStateSnapshot(caseId, [], result);

  if (!twinState) {
    return NextResponse.json({ message: "Twin state not available." }, { status: 404 });
  }

  return NextResponse.json(twinState);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json()) as {
    observations?: TwinStateObservation[];
  };

  const result = analyzeCase(caseId);

  if (!result) {
    return NextResponse.json({ message: "Case not found." }, { status: 404 });
  }

  const twinState = buildTwinStateSnapshot(caseId, payload.observations ?? [], result);

  if (!twinState) {
    return NextResponse.json({ message: "Twin state not available." }, { status: 404 });
  }

  return NextResponse.json(twinState);
}
