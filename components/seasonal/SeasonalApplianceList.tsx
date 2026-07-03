import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SeasonalApplianceList({
  items
}: {
  items: Array<{
    appliance_name: string;
    quantity: number;
    season_weight: number;
    season_reason: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contextual appliance behavior</CardTitle>
        <p className="text-sm text-muted">Probable seasonal appliance influence based on inventory and current bill context.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? items.map((item) => (
          <div key={item.appliance_name} className="rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{item.appliance_name}</div>
              <div className="text-xs text-muted">{item.quantity} installed</div>
            </div>
            <div className="mt-2 text-sm text-muted">{item.season_reason}</div>
          </div>
        )) : <p className="text-sm text-muted">Add appliances in household setup to unlock more seasonal context.</p>}
      </CardContent>
    </Card>
  );
}
