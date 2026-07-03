"use client";

import { Activity, Loader2, Radar, SendHorizonal, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AssistantMessageBubble } from "@/components/assistant/AssistantMessageBubble";
import { AssistantSuggestionChips } from "@/components/assistant/AssistantSuggestionChips";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnergyAssistant } from "@/lib/hooks/useEnergyAssistant";

function AssistantSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr] surface-fade">
      <Card className="border-white/8 bg-[#111827]">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </CardContent>
      </Card>
      <Card className="border-white/8 bg-[#111827]">
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AssistantPage() {
  const {
    conversations,
    suggestedQuestions,
    assistantSummary,
    loading,
    asking,
    error,
    hasHistory,
    ask,
  } = useEnergyAssistant();
  const [question, setQuestion] = useState("");
  const [draftQuestion, setDraftQuestion] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [asking, conversations.length]);

  const submitQuestion = async (value?: string) => {
    const nextQuestion = (value ?? question).trim();
    if (!nextQuestion || asking) return;
    setDraftQuestion(nextQuestion);
    const result = await ask(nextQuestion);
    if (!result.error) {
      setQuestion("");
      setDraftQuestion(null);
    } else {
      setDraftQuestion(null);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="AI Energy Assistant"
        description="A grounded household energy advisor that explains your bills, estimated appliance contribution, seasonal patterns, forecasts, and optimization options."
        actionLabel="Context-aware"
        actionDisabled
      />

      {loading ? <AssistantSkeleton /> : null}

      {!loading ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr] surface-fade">
          <Card className="overflow-hidden border-white/8 bg-[#111827] shadow-[0_24px_64px_rgba(0,0,0,0.34)]">
            <CardHeader className="border-b border-white/8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Household energy chat</CardTitle>
                  <div className="mt-2 text-sm text-muted">
                    This assistant explains your actual WattWise intelligence. It answers direct bill questions, compares saved bills, and explains estimated analysis without pretending to know exact appliance metering.
                  </div>
                </div>
                <Badge variant="info">Grounded in saved data</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <AssistantSuggestionChips
                items={suggestedQuestions}
                onSelect={(item) => void submitQuestion(item)}
                disabled={asking}
              />

              <div className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
                {!hasHistory && !draftQuestion ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm leading-7 text-muted">
                    Start with a direct question like &quot;What is my daily average usage?&quot; or &quot;Why is my bill high?&quot; The assistant will answer from your saved bills, seasonal intelligence, behavioral estimation, prediction ranges, and recommendations.
                  </div>
                ) : null}

                {conversations.map((item) => (
                  <div key={item.id} className="space-y-4">
                    <AssistantMessageBubble role="user" text={item.question} />
                    <AssistantMessageBubble
                      role="assistant"
                      text={item.answer}
                      category={item.assistant_category}
                      insights={item.generated_insights}
                      references={item.related_recommendation_refs}
                      grounding={item.grounding_metadata}
                    />
                  </div>
                ))}

                {draftQuestion ? (
                  <div className="space-y-4">
                    <AssistantMessageBubble role="user" text={draftQuestion} />
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="rounded-3xl border border-white/8 bg-[#111827] px-4 py-4 text-sm text-muted shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Interpreting your latest household energy context...
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about your bill, usage, season, forecast, appliances, or recommendations..."
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitQuestion();
                    }
                  }}
                />
                <Button
                  onClick={() => void submitQuestion()}
                  disabled={asking || !question.trim()}
                  className="sm:min-w-[140px]"
                >
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                  Ask assistant
                </Button>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>Live assistant snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted">
                {assistantSummary ? (
                  <>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                        <Activity className="h-3.5 w-3.5" />
                        Latest bill
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {assistantSummary.latest_bill_month ?? "--"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {assistantSummary.latest_units != null ? `${assistantSummary.latest_units} units` : "--"}
                        {assistantSummary.latest_bill_amount != null ? ` | INR ${Math.round(assistantSummary.latest_bill_amount)}` : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                        <Radar className="h-3.5 w-3.5" />
                        Current context
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {assistantSummary.season ?? "--"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        Score {assistantSummary.energy_score ?? "--"}
                        {assistantSummary.lead_category ? ` | ${assistantSummary.lead_category}` : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Forecast
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {assistantSummary.next_bill_range
                          ? `INR ${Math.round(assistantSummary.next_bill_range.min_amount)} - ${Math.round(assistantSummary.next_bill_range.max_amount)}`
                          : "--"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {assistantSummary.prediction_confidence?.level ?? "No"} confidence
                        {assistantSummary.bill_count ? ` | ${assistantSummary.bill_count} saved bills` : ""}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    Save at least one bill to unlock the assistant snapshot and grounded answers.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#111827] shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
              <CardHeader>
                <CardTitle>What this assistant does well</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  It answers direct bill facts like units consumed, bill amount, billing days, and daily average without forcing you through a generic explanation first.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  It explains why bills changed using season, appliance contribution, household scale, predictions, and recommendations from the rest of WattWise.
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  It stays grounded in estimated analysis and probable contribution wording instead of pretending to know exact appliance runtime or guaranteed future bills.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
