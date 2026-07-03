from __future__ import annotations

APPLIANCE_ALIASES = {
  "fan": "Fans",
  "fans": "Fans",
  "light": "Lights",
  "lights": "Lights",
  "ac": "AC",
  "acs": "AC",
  "air conditioner": "AC",
  "refrigerator": "Refrigerator",
  "fridge": "Refrigerator",
  "tv": "TV",
  "television": "TV",
  "washing machine": "Washing Machine",
  "geyser": "Geyser",
  "cooler": "Cooler",
  "microwave": "Microwave",
  "laptop/desktop": "Laptop/Desktop",
  "laptop": "Laptop/Desktop",
  "desktop": "Laptop/Desktop",
  "water purifier": "Water Purifier",
}

SEASONAL_APPLIANCE_PRIORITY = {
  "Summer": {
    "AC": 1.55,
    "Cooler": 1.35,
    "Fans": 1.25,
    "Lights": 1.05,
    "Geyser": 0.55,
  },
  "Rainy": {
    "Lights": 1.25,
    "Fans": 1.0,
    "Refrigerator": 1.05,
    "Laptop/Desktop": 1.05,
    "AC": 0.75,
    "Cooler": 0.65,
  },
  "Winter/Cooler": {
    "Geyser": 1.5,
    "Lights": 1.2,
    "Fans": 0.7,
    "AC": 0.45,
    "Cooler": 0.3,
  },
}

SEASONAL_BEHAVIOR_LIBRARY = {
  "Summer": [
    "Cooling demand is likely elevated because warmer evenings extend fan and AC usage.",
    "Cooling appliances probably account for a larger share of household electricity this season.",
    "Late-evening comfort load is likely contributing more than in cooler months.",
  ],
  "Rainy": [
    "Indoor appliance reliance usually rises during rainy months as households spend longer indoors.",
    "Lighting demand often increases because daylight is less consistent in the rainy season.",
    "Cooling demand is usually moderate, but indoor plug loads and lighting can climb.",
  ],
  "Winter/Cooler": [
    "Water-heating appliances often become more important in cooler months.",
    "Lighting usage generally starts earlier in the evening during this season.",
    "Cooling equipment usually becomes a smaller part of the total electricity mix.",
  ],
}


def normalize_appliance_name(name: str) -> str:
  return APPLIANCE_ALIASES.get(name.strip().lower(), name.strip())
