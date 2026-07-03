from __future__ import annotations


def _structured_answer(summary: str, reasoning: list[str] | None = None, actions: list[str] | None = None) -> str:
  parts = [f"Short answer: {summary}"]
  if reasoning:
    parts.append("Why WattWise thinks that:")
    parts.extend([f"- {item}" for item in reasoning[:3] if item])
  if actions:
    parts.append("Best next moves:")
    parts.extend([f"- {item}" for item in actions[:3] if item])
  return "\n\n".join([parts[0], "\n".join(parts[1:])]) if len(parts) > 1 else parts[0]


def explain_bill_fact(question: str, context: dict) -> dict:
  current_bill = context["current_bill"]
  lowered = question.lower()

  if "unit" in lowered or "consumed" in lowered:
    units = current_bill.get("units_consumed")
    answer = (
      f"The latest saved bill shows about {units} units consumed."
      if units is not None
      else "The latest saved bill does not yet have units consumed available."
    )
    follow_ups = [
      "Why is my bill high?",
      "Which appliances contribute most?",
      "What may happen next month?",
    ]
  elif "amount" in lowered or "bill amount" in lowered or "cost" in lowered:
    bill_amount = current_bill.get("bill_amount")
    answer = (
      f"The latest saved bill amount is about INR {round(float(bill_amount))}."
      if bill_amount is not None
      else "The latest saved bill does not yet have a bill amount available."
    )
    follow_ups = [
      "Why is my bill high?",
      "How can I reduce my bill?",
      "What may happen next month?",
    ]
  elif "day" in lowered or "billing" in lowered:
    billing_days = current_bill.get("billing_days")
    answer = (
      f"The latest bill covers about {billing_days} billing days."
      if billing_days is not None
      else "The latest saved bill does not yet have billing days available."
    )
    follow_ups = [
      "What is my daily average usage?",
      "Why did usage increase this month?",
      "How can I reduce my electricity usage?",
    ]
  elif "daily average" in lowered or "average usage" in lowered:
    units = current_bill.get("units_consumed")
    billing_days = current_bill.get("billing_days")
    if units is not None and billing_days:
      average = round(float(units) / max(int(billing_days), 1), 1)
      answer = f"The latest bill implies a daily average of about {average} units per day."
    else:
      answer = "The daily average needs both units consumed and billing days from the latest saved bill."
    follow_ups = [
      "Why is my bill high?",
      "What may happen next month?",
      "How can I improve my energy score?",
    ]
  else:
    bill_month = current_bill.get("bill_month")
    answer = (
      f"The latest bill in WattWise is for {bill_month}."
      if bill_month
      else "The latest saved bill does not yet have a detected bill month."
    )
    follow_ups = [
      "What is the units consumed?",
      "Why is my bill high?",
      "What may happen next month?",
    ]

  return {
    "category": "bill_fact_explanation",
    "answer": answer,
    "insights": [],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": follow_ups,
  }


def explain_bill_comparison(question: str, context: dict) -> dict:
  current_bill = context["current_bill"]
  history = context.get("history") or []
  seasonal = context["seasonal"]
  lead_category = context.get("lead_category")

  if not history:
    answer = "There is only one saved bill right now, so I cannot compare this month with a previous cycle yet."
    return {
      "category": "bill_comparison_explanation",
      "answer": answer,
      "insights": [],
      "related_recommendations": _top_recommendations(context),
      "follow_ups": [
        "Why is my bill high?",
        "Which appliances contribute most?",
        "What may happen next month?",
      ],
    }

  previous_bill = history[-1]
  current_units = float(current_bill.get("units_consumed") or 0)
  previous_units = float(previous_bill.get("units_consumed") or 0)
  current_amount = float(current_bill.get("bill_amount") or 0)
  previous_amount = float(previous_bill.get("bill_amount") or 0)
  unit_change = round(current_units - previous_units, 1)
  amount_change = round(current_amount - previous_amount, 1)
  month_change = (seasonal.get("trends") or {}).get("month_over_month_change")

  direction = "higher" if unit_change > 0 else "lower" if unit_change < 0 else "flat"
  summary = (
    f"Compared with {previous_bill.get('bill_month')}, the latest bill for {current_bill.get('bill_month')} is "
    f"{direction} by about {abs(unit_change)} units"
  )
  if current_amount or previous_amount:
    summary += f" and about INR {abs(amount_change):.0f}"
  summary += "."

  reasoning: list[str] = []
  if month_change is not None:
    if month_change > 0:
      reasoning.append(f"That is roughly a {month_change}% increase month over month.")
    elif month_change < 0:
      reasoning.append(f"That is roughly a {abs(month_change)}% decrease month over month.")

  if lead_category:
    reasoning.append(f"The strongest estimated shift still looks tied to {lead_category.lower()} pressure rather than an exact single-device event.")

  answer = _structured_answer(
    summary,
    reasoning=reasoning,
    actions=[
      "Open Recommendations to see the highest-priority optimization moves for this shift.",
      "Check whether the leading estimated category stayed active across more rooms or longer overlap periods.",
    ],
  )

  return {
    "category": "bill_comparison_explanation",
    "answer": answer,
    "insights": [
      f"Previous bill: {previous_bill.get('bill_month')}",
      f"Latest bill: {current_bill.get('bill_month')}",
      f"Estimated leading driver: {lead_category}" if lead_category else "Estimated leading driver is still building.",
    ],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": [
      "Why did usage increase this month?",
      "Which appliances contribute most?",
      "How can I reduce my bill?",
    ],
  }


