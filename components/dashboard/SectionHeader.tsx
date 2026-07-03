import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
  actionDisabled = false
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {actionLabel ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
          type="button"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
