import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.behavioral_estimation_engine import build_behavioral_estimation


class BehavioralEstimationEngineTests(unittest.TestCase):
  def test_builds_ranked_category_contributions(self):
    result = build_behavioral_estimation(
      household={
        "family_members": 4,
        "room_count": 3,
        "house_type": "2BHK",
      },
      appliances=[
        {"appliance_name": "AC", "quantity": 2},
        {"appliance_name": "Fans", "quantity": 4},
        {"appliance_name": "Lights", "quantity": 8},
        {"appliance_name": "Refrigerator", "quantity": 1},
      ],
      current_bill={
        "bill_month": "May 2026",
        "units_consumed": 420,
        "bill_amount": 3200,
        "billing_days": 31,
      },
      history=[
        {"bill_month": "Apr 2026", "units_consumed": 360, "bill_amount": 2800},
      ],
      seasonal_assumptions=[
        "Cooling demand is likely elevated because warmer evenings extend fan and AC usage.",
      ],
    )

    self.assertEqual(result["estimated_analysis_label"], "Estimated Analysis")
    self.assertGreater(len(result["category_contributions"]), 0)
    self.assertGreater(len(result["appliance_contributions"]), 0)
    self.assertEqual(result["category_contributions"][0]["category"], "Cooling")
    self.assertGreater(result["category_contributions"][0]["estimated_percentage"], 0)


if __name__ == "__main__":
  unittest.main()
