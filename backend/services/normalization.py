from __future__ import annotations

import re
from datetime import datetime


def normalize_line(value: str) -> str:
  value = value.lower().strip()
  value = value.replace("|", " ")
  value = re.sub(r"[?,:;]", " ", value)
  value = re.sub(r"[^a-z0-9\s\.\-/&]", " ", value)
  value = re.sub(r"\s+", " ", value)
  return value


def split_lines(text: str) -> list[str]:
  return [line.strip() for line in text.splitlines() if line.strip()]


def normalize_numeric_token(value: str) -> float | None:
  cleaned = value.strip()
  cleaned = cleaned.replace(",", "")
  cleaned = cleaned.replace("?", "")
  cleaned = re.sub(r"(?<=\d)\s+(?=\d)", "", cleaned)
  cleaned = re.sub(r"[^\d\.\-]", "", cleaned)
  if cleaned in {"", "-", ".", "-."}:
    return None
  try:
    return float(cleaned)
  except ValueError:
    return None


def normalize_text_token(value: str) -> str:
  return re.sub(r"\s+", " ", value.strip())


def normalize_month_value(value: str) -> str | None:
  candidate = normalize_text_token(value)
  candidate = candidate.replace(".", " ")
  candidate = re.sub(r"\s+", " ", candidate)

  formats = [
    "%b %Y",
    "%B %Y",
    "%m %Y",
    "%m/%Y",
    "%m-%Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y"
  ]

  for fmt in formats:
    try:
      parsed = datetime.strptime(candidate, fmt)
      return parsed.strftime("%b %Y")
    except ValueError:
      continue

  month_match = re.search(
    r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b(?:\s+|-|/)?(20\d{2})?",
    candidate,
    re.IGNORECASE
  )
  if not month_match:
    return None

  month_raw = month_match.group(1).title()
  year_raw = month_match.group(2)
  month_map = {
    "Jan": "Jan",
    "Feb": "Feb",
    "Mar": "Mar",
    "Apr": "Apr",
    "May": "May",
    "Jun": "Jun",
    "Jul": "Jul",
    "Aug": "Aug",
    "Sep": "Sep",
    "Sept": "Sep",
    "Oct": "Oct",
    "Nov": "Nov",
    "Dec": "Dec"
  }
  month = month_map.get(month_raw)
  if not month:
    return None
  return f"{month} {year_raw}" if year_raw else month
