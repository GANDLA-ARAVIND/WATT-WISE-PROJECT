import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  helper: string;
}

export function StatCard({ label, value, change, trend, helper }: StatCardProps) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="text-sm text-muted">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1",
              trend === "up"
                ? "bg-primary/15 text-primary"
                : "bg-secondary/15 text-secondary"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {change}
          </span>
          <span className="text-muted">{helper}</span>
        </div>
      </CardContent>
    </Card>
  );
}
