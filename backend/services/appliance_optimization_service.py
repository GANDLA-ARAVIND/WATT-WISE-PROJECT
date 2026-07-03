from __future__ import annotations


def build_appliance_optimization_recommendations(
  behavioral_estimation: dict,
  appliances: list[dict],
) -> list[dict]:
  recommendations: list[dict] = []
  category_contributions = behavioral_estimation.get("category_contributions") or []
  appliance_contributions = behavioral_estimation.get("appliance_contributions") or []

  top_category = category_contributions[0] if category_contributions else None
  top_appliance = appliance_contributions[0] if appliance_contributions else None

  if top_category and top_category.get("category") == "Cooling":
    recommendations.append({
      "title": "Cooling optimization should come first",
      "text": "Cooling is estimated to be the strongest contribution category in this bill. Start with AC, cooler, and fan coordination before optimizing smaller categories.",
      "category": "Appliance Optimization",
      "priority": "high" if top_category.get("estimated_percentage", 0) >= 40 else "medium",
      "related_appliance_category": "Cooling",
      "metadata": {
        "estimated_percentage": top_category.get("estimated_percentage"),
      },
    })

  if top_category and top_category.get("category") == "Lighting":
    recommendations.append({
      "title": "Lighting efficiency looks actionable",
      "text": "Lighting appears unusually relevant in the current mix. LED upgrades and avoiding unnecessary daylight-hour lighting may create a believable savings opportunity.",
      "category": "Appliance Optimization",
      "priority": "medium",
      "related_appliance_category": "Lighting",
      "metadata": {
        "estimated_percentage": top_category.get("estimated_percentage"),
      },
    })

  if top_category and top_category.get("category") == "Entertainment":
    recommendations.append({
      "title": "Reduce standby and entertainment overlap",
      "text": "Entertainment load looks more important in this bill cycle. Standby reduction and better session clustering may help trim invisible consumption.",
      "category": "Appliance Optimization",
      "priority": "medium",
      "related_appliance_category": "Entertainment",
      "metadata": {
        "estimated_percentage": top_category.get("estimated_percentage"),
      },
    })

  if top_appliance:
    quantity = int(top_appliance.get("quantity") or 0)
    if quantity >= 2:
      recommendations.append({
        "title": f"Review {top_appliance.get('appliance_name')} usage across the home",
        "text": f"{top_appliance.get('appliance_name')} appears near the top of the estimated contribution mix, and multiple units can amplify overlap when they are active at similar times.",
        "category": "Appliance Optimization",
        "priority": "medium",
        "related_appliance_category": top_appliance.get("category"),
        "metadata": {
          "quantity": quantity,
          "estimated_percentage": top_appliance.get("estimated_percentage"),
        },
      })

  active_appliances = len([item for item in appliances if int(item.get("quantity") or 0) > 0])
  if active_appliances >= 8:
    recommendations.append({
      "title": "Large appliance spread needs prioritization",
      "text": "This home has a broad appliance footprint, so trying to optimize everything at once may be noisy. Focus first on the top estimated categories and the highest-overlap rooms.",
      "category": "Appliance Optimization",
      "priority": "low",
      "related_appliance_category": top_category.get("category") if top_category else None,
      "metadata": {
        "active_appliance_count": active_appliances,
      },
    })

  return recommendations
