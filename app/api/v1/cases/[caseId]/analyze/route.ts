import { NextResponse } from "next/server";
import type { AnalysisOptions } from "@/lib/infection-explorer";
import { analyzeCase } from "@/lib/predixcan-integration";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const options = (await request.json()) as AnalysisOptions;
  const result = analyzeCase(caseId, options);

  if (!result) {
    return NextResponse.json({ message: "Case not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
