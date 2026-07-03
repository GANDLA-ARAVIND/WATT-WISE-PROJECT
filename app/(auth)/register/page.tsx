"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/components/providers/AuthProvider";
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

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectedFrom"));
  const { signUpWithPassword, signInWithGoogle, session, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, router, session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    setError(null);
    setNotice(null);

    if (name.trim().length < 2) {
      setError("Enter your full name.");
      setFormLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Enter a valid email address.");
      setFormLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      setFormLoading(false);
      return;
    }

    const { error: signUpError, session: signUpSession } =
      await signUpWithPassword(
      name,
      email,
      password
    );
    if (signUpError) {
      setError(signUpError);
      setFormLoading(false);
      return;
    }
    if (signUpSession) {
      router.replace(redirectTo);
      return;
    }
    setNotice("Check your email to confirm your account, then sign in.");
    setFormLoading(false);
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
            <CardTitle>Create your WattWise account</CardTitle>
            <p className="text-sm text-muted">
              Start tracking household energy insights instantly.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs text-secondary">
                {notice}
              </div>
            ) : null}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jordan Watts"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={formLoading || googleLoading}
                  autoComplete="name"
                  required
                />
              </div>
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={formLoading || googleLoading}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <Button
                className="w-full"
                disabled={formLoading || googleLoading}
                type="submit"
              >
                {formLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Create account
              </Button>
            </form>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={formLoading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Continue with Google"
              )}
            </Button>
              <div className="text-xs text-muted">
                Already have an account?{" "}
              <Link href={`/login?redirectedFrom=${encodeURIComponent(redirectTo)}`} className="text-secondary">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <RegisterPageContent />
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
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
