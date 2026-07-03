from __future__ import annotations


def build_tariff_recommendations(current_bill: dict, seasonal_intelligence: dict | None = None) -> list[dict]:
  units = float(current_bill.get("units_consumed") or 0)
  amount = float(current_bill.get("bill_amount") or 0)
  trends = (seasonal_intelligence or {}).get("trends", {})
  month_change = trends.get("month_over_month_change")
  recommendations: list[dict] = []

  if 190 <= units < 220:
    recommendations.append({
      "title": "Watch the 200-unit neighborhood",
      "text": "This bill is close to a level where tariff pressure may feel sharper. Holding the next cycle slightly lower could help avoid a more expensive slab outcome.",
      "category": "Tariff Awareness",
      "priority": "medium",
      "related_appliance_category": None,
      "metadata": {
        "units_consumed": units,
        "threshold_hint": 200,
      },
    })

  if units >= 300:
    recommendations.append({
      "title": "High-usage tariff pressure is likely",
      "text": "This month sits in a high-usage range, so even moderate additional consumption may feel more expensive. It may be worth targeting the strongest estimated category first.",
      "category": "Tariff Awareness",
      "priority": "high",
      "related_appliance_category": None,
      "metadata": {
        "units_consumed": units,
      },
    })

  if amount > 0 and units > 0 and amount / units >= 9:
    recommendations.append({
      "title": "Cost intensity is worth monitoring",
      "text": "Bill amount is rising faster than simple usage alone would suggest, which can happen when tariff pressure and usage overlap in the same cycle.",
      "category": "Tariff Awareness",
      "priority": "medium",
      "related_appliance_category": None,
      "metadata": {
        "amount_per_unit": round(amount / max(units, 1), 2),
      },
    })

  if month_change is not None and month_change >= 12 and units >= 180:
    recommendations.append({
      "title": "Current trend could push the next bill higher",
      "text": "The latest upward usage trend may carry extra billing pressure into the next cycle if the same habits continue.",
      "category": "Tariff Awareness",
      "priority": "medium",
      "related_appliance_category": None,
      "metadata": {
        "month_over_month_change": month_change,
      },
    })

  return recommendations
