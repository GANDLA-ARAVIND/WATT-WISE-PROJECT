from __future__ import annotations


def explain_seasonal_behavior(question: str, context: dict) -> dict:
  seasonal = context["seasonal"]
  current_season = seasonal.get("season") or "this season"
  behavior = seasonal.get("behavior") or {}
  priority_appliances = behavior.get("priority_appliances") or []
  assumptions = behavior.get("seasonal_assumptions") or []
  top_appliance = priority_appliances[0]["appliance_name"] if priority_appliances else "season-sensitive appliances"
  month_change = (seasonal.get("trends") or {}).get("month_over_month_change")

  answer = (
    f"{current_season} conditions are likely shaping this bill. "
    f"{top_appliance} appears especially relevant right now, and the assistant is reading the pattern as estimated seasonal behavior rather than exact device metering."
  )

  if month_change is not None and month_change > 0:
    answer += f" Compared with the previous bill, usage is up by about {month_change}%, which makes the seasonal shift more believable."
  elif month_change is not None and month_change < 0:
    answer += f" Compared with the previous bill, usage has eased by about {abs(month_change)}%, so the seasonal effect looks softer this cycle."

  if assumptions:
    answer += f" One of the strongest contextual assumptions right now is: {assumptions[0]}"

  return {
    "category": "seasonal_explanation",
    "answer": answer,
    "insights": assumptions[:2],
    "related_recommendations": _extract_related_recommendations(context, "Seasonal Recommendation"),
    "follow_ups": [
      "Why is my bill high?",
      "Which appliances contribute most?",
      "How can I reduce my electricity usage?",
    ],
  }


def _extract_related_recommendations(context: dict, category: str) -> list[str]:
  items = (context["recommendations"].get("recommendations") or [])
  return [item["title"] for item in items if item.get("category") == category][:2]
