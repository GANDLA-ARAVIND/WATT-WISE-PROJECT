"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppliances } from "@/lib/hooks/useAppliances";
import { useBills } from "@/lib/hooks/useBills";
import { useProfile } from "@/lib/hooks/useProfile";
import { useSeasonalIntelligence } from "@/lib/hooks/useSeasonalIntelligence";
import { useAuth } from "@/components/providers/AuthProvider";

const apiBaseUrl = "/api/backend";

export type CategoryContribution = {
  category: string;
  estimated_percentage: number;
  estimated_units: number;
  color: string;
  estimated_reason: string;
};

export type ApplianceContribution = {
  appliance_name: string;
  category: string;
  quantity: number;
  estimated_percentage: number;
  estimated_units: number;
  estimated_reason: string;
};

export type BehavioralEstimation = {
  season: string;
  estimated_analysis_label: string;
  category_contributions: CategoryContribution[];
  appliance_contributions: ApplianceContribution[];
  behavior_assumptions: string[];
  household_behavior_insights: Array<{
    title: string;
    message: string;
    tone: string;
  }>;
  estimation_metadata: Record<string, unknown>;
};

export function useBehavioralEstimation() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const { appliances } = useAppliances();
  const { bills, loading: billsLoading } = useBills();
  const { data: seasonal } = useSeasonalIntelligence();
  const [data, setData] = useState<BehavioralEstimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBill = useMemo(() => (bills.length ? bills[bills.length - 1] : null), [bills]);
  const history = useMemo(() => (bills.length > 1 ? bills.slice(0, -1) : []), [bills]);

  useEffect(() => {
    const run = async () => {
      if (!session?.access_token || !profile || !currentBill || !seasonal) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/behavioral/analyze`, {
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
            seasonal_assumptions: seasonal.behavior.seasonal_assumptions,
          }),
        });

        if (!response.ok) {
          setError("Failed to load estimated appliance contribution.");
          setLoading(false);
          return;
        }

        const result = (await response.json()) as BehavioralEstimation;
        setData(result);
        setLoading(false);
      } catch {
        setError("Unable to reach the behavioral estimation engine.");
        setLoading(false);
      }
    };

    if (!billsLoading) {
      void run();
    }
  }, [appliances, billsLoading, currentBill, history, profile, seasonal, session?.access_token]);

  return {
    data,
    loading: loading || billsLoading,
    error,
    hasBills: bills.length > 0,
  };
}
