import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from main import build_parse_response, ParseRequest, normalize_manual_fields


class BillTypeCoercionTests(unittest.TestCase):
  def test_manual_billing_days_normalizes_to_integer(self):
    normalized = normalize_manual_fields({"billing_days": "31.0"})
    self.assertEqual(normalized["billing_days"], 31)
    self.assertIsInstance(normalized["billing_days"], int)

  def test_corrected_billing_days_is_coerced_before_save(self):
    response = build_parse_response(
      ParseRequest(
        ocr_text="Billing Days: 31\nBill Amount: 1200\nUnits Consumed: 220\nBill Month: Mar 2026",
        manual_fields={"billing_days": "31.0"},
      )
    )
    self.assertEqual(response["corrected"]["billing_days"], 31)
    self.assertIsInstance(response["corrected"]["billing_days"], int)


if __name__ == "__main__":
  unittest.main()
