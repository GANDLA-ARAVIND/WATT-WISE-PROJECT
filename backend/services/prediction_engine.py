from __future__ import annotations

from datetime import datetime, timezone

from .anomaly_forecast_service import build_anomaly_forecast
from .budget_risk_analyzer import build_budget_risk
from .ml_prediction_service import predict_next_value_range
from .seasonal_forecasting_utility import build_seasonal_forecast
from .trend_analysis_service import build_prediction_trend_context


def build_future_bill_prediction(
  household: dict,
  appliances: list[dict],
  current_bill: dict,
  history: list[dict],
  seasonal_intelligence: dict,
  behavioral_estimation: dict,
) -> dict:
  trend_context = build_prediction_trend_context(history, current_bill)
  seasonal_forecast = build_seasonal_forecast(
    seasonal_intelligence.get("season"),
    seasonal_intelligence,
    behavioral_estimation,
  )

  all_bills = [*history, current_bill]
  unit_range = predict_next_value_range(
    [float(bill.get("units_consumed") or 0) for bill in all_bills if bill.get("units_consumed") is not None],
    volatility=0.09,
  )
  amount_range = predict_next_value_range(
    [float(bill.get("bill_amount") or 0) for bill in all_bills if bill.get("bill_amount") is not None],
    volatility=0.1,
  )

  next_month_label = _predict_next_month_label(current_bill.get("bill_month"))
  forecast_series = [
    *trend_context["timeline"],
    {
      "label": next_month_label,
      "units": unit_range["center"],
      "amount": amount_range["center"],
      "type": "predicted",
      "unitsMin": unit_range["min"],
      "unitsMax": unit_range["max"],
      "amountMin": amount_range["min"],
      "amountMax": amount_range["max"],
    },
  ]

  anomaly_forecast = build_anomaly_forecast(unit_range, trend_context, behavioral_estimation)
  budget_risk = build_budget_risk(amount_range, household.get("monthly_budget_goal"))
  confidence = _build_prediction_confidence(history, seasonal_intelligence, unit_range, amount_range)
  reasoning = _build_prediction_reasoning(seasonal_forecast, trend_context, behavioral_estimation, confidence)

  top_appliances = [
    {
      "appliance_name": item.get("appliance_name"),
      "estimated_percentage": item.get("estimated_percentage"),
      "trend_message": _build_appliance_trend_message(item, seasonal_forecast["next_season"]),
    }
    for item in (behavioral_estimation.get("appliance_contributions") or [])[:3]
  ]

  return {
    "estimated_analysis_label": "Estimated Forecast",
    "expected_next_bill": {
      "min_amount": amount_range["min"],
      "max_amount": amount_range["max"],
      "center_amount": amount_range["center"],
    },
    "expected_next_units": {
      "min_units": unit_range["min"],
      "max_units": unit_range["max"],
      "center_units": unit_range["center"],
    },
    "prediction_confidence": confidence,
    "seasonal_forecast": seasonal_forecast,
    "trend_forecast": {
      "direction": trend_context["direction"],
      "forecast_series": forecast_series,
      "average_units": trend_context["average_units"],
      "average_amount": trend_context["average_amount"],
    },
    "anomaly_forecast": anomaly_forecast,
    "budget_risk": budget_risk,
    "appliance_contribution_forecast": top_appliances,
    "prediction_reasoning": reasoning,
    "prediction_metadata": {
      "generated_at": datetime.now(timezone.utc).isoformat(),
      "history_count": len(history),
      "model_units": unit_range["model"],
      "model_amount": amount_range["model"],
      "next_month_label": next_month_label,
    },
  }


def _build_prediction_confidence(
  history: list[dict],
  seasonal_intelligence: dict,
  unit_range: dict,
  amount_range: dict,
) -> dict:
  history_count = len(history)
  seasonal_history_count = int((seasonal_intelligence.get("trends") or {}).get("seasonal_history_count") or 0)
  range_width_ratio = 0.0
  if unit_range.get("center"):
    range_width_ratio = (float(unit_range["max"]) - float(unit_range["min"])) / max(float(unit_range["center"]), 1.0)

  level = "Low"
  reason = "Prediction is working from a thin bill history, so the forecast should be read as a rough directional estimate."
  if history_count >= 5 and seasonal_history_count >= 2 and range_width_ratio <= 0.2:
    level = "High"
    reason = "There is enough bill history and seasonal context to support a tighter and more believable forecast range."
  elif history_count >= 2:
    level = "Medium"
    reason = "The forecast has enough recent history to follow your trend, but it still depends on estimated seasonal and behavioral carry-over."

  return {
    "level": level,
    "reason": reason,
  }


def _build_prediction_reasoning(
  seasonal_forecast: dict,
  trend_context: dict,
  behavioral_estimation: dict,
  confidence: dict,
) -> list[str]:
  reasons = [
    seasonal_forecast["seasonal_spike_message"],
    f"Recent bill direction is {trend_context['direction']}, based on saved history and the latest bill pattern.",
    confidence["reason"],
  ]
  category_contributions = behavioral_estimation.get("category_contributions") or []
  if category_contributions:
    reasons.append(
      f"{category_contributions[0]['category']} remains one of the strongest estimated forecast influences for the upcoming cycle."
    )
  return reasons[:4]


def _build_appliance_trend_message(item: dict, next_season: str) -> str:
  appliance_name = item.get("appliance_name") or "This appliance"
  percentage = float(item.get("estimated_percentage") or 0)
  if next_season == "Summer" and percentage >= 20:
    return f"{appliance_name} may stay more relevant if the next cycle moves into warmer conditions."
  if next_season == "Winter/Cooler":
    return f"{appliance_name} could stay important if cooler-season household routines continue."
  return f"{appliance_name} remains part of the forecast mix, but its future influence is still estimated rather than guaranteed."


def _predict_next_month_label(raw_month: str | None) -> str:
  if not raw_month:
    return "Next month"

  month_names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  lower = raw_month.lower()
  detected_index = -1
  year = None
  for index, month in enumerate(month_names):
    if month.lower() in lower or month[:3].lower() in lower:
      detected_index = index
      break

  year_match = None
  for token in raw_month.replace("/", " ").replace("-", " ").split():
    if token.isdigit() and len(token) == 4:
      year_match = int(token)
      break

  if detected_index == -1:
    return "Next month"

  next_index = (detected_index + 1) % 12
  year = year_match or datetime.now(timezone.utc).year
  if next_index == 0 and detected_index == 11:
    year += 1

  return f"{month_names[next_index]} {year}"
