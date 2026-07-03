import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.seasonal_behavior import infer_seasonal_behavior
from services.seasonal_insights import generate_seasonal_insights
from services.seasonal_trends import build_seasonal_trends


class SeasonalInsightsVariationTests(unittest.TestCase):
  def test_summer_insights_shift_with_appliance_mix(self):
    household = {"city": "Hyderabad", "family_members": 4, "room_count": 3}
    bill = {"bill_month": "May 2026", "units_consumed": 420, "bill_amount": 3200, "billing_days": 31}
    history = [{"bill_month": "Apr 2026", "units_consumed": 360, "bill_amount": 2800}]

    cooling_behavior = infer_seasonal_behavior(
      "Summer",
      household,
      [{"appliance_name": "AC", "quantity": 2}, {"appliance_name": "Fans", "quantity": 4}],
      bill,
    )
    lighting_behavior = infer_seasonal_behavior(
      "Summer",
      household,
      [{"appliance_name": "Lights", "quantity": 8}, {"appliance_name": "TV", "quantity": 1}],
      bill,
    )
    trends = build_seasonal_trends(bill, history)

    cooling_insights = generate_seasonal_insights("Summer", household, bill, cooling_behavior, trends)
    lighting_insights = generate_seasonal_insights("Summer", household, bill, lighting_behavior, trends)

    self.assertNotEqual(cooling_insights[0]["message"], lighting_insights[0]["message"])

  def test_history_and_load_signals_change_titles(self):
    household = {"city": "Warangal", "family_members": 2, "room_count": 2}
    bill = {"bill_month": "Aug 2026", "units_consumed": 260, "bill_amount": 2100, "billing_days": 30}

    behavior = infer_seasonal_behavior(
      "Rainy",
      household,
      [{"appliance_name": "Lights", "quantity": 6}],
      bill,
    )

    higher_history_trends = build_seasonal_trends(
      bill,
      [
        {"bill_month": "Jul 2026", "units_consumed": 220, "bill_amount": 1850},
        {"bill_month": "Aug 2025", "units_consumed": 200, "bill_amount": 1750},
      ],
    )
    lower_history_trends = build_seasonal_trends(
      bill,
      [{"bill_month": "Jul 2026", "units_consumed": 255, "bill_amount": 2050}],
    )

    richer_history_insights = generate_seasonal_insights("Rainy", household, bill, behavior, higher_history_trends)
    thinner_history_insights = generate_seasonal_insights("Rainy", household, bill, behavior, lower_history_trends)

    richer_titles = {item["title"] for item in richer_history_insights}
    thinner_titles = {item["title"] for item in thinner_history_insights}

    self.assertIn("Seasonal comparison is strengthening", richer_titles)
    self.assertNotEqual(richer_titles, thinner_titles)


if __name__ == "__main__":
  unittest.main()
