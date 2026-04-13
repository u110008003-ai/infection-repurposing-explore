import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { roleMeetsRequirement } from "@/lib/roles";
import type { ProfileRecord, UserRole } from "@/lib/types";

export type RequestActor = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  access_token: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function authenticateRequest(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      actor: null,
      response: NextResponse.json(
        { error: "Server is missing Supabase environment settings." },
        { status: 500 },
      ),
    };
  }

  const token = getBearerToken(request);

  if (!token) {
    return {
      actor: null,
      response: NextResponse.json(
        {
          code: "auth_token_missing",
          error: "Missing Authorization Bearer token.",
        },
        { status: 401 },
      ),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return {
      actor: null,
      response: NextResponse.json(
        {
          code: "auth_token_invalid",
          error: "Invalid or expired login token. Please sign in again.",
        },
        { status: 401 },
      ),
    };
  }

  const profilesTable = supabase.from("profiles") as unknown as {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        single: () => PromiseLike<{ data: ProfileRecord | null; error: { message: string } | null }>;
      };
    };
  };

  const profileResult = await profilesTable
    .select("id, email, display_name, role, created_at")
    .eq("id", authData.user.id)
    .single();

  if (profileResult.error || !profileResult.data) {
    return {
      actor: null,
      response: NextResponse.json(
        {
          code: "profile_not_found",
          error: "Unable to read your profile role. Please refresh and try again.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    actor: {
      id: profileResult.data.id,
      email: profileResult.data.email,
      display_name: profileResult.data.display_name,
      role: profileResult.data.role,
      access_token: token,
    } satisfies RequestActor,
    response: null,
  };
}

export async function requireRole(request: Request, requiredRole: UserRole) {
  const authResult = await authenticateRequest(request);

  if (!authResult.actor || authResult.response) {
    return authResult;
  }

  if (!roleMeetsRequirement(authResult.actor.role, requiredRole)) {
    return {
      actor: null,
      response: NextResponse.json(
        {
          code: "insufficient_role",
          error: `Insufficient role. This action requires ${requiredRole}.`,
        },
        { status: 403 },
      ),
    };
  }

  return authResult;
}
