import { notFound } from "next/navigation";
import { ResultsDashboard } from "@/components/infection-explorer/results-dashboard";
import { analyzeCase, drugs, getCase, getResult } from "@/lib/infection-explorer";

export default async function CaseResultsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const caseRecord = getCase(caseId);

  if (!caseRecord) {
    notFound();
  }

  const result = getResult(caseId) ?? analyzeCase(caseId);

  if (!result) {
    notFound();
  }

  return (
    <ResultsDashboard
      caseRecord={caseRecord}
      result={result}
      drugsById={new Map(drugs.map((drug) => [drug.id, drug]))}
    />
  );
}
