from __future__ import annotations

from statistics import mean


def build_prediction_trend_context(history: list[dict], current_bill: dict) -> dict:
  timeline = [*history, current_bill]
  points = []
  units_values: list[float] = []
  amount_values: list[float] = []

  for bill in timeline:
    units = float(bill.get("units_consumed") or 0)
    amount = float(bill.get("bill_amount") or 0)
    points.append({
      "label": bill.get("bill_month") or "Unknown",
      "units": round(units, 1),
      "amount": round(amount, 1),
      "type": "historical",
    })
    units_values.append(units)
    amount_values.append(amount)

  average_units = mean(units_values) if units_values else 0.0
  average_amount = mean(amount_values) if amount_values else 0.0
  latest_units = units_values[-1] if units_values else 0.0
  latest_amount = amount_values[-1] if amount_values else 0.0
  recent_direction = "stable"
  if len(units_values) >= 2:
    if latest_units >= units_values[-2] * 1.06:
      recent_direction = "rising"
    elif latest_units <= units_values[-2] * 0.94:
      recent_direction = "falling"

  return {
    "timeline": points,
    "average_units": round(average_units, 1),
    "average_amount": round(average_amount, 1),
    "latest_units": round(latest_units, 1),
    "latest_amount": round(latest_amount, 1),
    "direction": recent_direction,
    "history_count": len(history),
  }
