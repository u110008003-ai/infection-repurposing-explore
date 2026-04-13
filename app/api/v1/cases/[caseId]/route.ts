import { NextResponse } from "next/server";
import { getCase } from "@/lib/infection-explorer";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const caseRecord = getCase(caseId);

  if (!caseRecord) {
    return NextResponse.json({ message: "Case not found." }, { status: 404 });
  }

  return NextResponse.json(caseRecord);
}
