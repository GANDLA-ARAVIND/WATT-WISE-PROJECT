"use client";

import { useEffect, useMemo, useState } from "react";

import { buildDashboardSummary } from "@/lib/analytics/analytics-utility";
import { buildHouseholdInsightCards, buildRecommendationPreview } from "@/lib/analytics/insight-service";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAppliances } from "@/lib/hooks/useAppliances";
import type { BehavioralEstimation } from "@/lib/hooks/useBehavioralEstimation";
import { useBills } from "@/lib/hooks/useBills";
import { useProfile } from "@/lib/hooks/useProfile";
import type { SeasonalIntelligence } from "@/lib/hooks/useSeasonalIntelligence";

const apiBaseUrl = "/api/backend";

type PredictionAnalysis = {
  estimated_analysis_label: string;
  expected_next_bill: {
    min_amount: number;
    max_amount: number;
    center_amount: number;
  };
  expected_next_units: {
    min_units: number;
    max_units: number;
    center_units: number;
  };
  prediction_confidence: {
    level: string;
    reason: string;
  };
  seasonal_forecast: {
    current_season: string;
    next_season: string;
    seasonal_spike_message: string;
    seasonal_spike_severity: string;
    seasonal_history_count: number;
    assumptions: string[];
  };
  trend_forecast: {
    direction: string;
    forecast_series: Array<Record<string, string | number>>;
    average_units: number;
    average_amount: number;
  };
  anomaly_forecast: {
    risk: string;
    reason: string;
    lead_category: string | null;
  };
  budget_risk: {
    budget_goal: number;
    status: string;
    message: string;
  } | null;
  appliance_contribution_forecast: Array<{
    appliance_name: string;
    estimated_percentage: number;
    trend_message: string;
  }>;
  prediction_reasoning: string[];
  prediction_metadata: Record<string, unknown>;
};