def explain_usage(question: str, context: dict) -> dict:
  current_bill = context["current_bill"]
  seasonal = context["seasonal"]
  behavioral = context["behavioral"]
  prediction = context["prediction"]
  lead_category = context.get("lead_category")
  lead_appliance = context.get("lead_appliance")
  season = seasonal.get("season")
  month_change = (seasonal.get("trends") or {}).get("month_over_month_change")
  family_members = context["household"]["family_members"]
  room_count = context["household"]["room_count"]

  summary = (
    f"Your latest bill looks elevated mainly because {lead_category.lower() if lead_category else 'the strongest estimated categories'} "
    f"are carrying more pressure in {season.lower()} conditions. "
    f"{lead_appliance or 'The leading appliance mix'} appears to be one of the main estimated contributors."
  )
  reasoning: list[str] = []
  if month_change is not None and month_change > 0:
    reasoning.append(f"Usage is up by about {month_change}% versus the previous bill, which supports that increase story.")
  if family_members >= 4:
    reasoning.append("A larger household size can also increase overlapping comfort and lighting demand.")
  if room_count >= 3:
    reasoning.append("More active rooms can widen lighting and comfort usage across the home.")
  predicted = prediction.get("expected_next_units") or {}
  if predicted:
    reasoning.append(
      f"The forecast also expects next month to stay around {round(float(predicted.get('min_units') or 0))}-{round(float(predicted.get('max_units') or 0))} units, so the system does not read this as a one-off anomaly."
    )

  actions = []
  if lead_category:
    actions.append(f"Start with the {lead_category.lower()} category, because that is the strongest estimated pressure point right now.")
  actions.append("Use the Recommendations page to act on the highest-priority optimization card first.")
  if predicted:
    actions.append("Watch next month closely, because the forecast suggests this pattern could carry forward.")

  answer = _structured_answer(summary, reasoning=reasoning, actions=actions)

  insights = []
  insights.extend((behavioral.get("behavior_assumptions") or [])[:2])
  insights.extend([(seasonal.get("insights") or [{}])[0].get("message")] if seasonal.get("insights") else [])
  insights = [item for item in insights if item]

  return {
    "category": "usage_explanation",
    "answer": answer,
    "insights": insights[:3],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": [
      "Which appliances contribute most?",
      "How can I reduce my electricity usage?",
      "What may happen next month?",
    ],
  }


def explain_appliance_contribution(question: str, context: dict) -> dict:
  behavioral = context["behavioral"]
  category_contributions = behavioral.get("category_contributions") or []
  appliance_contributions = behavioral.get("appliance_contributions") or []
  top_category = category_contributions[0] if category_contributions else None
  top_appliance = appliance_contributions[0] if appliance_contributions else None

  summary = "The assistant reads appliance impact as estimated contribution, not exact metering."
  reasoning: list[str] = []
  if top_category:
    reasoning.append(
      f"Right now, {top_category['category']} looks like the strongest category at about "
      f"{top_category['estimated_percentage']}% of the estimated mix."
    )
  if top_appliance:
    reasoning.append(
      f"{top_appliance['appliance_name']} appears near the top of the appliance contribution view, "
      f"with an estimated share of about {top_appliance['estimated_percentage']}%."
    )

  answer = _structured_answer(
    summary,
    reasoning=reasoning,
    actions=[
      "Focus first on the leading estimated category before trying to optimize every appliance at once.",
      "Cross-check the Recommendations page for category-specific suggestions like cooling, lighting, or standby reduction.",
    ],
  )

  return {
    "category": "appliance_explanation",
    "answer": answer,
    "insights": [item.get("estimated_reason") for item in category_contributions[:2] if item.get("estimated_reason")],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": [
      "Why is cooling usage high?",
      "How can I reduce my bill?",
      "Why is summer usage higher?",
    ],
  }


