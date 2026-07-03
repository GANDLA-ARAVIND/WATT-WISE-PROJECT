"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Home,
  Loader2,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { QuantityStepper } from "@/components/household/QuantityStepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useProfile } from "@/lib/hooks/useProfile";
import { applianceCatalog, applianceCategories, houseTypeOptions, stateOptions } from "@/lib/household";
import { validateApplianceQuantities, validateHouseholdProfile } from "@/lib/household-validation";
import { isOnboardingGateResolved, isOnboardingSetupReady } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const steps = [
  { id: "welcome", title: "Welcome", helper: "Personalize your workspace" },
  { id: "household", title: "Household", helper: "Home and location" },
  { id: "appliances", title: "Appliances", helper: "Equipment counts" },
  { id: "review", title: "Review", helper: "Confirm setup" },
] as const;

type WizardStep = (typeof steps)[number]["id"];

function getStepIndex(step: WizardStep) {
  return steps.findIndex((item) => item.id === step);
}

function StateCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const filteredOptions = stateOptions.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls="state-options"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filteredOptions[0]) {
              event.preventDefault();
              onChange(filteredOptions[0]);
              setQuery(filteredOptions[0]);
              setOpen(false);
            }
          }}
          className="pl-9 pr-9"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>

      {open ? (
        <div
          id="state-options"
          role="listbox"
          className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-[#0B1220] p-1 shadow-[0_18px_44px_rgba(0,0,0,0.32)]"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={value === option}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/5",
                  value === option ? "text-primary" : "text-foreground",
                )}
                onClick={() => {
                  onChange(option);
                  setQuery(option);
                  setOpen(false);
                }}
              >
                {option}
                {value === option ? <Check className="h-4 w-4" /> : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted">No matching states</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MandatoryOnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading: profileLoading, saving: profileSaving, saveProfile } = useProfile();
  const {
    appliances,
    loading: appliancesLoading,
    saving: appliancesSaving,
    saveAppliances,
  } = useAppliances();
  const [activeStep, setActiveStep] = useState<WizardStep>("welcome");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [applianceErrors, setApplianceErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [lastSavedStep, setLastSavedStep] = useState<WizardStep | null>(null);
  const [success, setSuccess] = useState(false);
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
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

  const loading = profileLoading || appliancesLoading;
  const setupComplete = isOnboardingSetupReady(profile, appliances);
  const gateResolved = isOnboardingGateResolved(profile, appliances);
  const busy = loading || profileSaving || appliancesSaving || success;
  const currentIndex = getStepIndex(activeStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

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
    const nextState = Object.fromEntries(applianceCatalog.map((item) => [item.name, 0]));
    for (const appliance of appliances) {
      nextState[appliance.appliance_name] = appliance.quantity;
    }
    setApplianceState(nextState);
  }, [appliances]);

  useEffect(() => {
    if (!loading && gateResolved && pathname === "/onboarding") {
      router.replace("/dashboard");
    }
  }, [gateResolved, loading, pathname, router]);

  useEffect(() => {
    if (!gateResolved) {
      window.setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [activeStep, gateResolved]);

  useEffect(() => {
    if (gateResolved) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const appShell = appShellRef.current;
    appShell?.setAttribute("inert", "");

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      appShell?.removeAttribute("inert");
    };
  }, [gateResolved]);

  const applianceInputs = useMemo(
    () =>
      applianceCatalog.map((item) => ({
        appliance_name: item.name,
        quantity: applianceState[item.name] ?? 0,
        recommended_max: item.recommendedMax,
      })),
    [applianceState],
  );

  const selectedApplianceCount = applianceInputs.filter((item) => item.quantity > 0).length;
  const totalApplianceQuantity = applianceInputs.reduce((sum, item) => sum + item.quantity, 0);

  const saveProfileStep = async () => {
    const nextErrors = validateHouseholdProfile({
      city: formState.city,
      state: formState.state,
      house_type: formState.houseType,
      family_members: formState.familyMembers,
      room_count: formState.roomCount,
    });
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const result = await saveProfile({
      city: formState.city.trim(),
      state: formState.state.trim(),
      house_type: formState.houseType.trim(),
      family_members: formState.familyMembers,
      room_count: formState.roomCount,
    });
    if (result.error) {
      setError(result.error);
      return false;
    }
    setLastSavedStep("household");
    setError(null);
    return true;
  };

  const saveApplianceStep = async () => {
    const nextApplianceErrors = validateApplianceQuantities(applianceInputs);
    setApplianceErrors(nextApplianceErrors);
    if (Object.keys(nextApplianceErrors).length > 0) return false;

    if (!applianceInputs.some((item) => item.quantity > 0)) {
      setApplianceErrors({ _form: "Add at least one appliance to complete setup." });
      return false;
    }

    const applianceResult = await saveAppliances(applianceInputs);
    if (applianceResult.error) {
      setError(applianceResult.error);
      return false;
    }
    setLastSavedStep("appliances");
    setError(null);
    return true;
  };

  const goBack = () => {
    if (activeStep === "review") setActiveStep("appliances");
    if (activeStep === "appliances") setActiveStep("household");
    if (activeStep === "household") setActiveStep("welcome");
  };

  const goNext = async () => {
    if (activeStep === "welcome") {
      setActiveStep("household");
      return;
    }

    if (activeStep === "household") {
      const saved = await saveProfileStep();
      if (saved) setActiveStep("appliances");
      return;
    }

    if (activeStep === "appliances") {
      const saved = await saveApplianceStep();
      if (saved) setActiveStep("review");
      return;
    }

    const profileSaved = await saveProfileStep();
    const appliancesSaved = await saveApplianceStep();
    if (!profileSaved || !appliancesSaved) return;

    const profileResult = await saveProfile({
      city: formState.city.trim(),
      state: formState.state.trim(),
      house_type: formState.houseType.trim(),
      family_members: formState.familyMembers,
      room_count: formState.roomCount,
      onboarding_completed_at: new Date().toISOString(),
    });
    if (profileResult.error) {
      setError(profileResult.error);
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      router.replace("/dashboard");
    }, 1200);
  };

  const skipOnboarding = async () => {
    setError(null);
    const result = await saveProfile({
      onboarding_skipped_at: new Date().toISOString(),
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace(pathname === "/onboarding" ? "/dashboard" : pathname ?? "/dashboard");
  };

  const actionLabel = activeStep === "review" ? "Finish setup" : activeStep === "welcome" ? "Get started" : "Next";
  const canGoBack = activeStep !== "welcome" && !busy;

  return (
    <>
      <div
        ref={appShellRef}
        className={cn(
          gateResolved ? undefined : "pointer-events-none select-none blur-[1.5px] transition",
          success ? "opacity-70" : undefined,
        )}
        aria-hidden={!gateResolved}
      >
        {children}
      </div>

      {!gateResolved ? (
        <div className="fixed inset-0 z-50 flex h-dvh w-screen items-center justify-center overflow-hidden bg-[#030712]/78 p-3 backdrop-blur-md sm:p-5">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="mandatory-onboarding-title"
            className="flex h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-[1000px] overflow-hidden rounded-3xl border-white/10 bg-[#0B1220]/95 shadow-[0_32px_90px_rgba(0,0,0,0.52)] sm:h-[min(760px,calc(100dvh-2.5rem))]"
          >
            <CardContent className="min-h-0 w-full p-0">
              <div className="grid h-full min-h-0 lg:grid-cols-[300px,1fr]">
                <aside className="hidden border-r border-white/8 bg-white/[0.025] px-6 py-7 lg:block">
                  <div className="flex h-full flex-col">
                    <div>
                      <Badge variant="info">First-time setup</Badge>
                      <div className="mt-5 text-xl font-semibold text-foreground">WattWise</div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        A few details help personalize every estimate and recommendation.
                      </p>
                    </div>

                    <div className="mt-9 space-y-4">
                      {steps.map((step, index) => {
                        const complete = index < currentIndex || success;
                        const active = index === currentIndex && !success;
                        return (
                          <div key={step.id} className="flex gap-3">
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition",
                                complete
                                  ? "border-primary/40 bg-primary text-background"
                                  : active
                                    ? "border-primary/50 bg-primary/10 text-primary"
                                    : "border-white/12 bg-white/[0.03] text-muted",
                              )}
                            >
                              {complete ? <Check className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="pb-5">
                              <div className={cn("text-sm font-semibold", active ? "text-foreground" : "text-muted")}>
                                {step.title}
                              </div>
                              <div className="mt-1 text-xs text-muted">{step.helper}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-muted">
                      <div className="font-medium text-foreground">Estimated setup time</div>
                      <div className="mt-1">About 2 minutes</div>
                    </div>
                  </div>
                </aside>

                <section className="flex min-h-0 flex-col">
                  <div className="border-b border-white/8 px-5 py-5 sm:px-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted">
                          Step {currentIndex + 1} of {steps.length}
                        </div>
                        <h2
                          ref={titleRef}
                          tabIndex={-1}
                          id="mandatory-onboarding-title"
                          className="mt-2 text-2xl font-semibold leading-tight text-foreground outline-none sm:text-3xl"
                        >
                          {success
                            ? "Your workspace is ready."
                            : activeStep === "welcome"
                              ? "Welcome to WattWise"
                              : activeStep === "household"
                                ? "Household information"
                                : activeStep === "appliances"
                                  ? "Appliances"
                                  : "Review and finish"}
                        </h2>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void skipOnboarding()}
                      >
                        Skip for now
                      </Button>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: success ? "100%" : `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8">
                    {loading ? (
                      <div className="flex min-h-[380px] items-center justify-center text-sm text-muted">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparing setup...
                      </div>
                    ) : success ? (
                      <div className="surface-fade flex min-h-[420px] flex-col items-center justify-center text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
                          <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div className="mt-6 text-2xl font-semibold text-foreground">Your workspace is ready.</div>
                        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                          Opening your dashboard with personalized bill intelligence.
                        </p>
                      </div>
                    ) : activeStep === "welcome" ? (
                      <div className="surface-fade flex min-h-[420px] flex-col justify-center">
                        <div className="max-w-2xl">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/12 text-primary">
                            <Sparkles className="h-7 w-7" />
                          </div>
                          <h3 className="mt-7 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                            Let&apos;s personalize your workspace.
                          </h3>
                          <p className="mt-5 text-base leading-7 text-muted">
                            We&apos;ll use your household information and appliances to generate accurate bill predictions,
                            appliance estimates, seasonal analysis, and personalized recommendations.
                          </p>
                          <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            {[
                              ["Bill forecasts", "Estimate what may happen next."],
                              ["Appliance estimates", "Understand likely usage drivers."],
                              ["Recommendations", "Prioritize practical savings actions."],
                            ].map(([title, helper]) => (
                              <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                <div className="text-sm font-semibold text-foreground">{title}</div>
                                <div className="mt-2 text-xs leading-5 text-muted">{helper}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : activeStep === "household" ? (
                      <div className="surface-fade space-y-7">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Home className="h-4 w-4 text-primary" />
                            Home context
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                            These details calibrate usage estimates for your home size and location.
                          </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="onboarding-city">City</Label>
                            <Input
                              id="onboarding-city"
                              value={formState.city}
                              onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                            />
                            {profileErrors.city ? <div className="text-xs text-red-400">{profileErrors.city}</div> : null}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="onboarding-state">State</Label>
                            <StateCombobox
                              value={formState.state}
                              onChange={(value) => setFormState((prev) => ({ ...prev, state: value }))}
                            />
                            {profileErrors.state ? <div className="text-xs text-red-400">{profileErrors.state}</div> : null}
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>House type</Label>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {houseTypeOptions.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className={cn(
                                    "rounded-2xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60",
                                    formState.houseType === option
                                      ? "border-primary/40 bg-primary/10 text-foreground"
                                      : "border-border bg-background text-muted hover:bg-white/5 hover:text-foreground",
                                  )}
                                  onClick={() => setFormState((prev) => ({ ...prev, houseType: option }))}
                                >
                                  <span className="flex items-center justify-between gap-3">
                                    {option}
                                    {formState.houseType === option ? <Check className="h-4 w-4 text-primary" /> : null}
                                  </span>
                                </button>
                              ))}
                            </div>
                            {profileErrors.house_type ? <div className="text-xs text-red-400">{profileErrors.house_type}</div> : null}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-background p-5">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Users className="h-4 w-4 text-secondary" />
                              Family members
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <p className="text-sm text-muted">People in the household</p>
                              <Badge>{String(formState.familyMembers)}</Badge>
                            </div>
                            <input
                              className="mt-5 w-full accent-[hsl(var(--primary))]"
                              type="range"
                              min={1}
                              max={10}
                              value={formState.familyMembers}
                              onChange={(event) => setFormState((prev) => ({ ...prev, familyMembers: Number(event.target.value) }))}
                            />
                            {profileErrors.family_members ? <div className="mt-2 text-xs text-red-400">{profileErrors.family_members}</div> : null}
                          </div>

                          <div className="rounded-2xl border border-border bg-background p-5">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Home className="h-4 w-4 text-secondary" />
                              Active rooms
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <p className="text-sm text-muted">Rooms used regularly</p>
                              <Badge>{String(formState.roomCount)}</Badge>
                            </div>
                            <input
                              className="mt-5 w-full accent-[hsl(var(--primary))]"
                              type="range"
                              min={1}
                              max={10}
                              value={formState.roomCount}
                              onChange={(event) => setFormState((prev) => ({ ...prev, roomCount: Number(event.target.value) }))}
                            />
                            {profileErrors.room_count ? <div className="mt-2 text-xs text-red-400">{profileErrors.room_count}</div> : null}
                          </div>
                        </div>
                      </div>
                    ) : activeStep === "appliances" ? (
                      <div className="surface-fade space-y-6">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Appliance profile
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                            Add quantities only. You can refine these later from Settings.
                          </p>
                        </div>

                        {applianceErrors._form ? (
                          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {applianceErrors._form}
                          </div>
                        ) : null}

                        {applianceCategories.map((category) => (
                          <div key={category} className="space-y-3">
                            <div className="text-xs uppercase tracking-wide text-muted">{category}</div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {applianceCatalog.filter((item) => item.category === category).map((item) => (
                                <div key={item.name} className="rounded-2xl border border-border bg-background p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <div className="text-sm font-semibold text-foreground">{item.name}</div>
                                      <div className="mt-1 text-xs leading-5 text-muted">{item.description}</div>
                                    </div>
                                    <QuantityStepper
                                      value={applianceState[item.name] ?? 0}
                                      max={item.recommendedMax}
                                      disabled={busy}
                                      onChange={(value) => {
                                        setApplianceErrors((current) => {
                                          const next = { ...current };
                                          delete next[item.name];
                                          delete next._form;
                                          return next;
                                        });
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
                      </div>
                    ) : (
                      <div className="surface-fade space-y-6">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Confirm your setup</div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                            WattWise will use this context for bill predictions, appliance estimates, and recommendations.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-background p-5">
                            <div className="text-xs uppercase tracking-[0.16em] text-muted">Household</div>
                            <div className="mt-4 space-y-3 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted">Location</span>
                                <span className="text-right text-foreground">{formState.city}, {formState.state}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted">Home type</span>
                                <span className="text-foreground">{formState.houseType || "--"}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted">Family</span>
                                <span className="text-foreground">{formState.familyMembers} members</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted">Rooms</span>
                                <span className="text-foreground">{formState.roomCount} active rooms</span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border bg-background p-5">
                            <div className="text-xs uppercase tracking-[0.16em] text-muted">Appliances</div>
                            <div className="mt-4 grid gap-3 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted">Types selected</span>
                                <span className="text-foreground">{selectedApplianceCount}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted">Total quantity</span>
                                <span className="text-foreground">{totalApplianceQuantity}</span>
                              </div>
                              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/8 bg-white/[0.03] p-3">
                                {applianceInputs.filter((item) => item.quantity > 0).map((item) => (
                                  <div key={item.appliance_name} className="flex justify-between gap-3 py-1 text-xs">
                                    <span className="text-muted">{item.appliance_name}</span>
                                    <span className="text-foreground">{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/8 px-5 py-4 sm:px-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {activeStep === "welcome" ? (
                        <Button type="button" variant="outline" disabled={busy} onClick={() => void skipOnboarding()}>
                          Skip for now
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" disabled={!canGoBack} onClick={goBack}>
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                      )}

                      <div className="flex min-h-5 items-center justify-center text-sm">
                        {error ? (
                          <span className="text-red-300">{error}</span>
                        ) : lastSavedStep ? (
                          <span className="flex items-center gap-2 text-primary">
                            <CheckCircle2 className="h-4 w-4" />
                            Auto Saved
                          </span>
                        ) : (
                          <span className="text-muted">Progress saves as you continue</span>
                        )}
                      </div>

                      <Button type="button" onClick={() => void goNext()} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {actionLabel}
                        {!success ? <ArrowRight className="h-4 w-4" /> : null}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
