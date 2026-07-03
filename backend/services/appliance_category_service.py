from __future__ import annotations


APPLIANCE_CATEGORY_MAP = {
  "AC": "Cooling",
  "Cooler": "Cooling",
  "Fans": "Cooling",
  "Lights": "Lighting",
  "Refrigerator": "Always Active",
  "Water Purifier": "Always Active",
  "TV": "Entertainment",
  "Laptop/Desktop": "Entertainment",
  "Washing Machine": "Utility",
  "Microwave": "Utility",
  "Geyser": "Utility",
}

CATEGORY_COLORS = {
  "Cooling": "#10B981",
  "Lighting": "#F59E0B",
  "Always Active": "#3B82F6",
  "Entertainment": "#8B5CF6",
  "Utility": "#F97316",
}

BASE_APPLIANCE_FACTORS = {
  "AC": 3.6,
  "Cooler": 2.8,
  "Fans": 1.35,
  "Lights": 0.75,
  "Refrigerator": 1.5,
  "Water Purifier": 0.65,
  "TV": 0.85,
  "Laptop/Desktop": 0.95,
  "Washing Machine": 1.1,
  "Microwave": 0.8,
  "Geyser": 2.4,
}


def get_appliance_category(appliance_name: str) -> str:
  return APPLIANCE_CATEGORY_MAP.get(appliance_name, "Utility")


def get_category_color(category: str) -> str:
  return CATEGORY_COLORS.get(category, "#94A3B8")


def get_base_appliance_factor(appliance_name: str) -> float:
  return BASE_APPLIANCE_FACTORS.get(appliance_name, 1.0)
