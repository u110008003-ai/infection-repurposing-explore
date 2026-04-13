"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useAuth } from "@/components/auth-provider";
import { CollapsibleContentSection } from "@/components/collapsible-content-section";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  emptyProposalDraft,
  isStructuredProposalContent,
  parseProposalDraft,
  proposalDraftSections,
  serializeProposalDraft,
  type ProposalDraft,
  type ProposalDraftSectionKey,
} from "@/lib/proposal-draft";
import { parseReferenceLinks } from "@/components/reference-aware-text";
import { roleMeetsRequirement } from "@/lib/roles";
import type { ProposalRecord } from "@/lib/types";

export function ProposalsBoard({
  initialProposals,
}: {
  initialProposals: ProposalRecord[];
}) {
  const { loading, session, profile } = useAuth();
  const [proposals, setProposals] = useState(initialProposals);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canPromote =
    Boolean(session?.user) &&
    Boolean(profile?.role && roleMeetsRequirement(profile.role, "level_3"));
  const canEditAllProposals =
    Boolean(session?.user) &&
    Boolean(profile?.role && roleMeetsRequirement(profile.role, "level_4"));

  function promoteProposal(proposalId: string) {
    if (!session?.user) {
      setFeedback("請先登入後再操作。");
      return;
    }

    if (!canPromote) {
      setFeedback("只有 Level 3 以上帳號可以把提案升格成案件。");
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const accessToken = session.access_token;

      if (!accessToken) {
        setFeedback("登入狀態失效，請重新登入後再試一次。");
        return;
      }

      const response = await fetch(`/api/proposals/${proposalId}/promote`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = (await response.json()) as {
        code?: string;
        error?: string;
        message?: string;
        promoted_case_id?: string;
      };

      if (!response.ok) {
        setFeedback(getApiErrorMessage(data, response.status));
        return;
      }

      setProposals((current) =>
        current.map((proposal) =>
          proposal.id === proposalId
            ? {
                ...proposal,
                status: "promoted",
                promoted_case_id: data.promoted_case_id ?? proposal.promoted_case_id ?? null,
              }
            : proposal,
        ),
      );
      setFeedback(data.message ?? "提案已升格為案件。");
    });
  }

  function saveProposal(proposalId: string, title: string, draft: ProposalDraft) {
    if (!session?.user) {
      setFeedback("請先登入後再操作。");
      return;
    }

    const content = serializeProposalDraft(draft);

    if (!title.trim() || !content.trim()) {
      setFeedback("提案標題和內容不能空白。");
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const accessToken = session.access_token;

      if (!accessToken) {
        setFeedback("登入狀態失效，請重新登入後再試一次。");
        return;
      }

      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      const data = (await response.json()) as { code?: string; error?: string; message?: string };

      if (!response.ok) {
        setFeedback(getApiErrorMessage(data, response.status));
        return;
      }

      setProposals((current) =>
        current.map((proposal) =>
          proposal.id === proposalId
            ? {
                ...proposal,
                title: title.trim(),
                content,
                updated_at: new Date().toISOString(),
              }
            : proposal,
        ),
      );
      setFeedback(data.message ?? "提案已更新。");
    });
  }

  return (
    <section className="grid gap-4">
      {feedback ? (
        <div className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-700">
          {feedback}
        </div>
      ) : null}

      {proposals.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white p-8 text-stone-600">
          目前還沒有任何提案。
        </div>
      ) : (
        proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            currentUserId={profile?.id ?? null}
            canEditAllProposals={canEditAllProposals}
            canPromote={canPromote}
            isPending={isPending || loading}
            onPromote={promoteProposal}
            onSave={saveProposal}
          />
        ))
      )}
    </section>
  );
}

