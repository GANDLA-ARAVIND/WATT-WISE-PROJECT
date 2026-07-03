import json
import unittest
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
  sys.path.insert(0, str(BACKEND_ROOT))

from services.parser import parse_ocr_text

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "telangana"


class ParserRegressionTests(unittest.TestCase):
  maxDiff = None

  def test_telangana_ocr_regression_fixtures(self):
    fixture_files = sorted(FIXTURES_DIR.glob("*_raw_ocr.txt"))
    self.assertGreaterEqual(len(fixture_files), 3)

    for raw_path in fixture_files:
      expected_path = raw_path.with_name(raw_path.name.replace("_raw_ocr.txt", "_expected.json"))
      self.assertTrue(expected_path.exists(), f"Missing expected fixture for {raw_path.name}")

      raw_text = raw_path.read_text(encoding="utf-8")
      expected = json.loads(expected_path.read_text(encoding="utf-8"))
      result = parse_ocr_text(raw_text)
      parsed = result["parsed"]

      for key, expected_value in expected.items():
        self.assertIn(key, parsed, f"{raw_path.name}: missing field {key}")
        self.assertEqual(parsed[key], expected_value, f"{raw_path.name}: mismatch for {key}")

      self.assertIn("bill_month", parsed)
      self.assertIn("bill_amount", parsed)
      self.assertIn("units_consumed", parsed)


if __name__ == "__main__":
  unittest.main()
