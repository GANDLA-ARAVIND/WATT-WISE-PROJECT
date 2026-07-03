from __future__ import annotations

from typing import Any
import re

from .fuzzy import best_match_score
from .normalization import (
  normalize_line,
  normalize_month_value,
  normalize_numeric_token,
  normalize_text_token,
  split_lines,
)
from .regex_extract import (
  extract_bill_month,
  extract_meter_reading,
  extract_numbers,
  extract_tariff_details,
)
from .validation import validate_fields

PARSER_VERSION = "phase4.v2"

FIELD_SPECS: dict[str, dict[str, Any]] = {
  "bill_month": {
    "aliases": ["bill month", "billing month", "month"],
    "type": "month",
    "required": True,
  },
  "bill_amount": {
    "aliases": ["bill amount", "blll amount", "bill amt", "total amount", "amount payable"],
    "patterns": [
      r"\bbill\s+amount\b",
      r"\bblll\s+amount\b",
      r"\bamount\s+payable\b",
      r"\bcurrent\s+charges\b"
    ],
    "type": "number",
    "required": True,
  },
  "net_bill_amount": {
    "aliases": ["net bill amount", "net bill amnt", "net amount", "amount due"],
    "patterns": [r"\bnet\s+bill\s+amount\b", r"\bnet\s+bill\s+amnt\b", r"\bamount\s+due\b"],
    "type": "number",
  },
  "units_consumed": {
    "aliases": ["units consumed", "unlts consmed", "unlts", "consumption"],
    "patterns": [r"\bunits?\s+consumed\b", r"\bunlts\b", r"\bconsumption\b"],
    "type": "number",
    "required": True,
  },
  "billing_days": {
    "aliases": ["billing days", "biling days", "billing day", "nays"],
    "patterns": [r"\bbilling\s+days\b", r"\bbiling\s+days\b", r"\bnays\b"],
    "type": "number",
  },
  "subsidy": {
    "aliases": ["subsidy", "subsidies"],
    "patterns": [r"\bsubsidy\b"],
    "type": "number",
  },
  "meter_reading": {
    "aliases": ["meter reading", "present reading", "current reading", "present rdg"],
    "patterns": [r"\bmeter\s+reading\b", r"\bpresent\s+reading\b", r"\bcurrent\s+reading\b", r"\bpresent\s+rdg\b"],
    "type": "number",
  },
  "tariff_details": {
    "aliases": ["tariff", "tariff details", "category", "cat"],
    "patterns": [r"\btariff\b", r"\bcategory\b", r"\bcat\b"],
    "type": "text",
  },
  "average_month_units": {
    "aliases": ["average month units", "average units", "avg month units", "avg units"],
    "patterns": [r"\baverage\s+month\s+units\b", r"\bavg(?:erage)?\s+units\b"],
    "type": "number",
  },
  "recorded_md": {
    "aliases": ["recorded md", "recorded m.d", "recorded demand", "recorded hd"],
    "patterns": [r"\brecorded\s*(?:md|m\.?d|hd|demand)\b"],
    "type": "number",
  },
  "energy_charges": {
    "aliases": ["energy charges", "energy charge"],
    "patterns": [r"\benergy\s+charges?\b"],
    "type": "number",
  },
  "fixed_charges": {
    "aliases": ["fixed charges", "fixed charge"],
    "patterns": [r"\bfixed\s+charges?\b"],
    "type": "number",
  },
  "electricity_duty": {
    "aliases": ["electricity duty", "elec duty"],
    "patterns": [r"\belectricity\s+duty\b", r"\belec\s+duty\b"],
    "type": "number",
  },
  "interest_on_ed": {
    "aliases": ["interest on ed", "interest ed"],
    "patterns": [r"\binterest\s+on\s+ed\b", r"\binterest\s+ed\b"],
    "type": "number",
  },
  "surcharge": {
    "aliases": ["surcharge", "sur charge"],
    "patterns": [r"\bsur\s*charge\b", r"\bsurcharge\b"],
    "type": "number",
  },
  "adjustment": {
    "aliases": ["adjustment", "adjust"],
    "patterns": [r"\badjustment\b", r"\badjust\b"],
    "type": "number",
  },
  "interest_on_cd": {
    "aliases": ["interest on cd", "interest cd"],
    "patterns": [r"\binterest\s+on\s+cd\b", r"\binterest\s+cd\b"],
    "type": "number",
  },
  "loss_gain": {
    "aliases": ["loss gain", "loss/gain"],
    "patterns": [r"\bloss\s*/?\s*gain\b"],
    "type": "number",
  },
  "gjs_subsidy": {
    "aliases": ["gjs subsidy", "gis subsidy", "gjs", "gis"],
    "patterns": [r"\bgjs\s+subsidy\b", r"\bgis\s+subsidy\b"],
    "type": "number",
  },
}


