import { Card, CardContent } from "@/components/ui/card";

export function ContributionCard({
  title,
  percentage,
  detail,
}: {
  title: string;
  percentage: number;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-3xl font-semibold text-foreground">{percentage}%</div>
        <div className="text-xs text-muted">{detail}</div>
      </CardContent>
    </Card>
  );
}
