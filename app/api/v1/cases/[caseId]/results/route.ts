import { NextResponse } from "next/server";
import { getResult } from "@/lib/infection-explorer";
import { analyzeCase } from "@/lib/predixcan-integration";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const result = getResult(caseId) ?? analyzeCase(caseId);

  if (!result) {
    return NextResponse.json({ message: "Case result not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