export function useDashboardAnalytics(options?: { selectedBillId?: string | null }) {
  const { session } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { appliances, loading: appliancesLoading } = useAppliances();
  const { bills, loading: billsLoading } = useBills();
  const [seasonal, setSeasonal] = useState<SeasonalIntelligence | null>(null);
  const [behavioral, setBehavioral] = useState<BehavioralEstimation | null>(null);
  const [prediction, setPrediction] = useState<PredictionAnalysis | null>(null);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [behavioralLoading, setBehavioralLoading] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [seasonalError, setSeasonalError] = useState<string | null>(null);
  const [behavioralError, setBehavioralError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const selectedBillId = options?.selectedBillId ?? null;
  const currentBill = useMemo(() => {
    if (!bills.length) return null;
    if (!selectedBillId) return bills[bills.length - 1];
    return bills.find((bill) => bill.id === selectedBillId) ?? bills[bills.length - 1];
  }, [bills, selectedBillId]);
  const history = useMemo(() => {
    if (!currentBill) return [];
    const currentIndex = bills.findIndex((bill) => bill.id === currentBill.id);
    return currentIndex > 0 ? bills.slice(0, currentIndex) : [];
  }, [bills, currentBill]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (billsLoading || profileLoading || appliancesLoading) {
        return;
      }

      if (!session?.access_token || !profile || !currentBill) {
        if (!cancelled) {
          setSeasonal(null);
          setBehavioral(null);
          setPrediction(null);
          setSeasonalError(null);
          setBehavioralError(null);
          setPredictionError(null);
          setSeasonalLoading(false);
          setBehavioralLoading(false);
          setPredictionLoading(false);
        }
        return;
      }

        setSeasonalLoading(true);
        setSeasonalError(null);
        setPrediction(currentBill.prediction_results ?? null);

      try {
        const seasonalResponse = await fetch(`${apiBaseUrl}/api/seasonal/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            household: profile,
            appliances,
            current_bill: currentBill,
            history,
          }),
        });

        if (!seasonalResponse.ok) {
          if (!cancelled) {
            setSeasonalError("Failed to load seasonal intelligence.");
            setSeasonalLoading(false);
          }
          return;
        }

        const seasonalResult = (await seasonalResponse.json()) as SeasonalIntelligence;
        if (cancelled) return;
        setSeasonal(seasonalResult);
        setSeasonalLoading(false);

        setBehavioralLoading(true);
        setBehavioralError(null);

        const behavioralResponse = await fetch(`${apiBaseUrl}/api/behavioral/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            household: profile,
            appliances,
            current_bill: currentBill,
            history,
            seasonal_assumptions: seasonalResult.behavior.seasonal_assumptions,
          }),
        });

        if (!behavioralResponse.ok) {
          if (!cancelled) {
            setBehavioralError("Failed to load estimated appliance contribution.");
            setBehavioralLoading(false);
          }
          return;
        }

        const behavioralResult = (await behavioralResponse.json()) as BehavioralEstimation;
        if (cancelled) return;
        setBehavioral(behavioralResult);
        setBehavioralLoading(false);

        if (currentBill.prediction_results) {
          setPredictionLoading(false);
          setPrediction(currentBill.prediction_results);
          return;
        }

        setPredictionLoading(true);
        setPredictionError(null);

        const predictionResponse = await fetch(`${apiBaseUrl}/api/predictions/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            household: profile,
            appliances,
            current_bill: currentBill,
            history,
            seasonal_intelligence: seasonalResult,
            behavioral_estimation: behavioralResult,
          }),
        });

        if (!predictionResponse.ok) {
          if (!cancelled) {
            setPredictionError("Failed to load bill forecast.");
            setPredictionLoading(false);
          }
          return;
        }

        const predictionResult = (await predictionResponse.json()) as PredictionAnalysis;
        if (cancelled) return;
        setPrediction(predictionResult);
        setPredictionLoading(false);
      } catch {
        if (!cancelled) {
          setSeasonalError("Unable to reach the dashboard intelligence services.");
          setSeasonalLoading(false);
          setBehavioralLoading(false);
          setPredictionLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    appliances,
    appliancesLoading,
    billsLoading,
    currentBill,
    history,
    profile,
    profileLoading,
    session?.access_token,
  ]);

  const summary = useMemo(
    () => buildDashboardSummary({ bills, currentBill, profile, appliances, seasonal, behavioral }),
    [appliances, behavioral, bills, currentBill, profile, seasonal],
  );

  const householdInsights = useMemo(
    () => buildHouseholdInsightCards({ profile, appliances, seasonal, behavioral }),
    [appliances, behavioral, profile, seasonal],
  );

  const recommendationPreview = useMemo(
    () => {
      if (currentBill?.recommendation_results?.length) {
        return currentBill.recommendation_results.slice(0, 3).map((item) => ({
          title: item.title,
          description: item.text,
          impact: item.category,
          priority: item.priority,
          category: item.category,
          relatedCategory: item.related_appliance_category ?? null,
        }));
      }

      return buildRecommendationPreview({ seasonal, behavioral }).map((item) => ({
        ...item,
        priority: "medium" as const,
        category: "Recommendation Preview",
        relatedCategory: null,
      }));
    },
    [behavioral, currentBill?.recommendation_results, seasonal],
  );

  const loading =
    profileLoading ||
    appliancesLoading ||
    billsLoading ||
    seasonalLoading ||
    behavioralLoading ||
    predictionLoading;
  const intelligenceReady = !currentBill || Boolean(seasonal && behavioral && prediction);
  const initialLoading = loading && !intelligenceReady;

  return {
    profile,
    appliances,
    bills,
    seasonal,
    behavioral,
    summary,
    householdInsights,
    recommendationPreview,
    prediction,
    loading,
    initialLoading,
    error: seasonalError ?? behavioralError ?? predictionError ?? null,
    hasBills: bills.length > 0,
  };
}
