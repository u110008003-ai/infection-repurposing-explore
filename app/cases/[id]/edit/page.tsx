import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseEditForm } from "@/components/case-edit-form";
import { getAcceptedSubmissionsForCase, getCaseById } from "@/lib/cases";
import { SubmissionType } from "@/lib/types";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const submissionTypeLabel: Record<SubmissionType, string> = {
  evidence: "證據",
  error: "錯誤指認",
  inference: "推論",
};

export default async function CaseEditPage({ params }: PageProps) {
  const { id } = await params;
  const { caseItem } = await getCaseById(id);

  if (!caseItem) {
    notFound();
  }

  const { submissions } = await getAcceptedSubmissionsForCase(caseItem.id);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f0e7_0%,#faf7f2_35%,#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
              Case Editor
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">編輯案件內容</h1>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/cases/${caseItem.id}`}
              className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            >
              返回案件頁
            </Link>
            <Link
              href="/admin/submissions"
              className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            >
              前往 submissions 管理
            </Link>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_-35px_rgba(41,37,36,0.35)]">
            <h2 className="text-2xl font-semibold text-stone-950">{caseItem.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-stone-600">
              {caseItem.question}
            </p>

            <div className="mt-6 rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-600">
              你現在可以直接補上事件來龍去脈、總整理圖網址和圖說。來龍去脈建議一行寫一個時間點，
              之後在案件頁就能逐行點開看。
            </div>

            <div className="mt-6">
              <CaseEditForm caseItem={caseItem} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-stone-950 p-6 text-stone-100 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
              Accepted Submissions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">已採納的補充內容</h2>

            <div className="mt-6 grid gap-3">
              {submissions.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-stone-700 p-5 text-sm leading-7 text-stone-400">
                  目前還沒有已採納的 submissions。
                </div>
              ) : (
                submissions.map((submission) => (
                  <article
                    key={submission.id}
                    className="rounded-[1.25rem] border border-stone-800 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                        已採納
                      </span>
                      <span className="rounded-full bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-200">
                        {submissionTypeLabel[submission.type]}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-200">
                      {submission.content}
                    </p>

                    {submission.source_url ? (
                      <a
                        href={submission.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-medium text-amber-300 underline decoration-amber-500/40 underline-offset-4"
                      >
                        查看來源
                      </a>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
