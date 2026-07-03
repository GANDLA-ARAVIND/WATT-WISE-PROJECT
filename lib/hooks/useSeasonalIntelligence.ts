"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useAppliances } from "@/lib/hooks/useAppliances";
import { useBills } from "@/lib/hooks/useBills";
import { useProfile } from "@/lib/hooks/useProfile";

const apiBaseUrl = "/api/backend";

export type SeasonalIntelligence = {
  season: string;
  season_card: {
    title: string;
    subtitle: string;
    description: string;
  };
  behavior: {
    household_intensity_per_room: number;
    daily_average_units: number;
    behavior_signals: string[];
    priority_appliances: Array<{
      appliance_name: string;
      quantity: number;
      season_weight: number;
      season_reason: string;
    }>;
    seasonal_assumptions: string[];
  };
  trends: {
    current_season: string;
    current_units: number;
    current_amount: number;
    month_over_month_change: number | null;
    seasonal_average_units: number;
    seasonal_average_amount: number;
    seasonal_history_count: number;
  };
  insights: Array<{
    title: string;
    message: string;
    tone: string;
  }>;
  seasonal_metadata: Record<string, unknown>;
};

export function useSeasonalIntelligence() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const { appliances } = useAppliances();
  const { bills, loading: billsLoading } = useBills();
  const [data, setData] = useState<SeasonalIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBill = useMemo(() => (bills.length ? bills[bills.length - 1] : null), [bills]);
  const history = useMemo(() => (bills.length > 1 ? bills.slice(0, -1) : []), [bills]);

  useEffect(() => {
    const run = async () => {
      if (!session?.access_token || !profile || !currentBill) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl}/api/seasonal/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            household: profile,
            appliances,
            current_bill: currentBill,
            history
          })
        });
      } catch {
        setError(`Cannot reach the backend API at ${apiBaseUrl}.`);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError("Failed to load seasonal intelligence.");
        setLoading(false);
        return;
      }

      const result = (await response.json()) as SeasonalIntelligence;
      setData(result);
      setLoading(false);
    };

    if (!billsLoading) {
      run();
    }
  }, [appliances, billsLoading, currentBill, history, profile, session?.access_token]);

  return {
    data,
    loading: loading || billsLoading,
    error,
    currentBill,
    hasBills: bills.length > 0
  };
}
