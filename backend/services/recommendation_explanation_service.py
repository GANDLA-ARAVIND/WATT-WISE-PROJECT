from __future__ import annotations


def explain_recommendations(question: str, context: dict) -> dict:
  recommendation_analysis = context["recommendations"]
  lead_category = recommendation_analysis.get("recommendation_metadata", {}).get("lead_category") or context.get("lead_category")
  top_items = (recommendation_analysis.get("recommendations") or [])[:3]
  energy_score = context["energy_score"]

  answer = (
    f"The current guidance is focused on {lead_category.lower() if lead_category else 'your strongest estimated load drivers'}. "
    f"Your energy score is {energy_score.get('grade')}, so WattWise is prioritizing believable optimization steps instead of generic tips."
  )
  if top_items:
    answer += f" The first recommendation right now is '{top_items[0]['title']}', because it lines up with the latest seasonal and behavioral signals."

  return {
    "category": "recommendation_explanation",
    "answer": answer,
    "insights": [item["text"] for item in top_items[:2]],
    "related_recommendations": [item["title"] for item in top_items],
    "follow_ups": [
      "Which appliances contribute most?",
      "Why did usage increase this month?",
      "What may happen next month?",
    ],
  }
