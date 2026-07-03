"use client";

import { ChevronDown, Loader2, ShieldAlert, Sparkles, Target, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useState } from "react";

import { EstimatedAnalysisBadge } from "@/components/behavioral/EstimatedAnalysisBadge";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { SeasonalSeasonCard } from "@/components/seasonal/SeasonalSeasonCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntelligenceBundle } from "@/lib/hooks/useIntelligenceBundle";
import { type RecommendationItem } from "@/lib/hooks/useRecommendations";

function groupRecommendations(items: RecommendationItem[] | undefined) {
  const groups = new Map<string, RecommendationItem[]>();
  for (const item of items ?? []) {
    const bucket = groups.get(item.category) ?? [];
    bucket.push(item);
    groups.set(item.category, bucket);
  }
  return Array.from(groups.entries());
}

function RecommendationSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-white/8 bg-[#111827]">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-white/8 bg-[#111827]">
              <CardContent className="space-y-4 pt-6">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card className="border-white/8 bg-[#111827]">
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const {
    seasonal,
    behavioral,
    recommendations: data,
    loading,
    initialLoading,
    error,
    hasBills,
    recommendationHistory,
  } = useIntelligenceBundle({ includeRecommendations: true });
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categoryOptions = useMemo(() => {
    const unique = new Set((data?.recommendations ?? []).map((item) => item.category));
    return ["all", ...Array.from(unique)];
  }, [data?.recommendations]);

  const filteredRecommendations = useMemo(() => {
    return (data?.recommendations ?? []).filter((item) => {
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesPriority && matchesCategory;
    });
  }, [categoryFilter, data?.recommendations, priorityFilter]);

  const groupedRecommendations = useMemo(() => groupRecommendations(filteredRecommendations), [filteredRecommendations]);
  const highPriority = data?.recommendation_metadata.priority_breakdown.high ?? 0;
  const mediumPriority = data?.recommendation_metadata.priority_breakdown.medium ?? 0;
  const lowPriority = data?.recommendation_metadata.priority_breakdown.low ?? 0;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Recommendations"
        description="A contextual energy advisor built from seasonal intelligence, behavioral estimation, bill history, and the current household setup."
        actionLabel="Estimated Analysis"
        actionDisabled
      />

      {initialLoading ? <RecommendationSkeleton /> : null}

      {!initialLoading && loading && hasBills ? (
        <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing recommendations...
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && !hasBills ? (
        <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <CardContent className="pt-6 text-sm text-muted">
            Upload and save a bill to unlock season-aware and appliance-aware recommendations.
          </CardContent>
        </Card>
      ) : null}

      {!initialLoading && error ? (
        <Card className="border-red-500/30 bg-red-500/10 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <CardContent className="pt-6 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      {!initialLoading && data && seasonal ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr] surface-fade">
            <div className="space-y-6">
              <SeasonalSeasonCard
                season={seasonal.season}
                title="Recommendation context"
                description={seasonal.season_card.description}
              />

              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Target className="h-4 w-4" />
                    Engine summary
                  </div>
                  <CardTitle>What WattWise is optimizing around</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">Energy score</div>
                    <div className="mt-3 text-2xl font-semibold text-foreground">{data.energy_score.grade}</div>
                    <div className="mt-1 text-xs text-muted">{data.energy_score.label}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">High priority</div>
                    <div className="mt-3 text-2xl font-semibold text-red-300">{highPriority}</div>
                    <div className="mt-1 text-xs text-muted">Immediate actions worth attention</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">Medium priority</div>
                    <div className="mt-3 text-2xl font-semibold text-amber-300">{mediumPriority}</div>
                    <div className="mt-1 text-xs text-muted">Optimization opportunities</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">Low priority</div>
                    <div className="mt-3 text-2xl font-semibold text-primary">{lowPriority}</div>
                    <div className="mt-1 text-xs text-muted">Awareness and habit shaping</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Sparkles className="h-4 w-4" />
                      Recommendation readiness
                    </div>
                    <CardTitle className="mt-2">Adaptive recommendation layer active</CardTitle>
                  </div>
                  <EstimatedAnalysisBadge label={behavioral?.estimated_analysis_label ?? data.estimated_analysis_label} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                  Generated from season, appliance quantities, estimated contribution pressure, historical trends, and current efficiency score.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-muted">Lead recommendation season</span>
                  <div className="mt-1 font-semibold text-foreground">{data.season}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-muted">Lead estimated category</span>
                  <div className="mt-1 font-semibold text-foreground">
                    {data.recommendation_metadata.lead_category ?? "Context building"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-muted">Spike status</span>
                  <div className="mt-1 flex items-center gap-2 font-semibold text-foreground">
                    {data.usage_spike.detected ? <ShieldAlert className="h-4 w-4 text-red-300" /> : <TrendingUp className="h-4 w-4 text-primary" />}
                    {data.usage_spike.detected ? "Usage spike detected" : "No strong spike detected"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr,1fr] surface-fade">
            <div className="space-y-4">
              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                <CardHeader>
                  <CardTitle>Filter recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">Priority</div>
                    <div className="flex flex-wrap gap-2">
                      {(["all", "high", "medium", "low"] as const).map((option) => (
                        <Button
                          key={option}
                          type="button"
                          size="sm"
                          variant={priorityFilter === option ? "default" : "outline"}
                          onClick={() => setPriorityFilter(option)}
                        >
                          {option === "all" ? "All priorities" : `${option[0].toUpperCase()}${option.slice(1)} priority`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">Category</div>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          size="sm"
                          variant={categoryFilter === option ? "default" : "outline"}
                          onClick={() => setCategoryFilter(option)}
                        >
                          {option === "all" ? "All categories" : option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {groupedRecommendations.map(([category, items]) => (
                <details key={category} className="group rounded-3xl border border-white/8 bg-[#111827] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{category}</div>
                      <div className="text-sm text-muted">{items.length} recommendation{items.length === 1 ? "" : "s"} in this section</div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-4 space-y-4">
                    {items.map((item) => (
                      <RecommendationCard
                        key={`${category}-${item.title}`}
                        title={item.title}
                        description={item.text}
                        savings={item.priority === "high" ? "Start here first" : item.priority === "medium" ? "Worth optimizing next" : "Useful awareness layer"}
                        priority={item.priority}
                        category={item.category}
                        relatedCategory={item.related_appliance_category}
                      />
                    ))}
                  </div>
                </details>
              ))}
              {groupedRecommendations.length === 0 ? (
                <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                  <CardContent className="pt-6 text-sm text-muted">
                    No recommendations match the current filters. Try widening priority or category selection.
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-6">
              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                <CardHeader>
                  <CardTitle>Usage spike watch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.usage_spike.detected ? (
                    <>
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {data.usage_spike.reasons[0] ?? "A notable change has been detected in the latest bill pattern."}
                      </div>
                      {data.usage_spike.reasons.slice(1).map((reason) => (
                        <div key={reason} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                          {reason}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                      No major spike dominates the current cycle, so the recommendation engine is focusing more on efficiency and seasonal optimization than on anomaly response.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/8 bg-[#111827] shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                <CardHeader>
                  <CardTitle>Recommendation history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendationHistory.length ? (
                    recommendationHistory.slice(0, 5).map((bill) => (
                      <div key={bill.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-foreground">{bill.bill_month}</div>
                            <div className="text-xs text-muted">{bill.recommendation_results?.length ?? 0} saved recommendation{(bill.recommendation_results?.length ?? 0) === 1 ? "" : "s"}</div>
                          </div>
                          {bill.season ? <Badge variant="info">{bill.season}</Badge> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                      Recommendation history will grow as more bills are saved with contextual analysis snapshots.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
