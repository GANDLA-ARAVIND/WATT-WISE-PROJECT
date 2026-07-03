"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabaseBrowser } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{
    error: string | null;
  }>;
  signUpWithPassword: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null; session: Session | null }>;
  signInWithGoogle: (redirectTo: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => supabaseBrowser(), []);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.user) {
        setSession(null);
        setLoading(false);
        void supabase.auth.signOut({ scope: "local" });
        return;
      }

      supabase.auth.getSession().then(({ data: sessionData }) => {
        if (!mounted) return;
        setSession(sessionData.session ?? null);
        setLoading(false);
      });
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!nextSession) {
          setSession(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          setSession(null);
          await supabase.auth.signOut({ scope: "local" });
          setLoading(false);
          return;
        }

        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithPassword = React.useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { error: "Enter your email and password to continue." };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signUpWithPassword = React.useCallback(
    async (name: string, email: string, password: string) => {
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedName.length < 2) {
        return { error: "Enter your full name.", session: null };
      }

      if (!normalizedEmail) {
        return { error: "Enter a valid email address.", session: null };
      }

      if (password.length < 8) {
        return { error: "Use at least 8 characters for your password.", session: null };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name: normalizedName },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { error: error?.message ?? null, session: data.session ?? null };
    },
    [supabase]
  );

  const signInWithGoogle = React.useCallback(
    async (redirectTo: string) => {
      const nextUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        redirectTo
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: nextUrl }
      });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, [supabase]);

  const value = React.useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut
    }),
    [loading, session, signInWithPassword, signInWithGoogle, signOut, signUpWithPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
