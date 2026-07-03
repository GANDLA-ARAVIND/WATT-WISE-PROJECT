import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.seasonal_behavior import infer_seasonal_behavior


class SeasonalBehaviorVariationTests(unittest.TestCase):
  def test_summer_behavior_signals_change_with_top_appliance(self):
    household = {"family_members": 4, "room_count": 3}
    bill = {"bill_month": "May 2026", "units_consumed": 320, "bill_amount": 2600, "billing_days": 30}

    cooling = infer_seasonal_behavior(
      "Summer",
      household,
      [{"appliance_name": "AC", "quantity": 4}, {"appliance_name": "Fans", "quantity": 2}],
      bill,
    )
    fan_heavy = infer_seasonal_behavior(
      "Summer",
      household,
      [{"appliance_name": "Fans", "quantity": 6}, {"appliance_name": "Lights", "quantity": 2}],
      bill,
    )

    self.assertNotEqual(cooling["behavior_signals"][0], fan_heavy["behavior_signals"][0])

  def test_load_signals_change_with_intensity(self):
    household = {"family_members": 2, "room_count": 2}
    light_bill = {"bill_month": "Jan 2026", "units_consumed": 120, "bill_amount": 900, "billing_days": 30}
    heavy_bill = {"bill_month": "Jan 2026", "units_consumed": 520, "bill_amount": 3900, "billing_days": 30}
    appliances = [{"appliance_name": "Geyser", "quantity": 1}, {"appliance_name": "Lights", "quantity": 4}]

    lighter = infer_seasonal_behavior("Winter/Cooler", household, appliances, light_bill)
    heavier = infer_seasonal_behavior("Winter/Cooler", household, appliances, heavy_bill)

    self.assertNotEqual(lighter["behavior_signals"], heavier["behavior_signals"])


if __name__ == "__main__":
  unittest.main()
