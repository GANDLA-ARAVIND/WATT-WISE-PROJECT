from __future__ import annotations

from .appliance_category_service import (
  get_appliance_category,
  get_base_appliance_factor,
  get_category_color,
)
from .seasonal_influence_service import get_seasonal_category_multiplier


def calculate_estimated_contributions(
  season: str,
  appliances: list[dict],
  household_modifiers: dict,
  bill: dict,
  seasonal_behavior: dict,
) -> dict:
  units_consumed = float(bill.get("units_consumed") or 0)
  daily_average = float(seasonal_behavior.get("daily_average_units") or 0)
  top_priority_names = {
    item.get("appliance_name")
    for item in seasonal_behavior.get("priority_appliances", [])
  }

  appliance_entries: list[dict] = []
  category_scores: dict[str, float] = {}
  category_units_hint: dict[str, float] = {}

  occupancy_factor = household_modifiers.get("occupancy_factor", 1.0)
  room_spread_factor = household_modifiers.get("room_spread_factor", 1.0)
  house_type_factor = household_modifiers.get("house_type_factor", 1.0)

  for item in appliances:
    appliance_name = str(item.get("appliance_name") or "").strip()
    quantity = int(item.get("quantity") or 0)
    if not appliance_name or quantity <= 0:
      continue

    category = get_appliance_category(appliance_name)
    category_multiplier = get_seasonal_category_multiplier(season, category)
    base_factor = get_base_appliance_factor(appliance_name)
    activity_factor = _activity_factor(
      category=category,
      appliance_name=appliance_name,
      daily_average=daily_average,
      top_priority=appliance_name in top_priority_names,
      room_count=int(household_modifiers.get("room_count") or 0),
    )

    raw_score = (
      quantity
      * base_factor
      * category_multiplier
      * occupancy_factor
      * room_spread_factor
      * house_type_factor
      * activity_factor
    )

    appliance_entries.append({
      "appliance_name": appliance_name,
      "category": category,
      "quantity": quantity,
      "raw_score": raw_score,
      "seasonal_influence": round(category_multiplier, 2),
      "estimated_reason": _estimated_reason(
        season=season,
        appliance_name=appliance_name,
        category=category,
        quantity=quantity,
        top_priority=appliance_name in top_priority_names,
      ),
    })
    category_scores[category] = category_scores.get(category, 0) + raw_score

  total_score = sum(entry["raw_score"] for entry in appliance_entries)
  if total_score <= 0:
    return {
      "category_contributions": [],
      "appliance_contributions": [],
      "estimation_metadata": {
        "estimated_units_basis": units_consumed,
        "mode": "insufficient_appliance_context",
      },
    }

  for entry in appliance_entries:
    entry["estimated_percentage"] = round((entry["raw_score"] / total_score) * 100, 1)
    entry["estimated_units"] = round(units_consumed * (entry["estimated_percentage"] / 100), 1) if units_consumed else 0.0

  category_contributions = []
  for category, score in category_scores.items():
    percentage = round((score / total_score) * 100, 1)
    estimated_units = round(units_consumed * (percentage / 100), 1) if units_consumed else 0.0
    category_units_hint[category] = estimated_units
    category_contributions.append({
      "category": category,
      "estimated_percentage": percentage,
      "estimated_units": estimated_units,
      "color": get_category_color(category),
      "estimated_reason": _category_reason(season, category, percentage),
    })

  appliance_entries.sort(key=lambda item: item["estimated_percentage"], reverse=True)
  category_contributions.sort(key=lambda item: item["estimated_percentage"], reverse=True)

  return {
    "category_contributions": category_contributions,
    "appliance_contributions": [
      {
        "appliance_name": entry["appliance_name"],
        "category": entry["category"],
        "quantity": entry["quantity"],
        "estimated_percentage": entry["estimated_percentage"],
        "estimated_units": entry["estimated_units"],
        "estimated_reason": entry["estimated_reason"],
      }
      for entry in appliance_entries
    ],
    "estimation_metadata": {
      "estimated_units_basis": units_consumed,
      "daily_average_units": daily_average,
      "occupancy_factor": occupancy_factor,
      "room_spread_factor": room_spread_factor,
      "house_type_factor": house_type_factor,
      "category_units_hint": category_units_hint,
      "mode": "behavioral_estimation",
    },
  }


def _activity_factor(
  category: str,
  appliance_name: str,
  daily_average: float,
  top_priority: bool,
  room_count: int,
) -> float:
  factor = 1.0
  if top_priority:
    factor += 0.15
  if daily_average >= 12:
    factor += 0.12
  elif daily_average <= 6:
    factor -= 0.05

  if category == "Lighting" and room_count >= 3:
    factor += 0.1
  if category == "Always Active":
    factor += 0.08
  if appliance_name == "Geyser" and daily_average >= 10:
    factor += 0.1
  return factor


def _estimated_reason(
  season: str,
  appliance_name: str,
  category: str,
  quantity: int,
  top_priority: bool,
) -> str:
  if top_priority:
    return f"{appliance_name} appears to be one of the stronger estimated contributors in this {season.lower()} bill cycle."
  if category == "Always Active":
    return f"{appliance_name} likely provides steady base-load demand across the billing cycle."
  if category == "Lighting":
    return f"Lighting contribution is estimated from room spread, season, and the {quantity} installed lighting point(s)."
  return f"{appliance_name} is included as an estimated contributor based on season, quantity, and household context."


def _category_reason(season: str, category: str, percentage: float) -> str:
  if category == "Cooling":
    return f"{category} appliances are estimated to be a leading influence during this {season.lower()} cycle." if percentage >= 30 else f"{category} remains part of the current seasonal load mix."
  if category == "Utility":
    return f"{category} appliances appear more relevant in this {season.lower()} pattern." if percentage >= 25 else f"{category} is estimated as a supporting contributor."
  if category == "Lighting":
    return "Lighting contribution is estimated from room spread, season, and indoor-use assumptions."
  if category == "Always Active":
    return "Always-active appliances likely provide a stable base layer in the estimated household load."
  return "Entertainment contribution is estimated from always-available home usage patterns."
