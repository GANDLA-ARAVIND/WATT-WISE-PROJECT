from __future__ import annotations

import re
from datetime import datetime, timezone


MONTH_MAP = {
  "jan": 1,
  "feb": 2,
  "mar": 3,
  "apr": 4,
  "may": 5,
  "jun": 6,
  "jul": 7,
  "aug": 8,
  "sep": 9,
  "sept": 9,
  "oct": 10,
  "nov": 11,
  "dec": 12,
}


def get_bill_chronology_timestamp(record: dict) -> float:
  raw_bill_month = str(record.get("bill_month") or "").strip()
  if raw_bill_month:
    text_match = re.search(
      r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b(?:\s+|-|\/)?(20\d{2})?",
      raw_bill_month,
      re.IGNORECASE,
    )
    if text_match:
      month = MONTH_MAP[text_match.group(1).lower()]
      year = int(text_match.group(2) or datetime.now(timezone.utc).year)
      return datetime(year, month, 1, tzinfo=timezone.utc).timestamp()

    numeric_match = re.match(r"^(\d{1,2})[\/ -](20\d{2})$", raw_bill_month)
    if numeric_match:
      month = int(numeric_match.group(1))
      year = int(numeric_match.group(2))
      return datetime(year, month, 1, tzinfo=timezone.utc).timestamp()

  created_at = str(record.get("created_at") or "").strip()
  if created_at:
    normalized = created_at.replace("Z", "+00:00")
    try:
      return datetime.fromisoformat(normalized).timestamp()
    except ValueError:
      pass

  return 0.0


def sort_bills_chronologically(history: list[dict]) -> list[dict]:
  return sorted(history, key=get_bill_chronology_timestamp)
