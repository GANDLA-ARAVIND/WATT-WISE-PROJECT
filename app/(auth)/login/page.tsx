"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value.startsWith("/auth") || value.startsWith("/login") || value.startsWith("/register")) {
    return "/dashboard";
  }

  return value.startsWith("/onboarding") ? "/dashboard" : value;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectedFrom"));
  const { signInWithPassword, signInWithGoogle, session, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, router, session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      setFormLoading(false);
      return;
    }

    const { error: signInError } = await signInWithPassword(email, password);
    if (signInError) {
      setError(signInError);
      setFormLoading(false);
      return;
    }

    router.replace(redirectTo);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error: googleError } = await signInWithGoogle(redirectTo);
    if (googleError) {
      setError(googleError);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <Logo />
        <Card>
          <CardHeader>
            <CardTitle>Sign in to WattWise</CardTitle>
            <p className="text-sm text-muted">
              Pick up where your household workspace left off.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@wattwise.ai"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={formLoading || googleLoading}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={formLoading || googleLoading}
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button className="w-full" disabled={formLoading || googleLoading} type="submit">
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continue
              </Button>
            </form>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={formLoading || googleLoading}
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue with Google"}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted">
              <span>Forgot password?</span>
              <Link href={`/register?redirectedFrom=${encodeURIComponent(redirectTo)}`} className="text-secondary">
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <Skeleton className="h-10 w-36" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
