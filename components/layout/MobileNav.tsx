"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { primaryNav } from "@/lib/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    primaryNav.forEach((item) => router.prefetch(item.href));
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur shadow-[0_-12px_30px_rgba(15,23,42,0.35)] md:hidden">
      <div className="grid grid-cols-3 gap-2">
        {primaryNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch
              onTouchStart={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] leading-tight transition",
                active
                  ? "bg-white/10 text-primary"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
