from __future__ import annotations

from .efficiency_analysis_service import calculate_energy_score


def build_assistant_context(
  household: dict,
  appliances: list[dict],
  current_bill: dict,
  history: list[dict],
  seasonal_intelligence: dict,
  behavioral_estimation: dict,
  recommendation_analysis: dict,
  prediction_analysis: dict,
) -> dict:
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  lead_category = _safe_first((behavioral_estimation.get("category_contributions") or []), "category")
  lead_appliance = _safe_first((behavioral_estimation.get("appliance_contributions") or []), "appliance_name")
  active_appliances = [item for item in appliances if int(item.get("quantity") or 0) > 0]
  energy_score = recommendation_analysis.get("energy_score") or calculate_energy_score(
    current_bill=current_bill,
    household=household,
    appliances=appliances,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )

  return {
    "household": {
      "family_members": family_members,
      "room_count": room_count,
      "house_type": household.get("house_type"),
      "city": household.get("city"),
      "state": household.get("state"),
      "monthly_budget_goal": household.get("monthly_budget_goal"),
    },
    "current_bill": current_bill,
    "history": history,
    "bill_count": len(history) + 1,
    "seasonal": seasonal_intelligence,
    "behavioral": behavioral_estimation,
    "recommendations": recommendation_analysis,
    "prediction": prediction_analysis,
    "lead_category": lead_category,
    "lead_appliance": lead_appliance,
    "active_appliances": active_appliances,
    "energy_score": energy_score,
  }


def _safe_first(items: list[dict], key: str) -> str | None:
  if not items:
    return None
  return items[0].get(key)
