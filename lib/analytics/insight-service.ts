import type { ApplianceRecord } from "@/lib/hooks/useAppliances";
import type { BehavioralEstimation } from "@/lib/hooks/useBehavioralEstimation";
import type { UserProfile } from "@/lib/hooks/useProfile";
import type { SeasonalIntelligence } from "@/lib/hooks/useSeasonalIntelligence";

export function buildHouseholdInsightCards(params: {
  profile: UserProfile | null;
  appliances: ApplianceRecord[];
  seasonal: SeasonalIntelligence | null;
  behavioral: BehavioralEstimation | null;
}) {
  const { profile, appliances, seasonal, behavioral } = params;
  const activeAppliances = appliances.filter((item) => item.quantity > 0);
  const leadCategory = behavioral?.category_contributions[0];
  const topAppliance = behavioral?.appliance_contributions[0];
  const familyMembers = profile?.family_members ?? 0;
  const roomCount = profile?.room_count ?? 0;

  const cards = [];

  if (leadCategory) {
    cards.push({
      title: `${leadCategory.category} is shaping this bill`,
      detail: `WattWise estimates ${leadCategory.category.toLowerCase()} at ${leadCategory.estimated_percentage}% of the current bill mix, so this is the most important category to interpret first.`,
      badge: "Lead category",
    });
  }

  if (topAppliance) {
    cards.push({
      title: `${topAppliance.appliance_name} looks highly influential`,
      detail: topAppliance.estimated_reason,
      badge: "Appliance priority",
    });
  }

  if (roomCount >= 3) {
    cards.push({
      title: "Room spread likely matters",
      detail: "A larger room count can expand lighting and comfort load across more active spaces, which raises background electricity pressure even before peak appliance use.",
      badge: "Household context",
    });
  }

  if (familyMembers >= 4) {
    cards.push({
      title: "Shared-use overlap is elevated",
      detail: "More household members usually means more overlapping comfort, entertainment, and lighting usage across the same billing cycle.",
      badge: "Household context",
    });
  }

  if (seasonal?.behavior.priority_appliances.length) {
    cards.push({
      title: "Seasonal appliance pattern detected",
      detail: seasonal.behavior.priority_appliances[0].season_reason,
      badge: seasonal.season,
    });
  }

  if (!cards.length && activeAppliances.length === 0) {
    cards.push({
      title: "More setup unlocks better insights",
      detail: "Add appliances and save a few bills to unlock household-specific comparisons, richer seasonal behavior, and stronger estimation depth.",
      badge: "Setup",
    });
  }

  return cards.slice(0, 4);
}

export function buildRecommendationPreview(params: {
  seasonal: SeasonalIntelligence | null;
  behavioral: BehavioralEstimation | null;
}) {
  const { seasonal, behavioral } = params;
  const leadCategory = behavioral?.category_contributions[0];
  const topAppliance = behavioral?.appliance_contributions[0];

  return [
    {
      title: `Start with ${leadCategory?.category?.toLowerCase() ?? "the strongest category"} habits`,
      description:
        behavioral?.household_behavior_insights[0]?.message ??
        "The highest estimated category usually offers the clearest first savings opportunity.",
      impact: "Highest expected impact",
    },
    {
      title: `Review ${topAppliance?.appliance_name ?? "top appliance"} behavior`,
      description:
        topAppliance?.estimated_reason ??
        "Appliance-level estimation will surface the most plausible device influence here.",
      impact: "Behavior-driven action",
    },
    {
      title: "Use the seasonal pattern as your timing guide",
      description:
        seasonal?.insights[0]?.message ??
        "Seasonal context helps decide where to focus savings effort first.",
      impact: "Season-aware planning",
    },
  ];
}
