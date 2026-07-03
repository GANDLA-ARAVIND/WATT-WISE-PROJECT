"use client";

import { Building2, Loader2, MapPin, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { HouseholdSummaryCard } from "@/components/household/HouseholdSummaryCard";
import { QuantityStepper } from "@/components/household/QuantityStepper";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useProfile } from "@/lib/hooks/useProfile";
import { applianceCatalog, applianceCategories, houseTypeOptions, stateOptions } from "@/lib/household";
import { validateApplianceQuantities, validateHouseholdProfile } from "@/lib/household-validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { profile, loading, saving, error, saveProfile } = useProfile();
  const {
    appliances,
    loading: appliancesLoading,
    saving: appliancesSaving,
    error: appliancesError,
    saveAppliances
  } = useAppliances();

  const [formState, setFormState] = useState({
    name: "",
    city: "",
    state: "Telangana",
    houseType: "",
    familyMembers: 4,
    roomCount: 3,
    monthlyBudgetGoal: "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [applianceErrors, setApplianceErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [applianceState, setApplianceState] = useState<Record<string, number>>(() =>
    Object.fromEntries(applianceCatalog.map((item) => [item.name, 0]))
  );

  useEffect(() => {
    if (!profile) return;
    setFormState({
      name: profile.name ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "Telangana",
      houseType: profile.house_type ?? "",
      familyMembers: profile.family_members ?? 4,
      roomCount: profile.room_count ?? 3,
      monthlyBudgetGoal: profile.monthly_budget_goal != null ? String(profile.monthly_budget_goal) : "",
    });
  }, [profile]);

  useEffect(() => {
    if (appliances.length === 0) return;
    const nextState = Object.fromEntries(applianceCatalog.map((item) => [item.name, 0]));
    for (const appliance of appliances) {
      nextState[appliance.appliance_name] = appliance.quantity;
    }
    setApplianceState(nextState);
  }, [appliances]);

  const applianceInputs = useMemo(
    () => applianceCatalog.map((item) => ({
      appliance_name: item.name,
      quantity: applianceState[item.name] ?? 0,
      recommended_max: item.recommendedMax
    })),
    [applianceState]
  );

  const householdContextReady = Boolean(
    formState.city.trim() && formState.state.trim() && formState.houseType.trim()
  );

  const handleSaveProfile = async () => {
    const errors = validateHouseholdProfile({
      name: formState.name,
      city: formState.city,
      state: formState.state,
      house_type: formState.houseType,
      family_members: formState.familyMembers,
      room_count: formState.roomCount
    });
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await saveProfile({
      name: formState.name.trim() || null,
      city: formState.city.trim(),
      state: formState.state.trim(),
      house_type: formState.houseType.trim(),
      family_members: formState.familyMembers,
      room_count: formState.roomCount,
      monthly_budget_goal: formState.monthlyBudgetGoal.trim() ? Number(formState.monthlyBudgetGoal) : null,
    });

    if (!result.error) {
      setSaveMessage("Household profile saved.");
    }
  };

  const handleSaveAppliances = async () => {
    const errors = validateApplianceQuantities(applianceInputs);
    setApplianceErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await saveAppliances(applianceInputs);
    if (!result.error) {
      setSaveMessage("Appliance setup saved.");
    }
  };

  const isBusy = loading || saving || appliancesLoading || appliancesSaving;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Household setup"
        description="Configure your home once. WattWise will use this context later for seasonal intelligence and estimated appliance contribution."
      />

      {saveMessage ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {saveMessage}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {appliancesError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{appliancesError}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4 text-primary" /> Household profile
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Keep it simple. Family size, home type, rooms, and location are enough for later energy behavior estimation.
                  </p>
                </div>
                <Badge variant="info">One-time setup</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={formState.city} onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))} />
                  {profileErrors.city ? <div className="text-xs text-red-400">{profileErrors.city}</div> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <div className="flex flex-wrap gap-2">
                    {stateOptions.map((option) => (
                      <Button key={option} type="button" variant={formState.state === option ? "default" : "outline"} size="sm" onClick={() => setFormState((prev) => ({ ...prev, state: option }))}>
                        {option}
                      </Button>
                    ))}
                  </div>
                  {profileErrors.state ? <div className="text-xs text-red-400">{profileErrors.state}</div> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house-type">House type</Label>
                  <div className="flex flex-wrap gap-2">
                    {houseTypeOptions.map((option) => (
                      <Button key={option} type="button" variant={formState.houseType === option ? "default" : "outline"} size="sm" onClick={() => setFormState((prev) => ({ ...prev, houseType: option }))}>
                        {option}
                      </Button>
                    ))}
                  </div>
                  {profileErrors.house_type ? <div className="text-xs text-red-400">{profileErrors.house_type}</div> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-secondary" /> Family members</div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-muted">How many people live here?</p>
                    <Badge>{String(formState.familyMembers)}</Badge>
                  </div>
                  <input className="mt-4 w-full accent-[hsl(var(--primary))]" type="range" min={1} max={10} value={formState.familyMembers} onChange={(event) => setFormState((prev) => ({ ...prev, familyMembers: Number(event.target.value) }))} />
                  {profileErrors.family_members ? <div className="mt-2 text-xs text-red-400">{profileErrors.family_members}</div> : null}
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-secondary" /> Room count</div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-muted">How many rooms are in regular use?</p>
                    <Badge>{String(formState.roomCount)}</Badge>
                  </div>
                  <input className="mt-4 w-full accent-[hsl(var(--primary))]" type="range" min={1} max={10} value={formState.roomCount} onChange={(event) => setFormState((prev) => ({ ...prev, roomCount: Number(event.target.value) }))} />
                  {profileErrors.room_count ? <div className="mt-2 text-xs text-red-400">{profileErrors.room_count}</div> : null}
                </div>
                <div className="rounded-2xl border border-border bg-background p-4 md:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-secondary" /> Monthly budget goal</div>
                  <p className="mt-2 text-sm text-muted">Optional. WattWise can warn you when the predicted next bill may exceed this target.</p>
                  <div className="mt-4 max-w-xs space-y-2">
                    <Label htmlFor="budget-goal">Budget goal</Label>
                    <Input
                      id="budget-goal"
                      type="number"
                      min={0}
                      step="50"
                      placeholder="2000"
                      value={formState.monthlyBudgetGoal}
                      onChange={(event) => setFormState((prev) => ({ ...prev, monthlyBudgetGoal: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save household profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" /> Appliance setup
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Quantity only. WattWise will estimate behavior later using season, family size, room count, and bill data.
                  </p>
                </div>
                <Badge variant="success">Low effort</Badge>
              </div>

              {applianceCategories.map((category) => (
                <div key={category} className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-muted">{category}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {applianceCatalog.filter((item) => item.category === category).map((item) => (
                      <div key={item.name} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">{item.name}</div>
                            <div className="mt-1 text-xs text-muted">{item.description}</div>
                          </div>
                          <QuantityStepper
                            value={applianceState[item.name] ?? 0}
                            max={item.recommendedMax}
                            onChange={(value) => {
                              setSaveMessage(null);
                              setApplianceState((prev) => ({ ...prev, [item.name]: value }));
                            }}
                          />
                        </div>
                        {applianceErrors[item.name] ? <div className="mt-2 text-xs text-red-400">{applianceErrors[item.name]}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button onClick={handleSaveAppliances} disabled={appliancesLoading || appliancesSaving || !householdContextReady}>
                  {appliancesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save appliance setup
                </Button>
              </div>
              {!householdContextReady ? <div className="text-xs text-amber-300">Complete city, state, and house type first so the appliance setup has household context.</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <HouseholdSummaryCard profile={profile} appliances={appliances} />

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="text-sm font-semibold">Why this matters</div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                WattWise will later combine season, family size, room count, appliance count, and electricity bill trends to estimate likely household energy behavior.
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                No appliance hours, schedules, or electrical ratings are required from users during setup.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="text-sm font-semibold">Account</div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-secondary" />
                  Editable household setup
                </div>
                <Badge variant="success">Ready</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
                <span>Signed in</span>
                <LogoutButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
