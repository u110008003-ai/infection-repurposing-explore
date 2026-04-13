import Link from "next/link";
import { AdminSubmissionsShell } from "@/components/admin-submissions-shell";
import { getSubmissions } from "@/lib/cases";

export default async function AdminSubmissionsPage() {
  const { submissions, error } = await getSubmissions();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f0e7_0%,#faf7f2_35%,#ffffff_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">
              Submissions 管理
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              在這裡可審核使用者送出的 submissions，並調整為待審核 / 接受 / 拒絕。
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
          >
            回首頁
          </Link>
        </div>

        {error ? (
          <section className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            {error}
          </section>
        ) : null}

        <AdminSubmissionsShell initialSubmissions={submissions} />
      </div>
    </main>
  );
}
