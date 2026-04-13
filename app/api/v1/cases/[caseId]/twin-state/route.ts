import { NextResponse } from "next/server";
import type { TwinStateObservation } from "@/lib/infection-explorer";
import { analyzeCase } from "@/lib/predixcan-integration";
import { buildTwinStateSnapshot } from "@/lib/twin-state";
import {
  getTwinStateObservations,
  getTwinStateTimeline,
  saveTwinStateTimeline,
} from "@/lib/twin-state-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const result = analyzeCase(caseId);

  if (!result) {
    return NextResponse.json({ message: "Case not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const includeHistory = searchParams.get("history") === "true";
  let timeline = await getTwinStateTimeline(caseId);

  if (!timeline) {
    const observations = await getTwinStateObservations(caseId);
    const initialSnapshot = buildTwinStateSnapshot(caseId, {
      observations,
      existingResult: result,
      version: 1,
      updateReason: "initialization",
    });

    if (!initialSnapshot) {
      return NextResponse.json({ message: "Twin state not available." }, { status: 404 });
    }

    timeline = await saveTwinStateTimeline({
      caseId,
      snapshot: initialSnapshot,
      observations,
    });
  }

  return NextResponse.json(
    includeHistory
      ? timeline
      : {
          case_id: timeline.case_id,
          latest_snapshot: timeline.latest_snapshot,
          history_length: timeline.history.length,
        },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json()) as {
    observations?: TwinStateObservation[];
    update_reason?: string;
  };

  const result = analyzeCase(caseId);

  if (!result) {
    return NextResponse.json({ message: "Case not found." }, { status: 404 });
  }

  const priorTimeline = await getTwinStateTimeline(caseId);
  const priorObservations = await getTwinStateObservations(caseId);
  const observations = [...priorObservations, ...(payload.observations ?? [])];
  const twinState = buildTwinStateSnapshot(caseId, {
    observations,
    existingResult: result,
    version: (priorTimeline?.latest_snapshot.version ?? 0) + 1,
    updateReason: payload.update_reason ?? "manual-update",
  });

  if (!twinState) {
    return NextResponse.json({ message: "Twin state not available." }, { status: 404 });
  }

  const timeline = await saveTwinStateTimeline({
    caseId,
    snapshot: twinState,
    observations,
  });

  return NextResponse.json({
    case_id: timeline.case_id,
    latest_snapshot: timeline.latest_snapshot,
    history_length: timeline.history.length,
  });
}
