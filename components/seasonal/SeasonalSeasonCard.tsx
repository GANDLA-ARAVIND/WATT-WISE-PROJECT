import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SeasonalSeasonCard({
  season,
  title,
  description
}: {
  season: string;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="info">{season}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted">Estimated seasonal behavior</p>
        <p className="text-sm text-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
