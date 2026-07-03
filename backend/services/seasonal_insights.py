from __future__ import annotations


def generate_seasonal_insights(
  season: str,
  household: dict,
  bill: dict,
  behavior: dict,
  trends: dict,
) -> list[dict]:
  city = household.get("city") or "your area"
  family_members = int(household.get("family_members") or 0)
  room_count = int(household.get("room_count") or 0)
  units_consumed = float(bill.get("units_consumed") or 0)
  priority_appliances = behavior.get("priority_appliances", [])
  behavior_signals = behavior.get("behavior_signals", [])
  top_appliance = priority_appliances[0]["appliance_name"] if priority_appliances else None
  second_appliance = priority_appliances[1]["appliance_name"] if len(priority_appliances) > 1 else None
  daily_average = float(behavior.get("daily_average_units") or 0)
  intensity = float(behavior.get("household_intensity_per_room") or 0)
  seasonal_history_count = int(trends.get("seasonal_history_count") or 0)
  month_over_month_change = trends.get("month_over_month_change")
  seasonal_average_units = float(trends.get("seasonal_average_units") or 0)

  insights: list[dict] = []

  insights.append(_build_primary_insight(
    season=season,
    city=city,
    top_appliance=top_appliance,
    second_appliance=second_appliance,
    family_members=family_members,
    room_count=room_count,
  ))

  load_signal = _build_load_signal(
    season=season,
    units_consumed=units_consumed,
    daily_average=daily_average,
    intensity=intensity,
    seasonal_average_units=seasonal_average_units,
    month_over_month_change=month_over_month_change,
  )
  if load_signal:
    insights.append(load_signal)

  context_signal = _build_context_signal(
    season=season,
    family_members=family_members,
    room_count=room_count,
    seasonal_history_count=seasonal_history_count,
    behavior_signals=behavior_signals,
    top_appliance=top_appliance,
  )
  if context_signal:
    insights.append(context_signal)

  deduped: list[dict] = []
  seen_titles: set[str] = set()
  for item in insights:
    if item["title"] in seen_titles:
      continue
    seen_titles.add(item["title"])
    deduped.append(item)

  if not deduped:
    deduped.append({
      "title": "Seasonal context established",
      "message": "WattWise identified a usable seasonal context and will carry it into future estimated appliance contribution and recommendation logic.",
      "tone": "info",
    })

  return deduped[:3]


def _build_primary_insight(
  season: str,
  city: str,
  top_appliance: str | None,
  second_appliance: str | None,
  family_members: int,
  room_count: int,
) -> dict:
  if season == "Summer":
    if top_appliance in {"AC", "Cooler", "Fans"} and second_appliance:
      return {
        "title": "Cooling-heavy seasonal pattern",
        "message": f"{top_appliance} and {second_appliance} likely shaped a larger share of this bill as warmer conditions increased comfort demand around {city}.",
        "tone": "info",
      }
    if top_appliance in {"AC", "Cooler", "Fans"}:
      return {
        "title": "Cooling-driven bill context",
        "message": f"{top_appliance} appears to be one of the strongest seasonal signals in this bill, which fits a warmer-month household pattern.",
        "tone": "info",
      }
    return {
      "title": "Summer household pattern detected",
      "message": "The bill suggests a warmer-season usage mix where comfort load, longer evening activity, and room overlap likely mattered more than in cooler months.",
      "tone": "info",
    }

  if season == "Rainy":
    if top_appliance == "Lights":
      return {
        "title": "Rainy lighting shift detected",
        "message": f"Lighting appears more seasonally relevant here, which fits a rainy-period pattern where indoor activity and reduced daylight often change electricity use.",
        "tone": "info",
      }
    if family_members >= 4 or room_count >= 3:
      return {
        "title": "Indoor overlap signal detected",
        "message": f"Rainy-season conditions likely increased indoor appliance overlap across {family_members or 'the'} household and {room_count or 'multiple'} active rooms.",
        "tone": "info",
      }
    return {
      "title": "Rainy-season household shift",
      "message": "This bill likely reflects a rainy-period pattern where lighting, room-based usage, and longer indoor appliance overlap became more important.",
      "tone": "info",
    }

  if top_appliance == "Geyser":
    return {
      "title": "Cooler-season water heating signal",
      "message": "Water heating appears more relevant in this bill cycle, which fits a cooler-season pattern where geyser demand can rise noticeably.",
      "tone": "info",
    }
  if top_appliance == "Lights":
    return {
      "title": "Cooler-season lighting shift",
      "message": "Lighting looks seasonally more important here, which matches earlier-evening indoor usage during cooler months.",
      "tone": "info",
    }
  return {
    "title": "Cooler-season behavior detected",
    "message": "The bill likely reflects a cooler-season mix where water heating and earlier evening usage become more relevant than summer cooling patterns.",
    "tone": "info",
  }


