from __future__ import annotations

from .season_detection import detect_season_from_bill_month
from .seasonal_behavior import infer_seasonal_behavior
from .seasonal_insights import generate_seasonal_insights
from .seasonal_trends import build_seasonal_trends


def build_seasonal_intelligence(
  household: dict,
  appliances: list[dict],
  current_bill: dict,
  history: list[dict] | None = None,
) -> dict:
  season = detect_season_from_bill_month(current_bill.get("bill_month"))
  behavior = infer_seasonal_behavior(season, household, appliances, current_bill)
  trends = build_seasonal_trends(current_bill, history or [])
  insights = generate_seasonal_insights(season, household, current_bill, behavior, trends)

  return {
    "season": season,
    "season_card": {
      "title": f"{season} context detected",
      "subtitle": "Estimated seasonal behavior",
      "description": _season_description(season, behavior),
    },
    "behavior": behavior,
    "trends": trends,
    "insights": insights,
    "seasonal_metadata": {
      "season": season,
      "daily_average_units": behavior.get("daily_average_units"),
      "household_intensity_per_room": behavior.get("household_intensity_per_room"),
      "seasonal_history_count": trends.get("seasonal_history_count"),
    },
  }


def _season_description(season: str, behavior: dict) -> str:
  priority = behavior.get("priority_appliances", [])
  if season == "Summer" and priority:
    return f"{priority[0]['appliance_name']} and other comfort appliances are likely more active in this bill cycle."
  if season == "Rainy":
    return "Lighting and indoor appliance overlap are likely more relevant in the current bill cycle."
  return "Cooler-season lighting and water-heating patterns are likely more relevant than high cooling demand."
