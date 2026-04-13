"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { roleMeetsRequirement } from "@/lib/roles";

export function CaseRoleActions({ caseId }: { caseId: string }) {
  const { loading, profile } = useAuth();
  const canEditCases = Boolean(profile?.role && roleMeetsRequirement(profile.role, "level_4"));
  const canManageSubmissions = Boolean(profile?.role && roleMeetsRequirement(profile.role, "level_3"));

  if (loading) {
    return (
      <span className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-500">
        載入中...
      </span>
    );
  }

  if (!canEditCases && !canManageSubmissions) {
    return null;
  }

  return (
    <>
      {canEditCases ? (
        <Link
          href={`/cases/${caseId}/edit`}
          className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-300 transition hover:border-amber-400 hover:text-amber-300"
        >
          編輯 Case
        </Link>
      ) : null}
      {canManageSubmissions ? (
        <Link
          href="/admin/submissions"
          className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-300 transition hover:border-amber-400 hover:text-amber-300"
        >
          管理 Submissions
        </Link>
      ) : null}
    </>
  );
}