def _build_load_signal(
  season: str,
  units_consumed: float,
  daily_average: float,
  intensity: float,
  seasonal_average_units: float,
  month_over_month_change: float | None,
) -> dict | None:
  if month_over_month_change is not None and month_over_month_change >= 12:
    return {
      "title": "Seasonal usage climb detected",
      "message": f"Usage moved up by about {month_over_month_change}% versus the previous saved bill, suggesting this season added noticeable pressure to the household load mix.",
      "tone": "warning",
    }

  if month_over_month_change is not None and month_over_month_change <= -10:
    return {
      "title": "Seasonal load eased",
      "message": f"Usage dropped by about {abs(month_over_month_change)}% versus the previous saved bill, which suggests some seasonal demand may have softened in this cycle.",
      "tone": "info",
    }

  if seasonal_average_units > 0 and units_consumed >= seasonal_average_units * 1.15:
    return {
      "title": "Above-season baseline",
      "message": "This bill sits above the average of your comparable seasonal bills, which suggests stronger-than-usual overlap between climate-sensitive load and household routines.",
      "tone": "warning",
    }

  if seasonal_average_units > 0 and units_consumed <= seasonal_average_units * 0.9:
    return {
      "title": "Below-season baseline",
      "message": "This bill is tracking below the average of your comparable seasonal bills, which may indicate lighter seasonal pressure or more controlled household usage this cycle.",
      "tone": "info",
    }

  if daily_average >= 12:
    return {
      "title": "High daily demand signal",
      "message": f"Daily usage is running at about {round(daily_average, 1)} units per day, which points to a fairly active seasonal demand pattern across the home.",
      "tone": "warning",
    }

  if intensity >= 90:
    return {
      "title": "Multi-room activity signal",
      "message": "Per-room consumption appears relatively elevated, which can indicate overlapping appliance activity across several regularly used parts of the home.",
      "tone": "warning",
    }

  if units_consumed > 0:
    return {
      "title": f"{season} demand appears steady",
      "message": "The current bill suggests a fairly stable seasonal load pattern rather than a sharp spike, so appliance influence is likely present but not unusually extreme.",
      "tone": "info",
    }

  return None


def _build_context_signal(
  season: str,
  family_members: int,
  room_count: int,
  seasonal_history_count: int,
  behavior_signals: list[str],
  top_appliance: str | None,
) -> dict | None:
  if seasonal_history_count >= 2:
    return {
      "title": "Seasonal comparison is strengthening",
      "message": f"WattWise now has {seasonal_history_count} comparable {season.lower()} bill(s), so future seasonal interpretation can lean more on your own history instead of broad assumptions.",
      "tone": "info",
    }

  if family_members >= 5 and room_count >= 3:
    return {
      "title": "Household scale is influencing the bill",
      "message": "A larger household spread across multiple active rooms likely increases overlap between lighting, comfort load, and shared appliance routines.",
      "tone": "info",
    }

  if top_appliance and behavior_signals:
    return {
      "title": "Appliance context is active",
      "message": f"{top_appliance} is one of the strongest seasonal appliance signals right now, and the behavioral layer is using that context to shape the current bill interpretation.",
      "tone": "info",
    }

  if season == "Rainy":
    return {
      "title": "Rainy-season indoor context established",
      "message": "WattWise is treating this bill as a likely indoor-overlap period where weather and room use patterns matter more than exact device-level timing.",
      "tone": "info",
    }

  return None
