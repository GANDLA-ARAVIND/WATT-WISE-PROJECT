"use client";

import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Home, Loader2, Sparkles, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { QuantityStepper } from "@/components/household/QuantityStepper";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useProfile } from "@/lib/hooks/useProfile";
import { applianceCatalog, applianceCategories, houseTypeOptions, stateOptions } from "@/lib/household";
import { validateApplianceQuantities, validateHouseholdProfile } from "@/lib/household-validation";
import { isOnboardingGateResolved } from "@/lib/onboarding";

const setupSteps = [
  { id: "profile", title: "Home profile", helper: "Family, home type, location" },
  { id: "appliances", title: "Appliances", helper: "Add counts once" },
] as const;

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/bills";
  }

  if (value.startsWith("/auth") || value.startsWith("/login") || value.startsWith("/register")) {
    return "/bills";
  }

  return value;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get("next"));
  const { profile, loading, saving, saveProfile } = useProfile();
  const {
    appliances,
    loading: appliancesLoading,
    saving: appliancesSaving,
    saveAppliances,
  } = useAppliances();

  const [activeStep, setActiveStep] = useState(0);
  const [formState, setFormState] = useState({
    city: "",
    state: "Telangana",
    houseType: "",
    familyMembers: 4,
    roomCount: 3,
  });
  const [applianceState, setApplianceState] = useState<Record<string, number>>(
    () => Object.fromEntries(applianceCatalog.map((item) => [item.name, 0])),
  );
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [applianceErrors, setApplianceErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [skipLoading, setSkipLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFormState({
      city: profile.city ?? "",
      state: profile.state ?? "Telangana",
      houseType: profile.house_type ?? "",
      familyMembers: profile.family_members ?? 4,
      roomCount: profile.room_count ?? 3,
    });
  }, [profile]);

  useEffect(() => {
    if (!appliances.length) return;
    const nextState = Object.fromEntries(applianceCatalog.map((item) => [item.name, 0]));
    for (const appliance of appliances) {
      nextState[appliance.appliance_name] = appliance.quantity;
    }
    setApplianceState(nextState);
  }, [appliances]);

  useEffect(() => {
    if (!loading && !appliancesLoading && isOnboardingGateResolved(profile, appliances)) {
      router.replace(next);
    }
  }, [appliances, appliancesLoading, loading, next, profile, router]);

  const applianceInputs = useMemo(
    () =>
      applianceCatalog.map((item) => ({
        appliance_name: item.name,
        quantity: applianceState[item.name] ?? 0,
        recommended_max: item.recommendedMax,
      })),
    [applianceState],
  );

  const busy = loading || appliancesLoading || saving || appliancesSaving;

  const validateProfileStep = () => {
    const nextProfileErrors = validateHouseholdProfile({
      city: formState.city,
      state: formState.state,
      house_type: formState.houseType,
      family_members: formState.familyMembers,
      room_count: formState.roomCount,
    });
    setProfileErrors(nextProfileErrors);
    return Object.keys(nextProfileErrors).length === 0;
  };

  const validateApplianceStep = () => {
    const nextApplianceErrors = validateApplianceQuantities(applianceInputs);
    setApplianceErrors(nextApplianceErrors);
    return Object.keys(nextApplianceErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateProfileStep()) return;
    setActiveStep(1);
  };

  const handleFinish = async () => {
    const profileValid = validateProfileStep();
    const appliancesValid = validateApplianceStep();
    if (!profileValid || !appliancesValid) return;

    const profileResult = await saveProfile({
      city: formState.city.trim(),
      state: formState.state.trim(),
      house_type: formState.houseType.trim(),
      family_members: formState.familyMembers,
      room_count: formState.roomCount,
      onboarding_completed_at: new Date().toISOString(),
    });
    if (profileResult.error) return;

    const applianceResult = await saveAppliances(applianceInputs);
    if (applianceResult.error) return;

    setMessage("Setup complete. Opening the bill workspace...");
    router.replace(next);
  };

  const handleSkip = async () => {
    setSkipLoading(true);
    setMessage(null);

    const result = await saveProfile({
      onboarding_skipped_at: new Date().toISOString(),
    });

    if (result.error) {
      setMessage(result.error);
      setSkipLoading(false);
      return;
    }

    router.replace(next);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <SectionHeader
        title="One-time household setup"
        description="Set up the home once, then go straight to bill upload."
        actionLabel="Skip for now"
        actionLoading={skipLoading}
        actionDisabled={busy}
        onAction={() => void handleSkip()}
      />

      {message ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{message}</div>
      ) : null}

      <Card className="surface-fade overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_34%),linear-gradient(180deg,#111827_0%,#0B1220_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.34)]">
        <CardContent className="space-y-8 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="info">Guided setup</Badge>
              <div className="space-y-2">
                <div className="text-2xl font-semibold text-foreground sm:text-3xl">Complete setup, then upload the first bill.</div>
                <p className="max-w-2xl text-sm leading-6 text-muted">
                  This step improves analysis quality without slowing the user down. It only asks for the context WattWise actually needs.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground">
              Step {activeStep + 1} of {setupSteps.length}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {setupSteps.map((step, index) => {
              const active = activeStep === index;
              const complete = activeStep > index;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    active
                      ? "border-primary/40 bg-primary/10"
                      : complete
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{step.title}</div>
                      <div className="mt-1 text-xs text-muted">{step.helper}</div>
                    </div>
                    {complete ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <span className="text-xs text-muted">0{index + 1}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <Card className="pop-in-scale border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardContent className="space-y-6 pt-6">
                {activeStep === 0 ? (
                  <>
                    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Home className="h-4 w-4 text-primary" />
                        Household basics
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Add the home context once so WattWise can interpret bills more realistically.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={formState.city} onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))} />
                        {profileErrors.city ? <div className="text-xs text-red-400">{profileErrors.city}</div> : null}
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <div className="flex flex-wrap gap-2">
                          {stateOptions.map((option) => (
                            <Button key={option} type="button" size="sm" variant={formState.state === option ? "default" : "outline"} onClick={() => setFormState((prev) => ({ ...prev, state: option }))}>
                              {option}
                            </Button>
                          ))}
                        </div>
                        {profileErrors.state ? <div className="text-xs text-red-400">{profileErrors.state}</div> : null}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>House type</Label>
                        <div className="flex flex-wrap gap-2">
                          {houseTypeOptions.map((option) => (
                            <Button key={option} type="button" size="sm" variant={formState.houseType === option ? "default" : "outline"} onClick={() => setFormState((prev) => ({ ...prev, houseType: option }))}>
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
                          <p className="text-sm text-muted">People in the household</p>
                          <Badge>{String(formState.familyMembers)}</Badge>
                        </div>
                        <input className="mt-4 w-full accent-[hsl(var(--primary))]" type="range" min={1} max={10} value={formState.familyMembers} onChange={(event) => setFormState((prev) => ({ ...prev, familyMembers: Number(event.target.value) }))} />
                        {profileErrors.family_members ? <div className="mt-2 text-xs text-red-400">{profileErrors.family_members}</div> : null}
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-secondary" /> Active rooms</div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm text-muted">Rooms used regularly</p>
                          <Badge>{String(formState.roomCount)}</Badge>
                        </div>
                        <input className="mt-4 w-full accent-[hsl(var(--primary))]" type="range" min={1} max={10} value={formState.roomCount} onChange={(event) => setFormState((prev) => ({ ...prev, roomCount: Number(event.target.value) }))} />
                        {profileErrors.room_count ? <div className="mt-2 text-xs text-red-400">{profileErrors.room_count}</div> : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Appliance setup
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Add only quantities. WattWise uses these counts for contribution estimates, recommendations, and forecasts.
                      </p>
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
                                  onChange={(value) => setApplianceState((prev) => ({ ...prev, [item.name]: value }))}
                                />
                              </div>
                              {applianceErrors[item.name] ? <div className="mt-2 text-xs text-red-400">{applianceErrors[item.name]}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="flex flex-wrap justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={skipLoading || busy}
                    onClick={() => activeStep === 0 ? void handleSkip() : setActiveStep(0)}
                  >
                    {activeStep === 0 ? (
                      <>
                        {skipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Skip for now
                      </>
                    ) : (
                      <><ArrowLeft className="h-4 w-4" /> Back</>
                    )}
                  </Button>

                  {activeStep === 0 ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => void handleFinish()} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Continue to bill upload
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="pop-in-scale border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]" style={{ animationDelay: "120ms" }}>
                <CardContent className="space-y-4 pt-6">
                  <div className="text-sm font-semibold">What this unlocks</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    Better seasonal analysis
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    More believable appliance estimates
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    Stronger bill forecasts and recommendations
                  </div>
                </CardContent>
              </Card>

              <Card className="pop-in-scale border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]" style={{ animationDelay: "200ms" }}>
                <CardContent className="space-y-4 pt-6">
                  <div className="text-sm font-semibold">What happens next</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    After setup, WattWise opens the Bills workspace automatically so the first bill can be uploaded right away.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
