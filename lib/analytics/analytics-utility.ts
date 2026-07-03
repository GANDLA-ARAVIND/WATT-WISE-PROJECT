import type { ApplianceRecord } from "@/lib/hooks/useAppliances";
import type { BehavioralEstimation } from "@/lib/hooks/useBehavioralEstimation";
import type { BillRecord } from "@/lib/hooks/useBills";
import type { UserProfile } from "@/lib/hooks/useProfile";
import type { SeasonalIntelligence } from "@/lib/hooks/useSeasonalIntelligence";
import { buildHouseholdBenchmarkInsight } from "@/lib/analytics/comparison-utility";

type TrendPoint = {
  label: string;
  units: number;
  amount: number;
  season: string;
};

type SeasonalSummary = {
  season: string;
  averageUnits: number;
  averageAmount: number;
  bills: number;
};

function shortMonthLabel(raw: string | null | undefined) {
  if (!raw) return "--";
  const match = raw.match(/\b([A-Za-z]{3,})\b(?:\s+|-|\/)?(20\d{2})?/);
  if (match) {
    return `${match[1].slice(0, 3)}${match[2] ? ` '${match[2].slice(-2)}` : ""}`;
  }
  return raw;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function buildMonthlyTrendData(bills: BillRecord[]): TrendPoint[] {
  return bills.map((bill) => ({
    label: shortMonthLabel(bill.bill_month),
    units: Number(bill.units_consumed ?? 0),
    amount: Number(bill.bill_amount ?? 0),
    season: bill.season ?? "Unknown",
  }));
}

export function buildSeasonalComparisonData(bills: BillRecord[]): SeasonalSummary[] {
  const grouped = new Map<string, { units: number; amount: number; bills: number }>();

  for (const bill of bills) {
    const season = bill.season ?? "Unknown";
    const bucket = grouped.get(season) ?? { units: 0, amount: 0, bills: 0 };
    bucket.units += Number(bill.units_consumed ?? 0);
    bucket.amount += Number(bill.bill_amount ?? 0);
    bucket.bills += 1;
    grouped.set(season, bucket);
  }

  return Array.from(grouped.entries()).map(([season, value]) => ({
    season,
    averageUnits: value.bills ? round(value.units / value.bills) : 0,
    averageAmount: value.bills ? round(value.amount / value.bills) : 0,
    bills: value.bills,
  }));
}

export function calculateEnergyScore(params: {
  currentBill: BillRecord | null;
  profile: UserProfile | null;
  appliances: ApplianceRecord[];
  seasonal: SeasonalIntelligence | null;
  behavioral: BehavioralEstimation | null;
}) {
  const { currentBill, profile, appliances, seasonal, behavioral } = params;
  if (!currentBill) {
    return { grade: "--", numeric: 0, label: "Waiting for saved bill data" };
  }

  let score = 78;
  const units = Number(currentBill.units_consumed ?? 0);
  const familyMembers = profile?.family_members ?? 0;
  const roomCount = profile?.room_count ?? 0;
  const dailyAverage = seasonal?.behavior.daily_average_units ?? 0;
  const activeAppliances = appliances.filter((item) => item.quantity > 0).length;
  const leadCategory = behavioral?.category_contributions[0]?.category;

  if (familyMembers > 0) {
    const unitsPerPerson = units / Math.max(familyMembers, 1);
    if (unitsPerPerson <= 55) score += 8;
    else if (unitsPerPerson >= 90) score -= 7;
  }

  if (roomCount > 0) {
    const unitsPerRoom = units / Math.max(roomCount, 1);
    if (unitsPerRoom <= 85) score += 5;
    else if (unitsPerRoom >= 130) score -= 5;
  }

  if (dailyAverage <= 7.5 && dailyAverage > 0) score += 5;
  if (dailyAverage >= 13) score -= 6;
  if (activeAppliances >= 8) score -= 3;
  if (leadCategory === "Cooling" && seasonal?.season === "Summer") score -= 4;
  if (leadCategory === "Utility" && seasonal?.season === "Winter/Cooler") score -= 2;
  if ((seasonal?.trends.month_over_month_change ?? 0) <= -8) score += 4;
  if ((seasonal?.trends.month_over_month_change ?? 0) >= 15) score -= 5;

  score = Math.min(96, Math.max(42, Math.round(score)));

  if (score >= 90) return { grade: "A", numeric: score, label: "Excellent efficiency discipline" };
  if (score >= 82) return { grade: "B+", numeric: score, label: "Strong household efficiency" };
  if (score >= 74) return { grade: "B", numeric: score, label: "Healthy efficiency baseline" };
  if (score >= 66) return { grade: "C", numeric: score, label: "Moderate efficiency pressure" };
  return { grade: "D", numeric: score, label: "High optimization opportunity" };
}

export function calculateCarbonEstimate(currentUnits: number | null) {
  if (currentUnits == null) return null;
  const kg = round(currentUnits * 0.82, 1);
  return {
    kg,
    tone: kg >= 250 ? "high" : kg >= 140 ? "medium" : "low",
    description:
      kg >= 250
        ? "This bill cycle carries a heavier estimated carbon footprint than a typical urban household month."
        : kg >= 140
          ? "This cycle sits in a moderate household carbon range, with room for targeted savings."
          : "This cycle stays in a lighter estimated carbon range for a home with similar bill inputs.",
  };
}

export function buildSpikeSummary(bills: BillRecord[]) {
  if (!bills.length) return null;

  let highest: BillRecord | null = null;
  let lowest: BillRecord | null = null;
  for (const bill of bills) {
    if (!highest || Number(bill.units_consumed ?? 0) > Number(highest.units_consumed ?? 0)) highest = bill;
    if (!lowest || Number(bill.units_consumed ?? 0) < Number(lowest.units_consumed ?? 0)) lowest = bill;
  }

  if (!highest || !lowest) return null;
  return {
    highestMonth: highest.bill_month,
    highestUnits: Number(highest.units_consumed ?? 0),
    lowestMonth: lowest.bill_month,
    lowestUnits: Number(lowest.units_consumed ?? 0),
  };
}

export function buildDashboardSummary(params: {
  bills: BillRecord[];
  currentBill?: BillRecord | null;
  profile: UserProfile | null;
  appliances: ApplianceRecord[];
  seasonal: SeasonalIntelligence | null;
  behavioral: BehavioralEstimation | null;
}) {
  const { bills, currentBill: currentBillOverride, profile, appliances, seasonal, behavioral } = params;
  const currentBill = currentBillOverride ?? (bills.length ? bills[bills.length - 1] : null);
  const dailyAverage = seasonal?.behavior.daily_average_units ?? (currentBill?.billing_days && currentBill.units_consumed != null
    ? round(Number(currentBill.units_consumed) / currentBill.billing_days)
    : null);

  return {
    currentBill,
    dailyAverage,
    energyScore: calculateEnergyScore({ currentBill, profile, appliances, seasonal, behavioral }),
    carbon: calculateCarbonEstimate(currentBill?.units_consumed ?? null),
    monthlyTrend: buildMonthlyTrendData(bills),
    seasonalComparison: buildSeasonalComparisonData(bills),
    benchmark: buildHouseholdBenchmarkInsight(currentBill?.units_consumed ?? null, profile),
    spikeSummary: buildSpikeSummary(bills),
  };
}
