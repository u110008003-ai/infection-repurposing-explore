import { NextResponse } from "next/server";
import { exportCaseReport } from "@/lib/infection-explorer";

function buildResponse(caseId: string, format: "pdf" | "json") {
  const report = exportCaseReport(caseId, format);

  if (!report) {
    return NextResponse.json({ message: "Report could not be generated." }, { status: 404 });
  }

  return NextResponse.json({
    report_id: report.report_id,
    status: report.status,
    download_url: report.download_url,
    format: report.format,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json().catch(() => ({ format: "pdf" }))) as { format?: "pdf" | "json" };

  return buildResponse(caseId, payload.format ?? "pdf");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return buildResponse(caseId, "pdf");
}
