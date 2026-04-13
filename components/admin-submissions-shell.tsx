"use client";

import { AdminSubmissionsBoard } from "@/components/admin-submissions-board";
import { useAuth } from "@/components/auth-provider";
import { roleMeetsRequirement } from "@/lib/roles";
import type { SubmissionRecord } from "@/lib/types";

export function AdminSubmissionsShell({
  initialSubmissions,
}: {
  initialSubmissions: SubmissionRecord[];
}) {
  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 text-stone-600">
        正在確認登入狀態...
      </section>
    );
  }

  if (!session) {
    return (
      <section className="rounded-[2rem] border border-amber-300 bg-amber-50 p-8 text-amber-900">
        請先登入後再查看 submissions 管理頁。
      </section>
    );
  }

  if (!profile?.role || !roleMeetsRequirement(profile.role, "level_3")) {
    return (
      <section className="rounded-[2rem] border border-rose-300 bg-rose-50 p-8 text-rose-900">
        權限不足：只有 Level 3 可以使用 submissions 管理功能。
      </section>
    );
  }

  return <AdminSubmissionsBoard initialSubmissions={initialSubmissions} />;
}
