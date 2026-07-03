from __future__ import annotations

from datetime import datetime, timezone

from .appliance_optimization_service import build_appliance_optimization_recommendations
from .behavioral_estimation_engine import build_behavioral_estimation
from .efficiency_analysis_service import build_efficiency_recommendations, calculate_energy_score
from .season_detection import detect_season_from_bill_month
from .seasonal_engine import build_seasonal_intelligence
from .seasonal_recommendation_service import build_seasonal_recommendations
from .tariff_intelligence_service import build_tariff_recommendations
from .usage_spike_detector import build_usage_spike_recommendations, detect_usage_spike

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def build_recommendation_engine_output(
  household: dict,
  appliances: list[dict],
  current_bill: dict,
  history: list[dict] | None = None,
  seasonal_intelligence: dict | None = None,
  behavioral_estimation: dict | None = None,
) -> dict:
  history = history or []
  seasonal_intelligence = seasonal_intelligence or build_seasonal_intelligence(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
  )
  behavioral_estimation = behavioral_estimation or build_behavioral_estimation(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_assumptions=seasonal_intelligence.get("behavior", {}).get("seasonal_assumptions", []),
  )

  season = seasonal_intelligence.get("season") or detect_season_from_bill_month(current_bill.get("bill_month"))
  energy_score = calculate_energy_score(
    current_bill=current_bill,
    household=household,
    appliances=appliances,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )
  daily_average = float(seasonal_intelligence.get("behavior", {}).get("daily_average_units") or 0)
  lead_category = None
  category_contributions = behavioral_estimation.get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")

  spike_summary = detect_usage_spike(
    current_bill=current_bill,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )

  recommendations = []
  recommendations.extend(build_seasonal_recommendations(season, seasonal_intelligence, behavioral_estimation))
  recommendations.extend(build_appliance_optimization_recommendations(behavioral_estimation, appliances))
  recommendations.extend(build_tariff_recommendations(current_bill, seasonal_intelligence))
  recommendations.extend(_build_behavioral_suggestions(household, seasonal_intelligence, behavioral_estimation))
  recommendations.extend(build_efficiency_recommendations(energy_score, season, lead_category, daily_average))
  recommendations.extend(build_usage_spike_recommendations(spike_summary))

  deduped_recommendations = _dedupe_recommendations(recommendations)
  deduped_recommendations.sort(key=lambda item: (PRIORITY_ORDER.get(item["priority"], 3), item["category"], item["title"]))
  deduped_recommendations = deduped_recommendations[:12]

  priority_breakdown = {
    "high": len([item for item in deduped_recommendations if item["priority"] == "high"]),
    "medium": len([item for item in deduped_recommendations if item["priority"] == "medium"]),
    "low": len([item for item in deduped_recommendations if item["priority"] == "low"]),
  }

  return {
    "estimated_analysis_label": "Estimated Analysis",
    "season": season,
    "energy_score": energy_score,
    "usage_spike": spike_summary,
    "recommendations": deduped_recommendations,
    "recommendation_metadata": {
      "generated_at": datetime.now(timezone.utc).isoformat(),
      "season": season,
      "lead_category": lead_category,
      "recommendation_count": len(deduped_recommendations),
      "priority_breakdown": priority_breakdown,
    },
  }


def _build_behavioral_suggestions(
  household: dict,
  seasonal_intelligence: dict,
  behavioral_estimation: dict,
) -> list[dict]:
  recommendations: list[dict] = []
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  behavior_assumptions = behavioral_estimation.get("behavior_assumptions") or []
  behavior_signals = seasonal_intelligence.get("behavior", {}).get("behavior_signals") or []
  lead_category = None
  category_contributions = behavioral_estimation.get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")

  if family_members >= 4:
    recommendations.append({
      "title": "Shared-use overlap likely matters",
      "text": "A larger family size can increase overlapping comfort, lighting, and entertainment demand. Scheduling some high-load habits more deliberately may help smooth the bill.",
      "category": "Behavioral Suggestion",
      "priority": "medium",
      "related_appliance_category": lead_category,
      "metadata": {
        "family_members": family_members,
      },
    })

  if room_count >= 3:
    recommendations.append({
      "title": "Room spread can quietly raise base usage",
      "text": "More active rooms often mean broader lighting and comfort coverage. Concentrating usage in occupied areas may be more effective than blanket reductions everywhere.",
      "category": "Household Efficiency Suggestion",
      "priority": "low",
      "related_appliance_category": "Lighting",
      "metadata": {
        "room_count": room_count,
      },
    })

  if behavior_signals:
    recommendations.append({
      "title": "Behavioral pattern worth acting on",
      "text": behavior_signals[0],
      "category": "Behavioral Suggestion",
      "priority": "medium",
      "related_appliance_category": lead_category,
      "metadata": {
        "source": "behavior_signal",
      },
    })

  if behavior_assumptions:
    recommendations.append({
      "title": "Current recommendation logic is anchored in your home context",
      "text": behavior_assumptions[0],
      "category": "Household Efficiency Suggestion",
      "priority": "low",
      "related_appliance_category": lead_category,
      "metadata": {
        "source": "behavior_assumption",
      },
    })

  return recommendations


def _dedupe_recommendations(recommendations: list[dict]) -> list[dict]:
  deduped: list[dict] = []
  seen: set[tuple[str, str]] = set()
  for item in recommendations:
    title = item.get("title", "").strip()
    category = item.get("category", "").strip()
    key = (category.lower(), title.lower())
    if not title or key in seen:
      continue
    seen.add(key)
    deduped.append(item)
  return deduped
