import type { UserProfile } from "@/lib/hooks/useProfile";
import type { ApplianceRecordInput } from "@/lib/hooks/useAppliances";

export type HouseholdValidationErrors = Partial<Record<"name" | "city" | "state" | "house_type" | "family_members" | "room_count", string>>;

export function validateHouseholdProfile(profile: Partial<UserProfile>): HouseholdValidationErrors {
  const errors: HouseholdValidationErrors = {};

  if (!profile.city?.trim()) errors.city = "City is required.";
  if (!profile.state?.trim()) errors.state = "State is required.";
  if (!profile.house_type?.trim()) errors.house_type = "House type is required.";

  if (profile.family_members == null || Number.isNaN(Number(profile.family_members))) {
    errors.family_members = "Family members are required.";
  } else if (Number(profile.family_members) < 1 || Number(profile.family_members) > 20) {
    errors.family_members = "Enter a value between 1 and 20.";
  }

  if (profile.room_count == null || Number.isNaN(Number(profile.room_count))) {
    errors.room_count = "Room count is required.";
  } else if (Number(profile.room_count) < 1 || Number(profile.room_count) > 20) {
    errors.room_count = "Enter a value between 1 and 20.";
  }

  return errors;
}

export function validateApplianceQuantities(appliances: ApplianceRecordInput[]) {
  const errors: Record<string, string> = {};

  for (const appliance of appliances) {
    if (appliance.quantity < 0) {
      errors[appliance.appliance_name] = "Quantity cannot be negative.";
    }
    if (appliance.quantity > appliance.recommended_max) {
      errors[appliance.appliance_name] = `Keep this below ${appliance.recommended_max}.`;
    }
  }

  return errors;
}
