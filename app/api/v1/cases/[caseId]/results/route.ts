import { NextResponse } from "next/server";
import { analyzeCase, getResult } from "@/lib/infection-explorer";

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
