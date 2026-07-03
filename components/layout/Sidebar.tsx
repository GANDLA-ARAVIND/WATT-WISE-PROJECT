"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, ChevronRight, CircleDashed } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/lib/navigation";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useBills } from "@/lib/hooks/useBills";
import { useProfile } from "@/lib/hooks/useProfile";
import { isOnboardingSetupReady } from "@/lib/onboarding";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useProfile();
  const { appliances } = useAppliances();
  const { bills, loading: billsLoading } = useBills();
  const setupReady = isOnboardingSetupReady(profile, appliances);
  const hasBills = bills.length > 0;

  useEffect(() => {
    primaryNav.forEach((item) => router.prefetch(item.href));
  }, [router]);

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-background/80 px-5 py-6 md:flex">
      <Logo />

      <div className="mt-8 flex flex-col gap-2">
        {primaryNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-white/5 text-foreground"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.name}
              </span>
              {active && <ChevronRight className="h-4 w-4 text-primary" />}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto rounded-2xl border border-border bg-card/80 p-4">
        <div className="text-xs uppercase text-muted">Workspace Status</div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              {setupReady && hasBills ? "Ready for analysis" : "Setup in progress"}
            </div>
            <div className="text-xs text-muted">
              {setupReady && hasBills
                ? "Your saved data is powering insights."
                : "Complete the next step to improve accuracy."}
            </div>
          </div>
          <Badge variant={setupReady && hasBills ? "success" : "info"}>
            {setupReady && hasBills ? "Ready" : "Open"}
          </Badge>
        </div>
        <div className="mt-4 grid gap-2 rounded-xl bg-background px-3 py-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            {setupReady ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <CircleDashed className="h-4 w-4 text-muted" />
            )}
            <span className="text-foreground">Household setup</span>
          </div>
          <div className="flex items-center gap-2">
            {hasBills ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <CircleDashed className="h-4 w-4 text-muted" />
            )}
            <span className="text-foreground">
              {billsLoading ? "Checking saved bills" : hasBills ? "Bills uploaded" : "First bill needed"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
