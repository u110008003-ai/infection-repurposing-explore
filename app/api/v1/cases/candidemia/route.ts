import { NextResponse } from "next/server";
import { createCase, type CandidemiaCaseInput } from "@/lib/infection-explorer";

export async function POST(request: Request) {
  const payload = (await request.json()) as CandidemiaCaseInput;
  const caseRecord = createCase("candidemia", payload);

  return NextResponse.json({
    case_id: caseRecord.id,
    case_type: caseRecord.case_type,
    status: "created",
  });
}
