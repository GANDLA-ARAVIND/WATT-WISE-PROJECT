"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useAppliances } from "@/lib/hooks/useAppliances";
import type { BehavioralEstimation } from "@/lib/hooks/useBehavioralEstimation";
import { useBills } from "@/lib/hooks/useBills";
import { useProfile } from "@/lib/hooks/useProfile";
import type { RecommendationAnalysis } from "@/lib/hooks/useRecommendations";
import type { SeasonalIntelligence } from "@/lib/hooks/useSeasonalIntelligence";

const apiBaseUrl = "/api/backend";

type UseIntelligenceBundleOptions = {
  includeRecommendations?: boolean;
};

export function useIntelligenceBundle(options: UseIntelligenceBundleOptions = {}) {
  const { includeRecommendations = false } = options;
  const { session } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { appliances, loading: appliancesLoading } = useAppliances();
  const { bills, loading: billsLoading } = useBills();
  const [seasonal, setSeasonal] = useState<SeasonalIntelligence | null>(null);
  const [behavioral, setBehavioral] = useState<BehavioralEstimation | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationAnalysis | null>(null);
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
    let cancelled = false;

    const run = async () => {
      if (profileLoading || appliancesLoading || billsLoading) {
        return;
      }

      if (!session?.access_token || !profile || !currentBill) {
        if (!cancelled) {
          setSeasonal(null);
          setBehavioral(null);
          setRecommendations(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

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
            setError("Failed to load seasonal intelligence.");
            setLoading(false);
          }
          return;
        }

        const seasonalResult = (await seasonalResponse.json()) as SeasonalIntelligence;
        if (cancelled) {
          return;
        }
        setSeasonal(seasonalResult);

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
            setError("Failed to load estimated appliance contribution.");
            setLoading(false);
          }
          return;
        }

        const behavioralResult = (await behavioralResponse.json()) as BehavioralEstimation;
        if (cancelled) {
          return;
        }
        setBehavioral(behavioralResult);

        if (includeRecommendations) {
          const recommendationResponse = await fetch(`${apiBaseUrl}/api/recommendations/analyze`, {
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

          if (!recommendationResponse.ok) {
            if (!cancelled) {
              setError("Failed to load recommendations.");
              setLoading(false);
            }
            return;
          }

          const recommendationResult = (await recommendationResponse.json()) as RecommendationAnalysis;
          if (!cancelled) {
            setRecommendations(recommendationResult);
          }
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to reach the intelligence services.");
          setLoading(false);
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
    includeRecommendations,
    profile,
    profileLoading,
    session?.access_token,
  ]);

  const initialLoading = loading && !seasonal && !behavioral && (!includeRecommendations || !recommendations);

  return {
    seasonal,
    behavioral,
    recommendations,
    loading,
    initialLoading,
    error,
    currentBill,
    hasBills: bills.length > 0,
    recommendationHistory,
  };
}
