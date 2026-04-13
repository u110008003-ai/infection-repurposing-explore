import { NextResponse } from "next/server";
import { analyzeCase, type AnalysisOptions } from "@/lib/infection-explorer";

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
