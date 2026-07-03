from __future__ import annotations

from .energy_insight_generator import (
  explain_appliance_contribution,
  explain_bill_fact,
  explain_bill_comparison,
  explain_energy_score,
  explain_general,
  explain_specific_load,
  explain_usage,
)
from .prediction_explanation_service import explain_prediction
from .recommendation_explanation_service import explain_recommendations
from .seasonal_explanation_utility import explain_seasonal_behavior


SUGGESTED_QUESTIONS = [
  "Why is my bill high?",
  "Which appliances contribute most?",
  "Compare this month with last month",
  "What is my daily average usage?",
  "Why is cooling usage high?",
  "How can I improve my energy score?",
  "How can I reduce my electricity usage?",
  "Why is summer usage higher?",
  "What may happen next month?",
]


def build_assistant_response(question: str, context: dict) -> dict:
  normalized = (question or "").strip()
  lowered = normalized.lower()
  intent = _classify_intent(lowered)

  if intent == "usage":
    result = explain_usage(normalized, context)
  elif intent == "bill_fact":
    result = explain_bill_fact(normalized, context)
  elif intent == "comparison":
    result = explain_bill_comparison(normalized, context)
  elif intent == "appliance":
    result = explain_appliance_contribution(normalized, context)
  elif intent == "specific_load":
    result = explain_specific_load(normalized, context)
  elif intent == "seasonal":
    result = explain_seasonal_behavior(normalized, context)
  elif intent == "prediction":
    result = explain_prediction(normalized, context)
  elif intent == "recommendation":
    result = explain_recommendations(normalized, context)
  elif intent == "energy_score":
    result = explain_energy_score(normalized, context)
  else:
    result = explain_general(normalized, context)

  return {
    "question": normalized,
    "answer": result["answer"],
    "assistant_category": result["category"],
    "generated_insights": result["insights"],
    "related_recommendations": result["related_recommendations"],
    "follow_up_suggestions": result["follow_ups"][:4],
    "grounding": {
      "season": context["seasonal"].get("season"),
      "lead_category": context.get("lead_category"),
      "energy_score": context["energy_score"].get("grade"),
      "bill_count": context.get("bill_count"),
    },
  }


def default_suggested_questions() -> list[str]:
  return SUGGESTED_QUESTIONS


def build_assistant_summary(context: dict) -> dict:
  current_bill = context["current_bill"]
  prediction = context["prediction"]
  return {
    "latest_bill_month": current_bill.get("bill_month"),
    "latest_units": current_bill.get("units_consumed"),
    "latest_bill_amount": current_bill.get("bill_amount"),
    "season": context["seasonal"].get("season"),
    "energy_score": context["energy_score"].get("grade"),
    "lead_category": context.get("lead_category"),
    "lead_appliance": context.get("lead_appliance"),
    "next_bill_range": prediction.get("expected_next_bill"),
    "prediction_confidence": prediction.get("prediction_confidence"),
    "bill_count": context.get("bill_count"),
  }


def _classify_intent(question: str) -> str:
  if any(keyword in question for keyword in ["compare", "compared", "last month", "previous month", "what changed most", "difference this month"]):
    return "comparison"
  if any(keyword in question for keyword in ["units consumed", "unit consumed", "what is the units", "how many units", "bill amount", "what is my amount", "billing days", "bill month", "current bill month", "what month", "daily average", "average usage"]):
    return "bill_fact"
  if any(keyword in question for keyword in ["summer", "winter", "rainy", "season", "lighting increase"]):
    return "seasonal"
  if any(keyword in question for keyword in ["cooling", "ac", "fan usage", "lighting high", "geyser", "heater", "entertainment", "tv", "desktop", "laptop", "refrigerator"]):
    return "specific_load"
  if any(keyword in question for keyword in ["appliance", "contribute", "cooling usage", "which appliances"]):
    return "appliance"
  if any(keyword in question for keyword in ["high", "increase", "usage increase", "bill high", "why is my bill"]):
    return "usage"
  if any(keyword in question for keyword in ["next month", "future", "forecast", "prediction"]):
    return "prediction"
  if any(keyword in question for keyword in ["reduce", "improve", "optimize", "save", "recommend"]):
    return "recommendation"
  if any(keyword in question for keyword in ["score", "efficiency"]):
    return "energy_score"
  return "general"
