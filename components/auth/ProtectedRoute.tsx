"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/AuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      const redirect = encodeURIComponent(pathname ?? "/dashboard");
      router.replace(`/login?redirectedFrom=${redirect}`);
    }
  }, [loading, pathname, router, session]);

  if (loading || !session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
