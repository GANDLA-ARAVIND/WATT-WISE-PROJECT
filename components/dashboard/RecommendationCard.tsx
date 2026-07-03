import {
  AlertTriangle,
  Lightbulb,
  type LucideIcon,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface RecommendationCardProps {
  title: string;
  description: string;
  savings: string;
  priority?: "high" | "medium" | "low";
  category?: string;
  relatedCategory?: string | null;
}

function getRecommendationIcon(category?: string): LucideIcon {
  switch (category) {
    case "Seasonal Recommendation":
      return Waves;
    case "Appliance Optimization":
      return Zap;
    case "Tariff Awareness":
      return ShieldAlert;
    case "Usage Spike Alert":
      return TrendingUp;
    case "Efficiency Improvement":
      return Sparkles;
    default:
      return Lightbulb;
  }
}

export function RecommendationCard({
  title,
  description,
  savings,
  priority = "medium",
  category,
  relatedCategory,
}: RecommendationCardProps) {
  const priorityStyles = {
    high: "border-red-500/30 bg-red-500/10 text-red-200",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    low: "border-primary/30 bg-primary/10 text-primary",
  }[priority];

  const priorityLabel = {
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  }[priority];
  const Icon = getRecommendationIcon(category);

  return (
    <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </div>
          <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyles}`}>
            {priority === "high" ? <AlertTriangle className="mr-1 h-3 w-3" /> : null}
            {priorityLabel}
          </div>
        </div>
        {(category || relatedCategory) ? (
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
            {category ? <span>{category}</span> : null}
            {relatedCategory ? <span>{relatedCategory}</span> : null}
          </div>
        ) : null}
        <p className="text-sm text-muted">{description}</p>
        <div className="flex items-center gap-2 text-xs text-primary">
          <Sparkles className="h-3 w-3" />
          {savings}
        </div>
      </CardContent>
    </Card>
  );
}
