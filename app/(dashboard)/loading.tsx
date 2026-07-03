import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="surface-fade space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr]">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-5 h-72 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <Skeleton className="h-6 w-36" />
          <div className="mt-5 space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
