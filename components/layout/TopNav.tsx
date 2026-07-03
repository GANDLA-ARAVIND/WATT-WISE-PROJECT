"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useProfile } from "@/lib/hooks/useProfile";
import { isOnboardingGateResolved, isOnboardingSetupReady } from "@/lib/onboarding";

export function TopNav() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { appliances } = useAppliances();
  const setupReady = isOnboardingSetupReady(profile, appliances);
  const onboardingResolved = isOnboardingGateResolved(profile, appliances);
  const displayName =
    profile?.name?.trim() ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "WattWise user";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm text-muted">Welcome back</div>
        <h1 className="text-xl font-semibold">Energy Command Center</h1>
      </div>

      <div className="flex w-full flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-end md:gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={setupReady ? "/bills" : "/onboarding"}>
              {setupReady ? "Upload bill" : onboardingResolved ? "Complete setup" : "Finish setup"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-full border border-border px-2 py-1 md:border-0 md:px-0 md:py-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/20 text-secondary">
              {initials}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-muted">
                {setupReady ? "Energy workspace active" : onboardingResolved ? "Setup skipped" : "Setup in progress"}
              </div>
            </div>
            <Badge variant={setupReady ? "success" : "info"} className="hidden md:inline-flex">
              {setupReady ? "Ready" : onboardingResolved ? "Skipped" : "Setup"}
            </Badge>
          </Link>
          <LogoutButton className="hidden md:inline-flex" />
        </div>
      </div>
    </header>
  );
}
