from __future__ import annotations

SEASON_SEQUENCE = {
  "Summer": "Rainy",
  "Rainy": "Winter/Cooler",
  "Winter/Cooler": "Summer",
}


def build_seasonal_forecast(
  current_season: str,
  seasonal_intelligence: dict,
  behavioral_estimation: dict,
) -> dict:
  next_season = SEASON_SEQUENCE.get(current_season, current_season)
  lead_category = None
  category_contributions = behavioral_estimation.get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")

  seasonal_history_count = int((seasonal_intelligence.get("trends") or {}).get("seasonal_history_count") or 0)
  assumptions = (seasonal_intelligence.get("behavior") or {}).get("seasonal_assumptions") or []

  message = "Seasonal demand may stay broadly similar unless the next cycle shifts into a more climate-sensitive period."
  severity = "medium"

  if current_season == "Summer":
    message = "Cooling demand may stay elevated into the next bill cycle, especially if warmer evenings continue."
    if lead_category == "Cooling":
      severity = "high"
  elif current_season == "Rainy":
    message = "Rainy-period indoor load and lighting demand may stay more relevant in the next cycle."
  elif current_season == "Winter/Cooler":
    message = "Water-heating and earlier-evening indoor usage may keep cooler-season pressure active next month."
    if lead_category == "Utility":
      severity = "high"

  return {
    "current_season": current_season,
    "next_season": next_season,
    "seasonal_spike_message": message,
    "seasonal_spike_severity": severity,
    "seasonal_history_count": seasonal_history_count,
    "assumptions": assumptions[:3],
  }
