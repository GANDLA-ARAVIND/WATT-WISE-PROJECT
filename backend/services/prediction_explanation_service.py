from __future__ import annotations


def explain_prediction(question: str, context: dict) -> dict:
  prediction = context["prediction"]
  next_bill = prediction.get("expected_next_bill") or {}
  next_units = prediction.get("expected_next_units") or {}
  confidence = prediction.get("prediction_confidence") or {}
  seasonal_forecast = prediction.get("seasonal_forecast") or {}
  anomaly_forecast = prediction.get("anomaly_forecast") or {}
  budget_risk = prediction.get("budget_risk")

  answer = (
    f"The next bill is estimated in the range of INR {round(float(next_bill.get('min_amount') or 0))}"
    f" to INR {round(float(next_bill.get('max_amount') or 0))}, with expected usage around "
    f"{round(float(next_units.get('min_units') or 0))} to {round(float(next_units.get('max_units') or 0))} units. "
    f"This is a forecast range, not a guaranteed future bill."
  )
  if seasonal_forecast.get("seasonal_spike_message"):
    answer += f" {seasonal_forecast['seasonal_spike_message']}"
  if anomaly_forecast.get("reason"):
    answer += f" The forecast risk watch currently says: {anomaly_forecast['reason']}"
  if budget_risk:
    answer += f" Budget watch: {budget_risk['message']}"
  if confidence.get("reason"):
    answer += f" Confidence is {str(confidence.get('level') or 'Low').lower()} because {confidence['reason'].lower()}"

  return {
    "category": "prediction_explanation",
    "answer": answer,
    "insights": (prediction.get("prediction_reasoning") or [])[:3],
    "related_recommendations": _extract_prediction_related(context),
    "follow_ups": [
      "What may increase future bills?",
      "How can I reduce my bill?",
      "How can I improve my energy score?",
    ],
  }


def _extract_prediction_related(context: dict) -> list[str]:
  items = context["recommendations"].get("recommendations") or []
  return [item["title"] for item in items if item.get("priority") in {"high", "medium"}][:3]
