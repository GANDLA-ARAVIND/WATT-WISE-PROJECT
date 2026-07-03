import { Badge } from "@/components/ui/badge";

export function EstimatedAnalysisBadge({
  label = "Estimated Analysis",
}: {
  label?: string;
}) {
  return <Badge variant="info">{label}</Badge>;
}
