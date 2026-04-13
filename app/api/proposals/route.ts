import { NextResponse } from "next/server";
import { getSupabaseServerClientForToken } from "@/lib/supabase";
import { requireRole } from "@/lib/server-auth";

export async function POST(request: Request) {
  const auth = await requireRole(request, "level_2");

  if (!auth.actor || auth.response) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    content?: string;
  };

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json(
      { error: "Missing required fields: title and content." },
      { status: 400 },
    );
  }

  if (body.content.trim().length < 20) {
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
    insert: (values: {
      user_id: string;
      title: string;
      content: string;
      status: "under_review";
    }) => PromiseLike<{ error: { message: string } | null }>;
  };

  const { error } = await proposalsTable.insert({
    user_id: auth.actor.id,
    title: body.title.trim(),
    content: body.content.trim(),
    status: "under_review",
  });

  if (error) {
    return NextResponse.json(
      { error: `Failed to create proposal: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Proposal submitted successfully.",
  });
}
