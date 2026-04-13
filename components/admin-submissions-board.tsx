"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth-provider";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
  SubmissionRecord,
  SubmissionStatus,
  SubmissionType,
} from "@/lib/types";

const typeLabel: Record<SubmissionType, string> = {
  evidence: "證據",
  error: "修正",
  inference: "推論",
};

const statusLabel: Record<SubmissionStatus, string> = {
  pending: "待審核",
  accepted: "已接受",
  rejected: "已拒絕",
};

const statusClassName: Record<SubmissionStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export function AdminSubmissionsBoard({
  initialSubmissions,
}: {
  initialSubmissions: SubmissionRecord[];
}) {
  const { session } = useAuth();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(id: string, status: SubmissionStatus) {
    setFeedback(null);

    startTransition(async () => {
      const accessToken = session?.access_token;

      if (!accessToken) {
        setFeedback("登入已過期，請重新登入。");
        return;
      }

      const response = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as { code?: string; error?: string; message?: string };

      if (!response.ok) {
        setFeedback(getApiErrorMessage(data, response.status));
        return;
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === id ? { ...submission, status } : submission,
        ),
      );
      setFeedback(data.message ?? "狀態已更新。");
    });
  }

  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-3 shadow-[0_18px_60px_-35px_rgba(41,37,36,0.35)]">
      {submissions.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-stone-300 p-8 text-stone-600">
          目前沒有 submissions。
        </div>
      ) : (
        <div className="grid gap-3">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName[submission.status]}`}
                    >
                      {statusLabel[submission.status]}
                    </span>
                    <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">
                      {typeLabel[submission.type]}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-semibold text-stone-950">
                    {submission.cases?.title ?? "未知 case"}
                  </h2>

                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-700">
                    {submission.content}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 rounded-[1.25rem] bg-white p-3">
                  <ActionButton
                    label="設為待審核"
                    disabled={isPending || submission.status === "pending"}
                    onClick={() => updateStatus(submission.id, "pending")}
                  />
                  <ActionButton
                    label="設為接受"
                    disabled={isPending || submission.status === "accepted"}
                    onClick={() => updateStatus(submission.id, "accepted")}
                  />
                  <ActionButton
                    label="設為拒絕"
                    disabled={isPending || submission.status === "rejected"}
                    onClick={() => updateStatus(submission.id, "rejected")}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {feedback ? (
        <div className="mt-3 rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-700">
          {feedback}
        </div>
      ) : null}
    </section>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
    >
      {label}
    </button>
  );
}
