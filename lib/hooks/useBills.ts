"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { sortBillsChronologically } from "@/lib/bill-chronology";

export type BillRecord = {
  id: string;
  bill_month: string;
  units_consumed: number | null;
  bill_amount: number | null;
  billing_days: number | null;
  season: string | null;
  uploaded_file_url: string | null;
  created_at: string | null;
  meter_reading: number | null;
  average_month_units: number | null;
  recorded_md: number | null;
  energy_charges: number | null;
  fixed_charges: number | null;
  electricity_duty: number | null;
  interest_on_ed: number | null;
  surcharge: number | null;
  adjustment: number | null;
  interest_on_cd: number | null;
  loss_gain: number | null;
  gjs_subsidy: number | null;
  net_bill_amount: number | null;
  tariff_details: string | null;
  subsidy: number | null;
  seasonal_metadata?: Record<string, unknown> | null;
  seasonal_behavior_insights?: unknown[] | null;
  seasonal_assumptions?: unknown[] | null;
  estimated_contribution_results?: unknown[] | null;
  estimated_appliance_contributions?: unknown[] | null;
  estimation_metadata?: Record<string, unknown> | null;
  behavioral_assumptions?: string[] | null;
  recommendation_results?: Array<{
    title: string;
    text: string;
    category: string;
    priority: "high" | "medium" | "low";
    related_appliance_category?: string | null;
    metadata?: Record<string, unknown>;
  }> | null;
  recommendation_metadata?: Record<string, unknown> | null;
  prediction_results?: {
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
  } | null;
  prediction_metadata?: Record<string, unknown> | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  updated_at?: string | null;
};

const billSelect = `
  id,bill_month,units_consumed,bill_amount,billing_days,season,uploaded_file_url,created_at,
  meter_reading,average_month_units,recorded_md,energy_charges,fixed_charges,electricity_duty,
  interest_on_ed,surcharge,adjustment,interest_on_cd,loss_gain,gjs_subsidy,net_bill_amount,
  tariff_details,subsidy,seasonal_metadata,seasonal_behavior_insights,seasonal_assumptions,
  estimated_contribution_results,estimated_appliance_contributions,estimation_metadata,behavioral_assumptions,
  recommendation_results,recommendation_metadata,prediction_results,prediction_metadata,
  is_deleted,deleted_at,updated_at
`;

type BillsCache = {
  userId: string;
  bills: BillRecord[];
};

let billsCache: BillsCache | null = null;
let billsFetchPromise: Promise<BillsCache> | null = null;
let billsFetchPromiseUserId: string | null = null;
const billsListeners = new Set<(cache: BillsCache | null) => void>();

function updateBillsCache(cache: BillsCache | null) {
  billsCache = cache;
  billsListeners.forEach((listener) => listener(cache));
}

export function useBills() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const cachedBills = user && billsCache?.userId === user.id ? billsCache : null;
  const [bills, setBills] = useState<BillRecord[]>(cachedBills?.bills ?? []);
  const [loading, setLoading] = useState(!cachedBills);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const listener = (cache: BillsCache | null) => {
      if (!cache || cache.userId !== user.id) return;
      setBills(cache.bills);
      setLoading(false);
    };

    billsListeners.add(listener);
    return () => {
      billsListeners.delete(listener);
    };
  }, [user]);

  const refresh = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!user) {
      updateBillsCache(null);
      setBills([]);
      setLoading(false);
      return;
    }

    if (!force && billsCache?.userId === user.id) {
      setBills(billsCache.bills);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchBills = async (): Promise<BillsCache> => {
      const { data, error: fetchError } = await supabase
        .from("bills")
        .select(billSelect)
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      return {
        userId: user.id,
        bills: sortBillsChronologically(data ?? []),
      };
    };

    try {
      if (!billsFetchPromise || billsFetchPromiseUserId !== user.id) {
        billsFetchPromiseUserId = user.id;
        billsFetchPromise = fetchBills().finally(() => {
          billsFetchPromise = null;
          billsFetchPromiseUserId = null;
        });
      }

      const nextCache = await billsFetchPromise;
      updateBillsCache(nextCache);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Bills could not be loaded.");
      setLoading(false);
      return;
    }
  }, [supabase, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { bills, loading, error, refresh };
}
