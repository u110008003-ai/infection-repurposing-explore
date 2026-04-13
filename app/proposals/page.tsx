import Link from "next/link";
import { ProposalForm } from "@/components/proposal-form";
import { ProposalsBoard } from "@/components/proposals-board";
import { getProposals } from "@/lib/cases";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const { proposals, error } = await getProposals();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#fbfaf7_24%,#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
              Proposal Drafts
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">提案草稿池</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              proposal 頁現在也和 case 一樣分成多個板塊，只是它還在草稿階段。
              你可以先把核心問題、來龍去脈、已知事實、待查主張整理好，等內容成熟後再升格成正式案件。
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
          >
            返回首頁
          </Link>
        </div>

        <section className="grid gap-4 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_-35px_rgba(41,37,36,0.35)] md:grid-cols-3">
          <article className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-base font-semibold text-stone-950">先整理，再升格</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              proposal 適合用來先整理議題輪廓，不用一開始就把所有證據都補齊，但至少要讓人看得懂你想討論什麼。
            </p>
          </article>

          <article className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-base font-semibold text-stone-950">板塊式草稿</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              提案會用和 case 類似的板塊呈現，包含核心問題、來龍去脈、已確認事實、待查主張與材料整理。
            </p>
          </article>

          <article className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-base font-semibold text-stone-950">升格規則</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Level 2 可以建立與補充提案，Level 3 可以檢查是否成熟，並決定是否升格成正式案件。
            </p>
          </article>
        </section>

        <ProposalForm />

        {error ? (
          <section className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            {error}
          </section>
        ) : null}

        <section className="grid gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
              提案列表
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">目前所有草稿提案</h2>
          </div>
          <ProposalsBoard initialProposals={proposals} />
        </section>
      </div>
    </main>
  );
}
