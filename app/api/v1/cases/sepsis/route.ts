import { NextResponse } from "next/server";
import { createCase, type SepsisCaseInput } from "@/lib/infection-explorer";

export async function POST(request: Request) {
  const payload = (await request.json()) as SepsisCaseInput;
  const caseRecord = createCase("sepsis", payload);

  return NextResponse.json({
    case_id: caseRecord.id,
    case_type: caseRecord.case_type,
    status: "created",
  });
}
