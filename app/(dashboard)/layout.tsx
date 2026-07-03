import { MandatoryOnboardingGate } from "@/components/auth/MandatoryOnboardingGate";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex w-full min-w-0 flex-col">
        <TopNav />
        <main className="min-w-0 flex-1 space-y-8 overflow-x-hidden px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:pb-10">
          <ProtectedRoute>
            <MandatoryOnboardingGate>{children}</MandatoryOnboardingGate>
          </ProtectedRoute>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
