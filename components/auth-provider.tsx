"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/auth-client";
import type { ProfileRecord } from "@/lib/types";

type AuthContextValue = {
  session: Session | null;
  profile: ProfileRecord | null;
  loading: boolean;
  supabaseAvailable: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));

  const syncAndLoadProfile = useEffectEvent(async (userEmail: string, userId: string) => {
    if (!supabase) {
      return;
    }

    const fallbackName = userEmail.split("@")[0] || "new-user";

    const profilesTable = supabase.from("profiles") as unknown as {
      upsert: (
        values: {
          id: string;
          email: string;
          display_name: string;
        },
        options: { onConflict: string },
      ) => PromiseLike<{ error: { message: string } | null }>;
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          single: () => PromiseLike<{ data: ProfileRecord | null; error: { message: string } | null }>;
        };
      };
    };

    await profilesTable.upsert(
      {
        id: userId,
        email: userEmail,
        display_name: fallbackName,
      },
      { onConflict: "id" },
    );

    const { data } = await profilesTable
      .select("id, email, display_name, role, created_at")
      .eq("id", userId)
      .single();

    setProfile(data ?? null);
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null);

      if (data.session?.user) {
        await syncAndLoadProfile(data.session.user.email ?? "", data.session.user.id);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user) {
        void syncAndLoadProfile(nextSession.user.email ?? "", nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        supabaseAvailable: Boolean(supabase),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
