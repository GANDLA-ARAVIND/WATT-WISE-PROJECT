from __future__ import annotations

from .appliance_season_mapping import (
  SEASONAL_APPLIANCE_PRIORITY,
  SEASONAL_BEHAVIOR_LIBRARY,
  normalize_appliance_name,
)


def infer_seasonal_behavior(
  season: str,
  household: dict,
  appliances: list[dict],
  bill: dict,
) -> dict:
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  units_consumed = float(bill.get("units_consumed") or 0)
  billing_days = max(int(bill.get("billing_days") or 30), 1)
  daily_average = units_consumed / billing_days if units_consumed else 0
  intensity = units_consumed / max(room_count, 1) if units_consumed else 0

  appliance_map: dict[str, int] = {}
  for item in appliances:
    normalized = normalize_appliance_name(str(item.get("appliance_name") or ""))
    quantity = int(item.get("quantity") or 0)
    if not normalized or quantity <= 0:
      continue
    appliance_map[normalized] = appliance_map.get(normalized, 0) + quantity

  weighted_appliances = []
  seasonal_weights = SEASONAL_APPLIANCE_PRIORITY.get(season, {})
  for name, quantity in appliance_map.items():
    weight = seasonal_weights.get(name, 1.0) * quantity
    weighted_appliances.append({
      "appliance_name": name,
      "quantity": quantity,
      "season_weight": round(weight, 2),
      "season_reason": _appliance_reason(season, name, quantity),
    })

  weighted_appliances.sort(key=lambda item: item["season_weight"], reverse=True)
  priority_appliances = weighted_appliances[:4]
  top_appliance = priority_appliances[0]["appliance_name"] if priority_appliances else None

  behavior_signals = _build_behavior_signals(
    season=season,
    appliance_map=appliance_map,
    top_appliance=top_appliance,
    family_members=family_members,
    room_count=room_count,
    daily_average=daily_average,
    intensity=intensity,
    units_consumed=units_consumed,
  )

  season_library = SEASONAL_BEHAVIOR_LIBRARY.get(season, [])

  return {
    "season": season,
    "household_intensity_per_room": round(intensity, 1),
    "daily_average_units": round(daily_average, 2),
    "behavior_signals": behavior_signals,
    "priority_appliances": priority_appliances,
    "seasonal_assumptions": season_library,
  }


def _build_behavior_signals(
  season: str,
  appliance_map: dict[str, int],
  top_appliance: str | None,
  family_members: int,
  room_count: int,
  daily_average: float,
  intensity: float,
  units_consumed: float,
) -> list[str]:
  signals: list[str] = []

  if season == "Summer":
    if top_appliance in {"AC", "Cooler"}:
      signals.append(f"{top_appliance} appears to be one of the strongest seasonal drivers in this bill cycle.")
    elif top_appliance == "Fans":
      signals.append("Fan-driven comfort load looks more visible in this bill than cooler-season appliance demand.")
    elif any(name in appliance_map for name in {"AC", "Cooler", "Fans"}):
      signals.append("Cooling appliances are likely dominating the seasonal electricity mix.")
  elif season == "Rainy":
    if appliance_map.get("Lights", 0) >= 4:
      signals.append("Lighting demand is likely higher because rainy-season daylight is less predictable.")
    if top_appliance == "Laptop/Desktop":
      signals.append("Indoor plug-load activity appears more relevant in this rainy-season bill cycle.")
    if top_appliance == "Refrigerator":
      signals.append("Base-load appliances look more visible because rainy-season cooling pressure appears moderate.")
  else:
    if top_appliance == "Geyser":
      signals.append("Water heating is likely contributing more than in warmer months.")
    elif top_appliance == "Lights":
      signals.append("Earlier indoor lighting use appears more relevant than high cooling demand in this cycle.")
    elif appliance_map.get("Geyser", 0) > 0:
      signals.append("Cooler-season water heating likely increased the household load mix.")

  if family_members >= 6:
    signals.append("A larger household size likely creates stronger overlap between shared comfort load, lighting, and appliance routines.")
  elif family_members >= 4:
    signals.append("Household size likely increases evening overlap across rooms and appliances.")

  if room_count >= 5:
    signals.append("A wider active-room spread likely keeps lighting and comfort load distributed across more of the home.")
  elif room_count >= 3:
    signals.append("More active rooms usually spread lighting and comfort loads across the home.")

  if daily_average >= 14:
    signals.append("Daily usage looks quite elevated for a single bill cycle, which suggests sustained appliance overlap rather than a short isolated spike.")
  elif daily_average >= 10:
    signals.append("The current bill suggests a relatively active daily consumption pattern for this season.")
  elif daily_average > 0 and daily_average <= 6:
    signals.append("Daily usage looks comparatively controlled, which suggests the seasonal load may be present without unusually heavy overlap.")

  if intensity >= 120:
    signals.append("Per-room intensity looks especially high, which can point to concentrated usage in fewer active spaces.")
  elif intensity >= 90:
    signals.append("Per-room consumption appears elevated enough to suggest meaningful overlap across the home's active spaces.")

  if units_consumed >= 450:
    signals.append("Overall bill volume points to a high-load cycle where seasonal appliances and household routines likely reinforced each other.")
  elif units_consumed <= 180 and units_consumed > 0:
    signals.append("Total consumption remains relatively moderate, so the seasonal pattern here may be more about usage mix than a dramatic surge.")

  deduped: list[str] = []
  seen: set[str] = set()
  for signal in signals:
    if signal in seen:
      continue
    seen.add(signal)
    deduped.append(signal)

  return deduped[:5]


def _appliance_reason(season: str, appliance_name: str, quantity: int) -> str:
  if season == "Summer" and appliance_name in {"AC", "Cooler", "Fans"}:
    return f"{appliance_name} usage typically rises in summer, especially with {quantity} unit(s) available."
  if season == "Rainy" and appliance_name == "Lights":
    return "Lighting often becomes more important during cloudy and rainy periods."
  if season == "Winter/Cooler" and appliance_name == "Geyser":
    return "Geyser usage often increases during cooler months because hot water demand rises."
  if appliance_name == "Refrigerator":
    return "Refrigeration is a steady base-load appliance across most seasons."
  return "This appliance is part of the seasonal context, but its influence is estimated rather than directly measured."
