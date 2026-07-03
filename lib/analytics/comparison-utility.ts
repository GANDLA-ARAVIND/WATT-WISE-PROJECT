import type { UserProfile } from "@/lib/hooks/useProfile";

function getHouseTypeFactor(houseType: string | null | undefined) {
  const normalized = houseType?.toLowerCase() ?? "";
  if (normalized.includes("independent")) return 1.08;
  if (normalized.includes("studio")) return 0.9;
  if (normalized.includes("3bhk")) return 1.12;
  if (normalized.includes("2bhk")) return 1.02;
  return 1;
}

export function estimateHouseholdBenchmarkUnits(profile: UserProfile | null) {
  if (!profile) return null;

  const familyMembers = profile.family_members ?? 0;
  const roomCount = profile.room_count ?? 0;
  const baseline = 105;
  const familyLoad = familyMembers * 26;
  const roomLoad = roomCount * 19;
  const houseTypeFactor = getHouseTypeFactor(profile.house_type);

  return Math.round((baseline + familyLoad + roomLoad) * houseTypeFactor);
}

export function buildHouseholdBenchmarkInsight(
  currentUnits: number | null,
  profile: UserProfile | null,
) {
  const benchmarkUnits = estimateHouseholdBenchmarkUnits(profile);
  if (!benchmarkUnits || currentUnits == null) {
    return null;
  }

  const delta = currentUnits - benchmarkUnits;
  const percentage = Math.round((Math.abs(delta) / benchmarkUnits) * 100);
  const familyText = profile?.family_members ? `${profile.family_members} family members` : "a similar household";
  const homeText = profile?.house_type ?? "similar homes";

  if (Math.abs(delta) < 12) {
    return {
      benchmarkUnits,
      deltaPercentage: percentage,
      direction: "aligned" as const,
      message: `Homes with ${familyText} in ${homeText} layouts typically land close to this bill cycle, so your current usage is tracking near the expected range.`,
    };
  }

  if (delta > 0) {
    return {
      benchmarkUnits,
      deltaPercentage: percentage,
      direction: "above" as const,
      message: `Homes with ${familyText} in ${homeText} layouts typically consume about ${percentage}% less electricity than this cycle, which suggests the current bill is running above a similar-home benchmark.`,
    };
  }

  return {
    benchmarkUnits,
    deltaPercentage: percentage,
    direction: "below" as const,
    message: `Homes with ${familyText} in ${homeText} layouts typically consume about ${percentage}% more electricity than this cycle, so your household is currently tracking leaner than the similar-home benchmark.`,
  };
}
