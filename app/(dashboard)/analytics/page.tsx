"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Bot, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useMemo } from "react";

import { ApplianceContributionList } from "@/components/behavioral/ApplianceContributionList";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { PredictionConfidenceBadge } from "@/components/prediction/PredictionConfidenceBadge";
import { SeasonalSeasonCard } from "@/components/seasonal/SeasonalSeasonCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalytics } from "@/lib/hooks/useDashboardAnalytics";

const EnergyAreaChart = dynamic(
  () => import("@/components/charts/EnergyAreaChart").then((mod) => mod.EnergyAreaChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);
const EnergyBarChart = dynamic(
  () => import("@/components/charts/EnergyBarChart").then((mod) => mod.EnergyBarChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
);
const EnergyPieChart = dynamic(
  () => import("@/components/charts/EnergyPieChart").then((mod) => mod.EnergyPieChart),
  { ssr: false, loading: () => <Skeleton className="h-60 w-full rounded-xl" /> }
);

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-2 text-xs text-muted">{helper}</div>
    </div>
  );
}

function MoneyContributionCard({
  title,
  amount,
  percentage,
  color,
}: {
  title: string;
  amount: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <span className="text-xs text-muted">{percentage}%</span>
      </div>
      <div className="mt-4 text-3xl font-semibold text-foreground">INR {Math.round(amount)}</div>
      <div className="mt-2 text-xs text-muted">Estimated contribution</div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="space-y-6 surface-fade">
      <Card className="border-white/8 bg-[#111827]">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
        <Card className="border-white/8 bg-[#111827]">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-[#111827]">
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBillId = searchParams.get("bill");
  const {
    bills,
    seasonal,
    behavioral,
    summary,
    prediction,
    recommendationPreview,
    loading,
    initialLoading,
    error,
    hasBills,
  } = useDashboardAnalytics({ selectedBillId });

  const currentBill = summary.currentBill;
  const billSelectorItems = useMemo(() => [...bills].reverse(), [bills]);
  const currentAmount = Number(seasonal?.trends.current_amount ?? currentBill?.bill_amount ?? 0);
  const categoryPieData = behavioral?.category_contributions.map((item) => ({
    name: item.category,
    value: item.estimated_percentage,
    color: item.color,
  })) ?? [];
  const monetaryDistribution = behavioral?.category_contributions.map((item) => ({
    ...item,
    estimated_amount: currentAmount > 0 ? (currentAmount * item.estimated_percentage) / 100 : 0,
  })) ?? [];
  const hasBehavioralData = monetaryDistribution.length > 0;
  const forecastGraphData = prediction?.trend_forecast.forecast_series?.length
    ? prediction.trend_forecast.forecast_series
    : summary.monthlyTrend;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted">Money-first analytics</div>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">See where the bill is likely going.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Focus on bill amount, estimated contribution, upcoming risk, and the next best action.
          </p>
        </div>
        <Badge variant="info">Estimated analysis</Badge>
      </div>

      {initialLoading ? <LoadingShell /> : null}

      {!initialLoading && loading && hasBills ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing analytics...
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && error ? (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-6 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      {!initialLoading && !hasBills ? (
        <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_44%),linear-gradient(180deg,#111827_0%,#0B1220_100%)]">
          <CardContent className="space-y-4 pt-6">
            <div className="text-2xl font-semibold text-foreground">No bills uploaded yet</div>
            <p className="max-w-xl text-sm text-muted">
              Upload your first electricity bill to start intelligent cost analysis and forecasting.
            </p>
            <Button asChild>
              <Link href="/bills">Upload first bill</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && hasBills && seasonal ? (
        <>
          <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
            <CardHeader className="gap-2">
              <CardTitle>Saved bill analytics</CardTitle>
              <CardDescription>
                Open the current or any previous saved bill to switch the full analysis view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {billSelectorItems.map((bill, index) => {
                  const isActive = currentBill?.id === bill.id;
                  return (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => router.replace(`/analytics?bill=${bill.id}`, { scroll: false })}
                      className={`min-w-[210px] rounded-2xl border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? "border-primary/40 bg-primary/10"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">{bill.bill_month}</div>
                        {index === 0 ? <Badge variant="success">Current</Badge> : null}
                      </div>
                      <div className="mt-3 text-lg font-semibold text-foreground">
                        {bill.bill_amount != null ? `INR ${Math.round(Number(bill.bill_amount))}` : "INR --"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {bill.units_consumed != null ? `${Math.round(Number(bill.units_consumed))} units` : "Units unavailable"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Current bill"
              value={currentBill?.bill_amount != null ? `INR ${Math.round(Number(currentBill.bill_amount))}` : "INR --"}
              helper={currentBill ? `${currentBill.bill_month} record` : "Saved bill"}
            />
            <SummaryCard
              label="Predicted next bill"
              value={prediction ? `INR ${Math.round(prediction.expected_next_bill.min_amount)}-${Math.round(prediction.expected_next_bill.max_amount)}` : "Pending"}
              helper="Estimated range"
            />
            <SummaryCard
              label="Energy score"
              value={summary.energyScore.grade}
              helper={summary.energyScore.label}
            />
            <SummaryCard
              label="Season"
              value={seasonal.season}
              helper="Current bill context"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>Estimated monetary distribution</CardTitle>
                <CardDescription>
                  Rupee view first. Percentages are shown as supporting context.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {hasBehavioralData ? (
                  monetaryDistribution.map((item) => (
                    <MoneyContributionCard
                      key={item.category}
                      title={item.category}
                      amount={item.estimated_amount}
                      percentage={item.estimated_percentage}
                      color={item.color}
                    />
                  ))
                ) : (
                  <div className="md:col-span-2 rounded-3xl border border-dashed border-border bg-background px-5 py-12 text-sm text-muted">
                    Add appliance quantities in setup to unlock money-based contribution cards.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>Contribution mix</CardTitle>
                <CardDescription>Estimated category balance for the current bill.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[0.9fr,1.1fr]">
                {hasBehavioralData ? (
                  <>
                    <EnergyPieChart data={categoryPieData} />
                    <ApplianceContributionList items={behavioral?.appliance_contributions ?? []} />
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-3xl border border-dashed border-border bg-background px-5 py-12 text-sm text-muted">
                    The contribution chart appears after WattWise has enough household and appliance context to estimate appliance impact.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>Trend section</CardTitle>
                <CardDescription>Usage direction, seasonal movement, and bill trend context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <EnergyAreaChart data={summary.monthlyTrend} />
                <EnergyBarChart data={summary.seasonalComparison} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <SeasonalSeasonCard
                season={seasonal.season}
                title={seasonal.season_card.title}
                description={seasonal.season_card.description}
              />
              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                <CardHeader>
                  <CardTitle>Quick signals</CardTitle>
                  <CardDescription>Short, readable takeaways from the current bill.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {seasonal.behavior.behavior_signals.slice(0, 3).map((signal) => (
                    <div key={signal} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                      {signal}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Keep only the next few actions that matter most.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendationPreview.slice(0, 3).map((item) => (
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

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Prediction</CardTitle>
                    <CardDescription>Upcoming bill pressure, confidence, and budget watch.</CardDescription>
                  </div>
                  {prediction ? <PredictionConfidenceBadge level={prediction.prediction_confidence.level} /> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Next month</div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">
                    {prediction ? `INR ${Math.round(prediction.expected_next_bill.min_amount)}-${Math.round(prediction.expected_next_bill.max_amount)}` : "Pending"}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {prediction?.seasonal_forecast.seasonal_spike_message ?? "Forecast available after prediction runs."}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">Budget risk</div>
                    <div className="mt-2 text-xs text-muted">
                      {prediction?.budget_risk?.message ?? "Set a monthly budget in Settings to unlock risk alerts."}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">Anomaly watch</div>
                    <div className="mt-2 text-xs text-muted">
                      {prediction?.anomaly_forecast.reason ?? "Anomaly forecast becomes stronger with more bill history."}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>Forecast graph</CardTitle>
                <CardDescription>Historical direction with predicted pressure layered on top.</CardDescription>
              </CardHeader>
              <CardContent>
                <EnergyAreaChart data={forecastGraphData} />
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Bot className="h-4 w-4" />
                  Compact assistant
                </div>
                <CardTitle>Ask WattWise</CardTitle>
                <CardDescription>Use the assistant when you want an explanation, not another chart.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Why is my bill high?",
                  "Which appliances likely matter most?",
                  "What may happen next month?",
                ].map((question) => (
                  <div key={question} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                    {question}
                  </div>
                ))}
                <Button asChild className="w-full">
                  <Link href="/assistant">
                    Open assistant
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
