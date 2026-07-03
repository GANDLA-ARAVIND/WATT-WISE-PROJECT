from __future__ import annotations


def build_anomaly_forecast(
  predicted_units_range: dict,
  trend_context: dict,
  behavioral_estimation: dict,
) -> dict:
  average_units = float(trend_context.get("average_units") or 0)
  predicted_center = float(predicted_units_range.get("center") or 0)
  direction = trend_context.get("direction") or "stable"
  lead_category = None
  category_contributions = behavioral_estimation.get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")

  risk = "low"
  reason = "No strong anomaly signal is showing up in the current forecast."

  if average_units > 0 and predicted_center >= average_units * 1.18:
    risk = "high"
    reason = "Predicted usage sits meaningfully above your typical recent pattern, so the next cycle could feel unusually heavy."
  elif direction == "rising":
    risk = "medium"
    reason = "The recent upward trend may continue into the next cycle if the same household routines stay active."

  if lead_category == "Cooling" and risk != "high":
    reason = "Cooling remains one of the strongest forecast sensitivities, so warmer conditions could push the next bill above your normal range."

  return {
    "risk": risk,
    "reason": reason,
    "lead_category": lead_category,
  }
