import { NextResponse } from "next/server";
import { getSupabaseServerClientForToken } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/server-auth";
import type { SubmissionPayload, SubmissionType } from "@/lib/types";

const allowedTypes: SubmissionType[] = ["evidence", "error", "inference"];

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);

  if (!auth.actor || auth.response) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<SubmissionPayload>;

  if (!body.case_id || !body.content || !body.type) {
    return NextResponse.json(
      { error: "Missing required fields: case_id, type, content." },
      { status: 400 },
    );
  }

  if (!allowedTypes.includes(body.type)) {
    return NextResponse.json({ error: "Invalid submission type." }, { status: 400 });
  }

  if (body.content.trim().length < 10) {
    return NextResponse.json(
      { error: "Content must be at least 10 characters." },
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

  const submissionsTable = supabase.from("submissions") as unknown as {
    insert: (values: {
      case_id: string;
      user_id: string;
      type: SubmissionType;
      content: string;
      source_url: string | null;
      status: "pending";
    }) => PromiseLike<{ error: { message: string } | null }>;
  };

  const { error } = await submissionsTable.insert({
    case_id: body.case_id,
    user_id: auth.actor.id,
    type: body.type,
    content: body.content.trim(),
    source_url: body.source_url?.trim() || null,
    status: "pending",
  });

  if (error) {
    return NextResponse.json(
      { error: `Failed to insert submission: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Submission created successfully. It is now pending review.",
  });
}
