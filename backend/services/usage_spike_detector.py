from __future__ import annotations


def detect_usage_spike(
  current_bill: dict,
  seasonal_intelligence: dict | None = None,
  behavioral_estimation: dict | None = None,
) -> dict:
  trends = (seasonal_intelligence or {}).get("trends", {})
  current_units = float(current_bill.get("units_consumed") or 0)
  current_amount = float(current_bill.get("bill_amount") or 0)
  month_change = trends.get("month_over_month_change")
  seasonal_average_units = float(trends.get("seasonal_average_units") or 0)
  lead_category = None
  category_contributions = (behavioral_estimation or {}).get("category_contributions") or []
  if category_contributions:
    lead_category = category_contributions[0].get("category")

  detected = False
  severity = "none"
  reasons: list[str] = []

  if month_change is not None and month_change >= 15:
    detected = True
    severity = "high" if month_change >= 25 else "medium"
    reasons.append(f"Usage rose by about {month_change}% compared with the previous saved bill.")

  if seasonal_average_units > 0 and current_units >= seasonal_average_units * 1.15:
    detected = True
    if severity == "none":
      severity = "medium"
    reasons.append("Current usage is running above your comparable seasonal average.")

  if current_amount > 0 and current_units > 0 and current_amount / current_units >= 9:
    if severity == "none":
      severity = "medium"
    reasons.append("Cost per consumed unit looks elevated enough to justify closer review.")

  return {
    "detected": detected,
    "severity": severity,
    "reasons": reasons,
    "lead_category": lead_category,
    "month_over_month_change": month_change,
  }


def build_usage_spike_recommendations(spike_summary: dict) -> list[dict]:
  if not spike_summary.get("detected"):
    return []

  reasons = spike_summary.get("reasons") or []
  lead_category = spike_summary.get("lead_category")
  month_change = spike_summary.get("month_over_month_change")
  priority = "high" if spike_summary.get("severity") == "high" else "medium"

  message = reasons[0] if reasons else "A meaningful usage increase is showing up in the current bill pattern."
  if month_change is not None and lead_category:
    message = f"Electricity usage increased by about {month_change}% and {lead_category.lower()} is one of the strongest estimated drivers in this cycle."

  return [{
    "title": "Usage spike detected",
    "text": message,
    "category": "Usage Spike Alert",
    "priority": priority,
    "related_appliance_category": lead_category,
    "metadata": {
      "severity": spike_summary.get("severity"),
      "reasons": reasons,
    },
  }]
