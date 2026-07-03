from __future__ import annotations

from .normalization import normalize_month_value

NON_NEGATIVE_FIELDS = {
  "units_consumed",
  "billing_days",
  "average_month_units",
  "recorded_md",
  "energy_charges",
  "fixed_charges",
  "electricity_duty",
  "interest_on_ed",
  "surcharge",
  "bill_amount",
  "gjs_subsidy",
  "net_bill_amount",
  "subsidy",
  "meter_reading"
}

OPTIONALLY_NEGATIVE_FIELDS = {
  "adjustment",
  "interest_on_cd",
  "loss_gain"
}

REQUIRED_CORE_FIELDS = {
  "bill_month",
  "bill_amount",
  "units_consumed"
}


def validate_fields(data: dict) -> dict[str, str]:
  errors: dict[str, str] = {}

  for field in REQUIRED_CORE_FIELDS:
    if field not in data or data.get(field) in (None, ""):
      errors[field] = "This field is required."

  for field, value in data.items():
    if value is None or value == "":
      continue

    if field in NON_NEGATIVE_FIELDS | OPTIONALLY_NEGATIVE_FIELDS:
      try:
        numeric_value = float(value)
      except (ValueError, TypeError):
        errors[field] = "Invalid number."
        continue

      if field in NON_NEGATIVE_FIELDS and numeric_value < 0:
        errors[field] = "Value must be zero or greater."
        continue

      if field == "billing_days" and not 1 <= numeric_value <= 60:
        errors[field] = "Billing days should be between 1 and 60."
      if field == "units_consumed" and numeric_value > 10000:
        errors[field] = "Units consumed looks unusually high."
      if field == "recorded_md" and numeric_value > 100:
        errors[field] = "Recorded MD looks unusually high."

    if field == "bill_month" and normalize_month_value(str(value)) is None:
      errors[field] = "Use a recognizable month like Mar 2026."

  return errors
