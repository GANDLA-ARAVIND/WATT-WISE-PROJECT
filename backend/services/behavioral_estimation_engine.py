from __future__ import annotations

from datetime import datetime, timezone

from .estimation_calculation_service import calculate_estimated_contributions
from .household_behavior_utility import build_household_modifiers
from .season_detection import detect_season_from_bill_month
from .seasonal_behavior import infer_seasonal_behavior
from .seasonal_trends import build_seasonal_trends


def build_behavioral_estimation(
  household: dict,
  appliances: list[dict],
  current_bill: dict,
  history: list[dict] | None = None,
  seasonal_assumptions: list[str] | None = None,
) -> dict:
  season = detect_season_from_bill_month(current_bill.get("bill_month"))
  behavior = infer_seasonal_behavior(season, household, appliances, current_bill)
  trends = build_seasonal_trends(current_bill, history or [])
  household_modifiers = build_household_modifiers(household)
  calculations = calculate_estimated_contributions(
    season=season,
    appliances=appliances,
    household_modifiers=household_modifiers,
    bill=current_bill,
    seasonal_behavior=behavior,
  )

  category_contributions = calculations["category_contributions"]
  appliance_contributions = calculations["appliance_contributions"]
  top_category = category_contributions[0]["category"] if category_contributions else None
  top_appliance = appliance_contributions[0]["appliance_name"] if appliance_contributions else None

  behavior_assumptions = _build_behavior_assumptions(
    season=season,
    household=household,
    top_category=top_category,
    top_appliance=top_appliance,
    seasonal_assumptions=seasonal_assumptions or behavior.get("seasonal_assumptions", []),
    trends=trends,
  )

  insights = _build_estimation_insights(
    season=season,
    top_category=top_category,
    top_appliance=top_appliance,
    category_contributions=category_contributions,
    trends=trends,
    behavior=behavior,
  )

  return {
    "season": season,
    "estimated_analysis_label": "Estimated Analysis",
    "category_contributions": category_contributions,
    "appliance_contributions": appliance_contributions,
    "behavior_assumptions": behavior_assumptions,
    "household_behavior_insights": insights,
    "estimation_metadata": {
      **calculations["estimation_metadata"],
      "season": season,
      "seasonal_history_count": trends.get("seasonal_history_count"),
      "generated_at": datetime.now(timezone.utc).isoformat(),
    },
  }


def _build_behavior_assumptions(
  season: str,
  household: dict,
  top_category: str | None,
  top_appliance: str | None,
  seasonal_assumptions: list[str],
  trends: dict,
) -> list[str]:
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  assumptions = []

  if top_category:
    assumptions.append(f"{top_category} is estimated as the strongest category influence in the current bill.")
  if top_appliance:
    assumptions.append(f"{top_appliance} appears near the top of the estimated appliance contribution mix.")
  if family_members >= 4:
    assumptions.append("Household size likely increases overlap between shared comfort load and room-based electricity use.")
  if room_count >= 3:
    assumptions.append("Room count likely expands lighting and comfort distribution across more active spaces.")
  if trends.get("seasonal_history_count", 0) > 0:
    assumptions.append("Past comparable seasonal bills are helping anchor the current estimated contribution split.")

  assumptions.extend(seasonal_assumptions[:2])

  deduped: list[str] = []
  seen: set[str] = set()
  for item in assumptions:
    if item in seen:
      continue
    seen.add(item)
    deduped.append(item)
  return deduped[:5]


def _build_estimation_insights(
  season: str,
  top_category: str | None,
  top_appliance: str | None,
  category_contributions: list[dict],
  trends: dict,
  behavior: dict,
) -> list[dict]:
  insights: list[dict] = []
  if top_category:
    insights.append({
      "title": f"{top_category} likely led this bill",
      "message": f"{top_category} is estimated to be the strongest contribution category in this {season.lower()} cycle, based on household setup and seasonal context.",
      "tone": "info",
    })
  if top_appliance:
    insights.append({
      "title": f"{top_appliance} looks highly influential",
      "message": f"{top_appliance} appears near the top of the estimated appliance mix, which suggests it played a meaningful role in the household load pattern.",
      "tone": "info",
    })
  if trends.get("month_over_month_change") is not None and category_contributions:
    change = trends["month_over_month_change"]
    if change >= 10:
      insights.append({
        "title": "Estimated increase driver",
        "message": f"The recent increase likely reflects stronger pressure from {category_contributions[0]['category'].lower()} and overlapping household usage rather than a single exact device event.",
        "tone": "warning",
      })
    elif change <= -10:
      insights.append({
        "title": "Estimated easing driver",
        "message": f"The reduced bill likely reflects softer pressure from the leading estimated categories in this cycle.",
        "tone": "info",
      })
  if not insights and behavior.get("behavior_signals"):
    insights.append({
      "title": "Estimated household behavior is active",
      "message": behavior["behavior_signals"][0],
      "tone": "info",
    })
  return insights[:3]
