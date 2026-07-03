from __future__ import annotations


def build_budget_risk(
  predicted_amount_range: dict,
  monthly_budget_goal: float | int | None,
) -> dict | None:
  if monthly_budget_goal in (None, 0, ""):
    return None

  budget = float(monthly_budget_goal)
  min_amount = float(predicted_amount_range.get("min") or 0)
  max_amount = float(predicted_amount_range.get("max") or 0)
  center = float(predicted_amount_range.get("center") or 0)

  status = "safe"
  message = "Predicted bill range appears to stay inside the current monthly budget goal."
  if min_amount > budget:
    status = "high_risk"
    message = "The full predicted bill range sits above your budget goal, so next month's bill may exceed your target even without an unusual spike."
  elif max_amount > budget:
    status = "watch"
    message = "The upper end of the predicted bill range may exceed your budget goal if current usage pressure continues."
  elif center >= budget * 0.95:
    status = "watch"
    message = "The next bill is forecast to land close to your budget limit, so there is not much headroom for extra usage."

  return {
    "budget_goal": round(budget, 1),
    "status": status,
    "message": message,
  }
