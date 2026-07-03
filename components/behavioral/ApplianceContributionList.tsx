import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplianceContribution } from "@/lib/hooks/useBehavioralEstimation";

export function ApplianceContributionList({
  items,
}: {
  items: ApplianceContribution[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated appliance contribution</CardTitle>
        <p className="text-sm text-muted">
          Estimated contribution only, based on household context and seasonal behavior assumptions.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.slice(0, 5).map((item) => (
            <div key={item.appliance_name} className="rounded-2xl border border-border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.appliance_name}</div>
                  <div className="text-xs text-muted">{item.category} · {item.quantity} installed</div>
                </div>
                <div className="text-sm font-semibold text-foreground">{item.estimated_percentage}%</div>
              </div>
              <div className="mt-2 text-sm text-muted">{item.estimated_reason}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Add appliances in household setup to unlock estimated contribution detail.</p>
        )}
      </CardContent>
    </Card>
  );
}
