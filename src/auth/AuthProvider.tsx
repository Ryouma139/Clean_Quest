import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialAuthLinkError, supabase } from "../lib/supabase";

export interface SignUpResult {
  /** true ならメール確認待ち（Supabase の「Confirm email」が有効な場合） */
  needsEmailConfirmation: boolean;
}

/** 確認メールのリンクから戻ってきたときのエラー（URL の #error=... / ?error=...） */
export interface AuthLinkError {
  code: string;
  description: string;
}

interface AuthContextValue {
  session: Session | null;
  /** 初回のセッション復元が終わったか */
  ready: boolean;
  /** 確認メールのリンクのエラー（無ければ null） */
  linkError: AuthLinkError | null;
  clearLinkError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  /** 確認メールを再送する */
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  // URL のエラーは Supabase クライアント作成前に読み取ってある（lib/supabase.ts）
  const [linkError, setLinkError] = useState<AuthLinkError | null>(initialAuthLinkError);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      linkError,
      clearLinkError: () => setLinkError(null),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // 既に登録済みのメールの場合、Supabase は identities が空のユーザーを返す
        if (data.user && data.user.identities?.length === 0) throw new Error("User already registered");
        return { needsEmailConfirmation: !data.session };
      },
      async resendConfirmation(email) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, ready, linkError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
