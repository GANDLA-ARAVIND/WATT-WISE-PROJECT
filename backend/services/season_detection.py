from __future__ import annotations

import re
from datetime import datetime

SUMMER_MONTHS = {3, 4, 5, 6}
RAINY_MONTHS = {7, 8, 9}
WINTER_COOLER_MONTHS = {10, 11, 12, 1, 2}


def parse_month_number(bill_month: str | None) -> int | None:
  if not bill_month:
    return None

  normalized = bill_month.strip()
  month_map = {
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

  month_match = re.search(
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b",
    normalized,
    re.IGNORECASE,
  )
  if month_match:
    return month_map[month_match.group(1).lower()]

  for fmt in ("%m %Y", "%m/%Y", "%m-%Y", "%d/%m/%Y", "%d-%m-%Y"):
    try:
      return datetime.strptime(normalized, fmt).month
    except ValueError:
      continue

  return None


def detect_season_from_bill_month(bill_month: str | None) -> str:
  month_number = parse_month_number(bill_month)
  if month_number in SUMMER_MONTHS:
    return "Summer"
  if month_number in RAINY_MONTHS:
    return "Rainy"
  return "Winter/Cooler"