def explain_energy_score(question: str, context: dict) -> dict:
  energy_score = context["energy_score"]
  lead_category = context.get("lead_category")
  answer = _structured_answer(
    f"Your current energy score is {energy_score.get('grade')}, which WattWise describes as {energy_score.get('label').lower()}.",
    reasoning=[
      f"The best starting point is usually the strongest estimated category, which currently looks like {lead_category.lower() if lead_category else 'your leading household load'}.",
    ],
    actions=[
      "Reduce pressure in the leading estimated category first.",
      "Use the Recommendations page to act on the highest-priority efficiency improvement card.",
    ],
  )
  return {
    "category": "energy_score_guidance",
    "answer": answer,
    "insights": [item["title"] for item in (context["recommendations"].get("recommendations") or [])[:3]],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": [
      "How can I reduce my bill?",
      "Which appliances contribute most?",
      "What may happen next month?",
    ],
  }


def explain_general(question: str, context: dict) -> dict:
  season = context["seasonal"].get("season")
  score = context["energy_score"].get("grade")
  lead_category = context.get("lead_category") or "your strongest estimated category"
  answer = _structured_answer(
    f"WattWise currently sees {season.lower()} conditions, an energy score of {score}, and {lead_category.lower()} as one of the main estimated drivers.",
    reasoning=[
      "This assistant is grounded in your saved bill history, household profile, appliance setup, seasonal intelligence, and predictions.",
    ],
    actions=[
      "Ask why the bill is high if you want the biggest current driver.",
      "Ask which appliances contribute most for the estimated appliance mix.",
      "Ask what may happen next month for the forecast explanation.",
    ],
  )
  return {
    "category": "general_context",
    "answer": answer,
    "insights": [],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": [
      "Why is my bill high?",
      "Which appliances contribute most?",
      "What may happen next month?",
    ],
  }


def explain_specific_load(question: str, context: dict) -> dict:
  lowered = question.lower()
  load_label = "appliance pressure"
  suggested_action = "target the leading category first"
  if "cool" in lowered or "ac" in lowered or "fan" in lowered:
    load_label = "cooling pressure"
    suggested_action = "raise AC set points slightly and use fan coordination more deliberately"
  elif "light" in lowered:
    load_label = "lighting pressure"
    suggested_action = "reduce unused room lighting and tighten evening lighting spread"
  elif "geyser" in lowered or "heater" in lowered:
    load_label = "water-heating pressure"
    suggested_action = "shorten water-heating windows and avoid unnecessary reheating cycles"
  elif "tv" in lowered or "entertainment" in lowered or "desktop" in lowered or "laptop" in lowered:
    load_label = "entertainment and plug-load pressure"
    suggested_action = "trim standby and long overlap sessions where possible"

  season = context["seasonal"].get("season")
  lead_category = context.get("lead_category")
  lead_appliance = context.get("lead_appliance")
  answer = _structured_answer(
    f"{load_label.capitalize()} looks elevated because the current household pattern and season make that category more relevant right now.",
    reasoning=[
      f"The current season is {season.lower()}, which can change how heavily comfort, lighting, or utility appliances contribute.",
      f"The leading estimated category is {lead_category.lower() if lead_category else 'still being inferred'}, and {lead_appliance or 'the leading appliance mix'} appears near the top of the current contribution view.",
    ],
    actions=[
      f"If you want to reduce this pressure first, {suggested_action}.",
      "Cross-check the Recommendations page for the most relevant category-specific optimization card.",
    ],
  )
  return {
    "category": "specific_load_explanation",
    "answer": answer,
    "insights": [item.get("estimated_reason") for item in (context["behavioral"].get("category_contributions") or [])[:2] if item.get("estimated_reason")],
    "related_recommendations": _top_recommendations(context),
    "follow_ups": [
      "How can I reduce my bill?",
      "Compare this month with last month",
      "What may happen next month?",
    ],
  }


def _top_recommendations(context: dict) -> list[str]:
  return [item["title"] for item in (context["recommendations"].get("recommendations") or [])[:3]]
