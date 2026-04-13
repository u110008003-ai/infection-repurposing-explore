"use client";

import { useState } from "react";
import type { RevisionRecord } from "@/lib/types";

type RevisionsPanelProps = {
  revisions: RevisionRecord[];
  error?: string | null;
};

export function RevisionsPanel({ revisions, error }: RevisionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[var(--color-surface-main)] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            Revision History
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">修訂紀錄</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">
            預設先收起來，需要時再展開看歷次變更，避免案件頁面過長。
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
        >
          {isOpen ? "收起修訂紀錄" : `展開修訂紀錄 (${revisions.length})`}
        </button>
      </div>

      {error ? (
        <div className="mt-5 rounded-[1.25rem] border border-[oklch(0.65_0.1_40_/_0.2)] bg-[color-mix(in_oklch,#bb653b_6%,#1c1b19)] px-4 py-3 text-sm leading-7 text-[var(--color-text)]">
          {error}
        </div>
      ) : null}

      {!isOpen ? null : (
        <div className="mt-6 grid gap-3">
          {revisions.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-white/15 p-5 text-sm leading-7 text-[var(--color-text-muted)]">
              目前還沒有修訂紀錄。
            </div>
          ) : (
            revisions.map((revision) => (
              <article
                key={revision.id}
                className="rounded-[1.25rem] border border-white/10 bg-[var(--color-surface-card)] p-5"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">{revision.summary}</h3>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {formatDateTime(revision.created_at)}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text)]">
                  {revision.detail}
                </p>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未知";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
