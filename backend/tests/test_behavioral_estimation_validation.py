import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.behavioral_estimation_engine import build_behavioral_estimation
from services.bill_chronology import sort_bills_chronologically


class BehavioralEstimationValidationTests(unittest.TestCase):
  def test_percentages_normalize_close_to_hundred(self):
    result = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[
        {"appliance_name": "AC", "quantity": 1},
        {"appliance_name": "Fans", "quantity": 4},
        {"appliance_name": "Lights", "quantity": 6},
        {"appliance_name": "Refrigerator", "quantity": 1},
      ],
      current_bill={"bill_month": "May 2026", "units_consumed": 410, "bill_amount": 3200, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )

    total = sum(item["estimated_percentage"] for item in result["category_contributions"])
    self.assertAlmostEqual(total, 100.0, delta=0.2)

  def test_summer_ac_changes_output(self):
    ac_heavy = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[{"appliance_name": "AC", "quantity": 2}, {"appliance_name": "Fans", "quantity": 4}],
      current_bill={"bill_month": "May 2026", "units_consumed": 430, "bill_amount": 3400, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )
    fan_only = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[{"appliance_name": "Fans", "quantity": 4}],
      current_bill={"bill_month": "May 2026", "units_consumed": 430, "bill_amount": 3400, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )

    self.assertEqual(ac_heavy["category_contributions"][0]["category"], "Cooling")
    self.assertEqual(ac_heavy["appliance_contributions"][0]["appliance_name"], "AC")
    self.assertEqual(fan_only["appliance_contributions"][0]["appliance_name"], "Fans")

  def test_winter_geyser_changes_output(self):
    winter = build_behavioral_estimation(
      household={"family_members": 3, "room_count": 2, "house_type": "Apartment"},
      appliances=[{"appliance_name": "Geyser", "quantity": 1}, {"appliance_name": "Lights", "quantity": 4}],
      current_bill={"bill_month": "December 2026", "units_consumed": 260, "bill_amount": 2100, "billing_days": 30},
      history=[],
      seasonal_assumptions=["Water heating appliances likely increased usage."],
    )

    lead_categories = [item["category"] for item in winter["category_contributions"][:2]]
    self.assertIn("Utility", lead_categories)
    self.assertTrue(any("Water heating appliances likely increased usage." == item for item in winter["behavior_assumptions"]))

  def test_rainy_lighting_changes_output(self):
    rainy = build_behavioral_estimation(
      household={"family_members": 5, "room_count": 4, "house_type": "Independent house"},
      appliances=[{"appliance_name": "Lights", "quantity": 10}, {"appliance_name": "TV", "quantity": 1}],
      current_bill={"bill_month": "August 2026", "units_consumed": 250, "bill_amount": 1900, "billing_days": 31},
      history=[],
      seasonal_assumptions=["Daytime lighting usage likely increased."],
    )

    lead_categories = [item["category"] for item in rainy["category_contributions"][:2]]
    self.assertIn("Lighting", lead_categories)

  def test_family_size_changes_assumptions(self):
    smaller = build_behavioral_estimation(
      household={"family_members": 2, "room_count": 2, "house_type": "Apartment"},
      appliances=[{"appliance_name": "Lights", "quantity": 4}, {"appliance_name": "Refrigerator", "quantity": 1}],
      current_bill={"bill_month": "September 2026", "units_consumed": 180, "bill_amount": 1400, "billing_days": 30},
      history=[],
      seasonal_assumptions=[],
    )
    larger = build_behavioral_estimation(
      household={"family_members": 6, "room_count": 2, "house_type": "Apartment"},
      appliances=[{"appliance_name": "Lights", "quantity": 4}, {"appliance_name": "Refrigerator", "quantity": 1}],
      current_bill={"bill_month": "September 2026", "units_consumed": 180, "bill_amount": 1400, "billing_days": 30},
      history=[],
      seasonal_assumptions=[],
    )

    self.assertFalse(any("Household size likely increases overlap" in item for item in smaller["behavior_assumptions"]))
    self.assertTrue(any("Household size likely increases overlap" in item for item in larger["behavior_assumptions"]))

  def test_appliance_quantity_changes_results(self):
    lower = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[{"appliance_name": "Fans", "quantity": 2}, {"appliance_name": "Lights", "quantity": 4}],
      current_bill={"bill_month": "May 2026", "units_consumed": 280, "bill_amount": 2100, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )
    higher = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[{"appliance_name": "Fans", "quantity": 6}, {"appliance_name": "Lights", "quantity": 4}],
      current_bill={"bill_month": "May 2026", "units_consumed": 280, "bill_amount": 2100, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )

    lower_fan = next(item for item in lower["appliance_contributions"] if item["appliance_name"] == "Fans")
    higher_fan = next(item for item in higher["appliance_contributions"] if item["appliance_name"] == "Fans")
    self.assertGreater(higher_fan["estimated_percentage"], lower_fan["estimated_percentage"])

  def test_different_bills_change_estimations(self):
    lighter = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[{"appliance_name": "AC", "quantity": 1}, {"appliance_name": "Fans", "quantity": 4}, {"appliance_name": "Geyser", "quantity": 1}],
      current_bill={"bill_month": "May 2026", "units_consumed": 180, "bill_amount": 1450, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )
    heavier = build_behavioral_estimation(
      household={"family_members": 4, "room_count": 3, "house_type": "2BHK"},
      appliances=[{"appliance_name": "AC", "quantity": 1}, {"appliance_name": "Fans", "quantity": 4}, {"appliance_name": "Geyser", "quantity": 1}],
      current_bill={"bill_month": "May 2026", "units_consumed": 460, "bill_amount": 3550, "billing_days": 31},
      history=[],
      seasonal_assumptions=[],
    )

    self.assertNotEqual(lighter["estimation_metadata"]["daily_average_units"], heavier["estimation_metadata"]["daily_average_units"])
    self.assertNotEqual(
      lighter["category_contributions"][1]["estimated_percentage"],
      heavier["category_contributions"][1]["estimated_percentage"],
    )

  def test_chronology_uses_bill_month_before_upload_order(self):
    history = [
      {"id": "2", "bill_month": "May 2026", "created_at": "2026-06-10T00:00:00+00:00"},
      {"id": "1", "bill_month": "March 2026", "created_at": "2026-06-11T00:00:00+00:00"},
      {"id": "3", "bill_month": "April 2026", "created_at": "2026-06-12T00:00:00+00:00"},
    ]

    ordered = sort_bills_chronologically(history)
    self.assertEqual([item["bill_month"] for item in ordered], ["March 2026", "April 2026", "May 2026"])


if __name__ == "__main__":
  unittest.main()
