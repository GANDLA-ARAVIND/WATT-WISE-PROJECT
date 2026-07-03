from __future__ import annotations


def build_seasonal_recommendations(
  season: str,
  seasonal_intelligence: dict,
  behavioral_estimation: dict | None = None,
) -> list[dict]:
  behavior = seasonal_intelligence.get("behavior", {})
  insights = seasonal_intelligence.get("insights", [])
  priority_appliances = behavior.get("priority_appliances", [])
  top_appliance = priority_appliances[0]["appliance_name"] if priority_appliances else None
  lead_category = None
  category_contributions = (behavioral_estimation or {}).get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")

  recommendations: list[dict] = []

  if season == "Summer":
    recommendations.append({
      "title": "Tune cooling comfort before chasing smaller loads",
      "text": "Cooling appliances likely contributed to much of this month's pressure. Nudging AC set points upward and pairing them better with fans may reduce seasonal strain.",
      "category": "Seasonal Recommendation",
      "priority": "high" if lead_category == "Cooling" else "medium",
      "related_appliance_category": "Cooling",
      "metadata": {
        "season": season,
        "top_appliance": top_appliance,
      },
    })
    if top_appliance and top_appliance.lower() == "fans":
      recommendations.append({
        "title": "Fan-heavy summer pattern detected",
        "text": "Fan usage appears elevated during summer conditions. That can still be a useful optimization target if multiple rooms are active for long stretches.",
        "category": "Seasonal Recommendation",
        "priority": "medium",
        "related_appliance_category": "Cooling",
        "metadata": {
          "season": season,
          "top_appliance": top_appliance,
        },
      })

  if season == "Winter/Cooler":
    recommendations.append({
      "title": "Review water-heating habits this cycle",
      "text": "Water heating appliances may have increased cooler-season electricity pressure. Shorter geyser run windows and better timing may help reduce winter costs.",
      "category": "Seasonal Recommendation",
      "priority": "high" if lead_category == "Utility" else "medium",
      "related_appliance_category": "Utility",
      "metadata": {
        "season": season,
      },
    })

  if season == "Rainy":
    recommendations.append({
      "title": "Rainy-season indoor load looks more important",
      "text": "Lighting and indoor appliance usage appear more relevant in this cycle, so trimming avoidable daytime lighting and idle device use may matter more than usual.",
      "category": "Seasonal Recommendation",
      "priority": "medium",
      "related_appliance_category": "Lighting",
      "metadata": {
        "season": season,
      },
    })

  if insights:
    recommendations.append({
      "title": "Use the current seasonal pattern as your timing guide",
      "text": insights[0].get("message"),
      "category": "Seasonal Recommendation",
      "priority": "low",
      "related_appliance_category": lead_category,
      "metadata": {
        "season": season,
      },
    })

  return recommendations
