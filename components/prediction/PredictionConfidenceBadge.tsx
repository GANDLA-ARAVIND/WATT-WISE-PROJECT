"use client";

import { Gauge, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PredictionConfidenceBadge({
  level,
}: {
  level: string | null | undefined;
}) {
  const normalized = (level ?? "Low").toLowerCase();

  if (normalized === "high") {
    return (
      <Badge variant="success" className="gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        High confidence
      </Badge>
    );
  }

  if (normalized === "medium") {
    return (
      <Badge variant="info" className="gap-1.5">
        <Gauge className="h-3.5 w-3.5" />
        Medium confidence
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="gap-1.5">
      <ShieldAlert className="h-3.5 w-3.5" />
      Low confidence
    </Badge>
  );
}
