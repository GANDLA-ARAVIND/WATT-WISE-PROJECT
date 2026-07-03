from __future__ import annotations

from typing import Any

import numpy as np

try:
  from sklearn.linear_model import LinearRegression
except Exception:  # pragma: no cover - fallback when sklearn is unavailable
  LinearRegression = None


def predict_next_value_range(values: list[float], volatility: float = 0.08) -> dict[str, Any]:
  cleaned = [float(value) for value in values if value is not None]
  if not cleaned:
    return {
      "center": 0.0,
      "min": 0.0,
      "max": 0.0,
      "model": "insufficient_history",
    }

  if len(cleaned) == 1:
    center = cleaned[0]
    spread = max(center * volatility, 20.0 if center > 100 else 3.0)
    return {
      "center": round(center, 1),
      "min": round(max(0.0, center - spread), 1),
      "max": round(center + spread, 1),
      "model": "single_point_baseline",
    }

  x = np.arange(len(cleaned), dtype=float).reshape(-1, 1)
  y = np.array(cleaned, dtype=float)

  if LinearRegression is not None:
    model = LinearRegression()
    model.fit(x, y)
    center = float(model.predict(np.array([[len(cleaned)]], dtype=float))[0])
    model_name = "linear_regression"
  else:
    slope, intercept = np.polyfit(np.arange(len(cleaned), dtype=float), y, 1)
    center = float((len(cleaned) * slope) + intercept)
    model_name = "polyfit_fallback"

  diffs = np.diff(y) if len(y) > 1 else np.array([0.0])
  std_component = float(np.std(y)) if len(y) > 1 else 0.0
  drift_component = float(np.std(diffs)) if len(diffs) > 0 else 0.0
  spread = max(abs(center) * volatility, std_component * 0.55, drift_component * 0.8, 2.0)

  return {
    "center": round(max(0.0, center), 1),
    "min": round(max(0.0, center - spread), 1),
    "max": round(max(0.0, center + spread), 1),
    "model": model_name,
  }
