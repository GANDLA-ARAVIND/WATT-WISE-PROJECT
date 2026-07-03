import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SeasonalInsightCard({
  title,
  message,
  tone = "info"
}: {
  title: string;
  message: string;
  tone?: string;
}) {
  const variant = tone === "warning" ? "warning" : "info";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={variant}>{tone === "warning" ? "Watch" : "Seasonal"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">{message}</p>
      </CardContent>
    </Card>
  );
}
