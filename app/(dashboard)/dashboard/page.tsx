"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity,
  Cloud,
  Leaf,
  Loader2,
  Radar,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { ApplianceContributionList } from "@/components/behavioral/ApplianceContributionList";
import { ContributionCard } from "@/components/behavioral/ContributionCard";
import { EstimatedAnalysisBadge } from "@/components/behavioral/EstimatedAnalysisBadge";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { PredictionConfidenceBadge } from "@/components/prediction/PredictionConfidenceBadge";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { UploadBillCard } from "@/components/dashboard/UploadBillCard";
import { HouseholdSummaryCard } from "@/components/household/HouseholdSummaryCard";
import { SeasonalInsightCard } from "@/components/seasonal/SeasonalInsightCard";
import { SeasonalSeasonCard } from "@/components/seasonal/SeasonalSeasonCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalytics } from "@/lib/hooks/useDashboardAnalytics";

const EnergyAreaChart = dynamic(
  () => import("@/components/charts/EnergyAreaChart").then((mod) => mod.EnergyAreaChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-xl" /> }
);
const EnergyBarChart = dynamic(
  () => import("@/components/charts/EnergyBarChart").then((mod) => mod.EnergyBarChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);
const EnergyPieChart = dynamic(
  () => import("@/components/charts/EnergyPieChart").then((mod) => mod.EnergyPieChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);
const PredictionForecastChart = dynamic(
  () => import("@/components/charts/PredictionForecastChart").then((mod) => mod.PredictionForecastChart),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-xl" /> }
);

function SummaryMetric({
  label,
  value,
  helper,
  accent = "text-primary",
}: {
  label: string;
  value: string;
  helper: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted">{label}</div>
      <div className={`mt-3 text-2xl font-semibold ${accent}`}>{value}</div>
      <div className="mt-2 text-xs text-muted">{helper}</div>
    </div>
  );
}

function InsightPill({
  title,
  detail,
  badge,
}: {
  title: string;
  detail: string;
  badge: string;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <Badge variant="info">{badge}</Badge>
      </div>
      <div className="mt-3 text-sm leading-6 text-muted">{detail}</div>
    </div>
  );
}

function DashboardLoadingShell() {
  return (
    <div className="space-y-6 surface-fade">
      <Card className="border-white/8 bg-[#111827] shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-9 w-32 rounded-full" />
              <Skeleton className="h-9 w-14 rounded-full" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-20" />
                <Skeleton className="mt-3 h-3 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-white/8 bg-[#111827]">
          <CardContent className="space-y-5 pt-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-white/8 bg-[#111827]">
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </CardContent>
          </Card>
          <Card className="border-white/8 bg-[#111827]">
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-[220px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type ForecastPoint = {
  label: string;
  units: number;
  amount: number;
  type: string;
};

export default function DashboardPage() {
  const {
    profile,
    appliances,
    seasonal,
    behavioral,
    summary,
    householdInsights,
    recommendationPreview,
    prediction,
    loading,
    initialLoading,
    error,
    hasBills,
  } = useDashboardAnalytics();

  const currentBill = summary.currentBill;
  const trendData = summary.monthlyTrend;
  const seasonalComparisonData = summary.seasonalComparison;
  const categoryPieData = behavioral?.category_contributions.map((item) => ({
    name: item.category,
    value: item.estimated_percentage,
    color: item.color,
  })) ?? [];
  const forecastSeries: ForecastPoint[] = prediction?.trend_forecast.forecast_series.map((item: Record<string, string | number>) => ({
    label: String(item.label),
    units: Number(item.units ?? 0),
    amount: Number(item.amount ?? 0),
    type: String(item.type ?? "historical"),
  })) ?? [];
  const profileReady = Boolean(
    profile?.city &&
    profile?.state &&
    profile?.house_type &&
    profile?.family_members &&
    profile?.room_count,
  );
  const appliancesReady = appliances.some((item) => item.quantity > 0);
  const onboardingDone = profileReady && appliancesReady && hasBills;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Energy Intelligence Dashboard"
        description="A focused view of your latest bill, likely contributors, and what needs attention next."
        actionLabel="Estimated Analysis"
        actionDisabled
      />

      {initialLoading ? <DashboardLoadingShell /> : null}

      {!initialLoading && loading && hasBills ? (
        <Card className="border-white/8 bg-[#111827] shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing your latest energy signals...
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && error ? (
        <Card className="border-red-500/30 bg-red-500/10 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <CardContent className="pt-6 text-sm text-red-200">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && !onboardingDone ? (
        <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_38%),linear-gradient(180deg,#111827_0%,#0B1220_100%)] shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Badge variant="info">Quick start</Badge>
                <div className="space-y-2">
                  <div className="text-2xl font-semibold text-foreground">Start with one bill, then complete home setup once.</div>
                  <p className="max-w-3xl text-sm leading-6 text-muted">
                    Upload a bill first. Then add home and appliance details once to improve every forecast, recommendation, and assistant answer.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/bills">Upload first bill</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings">Complete one-time setup</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">1. Upload a bill</div>
                  <Badge variant={hasBills ? "success" : "warning"}>{hasBills ? "Done" : "Start here"}</Badge>
                </div>
                <div className="mt-3 text-sm leading-6 text-muted">
                  Enter bill month, units, amount, and billing days.
                </div>
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">2. Complete home setup</div>
                  <Badge variant={profileReady && appliancesReady ? "success" : "info"}>{profileReady && appliancesReady ? "Ready" : "One-time"}</Badge>
                </div>
                <div className="mt-3 text-sm leading-6 text-muted">
                  Add family size, room count, home type, and appliances once.
                </div>
              </div>
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">3. Explore insights</div>
                  <Badge variant={hasBills ? "info" : "default"}>{hasBills ? "Unlocked" : "Waiting"}</Badge>
                </div>
                <div className="mt-3 text-sm leading-6 text-muted">
                  After the first bill, the rest of the product becomes useful.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && !hasBills ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr,1fr]">
          <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_48%),linear-gradient(180deg,#111827_0%,#0B1220_100%)] shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
            <CardContent className="space-y-5 pt-6">
              <Badge variant="info">Upload your first bill to begin analysis</Badge>
              <div className="space-y-3">
                <div className="text-3xl font-semibold text-foreground">This dashboard becomes useful right after the first saved bill.</div>
                <p className="max-w-2xl text-sm leading-6 text-muted">
                  Upload one bill to unlock analysis. Household setup is a one-time step that improves the quality of everything after that.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryMetric label="Seasonal context" value="Pending" helper="Needs bill month and units" />
                <SummaryMetric label="Behavioral estimation" value="Pending" helper="Needs saved bill plus household setup" accent="text-secondary" />
                <SummaryMetric label="Energy score" value="--" helper="Computed after bill analysis" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <UploadBillCard />
            <HouseholdSummaryCard profile={profile} appliances={appliances} compact />
          </div>
        </div>
      ) : null}

      {!initialLoading && hasBills && seasonal && currentBill ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr] surface-fade">
            <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_46%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_42%),linear-gradient(180deg,#111827_0%,#0B1220_100%)] shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
              <CardContent className="space-y-6 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <Badge variant="info">Energy intelligence layer active</Badge>
                    <div>
                      <div className="text-3xl font-semibold text-foreground">
                        {currentBill.bill_amount != null ? `INR ${Number(currentBill.bill_amount).toFixed(0)}` : "INR --"}
                      </div>
                      <div className="mt-2 text-sm text-muted">
                        Current bill amount with seasonal and behavioral context attached.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <EstimatedAnalysisBadge label={behavioral?.estimated_analysis_label} />
                    <Badge variant="success">{summary.energyScore.grade}</Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <SummaryMetric
                    label="Units consumed"
                    value={currentBill.units_consumed != null ? `${currentBill.units_consumed} kWh` : "--"}
                    helper="Saved current bill usage"
                  />
                  <SummaryMetric
                    label="Daily average"
                    value={summary.dailyAverage != null ? `${summary.dailyAverage}/day` : "--"}
                    helper="Usage spread across billing days"
                    accent="text-secondary"
                  />
                  <SummaryMetric
                    label="Detected season"
                    value={seasonal.season}
                    helper="Estimated seasonal context"
                  />
                  <SummaryMetric
                    label="Energy score"
                    value={summary.energyScore.grade}
                    helper={summary.energyScore.label}
                  />
                  <SummaryMetric
                    label="Estimated CO2"
                    value={summary.carbon ? `${summary.carbon.kg} kg` : "--"}
                    helper="Monthly carbon estimate"
                    accent="text-emerald-300"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Target className="h-4 w-4" />
                    Efficiency score
                  </div>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>Household energy score</span>
                    <span className="text-3xl">{summary.energyScore.grade}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-3 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] via-[#10B981] to-[#34D399] transition-all"
                      style={{ width: `${summary.energyScore.numeric}%` }}
                    />
                  </div>
                  <div className="text-sm text-muted">{summary.energyScore.label}</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    Built from current usage, family size, room count, appliance setup, and seasonal estimation pressure.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Leaf className="h-4 w-4" />
                    Environmental impact
                  </div>
                  <CardTitle>Estimated monthly carbon footprint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-semibold text-foreground">
                    {summary.carbon ? `${summary.carbon.kg} kg CO2` : "--"}
                  </div>
                  <div className="text-sm text-muted">{summary.carbon?.description ?? "Carbon estimate appears after bill analysis."}</div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr] surface-fade">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <TrendingUp className="h-4 w-4" />
                  Monthly trends
                </div>
                <CardTitle>Bill amount and usage trend</CardTitle>
                <p className="text-sm text-muted">
                  Month-wise units and bill amount, with visual room to spot growth, easing, and spikes.
                </p>
              </CardHeader>
              <CardContent>
                <EnergyAreaChart
                  data={trendData}
                  xKey="label"
                  series={[
                    { key: "units", label: "Units", color: "#10B981", yAxisId: "left" },
                    { key: "amount", label: "Bill amount", color: "#3B82F6", yAxisId: "right" },
                  ]}
                  height={320}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <SeasonalSeasonCard
                season={seasonal.season}
                title="Current seasonal context"
                description={seasonal.season_card.description}
              />

              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="h-4 w-4" />
                    Household benchmark
                  </div>
                  <CardTitle>Comparison with similar homes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    {summary.benchmark?.message ?? "Complete household setup to unlock a more precise similar-home comparison."}
                  </div>
                  {summary.benchmark ? (
                    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                      <span className="text-muted">Benchmark usage</span>
                      <span className="font-semibold text-foreground">{summary.benchmark.benchmarkUnits} kWh</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </section>

          {prediction ? (
            <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr] surface-fade">
              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <TrendingUp className="h-4 w-4" />
                      Future bill prediction
                    </div>
                    <PredictionConfidenceBadge level={prediction.prediction_confidence.level} />
                  </div>
                  <CardTitle>Estimated next bill outlook</CardTitle>
                  <p className="text-sm text-muted">
                    Forecasts are shown as estimated ranges, based on saved bills, seasonal carry-over, appliance mix, and current household trends.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <SummaryMetric
                      label="Expected next bill"
                      value={`INR ${prediction.expected_next_bill.min_amount.toFixed(0)} - ${prediction.expected_next_bill.max_amount.toFixed(0)}`}
                      helper="Estimated amount range"
                      accent="text-secondary"
                    />
                    <SummaryMetric
                      label="Expected units"
                      value={`${prediction.expected_next_units.min_units.toFixed(0)} - ${prediction.expected_next_units.max_units.toFixed(0)} kWh`}
                      helper="Estimated usage range"
                    />
                    <SummaryMetric
                      label="Confidence"
                      value={prediction.prediction_confidence.level}
                      helper={prediction.prediction_confidence.reason}
                      accent="text-sky-300"
                    />
                  </div>
                  <PredictionForecastChart data={forecastSeries} height={320} />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Radar className="h-4 w-4" />
                      Seasonal forecast
                    </div>
                    <CardTitle>{prediction.seasonal_forecast.next_season} outlook</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                      {prediction.seasonal_forecast.seasonal_spike_message}
                    </div>
                    {prediction.prediction_reasoning.map((reason: string) => (
                      <div key={reason} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                        {reason}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <ShieldAlert className="h-4 w-4" />
                      Forecast risk watch
                    </div>
                    <CardTitle>Budget and anomaly signals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                      {prediction.anomaly_forecast.reason}
                    </div>
                    {prediction.budget_risk ? (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {prediction.budget_risk.message}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                        Add an optional monthly budget in Settings to unlock budget risk alerts.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr,1.15fr] surface-fade">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Estimated appliance contribution</CardTitle>
                  <p className="text-sm text-muted">
                    Category contribution from Phase 7. Estimated Analysis only, never exact device metering.
                  </p>
                </div>
                <EstimatedAnalysisBadge label={behavioral?.estimated_analysis_label} />
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {behavioral?.category_contributions.slice(0, 4).map((item) => (
                    <ContributionCard
                      key={item.category}
                      title={item.category}
                      percentage={item.estimated_percentage}
                      detail={item.estimated_reason}
                    />
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
                  <EnergyPieChart data={categoryPieData} height={260} />
                  <div className="space-y-3">
                    {behavioral?.category_contributions.map((item) => (
                      <div key={item.category} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-semibold text-foreground">{item.category}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{item.estimated_percentage}%</span>
                        </div>
                        <div className="mt-2 text-xs text-muted">{item.estimated_reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <ApplianceContributionList items={behavioral?.appliance_contributions ?? []} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr,1fr] surface-fade">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Cloud className="h-4 w-4" />
                  Seasonal analysis
                </div>
                <CardTitle>Season vs season comparison</CardTitle>
                <p className="text-sm text-muted">
                  Average units and bill amount across detected seasonal groups from your saved history.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <EnergyBarChart
                  data={seasonalComparisonData}
                  xKey="season"
                  series={[
                    { key: "averageUnits", label: "Avg units", color: "#10B981" },
                    { key: "averageAmount", label: "Avg amount", color: "#3B82F6" },
                  ]}
                  height={300}
                />
                <div className="grid gap-4 md:grid-cols-3">
                  {seasonalComparisonData.map((item) => (
                    <div key={item.season} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted">{item.season}</div>
                      <div className="mt-2 text-lg font-semibold text-foreground">{item.averageUnits} kWh</div>
                      <div className="text-xs text-muted">{item.bills} saved bill{item.bills === 1 ? "" : "s"} in this season</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Zap className="h-4 w-4" />
                  Smart household insights
                </div>
                <CardTitle>Contextual household signals</CardTitle>
                <p className="text-sm text-muted">
                  Behavioral interpretation built from bill history, appliances, room count, family size, and seasonal assumptions.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                {householdInsights.map((item) => (
                  <InsightPill key={item.title} title={item.title} detail={item.detail} badge={item.badge} />
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr] surface-fade">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Recommendation preview
                </div>
                <CardTitle>Next best actions</CardTitle>
                <p className="text-sm text-muted">
                  Early recommendation preview from the dashboard. Full recommendation engine can deepen this later.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendationPreview.map((item) => (
                  <RecommendationCard
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    savings={item.impact}
                    priority={item.priority}
                    category={item.category}
                    relatedCategory={item.relatedCategory}
                  />
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <HouseholdSummaryCard profile={profile} appliances={appliances} compact />

              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <CardHeader>
                  <CardTitle>Bill intelligence highlights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summary.spikeSummary ? (
                    <>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                        Highest observed usage in saved history: <span className="text-foreground">{summary.spikeSummary.highestMonth}</span> at <span className="text-foreground">{summary.spikeSummary.highestUnits} kWh</span>.
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                        Lowest observed usage in saved history: <span className="text-foreground">{summary.spikeSummary.lowestMonth}</span> at <span className="text-foreground">{summary.spikeSummary.lowestUnits} kWh</span>.
                      </div>
                    </>
                  ) : null}
                  {seasonal.insights.slice(0, 2).map((item) => (
                    <SeasonalInsightCard key={item.title} title={item.title} message={item.message} tone={item.tone} />
                  ))}
                </CardContent>
              </Card>

              <UploadBillCard />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
