import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server-auth";
import { getSupabaseServerClientForToken } from "@/lib/supabase";
import { roleMeetsRequirement } from "@/lib/roles";
import type { ProposalStatus } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProposalRow = {
  id: string;
  user_id: string | null;
  status: ProposalStatus;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateRequest(request);

  if (!auth.actor || auth.response) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    content?: string;
  };

  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";

  if (!title || !content) {
    return NextResponse.json(
      { error: "Missing required fields: title and content." },
      { status: 400 },
    );
  }

  if (content.length < 20) {
    return NextResponse.json(
      { error: "Proposal content must be at least 20 characters." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClientForToken(auth.actor.access_token);

  if (!supabase) {
    return NextResponse.json(
      { error: "Server is missing Supabase environment settings." },
      { status: 500 },
    );
  }

  const proposalsTable = supabase.from("proposals") as unknown as {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        single: () => PromiseLike<{
          data: ProposalRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (values: {
      title: string;
      content: string;
      updated_at: string;
    }) => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };

  const proposalResult = await proposalsTable
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (!proposalResult.data || proposalResult.error) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  if (proposalResult.data.status === "promoted") {
    return NextResponse.json(
      { error: "This proposal has already been promoted and can no longer be edited directly." },
      { status: 409 },
    );
  }

  const canEdit =
    proposalResult.data.user_id === auth.actor.id || roleMeetsRequirement(auth.actor.role, "level_4");

  if (!canEdit) {
    return NextResponse.json(
      { error: "Only the proposal author or Level 4 can edit this proposal." },
      { status: 403 },
    );
  }

  const updateResult = await proposalsTable
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateResult.error) {
    return NextResponse.json(
      { error: `Failed to update proposal: ${updateResult.error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "提案已更新。",
  });
}
