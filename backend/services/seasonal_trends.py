from __future__ import annotations

from .bill_chronology import sort_bills_chronologically
from .season_detection import detect_season_from_bill_month


def build_seasonal_trends(current_bill: dict, history: list[dict]) -> dict:
  sorted_history = sort_bills_chronologically(history)
  current_units = float(current_bill.get("units_consumed") or 0)
  current_amount = float(current_bill.get("bill_amount") or 0)
  current_season = detect_season_from_bill_month(current_bill.get("bill_month"))

  month_over_month_change = None
  if sorted_history:
    previous_units = float(sorted_history[-1].get("units_consumed") or 0)
    if previous_units > 0:
      month_over_month_change = round(((current_units - previous_units) / previous_units) * 100, 1)

  same_season_bills = [
    bill for bill in sorted_history if detect_season_from_bill_month(bill.get("bill_month")) == current_season
  ]
  seasonal_average_units = 0.0
  seasonal_average_amount = 0.0
  if same_season_bills:
    seasonal_average_units = round(
      sum(float(bill.get("units_consumed") or 0) for bill in same_season_bills) / len(same_season_bills),
      1,
    )
    seasonal_average_amount = round(
      sum(float(bill.get("bill_amount") or 0) for bill in same_season_bills) / len(same_season_bills),
      1,
    )

  return {
    "current_season": current_season,
    "current_units": current_units,
    "current_amount": current_amount,
    "month_over_month_change": month_over_month_change,
    "seasonal_average_units": seasonal_average_units,
    "seasonal_average_amount": seasonal_average_amount,
    "seasonal_history_count": len(same_season_bills),
  }