def _normalize_field_value(field: str, raw_value: Any, field_type: str) -> float | str | None:
  if raw_value is None:
    return None
  if field_type == "number":
    if isinstance(raw_value, (int, float)):
      return float(raw_value)
    return normalize_numeric_token(str(raw_value))
  if field_type == "month":
    return normalize_month_value(str(raw_value))
  return normalize_text_token(str(raw_value))


def _line_is_candidate_for_field(field: str, normalized_line: str) -> bool:
  token_rules = {
    "bill_amount": ["amount", "amnt", "amt", "charges"],
    "net_bill_amount": ["net", "amount", "amnt", "due"],
    "units_consumed": ["unlt", "unit", "consum"],
    "billing_days": ["billing", "biling", "day", "nays"],
    "average_month_units": ["average", "avg"],
    "recorded_md": ["recorded", "md", "hd", "demand"],
    "energy_charges": ["energy"],
    "fixed_charges": ["fixed"],
    "electricity_duty": ["duty", "elec"],
    "interest_on_ed": ["interest", "ed"],
    "interest_on_cd": ["interest", "cd"],
    "adjustment": ["adjust"],
    "loss_gain": ["loss", "gain"],
    "gjs_subsidy": ["gjs", "gis"],
    "subsidy": ["subsidy"],
    "meter_reading": ["reading", "rdg"],
    "tariff_details": ["tariff", "category", "cat"],
    "bill_month": ["month", "bill"],
  }
  required_tokens = token_rules.get(field)
  if not required_tokens:
    return True
  if field == "interest_on_ed":
    return "interest" in normalized_line and " ed" in f" {normalized_line}"
  if field == "interest_on_cd":
    return "interest" in normalized_line and " cd" in f" {normalized_line}"
  return any(token in normalized_line for token in required_tokens)


def _extract_number_from_line(field: str, line: str, match_end: int | None = None) -> float | None:
  search_region = line[match_end:] if match_end is not None else line
  numbers = extract_numbers(search_region)
  if numbers:
    return numbers[0]
  numbers = extract_numbers(line)
  if not numbers:
    return None
  return numbers[-1]


def _match_from_patterns(field: str, line: str) -> tuple[Any, float, str | None]:
  spec = FIELD_SPECS[field]
  field_type = spec["type"]
  for raw_pattern in spec.get("patterns", []):
    pattern = re.compile(raw_pattern, re.IGNORECASE)
    match = pattern.search(line)
    if not match:
      continue

    if field_type == "text":
      return line.strip(), 0.82, raw_pattern

    if field == "bill_month":
      normalized = _normalize_field_value(field, line, field_type)
      if normalized is not None:
        return normalized, 0.8, raw_pattern
      continue

    if field == "meter_reading":
      reading = extract_meter_reading(line)
      if reading is not None:
        return reading, 0.82, raw_pattern
      continue

    value = _extract_number_from_line(field, line, match.end())
    if value is not None:
      score = 0.88 if field in {"bill_amount", "units_consumed", "net_bill_amount"} else 0.84
      return value, score, raw_pattern

  return None, 0.0, None


