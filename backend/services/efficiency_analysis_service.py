from __future__ import annotations


def calculate_energy_score(
  current_bill: dict,
  household: dict,
  appliances: list[dict],
  seasonal_intelligence: dict | None = None,
  behavioral_estimation: dict | None = None,
) -> dict:
  if not current_bill:
    return {"grade": "--", "numeric": 0, "label": "Waiting for saved bill data"}

  score = 78
  units = float(current_bill.get("units_consumed") or 0)
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  seasonal_behavior = (seasonal_intelligence or {}).get("behavior", {})
  seasonal_trends = (seasonal_intelligence or {}).get("trends", {})
  daily_average = float(seasonal_behavior.get("daily_average_units") or 0)
  active_appliances = len([item for item in appliances if int(item.get("quantity") or 0) > 0])
  lead_category = None
  category_contributions = (behavioral_estimation or {}).get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")
  season = (seasonal_intelligence or {}).get("season")
  month_change = seasonal_trends.get("month_over_month_change") or 0

  if family_members > 0:
    units_per_person = units / max(family_members, 1)
    if units_per_person <= 55:
      score += 8
    elif units_per_person >= 90:
      score -= 7

  if room_count > 0:
    units_per_room = units / max(room_count, 1)
    if units_per_room <= 85:
      score += 5
    elif units_per_room >= 130:
      score -= 5

  if 0 < daily_average <= 7.5:
    score += 5
  if daily_average >= 13:
    score -= 6
  if active_appliances >= 8:
    score -= 3
  if lead_category == "Cooling" and season == "Summer":
    score -= 4
  if lead_category == "Utility" and season == "Winter/Cooler":
    score -= 2
  if month_change <= -8:
    score += 4
  if month_change >= 15:
    score -= 5

  score = min(96, max(42, round(score)))

  if score >= 90:
    return {"grade": "A", "numeric": score, "label": "Excellent efficiency discipline"}
  if score >= 82:
    return {"grade": "B+", "numeric": score, "label": "Strong household efficiency"}
  if score >= 74:
    return {"grade": "B", "numeric": score, "label": "Healthy efficiency baseline"}
  if score >= 66:
    return {"grade": "C", "numeric": score, "label": "Moderate efficiency pressure"}
  return {"grade": "D", "numeric": score, "label": "High optimization opportunity"}


def build_efficiency_recommendations(
  energy_score: dict,
  season: str,
  lead_category: str | None,
  daily_average: float,
) -> list[dict]:
  recommendations: list[dict] = []
  grade = energy_score.get("grade")
  numeric = int(energy_score.get("numeric") or 0)

  if grade == "B":
    recommendations.append({
      "title": "A healthy score can still be improved",
      "text": "This home is already on a decent efficiency baseline, but a few targeted changes around the strongest estimated category may help push it toward a stronger grade.",
      "category": "Efficiency Improvement",
      "priority": "medium",
      "related_appliance_category": lead_category,
      "metadata": {
        "energy_score_grade": grade,
        "energy_score_numeric": numeric,
      },
    })

  if grade in {"C", "D"}:
    recommendations.append({
      "title": f"Lift the current {grade} efficiency grade",
      "text": "This home has a meaningful optimization window right now. Focus first on the strongest estimated category before chasing smaller habits.",
      "category": "Efficiency Improvement",
      "priority": "high" if grade == "D" else "medium",
      "related_appliance_category": lead_category,
      "metadata": {
        "energy_score_grade": grade,
        "energy_score_numeric": numeric,
      },
    })

  if lead_category == "Cooling" and season == "Summer":
    recommendations.append({
      "title": "Use comfort settings to protect the energy score",
      "text": "Cooling appears to be carrying much of the seasonal pressure. Slightly higher AC set points and better fan coordination may improve efficiency without claiming exact device savings.",
      "category": "Efficiency Improvement",
      "priority": "medium",
      "related_appliance_category": "Cooling",
      "metadata": {
        "season": season,
        "energy_score_grade": grade,
      },
    })

  if daily_average >= 12:
    recommendations.append({
      "title": "Daily usage intensity is worth trimming",
      "text": "The current daily average suggests heavy overlap across the month. Reducing simultaneous high-load habits may be one of the cleanest ways to improve efficiency.",
      "category": "Energy Saving Opportunity",
      "priority": "medium",
      "related_appliance_category": lead_category,
      "metadata": {
        "daily_average_units": round(daily_average, 1),
      },
    })

  return recommendations
