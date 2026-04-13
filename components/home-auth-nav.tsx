"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/auth-client";
import type { UserRole } from "@/lib/types";

const roleLabel: Record<UserRole, string> = {
  level_1: "Level 1",
  level_2: "Level 2",
  level_3: "Level 3",
  level_4: "管理端",
};

type AuthMode = "sign-in" | "sign-up";

export function HomeAuthNav() {
  const { session, profile, supabaseAvailable } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!supabase) {
      setFeedback("Supabase 尚未設定完成，暫時無法登入。");
      return;
    }

    startTransition(async () => {
      const normalizedEmail = email.trim();
      const normalizedPassword = password.trim();
      const normalizedName = displayName.trim();

      if (!normalizedEmail || !normalizedPassword) {
        setFeedback("請填寫 email 和密碼。");
        return;
      }

      if (mode === "sign-up") {
        if (normalizedPassword.length < 6) {
          setFeedback("密碼至少需要 6 個字元。");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            data: {
              display_name: normalizedName || normalizedEmail.split("@")[0],
            },
          },
        });

        if (error) {
          setFeedback(`註冊失敗：${error.message}`);
          return;
        }

        setFeedback(data.session ? "註冊成功，已登入。" : "註冊成功，若有開信箱驗證請先完成確認。");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        setFeedback(`登入失敗：${error.message}`);
        return;
      }

      setFeedback("登入成功。");
    });
  }

  function handleSignOut() {
    if (!supabase) {
      return;
    }

    startTransition(async () => {
      await supabase.auth.signOut();
      setFeedback("已登出。");
    });
  }

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full border border-stone-300/80 bg-white/90 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:border-stone-400 hover:text-stone-950">
        <span>{session?.user ? profile?.display_name || session.user.email : "登入 / 註冊"}</span>
        <span className="text-xs text-stone-500 transition group-open:rotate-180">▾</span>
      </summary>

      <div className="absolute right-0 z-20 mt-3 w-[min(92vw,24rem)] rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_24px_60px_-32px_rgba(28,25,23,0.35)]">
        {session?.user ? (
          <div className="grid gap-4">
            <div className="rounded-[1.25rem] bg-stone-950 p-4 text-stone-50">
              <p className="text-sm text-stone-300">目前登入</p>
              <p className="mt-2 text-lg font-semibold">{profile?.display_name || session.user.email}</p>
              <p className="mt-1 text-sm text-stone-300">{session.user.email}</p>
              <span className="mt-4 inline-flex rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-stone-950">
                {roleLabel[profile?.role ?? "level_1"]}
              </span>
            </div>

            <div className="grid gap-2 text-sm leading-7 text-stone-600">
              <p>Level 1：補充證據、指出錯誤、修正推論</p>
              <p>Level 2：提出新題目</p>
              <p>Level 3：整理案件、管理內容、升格結論</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/proposals"
                className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              >
                前往提案池
              </Link>
              {profile?.role && (profile.role === "level_3" || profile.role === "level_4") ? (
                <Link
                  href="/admin/submissions"
                  className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                >
                  submissions 管理
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                登出
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-500">Account</p>
              <h2 className="mt-2 text-xl font-semibold text-stone-950">登入或建立帳號</h2>
            </div>

            <div className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setFeedback(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "sign-in" ? "bg-stone-950 text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                登入
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setFeedback(null);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === "sign-up" ? "bg-stone-950 text-white" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                註冊
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-[1rem] border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-950"
                />
              </label>

              {mode === "sign-up" ? (
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-stone-700">顯示名稱（可選）</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="例如：Alice"
                    className="rounded-[1rem] border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-950"
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">密碼</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "sign-up" ? "至少 6 個字元" : "輸入密碼"}
                  className="rounded-[1rem] border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-950"
                />
              </label>

              <button
                type="submit"
                disabled={isPending || !supabaseAvailable}
                className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {isPending ? "處理中..." : mode === "sign-in" ? "登入" : "建立帳號"}
              </button>
            </form>

            <p className="text-sm leading-7 text-stone-500">
              使用 Email + 密碼登入。這個入口放在右上角，首頁正文會先讓人看案件內容。
            </p>
          </div>
        )}

        {feedback || !supabaseAvailable ? (
          <div className="mt-4 rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-700">
            {feedback ?? "Supabase 尚未設定完成，登入功能暫時無法使用。"}
          </div>
        ) : null}
      </div>
    </details>
  );
}
