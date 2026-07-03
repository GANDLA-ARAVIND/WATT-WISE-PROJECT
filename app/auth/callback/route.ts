import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const authSupabaseUrl: string = supabaseUrl;
const authSupabaseAnonKey: string = supabaseAnonKey;

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value.startsWith("/auth") || value.startsWith("/login") || value.startsWith("/register")) {
    return "/dashboard";
  }

  return value.startsWith("/onboarding") ? "/dashboard" : value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(authSupabaseUrl, authSupabaseAnonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options });
        }
      }
    });

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, origin));
}
