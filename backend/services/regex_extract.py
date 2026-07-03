from __future__ import annotations

import re

from .normalization import normalize_month_value, normalize_numeric_token

MONTH_PATTERN = re.compile(
  r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b",
  re.IGNORECASE
)
DATE_PATTERN = re.compile(r"\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b")
NUMBER_PATTERN = re.compile(r"-?\d[\d,\s]*(?:\.\d+)?")


def extract_numbers(line: str) -> list[float]:
  values: list[float] = []
  for match in NUMBER_PATTERN.findall(line):
    value = normalize_numeric_token(match)
    if value is not None:
      values.append(value)
  return values


def extract_bill_month(text: str) -> str | None:
  for line in text.splitlines():
    normalized = normalize_month_value(line)
    if normalized and (
      "bill" in line.lower() or "month" in line.lower() or "present" in line.lower()
    ):
      return normalized

  date_match = DATE_PATTERN.search(text)
  if date_match:
    day, month, year = date_match.groups()
    return normalize_month_value(f"{day}/{month}/{year}")

  month_match = MONTH_PATTERN.search(text)
  if month_match:
    year_match = re.search(r"\b(20\d{2})\b", text)
    candidate = month_match.group(1).title()
    if year_match:
      candidate = f"{candidate} {year_match.group(1)}"
    return normalize_month_value(candidate)

  return None


def extract_meter_reading(line: str) -> float | None:
  lower_line = line.lower()
  if "meter" in lower_line and "no" in lower_line:
    return None
  if not any(
    keyword in lower_line
    for keyword in ["present", "rdg", "reading", "meter reading", "current reading"]
  ):
    return None
  numbers = extract_numbers(line)
  if not numbers:
    return None
  return numbers[-1]


def extract_tariff_details(line: str) -> str | None:
  if any(
    keyword in line.lower()
    for keyword in ["tariff", "category", "cat", "domestic", "commercial", "lt", "ht"]
  ):
    return line.strip()
  return None