function ProposalCard({
  proposal,
  currentUserId,
  canEditAllProposals,
  canPromote,
  isPending,
  onPromote,
  onSave,
}: {
  proposal: ProposalRecord;
  currentUserId: string | null;
  canEditAllProposals: boolean;
  canPromote: boolean;
  isPending: boolean;
  onPromote: (proposalId: string) => void;
  onSave: (proposalId: string, title: string, draft: ProposalDraft) => void;
}) {
  const structured = isStructuredProposalContent(proposal.content);
  const draft = structured
    ? parseProposalDraft(proposal.content)
    : { ...emptyProposalDraft, question: proposal.content };
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(proposal.title);
  const [editDraft, setEditDraft] = useState<ProposalDraft>(draft);
  const canEditProposal =
    proposal.status !== "promoted" &&
    Boolean(currentUserId) &&
    (proposal.user_id === currentUserId || canEditAllProposals);
  const references = parseReferenceLinks(draft.referenceLinks);

  function updateEditDraftField(key: ProposalDraftSectionKey, value: string) {
    setEditDraft((current) => ({ ...current, [key]: value }));
  }

  function buildResetDraft() {
    return isStructuredProposalContent(proposal.content)
      ? parseProposalDraft(proposal.content)
      : { ...emptyProposalDraft, question: proposal.content };
  }

  function resetEditState() {
    setEditTitle(proposal.title);
    setEditDraft(buildResetDraft());
  }

  return (
    <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_12px_40px_-28px_rgba(41,37,36,0.25)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {proposal.status === "promoted" ? "已升格" : "草稿提案"}
        </span>
        <span className="text-sm text-stone-500">
          提案者：{proposal.profiles?.display_name ?? "未知"}
        </span>
        {proposal.status === "promoted" ? (
          <span className="text-sm text-stone-500">
            升格者：{proposal.reviewed_by_profile?.display_name ?? "尚未紀錄"}
          </span>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-700">提案標題</span>
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="rounded-[1rem] border border-amber-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-amber-500"
            />
          </label>

          {proposalDraftSections.map((section) => (
            <label key={section.key} className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-stone-700">{section.label}</span>
                {!section.promoteToCase ? (
                  <span className="rounded-full border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600">
                    草稿限定
                  </span>
                ) : null}
              </div>
              <span className="text-xs leading-6 text-stone-500">{section.description}</span>
              <textarea
                value={editDraft[section.key]}
                onChange={(event) => updateEditDraftField(section.key, event.target.value)}
                className="min-h-28 rounded-[1rem] border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-amber-500"
              />
            </label>
          ))}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                resetEditState();
                setIsEditing(false);
              }}
              className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              取消
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                onSave(proposal.id, editTitle, editDraft);
                setIsEditing(false);
              }}
              className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isPending ? "儲存中..." : "儲存提案"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="mt-4 text-xl font-semibold text-stone-950">{proposal.title}</h2>
          <p className="mt-2 text-sm leading-7 text-stone-500">
            提案板塊現在會盡量對齊正式案件，方便之後直接升格整理。
          </p>

          {structured ? (
            <div className="mt-5 grid gap-4">
              {proposalDraftSections.map((section) => (
                <CollapsibleContentSection
                  key={section.key}
                  label={section.label}
                  description={section.description}
                  value={draft[section.key]}
                  tone={section.tone}
                  references={references}
                  defaultOpen={section.key === "question" || section.key === "facts"}
                  compact
                  badge={section.promoteToCase ? undefined : "草稿限定"}
                  surface="light"
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-700">
              {proposal.content}
            </p>
          )}
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {canEditProposal && !isEditing ? (
          <button
            type="button"
            onClick={() => {
              resetEditState();
              setIsEditing(true);
            }}
            disabled={isPending}
            className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            編輯我的提案
          </button>
        ) : null}

        {proposal.promoted_case_id ? (
          <Link
            href={`/cases/${proposal.promoted_case_id}`}
            className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
          >
            查看已建立案件
          </Link>
        ) : null}

        {canPromote && proposal.status !== "promoted" ? (
          <button
            type="button"
            onClick={() => onPromote(proposal.id)}
            disabled={isPending}
            className="inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            升格成案件
          </button>
        ) : null}
      </div>
    </article>
  );
}
