"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, Loader2, Radar, TrendingUp, Wallet } from "lucide-react";

import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { PredictionConfidenceBadge } from "@/components/prediction/PredictionConfidenceBadge";
import { SeasonalSeasonCard } from "@/components/seasonal/SeasonalSeasonCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalytics } from "@/lib/hooks/useDashboardAnalytics";

const PredictionForecastChart = dynamic(
  () => import("@/components/charts/PredictionForecastChart").then((mod) => mod.PredictionForecastChart),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-xl" /> }
);

type ForecastPoint = {
  label: string;
  units: number;
  amount: number;
  type: string;
};

function PredictionMetric({
  label,
  value,
  helper,
  accent = "text-foreground",
}: {
  label: string;
  value: string;
  helper: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[0_14px_38px_rgba(0,0,0,0.2)]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className={`mt-3 text-2xl font-semibold ${accent}`}>{value}</div>
      <div className="mt-2 text-xs text-muted">{helper}</div>
    </div>
  );
}

function PredictionSkeleton() {
  return (
    <div className="space-y-6 surface-fade">
      <Card className="border-white/8 bg-[#111827]">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-80" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-28" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
        <Card className="border-white/8 bg-[#111827]">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-white/8 bg-[#111827]">
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const {
    seasonal,
    prediction,
    loading,
    initialLoading,
    error,
    hasBills,
  } = useDashboardAnalytics();

  const forecastSeries: ForecastPoint[] = prediction?.trend_forecast.forecast_series.map((item: Record<string, string | number>) => ({
    label: String(item.label),
    units: Number(item.units ?? 0),
    amount: Number(item.amount ?? 0),
    type: String(item.type ?? "historical"),
  })) ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Predictions"
        description="A forecast view built from saved bills, seasonal carry-over, estimated appliance pressure, and household energy patterns."
        actionLabel="Estimated Forecast"
        actionDisabled
      />

      {initialLoading ? <PredictionSkeleton /> : null}

      {!initialLoading && loading && hasBills ? (
        <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing forecast signals...
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && error ? (
        <Card className="border-red-500/30 bg-red-500/10 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <CardContent className="pt-6 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      {!initialLoading && !hasBills ? (
        <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <CardContent className="pt-6 text-sm text-muted">
            Save a few bills to unlock future bill prediction and budget-risk forecasting.
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && hasBills && prediction && seasonal ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.2fr,1fr] surface-fade">
            <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_45%),linear-gradient(180deg,#111827_0%,#0B1220_100%)] shadow-[0_24px_64px_rgba(0,0,0,0.34)]">
              <CardContent className="space-y-6 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <Badge variant="info">Forecast engine active</Badge>
                    <div className="text-3xl font-semibold text-foreground">
                      INR {prediction.expected_next_bill.min_amount.toFixed(0)} - {prediction.expected_next_bill.max_amount.toFixed(0)}
                    </div>
                    <div className="text-sm text-muted">
                      Estimated next bill range, not a guaranteed outcome.
                    </div>
                  </div>
                  <PredictionConfidenceBadge level={prediction.prediction_confidence.level} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <PredictionMetric
                    label="Expected bill"
                    value={`INR ${prediction.expected_next_bill.min_amount.toFixed(0)} - ${prediction.expected_next_bill.max_amount.toFixed(0)}`}
                    helper="Forecast amount range"
                    accent="text-sky-300"
                  />
                  <PredictionMetric
                    label="Expected units"
                    value={`${prediction.expected_next_units.min_units.toFixed(0)} - ${prediction.expected_next_units.max_units.toFixed(0)} kWh`}
                    helper="Forecast usage range"
                  />
                  <PredictionMetric
                    label="Trend direction"
                    value={prediction.trend_forecast.direction}
                    helper={prediction.prediction_confidence.reason}
                    accent="text-primary"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <SeasonalSeasonCard
                season={prediction.seasonal_forecast.next_season}
                title="Upcoming seasonal outlook"
                description={prediction.seasonal_forecast.seasonal_spike_message}
              />

              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Wallet className="h-4 w-4" />
                    Budget risk
                  </div>
                  <CardTitle>Forecast budget watch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prediction.budget_risk ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {prediction.budget_risk.message}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                      Add a monthly budget goal in Settings to unlock forecast budget alerts.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr,1fr] surface-fade">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <TrendingUp className="h-4 w-4" />
                  Historical vs predicted
                </div>
                <CardTitle>Forecast trend graph</CardTitle>
              </CardHeader>
              <CardContent>
                <PredictionForecastChart data={forecastSeries} height={340} />
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Radar className="h-4 w-4" />
                  Prediction reasoning
                </div>
                <CardTitle>Why the forecast looks this way</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prediction.prediction_reasoning.map((reason) => (
                  <div key={reason} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    {reason}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr,1fr] surface-fade">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <AlertTriangle className="h-4 w-4" />
                  Abnormal usage forecast
                </div>
                <CardTitle>Future risk watch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                  {prediction.anomaly_forecast.reason}
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-muted">Risk level</span>
                  <Badge variant={prediction.anomaly_forecast.risk === "high" ? "warning" : prediction.anomaly_forecast.risk === "medium" ? "info" : "success"}>
                    {prediction.anomaly_forecast.risk}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
              <CardHeader>
                <CardTitle>Appliance impact forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prediction.appliance_contribution_forecast.length ? (
                  prediction.appliance_contribution_forecast.map((item) => (
                    <div key={item.appliance_name} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{item.appliance_name}</span>
                        <span className="text-sm font-semibold text-foreground">{item.estimated_percentage}%</span>
                      </div>
                      <div className="mt-2 text-xs text-muted">{item.trend_message}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                    Forecast appliance influence will strengthen as more bills and appliance context accumulate.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
