import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.behavioral_estimation_engine import build_behavioral_estimation
from services.recommendation_engine import build_recommendation_engine_output
from services.seasonal_engine import build_seasonal_intelligence


class RecommendationEngineTests(unittest.TestCase):
  def test_summer_cooling_generates_contextual_recommendations(self):
    household = {"family_members": 4, "room_count": 3, "house_type": "2BHK"}
    appliances = [
      {"appliance_name": "AC", "quantity": 2},
      {"appliance_name": "Fans", "quantity": 4},
      {"appliance_name": "Lights", "quantity": 6},
    ]
    current_bill = {"bill_month": "May 2026", "units_consumed": 430, "bill_amount": 3400, "billing_days": 31}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, [])
    behavioral = build_behavioral_estimation(household, appliances, current_bill, [], seasonal["behavior"]["seasonal_assumptions"])

    result = build_recommendation_engine_output(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=[],
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )

    titles = [item["title"] for item in result["recommendations"]]
    self.assertTrue(any("cooling" in title.lower() for title in titles))
    self.assertEqual(result["estimated_analysis_label"], "Estimated Analysis")

  def test_winter_geyser_context_generates_utility_guidance(self):
    household = {"family_members": 3, "room_count": 2, "house_type": "Apartment"}
    appliances = [
      {"appliance_name": "Geyser", "quantity": 1},
      {"appliance_name": "Lights", "quantity": 4},
    ]
    current_bill = {"bill_month": "December 2026", "units_consumed": 280, "bill_amount": 2200, "billing_days": 30}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, [])
    behavioral = build_behavioral_estimation(household, appliances, current_bill, [], seasonal["behavior"]["seasonal_assumptions"])

    result = build_recommendation_engine_output(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=[],
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )

    self.assertTrue(any(item["related_appliance_category"] == "Utility" for item in result["recommendations"]))

  def test_usage_spike_creates_high_priority_alert(self):
    household = {"family_members": 4, "room_count": 3, "house_type": "2BHK"}
    appliances = [
      {"appliance_name": "AC", "quantity": 1},
      {"appliance_name": "Fans", "quantity": 4},
    ]
    history = [
      {"bill_month": "April 2026", "units_consumed": 240, "bill_amount": 1850, "billing_days": 30},
    ]
    current_bill = {"bill_month": "May 2026", "units_consumed": 360, "bill_amount": 2900, "billing_days": 31}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(household, appliances, current_bill, history, seasonal["behavior"]["seasonal_assumptions"])

    result = build_recommendation_engine_output(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=history,
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )

    spike_items = [item for item in result["recommendations"] if item["category"] == "Usage Spike Alert"]
    self.assertTrue(spike_items)
    self.assertEqual(spike_items[0]["priority"], "high")

  def test_recommendations_are_deduped_and_prioritized(self):
    household = {"family_members": 6, "room_count": 4, "house_type": "Independent house"}
    appliances = [
      {"appliance_name": "Lights", "quantity": 10},
      {"appliance_name": "TV", "quantity": 2},
      {"appliance_name": "Refrigerator", "quantity": 1},
    ]
    current_bill = {"bill_month": "August 2026", "units_consumed": 250, "bill_amount": 1900, "billing_days": 31}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, [])
    behavioral = build_behavioral_estimation(household, appliances, current_bill, [], seasonal["behavior"]["seasonal_assumptions"])

    result = build_recommendation_engine_output(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=[],
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )

    titles = [item["title"] for item in result["recommendations"]]
    self.assertEqual(len(titles), len(set(titles)))
    priorities = [item["priority"] for item in result["recommendations"]]
    if "high" in priorities and "medium" in priorities:
      self.assertLess(priorities.index("high"), priorities.index("medium"))

  def test_b_grade_generates_efficiency_guidance(self):
    household = {"family_members": 4, "room_count": 3, "house_type": "2BHK"}
    appliances = [
      {"appliance_name": "Fans", "quantity": 4},
      {"appliance_name": "Lights", "quantity": 5},
      {"appliance_name": "Refrigerator", "quantity": 1},
    ]
    current_bill = {"bill_month": "September 2026", "units_consumed": 300, "bill_amount": 2400, "billing_days": 30}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, [])
    behavioral = build_behavioral_estimation(household, appliances, current_bill, [], seasonal["behavior"]["seasonal_assumptions"])

    result = build_recommendation_engine_output(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=[],
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )

    self.assertEqual(result["energy_score"]["grade"], "B")
    self.assertTrue(any(item["category"] == "Efficiency Improvement" for item in result["recommendations"]))


if __name__ == "__main__":
  unittest.main()
