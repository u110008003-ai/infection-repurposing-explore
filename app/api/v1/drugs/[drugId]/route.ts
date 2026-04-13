import { NextResponse } from "next/server";
import { getDrug } from "@/lib/infection-explorer";

export async function GET(
  _request: Request,
  context: { params: Promise<{ drugId: string }> },
) {
  const { drugId } = await context.params;
  const drug = getDrug(drugId);

  if (!drug) {
    return NextResponse.json({ message: "Drug not found." }, { status: 404 });
  }

  return NextResponse.json({
    drug_id: drug.id,
    generic_name: drug.generic_name,
    drug_class: drug.drug_class,
    mechanism_summary: drug.mechanism_summary,
    route: drug.route,
    renal_adjustment_required: drug.renal_adjustment_required,
    hepatic_caution: drug.hepatic_caution,
    qt_risk: drug.qt_risk,
    immunosuppressive_risk: drug.immunosuppressive_risk,
    bleeding_risk: drug.bleeding_risk,
    ddi_summary: drug.ddi_summary,
    linked_genes: drug.linked_genes,
  });
}
