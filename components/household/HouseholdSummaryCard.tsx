"use client";

import { Home, MapPin, Users } from "lucide-react";

import type { UserProfile } from "@/lib/hooks/useProfile";
import type { ApplianceRecord } from "@/lib/hooks/useAppliances";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HouseholdSummaryCard({
  profile,
  appliances,
  compact = false
}: {
  profile: UserProfile | null;
  appliances: ApplianceRecord[];
  compact?: boolean;
}) {
  const activeAppliances = appliances.filter((item) => item.quantity > 0);

  return (
    <Card>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle>{compact ? "Household summary" : "Household context summary"}</CardTitle>
        <p className="text-sm text-muted">
          This setup powers future seasonal intelligence, appliance contribution estimates, and personalized recommendations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted"><Users className="h-4 w-4" /> Family</div>
            <div className="mt-2 text-sm font-semibold">{profile?.family_members ?? "--"} members</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted"><Home className="h-4 w-4" /> Home</div>
            <div className="mt-2 text-sm font-semibold">{profile?.house_type ?? "--"}</div>
            <div className="text-xs text-muted">{profile?.room_count ?? "--"} rooms</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted"><MapPin className="h-4 w-4" /> Location</div>
            <div className="mt-2 text-sm font-semibold">
              {profile?.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}` : "--"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">Installed appliances</div>
          <div className="flex flex-wrap gap-2">
            {activeAppliances.length > 0 ? activeAppliances.map((item) => (
              <Badge key={item.id || item.appliance_name} variant="info">
                {item.quantity} {item.appliance_name}
              </Badge>
            )) : <span className="text-sm text-muted">No appliances configured yet.</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
