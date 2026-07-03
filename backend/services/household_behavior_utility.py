from __future__ import annotations


def build_household_modifiers(household: dict) -> dict[str, float]:
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  house_type = str(household.get("house_type") or "").strip().lower()

  occupancy_factor = 1.0
  if family_members >= 6:
    occupancy_factor = 1.18
  elif family_members >= 4:
    occupancy_factor = 1.1
  elif family_members == 1:
    occupancy_factor = 0.92

  room_spread_factor = 1.0
  if room_count >= 5:
    room_spread_factor = 1.16
  elif room_count >= 3:
    room_spread_factor = 1.08
  elif room_count == 1:
    room_spread_factor = 0.94

  house_type_factor = 1.0
  if "independent" in house_type:
    house_type_factor = 1.08
  elif "studio" in house_type:
    house_type_factor = 0.92

  return {
    "occupancy_factor": occupancy_factor,
    "room_spread_factor": room_spread_factor,
    "house_type_factor": house_type_factor,
    "family_members": family_members,
    "room_count": room_count,
  }
