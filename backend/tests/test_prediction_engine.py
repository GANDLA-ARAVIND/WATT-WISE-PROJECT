import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.behavioral_estimation_engine import build_behavioral_estimation
from services.prediction_engine import build_future_bill_prediction
from services.seasonal_engine import build_seasonal_intelligence


class PredictionEngineTests(unittest.TestCase):
  def test_prediction_returns_ranges_and_confidence(self):
    household = {"family_members": 4, "room_count": 3, "house_type": "2BHK", "monthly_budget_goal": 2600}
    appliances = [
      {"appliance_name": "AC", "quantity": 1},
      {"appliance_name": "Fans", "quantity": 4},
      {"appliance_name": "Lights", "quantity": 6},
    ]
    history = [
      {"bill_month": "March 2026", "units_consumed": 240, "bill_amount": 1850, "billing_days": 31},
      {"bill_month": "April 2026", "units_consumed": 275, "bill_amount": 2180, "billing_days": 30},
      {"bill_month": "May 2026", "units_consumed": 310, "bill_amount": 2480, "billing_days": 31},
    ]
    current_bill = {"bill_month": "June 2026", "units_consumed": 335, "bill_amount": 2690, "billing_days": 30}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(
      household,
      appliances,
      current_bill,
      history,
      seasonal["behavior"]["seasonal_assumptions"],
    )

    result = build_future_bill_prediction(household, appliances, current_bill, history, seasonal, behavioral)

    self.assertEqual(result["estimated_analysis_label"], "Estimated Forecast")
    self.assertLessEqual(result["expected_next_bill"]["min_amount"], result["expected_next_bill"]["center_amount"])
    self.assertLessEqual(result["expected_next_bill"]["center_amount"], result["expected_next_bill"]["max_amount"])
    self.assertLessEqual(result["expected_next_units"]["min_units"], result["expected_next_units"]["center_units"])
    self.assertLessEqual(result["expected_next_units"]["center_units"], result["expected_next_units"]["max_units"])
    self.assertIn(result["prediction_confidence"]["level"], {"Low", "Medium", "High"})
    self.assertTrue(result["trend_forecast"]["forecast_series"][-1]["type"] == "predicted")

  def test_summer_forecast_highlights_cooling_pressure(self):
    household = {"family_members": 5, "room_count": 4, "house_type": "Independent house"}
    appliances = [
      {"appliance_name": "AC", "quantity": 2},
      {"appliance_name": "Fans", "quantity": 5},
    ]
    history = [
      {"bill_month": "April 2026", "units_consumed": 280, "bill_amount": 2200, "billing_days": 30},
    ]
    current_bill = {"bill_month": "May 2026", "units_consumed": 390, "bill_amount": 3150, "billing_days": 31}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(
      household,
      appliances,
      current_bill,
      history,
      seasonal["behavior"]["seasonal_assumptions"],
    )

    result = build_future_bill_prediction(household, appliances, current_bill, history, seasonal, behavioral)

    self.assertEqual(result["seasonal_forecast"]["current_season"], "Summer")
    self.assertIn("Cooling", result["seasonal_forecast"]["seasonal_spike_message"])
    self.assertEqual(result["seasonal_forecast"]["next_season"], "Rainy")

  def test_winter_forecast_can_raise_budget_risk(self):
    household = {"family_members": 3, "room_count": 2, "house_type": "Apartment", "monthly_budget_goal": 1800}
    appliances = [
      {"appliance_name": "Geyser", "quantity": 1},
      {"appliance_name": "Lights", "quantity": 5},
    ]
    history = [
      {"bill_month": "October 2026", "units_consumed": 190, "bill_amount": 1500, "billing_days": 31},
      {"bill_month": "November 2026", "units_consumed": 220, "bill_amount": 1770, "billing_days": 30},
    ]
    current_bill = {"bill_month": "December 2026", "units_consumed": 285, "bill_amount": 2320, "billing_days": 31}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(
      household,
      appliances,
      current_bill,
      history,
      seasonal["behavior"]["seasonal_assumptions"],
    )

    result = build_future_bill_prediction(household, appliances, current_bill, history, seasonal, behavioral)

    self.assertEqual(result["seasonal_forecast"]["current_season"], "Winter/Cooler")
    self.assertIsNotNone(result["budget_risk"])
    self.assertIn(result["budget_risk"]["status"], {"watch", "high_risk"})

  def test_rainy_history_can_raise_prediction_confidence(self):
    household = {"family_members": 4, "room_count": 3, "house_type": "2BHK"}
    appliances = [
      {"appliance_name": "Lights", "quantity": 7},
      {"appliance_name": "Fans", "quantity": 3},
      {"appliance_name": "TV", "quantity": 2},
    ]
    history = [
      {"bill_month": "July 2025", "units_consumed": 210, "bill_amount": 1650, "billing_days": 31},
      {"bill_month": "August 2025", "units_consumed": 218, "bill_amount": 1700, "billing_days": 31},
      {"bill_month": "September 2025", "units_consumed": 214, "bill_amount": 1680, "billing_days": 30},
      {"bill_month": "July 2026", "units_consumed": 216, "bill_amount": 1720, "billing_days": 31},
      {"bill_month": "August 2026", "units_consumed": 222, "bill_amount": 1765, "billing_days": 31},
    ]
    current_bill = {"bill_month": "September 2026", "units_consumed": 219, "bill_amount": 1740, "billing_days": 30}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(
      household,
      appliances,
      current_bill,
      history,
      seasonal["behavior"]["seasonal_assumptions"],
    )

    result = build_future_bill_prediction(household, appliances, current_bill, history, seasonal, behavioral)

    self.assertEqual(result["seasonal_forecast"]["current_season"], "Rainy")
    self.assertEqual(result["prediction_confidence"]["level"], "High")
    self.assertGreaterEqual(result["seasonal_forecast"]["seasonal_history_count"], 2)

  def test_rising_usage_can_trigger_anomaly_watch(self):
    household = {"family_members": 4, "room_count": 3, "house_type": "2BHK"}
    appliances = [
      {"appliance_name": "AC", "quantity": 1},
      {"appliance_name": "Fans", "quantity": 4},
      {"appliance_name": "Refrigerator", "quantity": 1},
    ]
    history = [
      {"bill_month": "February 2026", "units_consumed": 170, "bill_amount": 1320, "billing_days": 28},
      {"bill_month": "March 2026", "units_consumed": 210, "bill_amount": 1640, "billing_days": 31},
      {"bill_month": "April 2026", "units_consumed": 285, "bill_amount": 2290, "billing_days": 30},
    ]
    current_bill = {"bill_month": "May 2026", "units_consumed": 370, "bill_amount": 3010, "billing_days": 31}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(
      household,
      appliances,
      current_bill,
      history,
      seasonal["behavior"]["seasonal_assumptions"],
    )

    result = build_future_bill_prediction(household, appliances, current_bill, history, seasonal, behavioral)

    self.assertIn(result["anomaly_forecast"]["risk"], {"medium", "high"})
    self.assertTrue(result["prediction_reasoning"])


if __name__ == "__main__":
  unittest.main()
