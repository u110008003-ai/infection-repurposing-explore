import { NextResponse } from "next/server";
import { getSupabaseServerClientForToken } from "@/lib/supabase";
import { requireRole } from "@/lib/server-auth";
import type { SubmissionStatus } from "@/lib/types";

const allowedStatuses: SubmissionStatus[] = ["pending", "accepted", "rejected"];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole(request, "level_3");

  if (!auth.actor || auth.response) {
    return auth.response ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: SubmissionStatus };

  if (!body.status || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid submission status." }, { status: 400 });
  }

  const supabase = getSupabaseServerClientForToken(auth.actor.access_token);

  if (!supabase) {
    return NextResponse.json(
      { error: "Server is missing Supabase environment settings." },
      { status: 500 },
    );
  }

  const submissionsTable = supabase.from("submissions") as unknown as {
    update: (values: { status: SubmissionStatus }) => {
      eq: (
        column: string,
        value: string,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };

  const { error } = await submissionsTable.update({ status: body.status }).eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: `Failed to update submission status: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Submission status updated to ${body.status}.`,
  });
}
