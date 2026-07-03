import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.ai_energy_assistant import build_assistant_response
from services.assistant_context_builder import build_assistant_context
from services.behavioral_estimation_engine import build_behavioral_estimation
from services.prediction_engine import build_future_bill_prediction
from services.recommendation_engine import build_recommendation_engine_output
from services.seasonal_engine import build_seasonal_intelligence


class AiEnergyAssistantTests(unittest.TestCase):
  def _build_context(self):
    household = {
      "family_members": 4,
      "room_count": 3,
      "house_type": "2BHK",
      "city": "Hyderabad",
      "state": "Telangana",
      "monthly_budget_goal": 2500,
    }
    appliances = [
      {"appliance_name": "AC", "quantity": 1},
      {"appliance_name": "Fans", "quantity": 4},
      {"appliance_name": "Lights", "quantity": 6},
      {"appliance_name": "Refrigerator", "quantity": 1},
    ]
    history = [
      {"bill_month": "April 2026", "units_consumed": 245, "bill_amount": 1880, "billing_days": 30},
      {"bill_month": "May 2026", "units_consumed": 310, "bill_amount": 2480, "billing_days": 31},
    ]
    current_bill = {"bill_month": "June 2026", "units_consumed": 355, "bill_amount": 2890, "billing_days": 30}
    seasonal = build_seasonal_intelligence(household, appliances, current_bill, history)
    behavioral = build_behavioral_estimation(
      household,
      appliances,
      current_bill,
      history,
      seasonal["behavior"]["seasonal_assumptions"],
    )
    recommendations = build_recommendation_engine_output(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=history,
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )
    prediction = build_future_bill_prediction(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=history,
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
    )
    return build_assistant_context(
      household=household,
      appliances=appliances,
      current_bill=current_bill,
      history=history,
      seasonal_intelligence=seasonal,
      behavioral_estimation=behavioral,
      recommendation_analysis=recommendations,
      prediction_analysis=prediction,
    )

  def test_usage_question_references_context(self):
    context = self._build_context()
    result = build_assistant_response("Why is my bill high?", context)
    self.assertEqual(result["assistant_category"], "usage_explanation")
    self.assertIn("estimated", result["answer"].lower())
    self.assertTrue(result["related_recommendations"])

  def test_prediction_question_returns_forecast_language(self):
    context = self._build_context()
    result = build_assistant_response("What may happen next month?", context)
    self.assertEqual(result["assistant_category"], "prediction_explanation")
    self.assertIn("forecast", result["answer"].lower())
    self.assertIn("not a guaranteed", result["answer"].lower())

  def test_seasonal_question_returns_seasonal_context(self):
    context = self._build_context()
    result = build_assistant_response("Why is summer usage higher?", context)
    self.assertEqual(result["assistant_category"], "seasonal_explanation")
    self.assertIn("summer", result["answer"].lower())

  def test_appliance_question_references_contribution(self):
    context = self._build_context()
    result = build_assistant_response("Which appliances contribute most?", context)
    self.assertEqual(result["assistant_category"], "appliance_explanation")
    self.assertIn("estimated contribution", result["answer"].lower())

  def test_bill_fact_question_returns_direct_units_answer(self):
    context = self._build_context()
    result = build_assistant_response("what is the units consumed", context)
    self.assertEqual(result["assistant_category"], "bill_fact_explanation")
    self.assertIn("355", result["answer"])

  def test_daily_average_question_returns_direct_average(self):
    context = self._build_context()
    result = build_assistant_response("what is my daily average usage", context)
    self.assertEqual(result["assistant_category"], "bill_fact_explanation")
    self.assertIn("11.8", result["answer"])

  def test_comparison_question_returns_month_over_month_answer(self):
    context = self._build_context()
    result = build_assistant_response("compare this month with last month", context)
    self.assertEqual(result["assistant_category"], "bill_comparison_explanation")
    self.assertIn("June 2026", result["answer"])
    self.assertIn("May 2026", result["answer"])

  def test_specific_cooling_question_routes_to_specific_load_answer(self):
    context = self._build_context()
    result = build_assistant_response("why is cooling usage high", context)
    self.assertEqual(result["assistant_category"], "specific_load_explanation")
    self.assertIn("cooling", result["answer"].lower())


if __name__ == "__main__":
  unittest.main()