def _match_from_fuzzy(field: str, normalized_line: str, raw_line: str) -> tuple[Any, float, str | None]:
  spec = FIELD_SPECS[field]
  if not _line_is_candidate_for_field(field, normalized_line):
    return None, 0.0, None

  score = best_match_score(normalized_line, spec["aliases"])
  if score < 78:
    return None, 0.0, None

  if spec["type"] == "text":
    return raw_line.strip(), round(score / 100, 2), "fuzzy"

  if field == "bill_month":
    normalized = _normalize_field_value(field, raw_line, spec["type"])
    if normalized is not None:
      return normalized, round(score / 100, 2), "fuzzy"
    return None, 0.0, None

  if field == "meter_reading":
    reading = extract_meter_reading(raw_line)
    if reading is not None:
      return reading, round(score / 100, 2), "fuzzy"
    return None, 0.0, None

  value = _extract_number_from_line(field, raw_line)
  if value is None:
    return None, 0.0, None
  return value, round(score / 100, 2), "fuzzy"


def parse_ocr_text(text: str) -> dict[str, Any]:
  lines = split_lines(text)
  normalized_lines = [normalize_line(line) for line in lines]

  parsed: dict[str, Any] = {}
  confidence: dict[str, float] = {}
  field_meta: dict[str, dict[str, Any]] = {}

  def set_field(
    field: str,
    value: Any,
    score: float,
    source: str,
    raw_line: str,
    matched_on: str | None
  ) -> None:
    spec = FIELD_SPECS[field]
    normalized_value = _normalize_field_value(field, value, spec["type"])
    if normalized_value is None:
      return
    if field not in parsed or score > confidence.get(field, 0):
      parsed[field] = normalized_value
      confidence[field] = score
      field_meta[field] = {
        "value": normalized_value,
        "confidence": score,
        "source": source,
        "matched_on": matched_on,
        "raw_line": raw_line,
        "requires_review": score < 0.75
      }

  for raw_line, normalized_line in zip(lines, normalized_lines):
    for field in FIELD_SPECS:
      pattern_value, pattern_score, pattern_match = _match_from_patterns(field, raw_line)
      if pattern_value is not None:
        set_field(field, pattern_value, pattern_score, "regex", raw_line, pattern_match)
        continue

      fuzzy_value, fuzzy_score, fuzzy_match = _match_from_fuzzy(field, normalized_line, raw_line)
      if fuzzy_value is not None:
        set_field(field, fuzzy_value, fuzzy_score, "fuzzy", raw_line, fuzzy_match)

    tariff = extract_tariff_details(raw_line)
    if tariff and "tariff_details" not in parsed:
      set_field("tariff_details", tariff, 0.74, "heuristic", raw_line, "tariff")

    meter_reading = extract_meter_reading(raw_line)
    if meter_reading is not None and "meter_reading" not in parsed:
      set_field("meter_reading", meter_reading, 0.72, "heuristic", raw_line, "meter-reading")

  bill_month = extract_bill_month(text)
  if bill_month:
    set_field("bill_month", bill_month, 0.78, "document", bill_month, "bill-month")

  errors = validate_fields(parsed)
  uncertain_fields = sorted(
    {
      field
      for field, meta in field_meta.items()
      if meta["requires_review"] or field in errors
    }
  )

  return {
    "parsed": parsed,
    "confidence": confidence,
    "uncertain_fields": uncertain_fields,
    "errors": errors,
    "field_meta": field_meta,
    "parser_version": PARSER_VERSION
  }


def apply_manual_overrides(parsed: dict[str, Any], manual: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
  corrected = dict(parsed)
  overridden_fields: list[str] = []
  for key, value in manual.items():
    if value is None or value == "":
      continue
    corrected[key] = value
    overridden_fields.append(key)
  return corrected, overridden_fields

