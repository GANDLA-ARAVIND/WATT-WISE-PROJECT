"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 20,
  disabled = false,
  className
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-border bg-background", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="rounded-r-none px-3"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="min-w-12 px-3 text-center text-sm font-medium">{value}</div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="rounded-l-none px-3"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
