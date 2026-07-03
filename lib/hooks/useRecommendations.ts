"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useBehavioralEstimation } from "@/lib/hooks/useBehavioralEstimation";
import { useBills } from "@/lib/hooks/useBills";
import { useProfile } from "@/lib/hooks/useProfile";
import { useSeasonalIntelligence } from "@/lib/hooks/useSeasonalIntelligence";

const apiBaseUrl = "/api/backend";

export type RecommendationItem = {
  title: string;
  text: string;
  category: string;
  priority: "high" | "medium" | "low";
  related_appliance_category: string | null;
  metadata: Record<string, unknown>;
};

export type RecommendationAnalysis = {
  estimated_analysis_label: string;
  season: string;
  energy_score: {
    grade: string;
    numeric: number;
    label: string;
  };
  usage_spike: {
    detected: boolean;
    severity: string;
    reasons: string[];
    lead_category: string | null;
    month_over_month_change: number | null;
  };
  recommendations: RecommendationItem[];
  recommendation_metadata: {
    generated_at: string;
    season: string;
    lead_category: string | null;
    recommendation_count: number;
    priority_breakdown: {
      high: number;
      medium: number;
      low: number;
    };
  };
};

export function useRecommendations() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const { appliances } = useAppliances();
  const { bills, loading: billsLoading } = useBills();
  const { data: seasonal } = useSeasonalIntelligence();
  const { data: behavioral } = useBehavioralEstimation();
  const [data, setData] = useState<RecommendationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBill = useMemo(() => (bills.length ? bills[bills.length - 1] : null), [bills]);
  const history = useMemo(() => (bills.length > 1 ? bills.slice(0, -1) : []), [bills]);
  const recommendationHistory = useMemo(
    () =>
      bills
        .filter((bill) => (bill.recommendation_results?.length ?? 0) > 0)
        .slice()
        .reverse(),
    [bills],
  );

  useEffect(() => {
    const run = async () => {
      if (!session?.access_token || !profile || !currentBill || !seasonal || !behavioral) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/recommendations/analyze`, {
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
            seasonal_intelligence: seasonal,
            behavioral_estimation: behavioral,
          }),
        });

        if (!response.ok) {
          setError("Failed to load recommendations.");
          setLoading(false);
          return;
        }

        const result = (await response.json()) as RecommendationAnalysis;
        setData(result);
        setLoading(false);
      } catch {
        setError("Unable to reach the recommendation engine.");
        setLoading(false);
      }
    };

    if (!billsLoading) {
      void run();
    }
  }, [appliances, behavioral, billsLoading, currentBill, history, profile, seasonal, session?.access_token]);

  return {
    data,
    loading: loading || billsLoading,
    error,
    hasBills: bills.length > 0,
    recommendationHistory,
  };
}
