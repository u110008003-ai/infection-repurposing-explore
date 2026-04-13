import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { getSupabaseServerClientForToken } from "@/lib/supabase";
import type { CaseRecord, CaseUpdatePayload } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const caseColumns = [
  "id",
  "title",
  "question",
  "narrative_timeline",
  "stable_conclusion",
  "confirmed_facts",
  "possible_explanations",
  "unsupported_claims",
  "evidence_list",
  "reference_links",
  "open_questions",
  "summary_image_url",
  "summary_image_note",
  "status",
  "updated_at",
].join(", ");

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole(request, "level_4");

  if (!auth.actor || auth.response) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<CaseUpdatePayload>;
  const supabase = getSupabaseServerClientForToken(auth.actor.access_token);

  if (!supabase) {
    return NextResponse.json(
      { error: "Server is missing Supabase environment settings." },
      { status: 500 },
    );
  }

  const casesReader = supabase.from("cases") as unknown as {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        single: () => PromiseLike<{ data: CaseRecord | null; error: { message: string } | null }>;
      };
    };
  };

  const existingCaseResult = await casesReader.select(caseColumns).eq("id", id).single();

  if (existingCaseResult.error || !existingCaseResult.data) {
    return NextResponse.json(
      { error: `Case not found: ${existingCaseResult.error?.message ?? ""}`.trim() },
      { status: 404 },
    );
  }

  const existingCase = existingCaseResult.data;

  const payload: CaseUpdatePayload = {
    question: body.question?.trim() ?? "",
    narrative_timeline: body.narrative_timeline?.trim() ?? "",
    stable_conclusion: body.stable_conclusion?.trim() ?? "",
    confirmed_facts: body.confirmed_facts?.trim() ?? "",
    possible_explanations: body.possible_explanations?.trim() ?? "",
    unsupported_claims: body.unsupported_claims?.trim() ?? "",
    evidence_list: body.evidence_list?.trim() ?? "",
    reference_links: body.reference_links?.trim() ?? "",
    open_questions: body.open_questions?.trim() ?? "",
    summary_image_url: body.summary_image_url?.trim() ?? "",
    summary_image_note: body.summary_image_note?.trim() ?? "",
  };

  const casesTable = supabase.from("cases") as unknown as {
    update: (values: CaseUpdatePayload) => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };

  const { error } = await casesTable.update(payload).eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `Failed to update case: ${error.message}` },
      { status: 500 },
    );
  }

  const changedFields = getChangedFields(existingCase, payload);

  if (changedFields.length > 0) {
    const revisionsTable = supabase.from("revisions") as unknown as {
      insert: (values: {
        case_id: string;
        editor_id: string;
        summary: string;
        detail: string;
      }) => PromiseLike<{ error: { message: string } | null }>;
    };

    const revisionSummary = `更新欄位：${changedFields.map((field) => field.label).join("、")}`;
    const revisionDetail = changedFields
      .map((field) => {
        const before = readableValue(existingCase[field.key]);
        const after = readableValue(payload[field.key]);
        return `${field.label}\n變更前：${before}\n變更後：${after}`;
      })
      .join("\n\n");

    const revisionResult = await revisionsTable.insert({
      case_id: id,
      editor_id: auth.actor.id,
      summary: revisionSummary,
      detail: revisionDetail,
    });

    if (revisionResult.error) {
      return NextResponse.json(
        { error: `Case updated but failed to create revision: ${revisionResult.error.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    message: "案件已更新。",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireRole(request, "level_4");

  if (!auth.actor || auth.response) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseServerClientForToken(auth.actor.access_token);

  if (!supabase) {
    return NextResponse.json(
      { error: "Server is missing Supabase environment settings." },
      { status: 500 },
    );
  }

  const casesTable = supabase.from("cases") as unknown as {
    delete: () => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };

  const { error } = await casesTable.delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `Failed to delete case: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "案件已刪除。",
  });
}

function getChangedFields(existingCase: CaseRecord, payload: CaseUpdatePayload) {
  const fieldLabels: Record<keyof CaseUpdatePayload, string> = {
    question: "核心問題",
    narrative_timeline: "事件來龍去脈",
    stable_conclusion: "穩定結論",
    confirmed_facts: "已確認事實",
    possible_explanations: "目前可能解釋",
    unsupported_claims: "未支持主張",
    evidence_list: "證據與材料",
    reference_links: "參考連結",
    open_questions: "待確認問題",
    summary_image_url: "總整理圖網址",
    summary_image_note: "總整理圖說明",
  };

  return (Object.keys(fieldLabels) as Array<keyof CaseUpdatePayload>)
    .filter((field) => existingCase[field] !== payload[field])
    .map((field) => ({
      key: field,
      label: fieldLabels[field],
    }));
}

function readableValue(value: string) {
  return value.trim() ? value : "(空白)";
}
