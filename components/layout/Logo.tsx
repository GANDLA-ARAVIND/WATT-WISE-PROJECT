import { Zap } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-lg font-semibold">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Zap className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <div>WattWise</div>
        <div className="text-xs font-normal text-muted">Energy Intelligence</div>
      </div>
    </div>
  );
}
