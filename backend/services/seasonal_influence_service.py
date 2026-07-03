from __future__ import annotations


SEASONAL_CATEGORY_MULTIPLIERS = {
  "Summer": {
    "Cooling": 1.45,
    "Lighting": 1.0,
    "Always Active": 1.0,
    "Entertainment": 1.05,
    "Utility": 0.88,
  },
  "Rainy": {
    "Cooling": 0.92,
    "Lighting": 1.28,
    "Always Active": 1.02,
    "Entertainment": 1.08,
    "Utility": 0.98,
  },
  "Winter/Cooler": {
    "Cooling": 0.72,
    "Lighting": 1.18,
    "Always Active": 1.0,
    "Entertainment": 1.0,
    "Utility": 1.32,
  },
}


def get_seasonal_category_multiplier(season: str, category: str) -> float:
  return SEASONAL_CATEGORY_MULTIPLIERS.get(season, {}).get(category, 1.0)
