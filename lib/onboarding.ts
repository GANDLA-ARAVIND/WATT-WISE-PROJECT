import type { ApplianceRecord } from "@/lib/hooks/useAppliances";
import type { UserProfile } from "@/lib/hooks/useProfile";

export function isHouseholdProfileReady(profile: UserProfile | null) {
  return Boolean(
    profile?.city &&
    profile?.state &&
    profile?.house_type &&
    profile?.family_members &&
    profile?.room_count,
  );
}

export function isApplianceSetupReady(appliances: ApplianceRecord[]) {
  return appliances.some((item) => item.quantity > 0);
}

export function isOnboardingSetupReady(profile: UserProfile | null, appliances: ApplianceRecord[]) {
  return Boolean(profile?.onboarding_completed_at) || (isHouseholdProfileReady(profile) && isApplianceSetupReady(appliances));
}

export function isOnboardingGateResolved(profile: UserProfile | null, appliances: ApplianceRecord[]) {
  return isOnboardingSetupReady(profile, appliances) || Boolean(profile?.onboarding_skipped_at);
}
