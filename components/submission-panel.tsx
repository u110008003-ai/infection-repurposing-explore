"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth-provider";
import { getApiErrorMessage } from "@/lib/api-error";
import type { SubmissionType } from "@/lib/types";

type SubmissionPanelProps = {
  caseId: string;
};

const submissionOptions: Array<{
  type: SubmissionType;
  label: string;
  hint: string;
}> = [
  { type: "evidence", label: "證據資料", hint: "可驗證事實、來源連結、公開文件。" },
  { type: "error", label: "錯誤修正", hint: "指出目前 case 內容的錯誤與更正依據。" },
  { type: "inference", label: "推論補充", hint: "提供新的推論方向與理由。" },
];

export function SubmissionPanel({ caseId }: SubmissionPanelProps) {
  const { loading, session, profile } = useAuth();
  const [selectedType, setSelectedType] = useState<SubmissionType>("evidence");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOption =
    submissionOptions.find((option) => option.type === selectedType) ??
    submissionOptions[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!session?.user) {
      setFeedback("請先登入後再送出 submission。");
      return;
    }

    startTransition(async () => {
      const accessToken = session.access_token;

      if (!accessToken) {
        setFeedback("登入已過期，請重新登入。");
        return;
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          type: selectedType,
          content,
          source_url: sourceUrl || null,
        }),
      });

      const data = (await response.json()) as { code?: string; error?: string; message?: string };

      if (!response.ok) {
        setFeedback(getApiErrorMessage(data, response.status));
        return;
      }

      setContent("");
      setSourceUrl("");
      setFeedback(data.message ?? "Submission 已成功送出。");
    });
  }

  return (
    <section className="rounded-[2rem] border border-stone-800 bg-white/5 p-6 backdrop-blur">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
          Structured Submission
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          送出證據、修正或推論
        </h2>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {submissionOptions.map((option) => {
          const isActive = option.type === selectedType;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => setSelectedType(option.type)}
              className={`rounded-[1.25rem] border p-4 text-left transition ${
                isActive
                  ? "border-amber-400 bg-amber-500/10 text-white"
                  : "border-stone-800 bg-stone-950/50 text-stone-300 hover:border-stone-700"
              }`}
            >
              <p className="text-base font-semibold">{option.label}</p>
              <p className="mt-2 text-sm leading-6 text-inherit/80">{option.hint}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div className="rounded-[1.25rem] border border-stone-800 bg-stone-950/50 p-4 text-sm leading-7 text-stone-300">
          {loading
            ? "正在確認登入狀態..."
            : session?.user
              ? `目前登入：${profile?.display_name ?? session.user.email}`
              : "未登入，送出前請先登入。"}
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-200">內容</span>
          <textarea
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="請描述你的補充內容（至少 10 字）"
            className="min-h-40 rounded-[1.25rem] border border-stone-800 bg-stone-950/60 px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-stone-500 focus:border-amber-400"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-200">來源連結（可選）</span>
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://"
            className="rounded-[1.25rem] border border-stone-800 bg-stone-950/60 px-4 py-3 text-base text-white outline-none transition placeholder:text-stone-500 focus:border-amber-400"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || loading || !session?.user}
            className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
          >
            {isPending ? "送出中..." : `送出 ${activeOption.label}`}
          </button>
        </div>

        {feedback ? (
          <div className="rounded-[1.25rem] border border-stone-800 bg-stone-950/50 px-4 py-3 text-sm leading-7 text-stone-200">
            {feedback}
          </div>
        ) : null}
      </form>
    </section>
  );
}
