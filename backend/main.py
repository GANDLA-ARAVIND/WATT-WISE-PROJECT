import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Optional

import cv2
import fitz
import jwt
import numpy as np
import pytesseract
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pydantic import BaseModel, Field
from pytesseract import Output, TesseractNotFoundError
from supabase import create_client
from postgrest.exceptions import APIError

from services.normalization import normalize_month_value
from services.ai_energy_assistant import build_assistant_response, build_assistant_summary, default_suggested_questions
from services.assistant_context_builder import build_assistant_context
from services.behavioral_estimation_engine import build_behavioral_estimation
from services.bill_chronology import sort_bills_chronologically
from services.parser import PARSER_VERSION, apply_manual_overrides, parse_ocr_text
from services.prediction_engine import build_future_bill_prediction
from services.recommendation_engine import build_recommendation_engine_output
from services.season_detection import detect_season_from_bill_month
from services.seasonal_engine import build_seasonal_intelligence
from services.validation import validate_fields

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "bills")
OCR_LANGUAGE = os.getenv("OCR_LANGUAGE", "eng")
OCR_PSM = os.getenv("OCR_PSM", "6")
OCR_OEM = os.getenv("OCR_OEM", "3")
OCR_MIN_WIDTH = int(os.getenv("OCR_MIN_WIDTH", "1200"))
OCR_CONTRAST = float(os.getenv("OCR_CONTRAST", "1.8"))
OCR_SHARPNESS = float(os.getenv("OCR_SHARPNESS", "1.4"))
OCR_THRESHOLD = int(os.getenv("OCR_THRESHOLD", "160"))
OCR_ADAPTIVE_BLOCK_SIZE = int(os.getenv("OCR_ADAPTIVE_BLOCK_SIZE", "31"))
OCR_ADAPTIVE_C = int(os.getenv("OCR_ADAPTIVE_C", "10"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.6"))

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
  raise RuntimeError(
    "Missing Supabase config. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  )

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="WattWise OCR API")


def get_cors_origins() -> list[str]:
  configured = os.getenv(
    "CORS_ORIGINS",
    ",".join([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ]),
  )
  return [origin.strip() for origin in configured.split(",") if origin.strip()]


origins = get_cors_origins()

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}

NUMERIC_FIELDS = {
  "units_consumed",
  "bill_amount",
  "billing_days",
  "subsidy",
  "meter_reading",
  "average_month_units",
  "recorded_md",
  "energy_charges",
  "fixed_charges",
  "electricity_duty",
  "interest_on_ed",
  "surcharge",
  "adjustment",
  "interest_on_cd",
  "loss_gain",
  "gjs_subsidy",
  "net_bill_amount"
}

INTEGER_FIELDS = {
  "billing_days",
}


class ParseRequest(BaseModel):
  ocr_text: str
  manual_fields: dict[str, object] | None = None
  ocr_confidence: float | None = None


class SaveBillRequest(BaseModel):
  ocr_text: str = ""
  manual_fields: dict[str, object] | None = None
  file_url: str | None = None
  file_path: str | None = None
  ocr_confidence: float | None = None
  bill_id: str | None = None


class SeasonalAnalysisRequest(BaseModel):
  household: dict[str, Any]
  appliances: list[dict[str, Any]] = Field(default_factory=list)
  current_bill: dict[str, Any]
  history: list[dict[str, Any]] = Field(default_factory=list)


class BehavioralAnalysisRequest(BaseModel):
  household: dict[str, Any]
  appliances: list[dict[str, Any]] = Field(default_factory=list)
  current_bill: dict[str, Any]
  history: list[dict[str, Any]] = Field(default_factory=list)
  seasonal_assumptions: list[str] = Field(default_factory=list)


class RecommendationAnalysisRequest(BaseModel):
  household: dict[str, Any]
  appliances: list[dict[str, Any]] = Field(default_factory=list)
  current_bill: dict[str, Any]
  history: list[dict[str, Any]] = Field(default_factory=list)
  seasonal_intelligence: dict[str, Any] | None = None
  behavioral_estimation: dict[str, Any] | None = None


class PredictionAnalysisRequest(BaseModel):
  household: dict[str, Any]
  appliances: list[dict[str, Any]] = Field(default_factory=list)
  current_bill: dict[str, Any]
  history: list[dict[str, Any]] = Field(default_factory=list)
  seasonal_intelligence: dict[str, Any]
  behavioral_estimation: dict[str, Any]


class AssistantAskRequest(BaseModel):
  question: str


class AssistantConversationItem(BaseModel):
  id: str
  question: str
  answer: str
  assistant_category: str | None = None
  generated_insights: list[str] = Field(default_factory=list)
  related_recommendation_refs: list[str] = Field(default_factory=list)
  grounding_metadata: dict[str, Any] | None = None
  created_at: str | None = None


class AssistantAskResponse(BaseModel):
  id: str
  question: str
  answer: str
  assistant_category: str
  generated_insights: list[str] = Field(default_factory=list)
  related_recommendations: list[str] = Field(default_factory=list)
  follow_up_suggestions: list[str] = Field(default_factory=list)
  grounding: dict[str, Any] = Field(default_factory=dict)
  created_at: str


class PersistedBillResponse(BaseModel):
  id: str
  verification_status: str
  parsed_data: dict[str, Any]
  corrected_data: dict[str, Any]
  uncertain_fields: list[str] = Field(default_factory=list)
  errors: dict[str, str] = Field(default_factory=dict)
  manual_override_fields: list[str] = Field(default_factory=list)


class BillActionResponse(BaseModel):
  id: str
  detail: str


class BillListItem(BaseModel):
  id: str
  bill_month: str
  units_consumed: float | None = None
  bill_amount: float | None = None
  billing_days: int | None = None
  season: str | None = None
  uploaded_file_url: str | None = None
  created_at: str | None = None
  updated_at: str | None = None
  deleted_at: str | None = None
  is_deleted: bool = False
  verification_status: str | None = None
  corrected_data: dict[str, Any] | None = None
  seasonal_metadata: dict[str, Any] | None = None
  estimated_contribution_results: list[dict[str, Any]] | None = None
  behavioral_assumptions: list[str] | None = None
  recommendation_results: list[dict[str, Any]] | None = None
  recommendation_metadata: dict[str, Any] | None = None
  prediction_results: dict[str, Any] | None = None
  prediction_metadata: dict[str, Any] | None = None


def normalize_manual_fields(fields: dict[str, object] | None) -> dict[str, object]:
  if not fields:
    return {}
  normalized: dict[str, object] = {}
  for key, value in fields.items():
    if value is None or value == "":
      continue
    if key in INTEGER_FIELDS:
      try:
        normalized[key] = int(float(value))
      except (TypeError, ValueError):
        continue
    elif key in NUMERIC_FIELDS:
      try:
        normalized[key] = float(value)
      except (TypeError, ValueError):
        continue
    elif key == "bill_month":
      normalized_month = normalize_month_value(str(value))
      normalized[key] = normalized_month or str(value)
    else:
      normalized[key] = str(value)
  return normalized


def coerce_record_types(data: dict[str, Any]) -> dict[str, Any]:
  coerced = dict(data)
  for field in INTEGER_FIELDS:
    value = coerced.get(field)
    if value in (None, ""):
      continue
    try:
      coerced[field] = int(float(value))
    except (TypeError, ValueError):
      continue
  return coerced


def get_user_id(authorization: Optional[str]) -> str:
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail="Missing authorization token.")

  token = authorization.split(" ", 1)[1].strip()
  if SUPABASE_JWT_SECRET:
    try:
      payload = jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False}
      )
      user_id = payload.get("sub")
      if user_id:
        return user_id
    except jwt.PyJWTError:
      pass

  try:
    response = supabase.auth.get_user(token)
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid token.")

  user = getattr(response, "user", None)
  if isinstance(response, dict):
    user = response.get("user")

  if not user:
    raise HTTPException(status_code=401, detail="Invalid token.")

  user_id = getattr(user, "id", None)
  if isinstance(user, dict):
    user_id = user.get("id")

  if not user_id:
    raise HTTPException(status_code=401, detail="Invalid token payload.")

  return user_id


def preprocess_image(image: Image.Image) -> Image.Image:
  image = ImageOps.exif_transpose(image)
  if image.mode not in ("RGB", "L"):
    image = image.convert("RGB")

  if image.width and image.width < OCR_MIN_WIDTH:
    scale = OCR_MIN_WIDTH / image.width
    image = image.resize(
      (int(image.width * scale), int(image.height * scale)),
      Image.LANCZOS
    )

  gray_pil = image.convert("L")
  gray_pil = ImageEnhance.Contrast(gray_pil).enhance(OCR_CONTRAST)
  gray_pil = ImageEnhance.Sharpness(gray_pil).enhance(OCR_SHARPNESS)
  gray_pil = gray_pil.filter(ImageFilter.MedianFilter(size=3))

  gray = np.array(gray_pil)
  gray = cv2.medianBlur(gray, 3)

  block_size = OCR_ADAPTIVE_BLOCK_SIZE
  if block_size % 2 == 0:
    block_size += 1
  if block_size < 3:
    block_size = 3

  thresh = cv2.adaptiveThreshold(
    gray,
    255,
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY,
    block_size,
    OCR_ADAPTIVE_C
  )

  coords = np.column_stack(np.where(thresh < 255))
  if coords.size > 0:
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
      angle = -(90 + angle)
    else:
      angle = -angle
    (h, w) = thresh.shape
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    thresh = cv2.warpAffine(
      thresh,
      matrix,
      (w, h),
      flags=cv2.INTER_CUBIC,
      borderMode=cv2.BORDER_REPLICATE
    )

  if OCR_THRESHOLD > 0:
    _, thresh = cv2.threshold(
      thresh,
      OCR_THRESHOLD,
      255,
      cv2.THRESH_BINARY
    )

  return Image.fromarray(thresh)


def ocr_text_and_confidence(image: Image.Image) -> tuple[str, float]:
  processed = preprocess_image(image)
  config = f"--oem {OCR_OEM} --psm {OCR_PSM} -c preserve_interword_spaces=1"
  text = pytesseract.image_to_string(processed, lang=OCR_LANGUAGE, config=config)
  data = pytesseract.image_to_data(
    processed,
    lang=OCR_LANGUAGE,
    config=config,
    output_type=Output.DICT
  )
  confidences = [
    int(conf)
    for conf in data.get("conf", [])
    if conf not in ("-1", "", None)
  ]
  avg_conf = round(sum(confidences) / (len(confidences) * 100), 2) if confidences else 0.0
  return text, avg_conf


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, float]:
  pages_text = []
  confidences = []
  with fitz.open(stream=file_bytes, filetype="pdf") as doc:
    for index, page in enumerate(doc, start=1):
      pix = page.get_pixmap(dpi=300, alpha=False)
      image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
      text, confidence = ocr_text_and_confidence(image)
      confidences.append(confidence)
      pages_text.append(f"--- Page {index} ---\n{text.strip()}")
  avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else 0.0
  return "\n\n".join(pages_text).strip(), avg_conf


def extract_text_from_image(file_bytes: bytes) -> tuple[str, float]:
  image = Image.open(BytesIO(file_bytes))
  text, confidence = ocr_text_and_confidence(image)
  return text.strip(), confidence


def build_parse_response(payload: ParseRequest) -> dict[str, Any]:
  parsed_result = parse_ocr_text(payload.ocr_text)
  manual_fields = normalize_manual_fields(payload.manual_fields)
  corrected, manual_override_fields = apply_manual_overrides(parsed_result["parsed"], manual_fields)
  corrected = coerce_record_types(corrected)
  validation_errors = validate_fields(corrected)

  uncertain_fields = set(parsed_result["uncertain_fields"])
  uncertain_fields.update(validation_errors.keys())
  if payload.ocr_confidence is not None and payload.ocr_confidence < LOW_CONFIDENCE_THRESHOLD:
    uncertain_fields.update(parsed_result["parsed"].keys())

  field_meta = dict(parsed_result["field_meta"])
  for field in manual_override_fields:
    field_meta[field] = {
      "value": corrected.get(field),
      "confidence": 1.0,
      "source": "manual",
      "matched_on": "manual-override",
      "raw_line": None,
      "requires_review": False
    }

  for field in INTEGER_FIELDS:
    if field in field_meta and field in corrected:
      field_meta[field]["value"] = corrected[field]

  return {
    "parsed": parsed_result["parsed"],
    "corrected": corrected,
    "confidence": parsed_result["confidence"],
    "uncertain_fields": sorted(uncertain_fields),
    "errors": validation_errors,
    "field_meta": field_meta,
    "parser_version": parsed_result["parser_version"],
    "manual_override_fields": manual_override_fields,
    "requires_verification": bool(uncertain_fields),
  }


def build_saved_bill_seasonal_context(
  household: dict[str, Any],
  appliances: list[dict[str, Any]],
  current_bill: dict[str, Any],
  history: list[dict[str, Any]],
) -> dict[str, Any]:
  seasonal_intelligence = build_seasonal_intelligence(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
  )
  season = seasonal_intelligence["season"]
  return {
    "season": season,
    "full_analysis": seasonal_intelligence,
    "seasonal_metadata": {
      **seasonal_intelligence["seasonal_metadata"],
      "bill_month": current_bill.get("bill_month"),
      "units_consumed": current_bill.get("units_consumed"),
      "bill_amount": current_bill.get("bill_amount"),
    },
    "seasonal_behavior_insights": seasonal_intelligence["insights"],
    "seasonal_assumptions": seasonal_intelligence["behavior"].get("seasonal_assumptions", []),
  }


def get_user_household_context(
  user_id: str,
  excluded_bill_id: str | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
  profile_response = supabase.table("users").select(
    "id,name,email,city,state,family_members,room_count,house_type,monthly_budget_goal"
  ).eq("id", user_id).maybe_single().execute()
  household = getattr(profile_response, "data", None) or {}

  appliances_response = supabase.table("appliances").select(
    "appliance_name,quantity,created_at"
  ).eq("user_id", user_id).order("created_at", desc=False).execute()
  appliances = getattr(appliances_response, "data", None) or []

  bills_response = supabase.table("bills").select(
    "id,bill_month,units_consumed,bill_amount,billing_days,created_at"
  ).eq("user_id", user_id).eq("is_deleted", False).order("created_at", desc=False).execute()
  history = getattr(bills_response, "data", None) or []
  if excluded_bill_id:
    history = [bill for bill in history if bill.get("id") != excluded_bill_id]
  history = sort_bills_chronologically(history)

  return household, appliances, history


def persist_bill_record(user_id: str, payload: SaveBillRequest) -> PersistedBillResponse:
  parse_response = build_parse_response(
    ParseRequest(
      ocr_text=payload.ocr_text,
      manual_fields=payload.manual_fields,
      ocr_confidence=payload.ocr_confidence,
    )
  )

  corrected = parse_response["corrected"]
  verification_status = "needs_review" if parse_response["uncertain_fields"] else "verified"
  household, appliances, history = get_user_household_context(user_id, payload.bill_id)
  seasonal_context = build_saved_bill_seasonal_context(household, appliances, corrected, history)
  behavioral_estimation = build_behavioral_estimation(
    household=household,
    appliances=appliances,
    current_bill=corrected,
    history=history,
    seasonal_assumptions=seasonal_context["seasonal_assumptions"],
  ) if household and appliances else {
    "category_contributions": [],
    "appliance_contributions": [],
    "behavior_assumptions": [],
    "household_behavior_insights": [],
    "estimation_metadata": {
      "mode": "insufficient_household_context",
    },
    "estimated_analysis_label": "Estimated Analysis",
  }
  recommendation_output = build_recommendation_engine_output(
    household=household,
    appliances=appliances,
    current_bill=corrected,
    history=history,
    seasonal_intelligence=seasonal_context["full_analysis"] if household else None,
    behavioral_estimation=behavioral_estimation if household and appliances else None,
  ) if household else {
    "estimated_analysis_label": "Estimated Analysis",
    "season": seasonal_context["season"],
    "energy_score": {"grade": "--", "numeric": 0, "label": "Waiting for household context"},
    "usage_spike": {"detected": False, "severity": "none", "reasons": [], "lead_category": None, "month_over_month_change": None},
    "recommendations": [],
    "recommendation_metadata": {
      "generated_at": datetime.now(timezone.utc).isoformat(),
      "season": seasonal_context["season"],
      "lead_category": None,
      "recommendation_count": 0,
      "priority_breakdown": {"high": 0, "medium": 0, "low": 0},
    },
  }
  prediction_output = build_future_bill_prediction(
    household=household,
    appliances=appliances,
    current_bill=corrected,
    history=history,
    seasonal_intelligence=seasonal_context["full_analysis"] if household else {"season": seasonal_context["season"], "trends": {}, "behavior": {}},
    behavioral_estimation=behavioral_estimation,
  ) if household else {
    "estimated_analysis_label": "Estimated Forecast",
    "expected_next_bill": {"min_amount": 0.0, "max_amount": 0.0, "center_amount": 0.0},
    "expected_next_units": {"min_units": 0.0, "max_units": 0.0, "center_units": 0.0},
    "prediction_confidence": {"level": "Low", "reason": "Prediction needs household context and saved history."},
    "seasonal_forecast": {
      "current_season": seasonal_context["season"],
      "next_season": seasonal_context["season"],
      "seasonal_spike_message": "Prediction is waiting for more saved context.",
      "seasonal_spike_severity": "medium",
      "seasonal_history_count": 0,
      "assumptions": [],
    },
    "trend_forecast": {"direction": "stable", "forecast_series": [], "average_units": 0.0, "average_amount": 0.0},
    "anomaly_forecast": {"risk": "low", "reason": "Prediction needs more history.", "lead_category": None},
    "budget_risk": None,
    "appliance_contribution_forecast": [],
    "prediction_reasoning": ["Prediction is waiting for richer household and bill context."],
    "prediction_metadata": {
      "generated_at": datetime.now(timezone.utc).isoformat(),
      "history_count": len(history),
      "model_units": "insufficient_history",
      "model_amount": "insufficient_history",
      "next_month_label": "Next month",
    },
  }

  record = {
    "user_id": user_id,
    "bill_month": corrected.get("bill_month"),
    "units_consumed": corrected.get("units_consumed"),
    "bill_amount": corrected.get("bill_amount"),
    "billing_days": corrected.get("billing_days"),
    "season": seasonal_context["season"],
    "uploaded_file_url": payload.file_url,
    "ocr_raw_text": payload.ocr_text or None,
    "parsed_data": parse_response["parsed"],
    "corrected_data": corrected,
    "ocr_confidence": payload.ocr_confidence,
    "meter_reading": corrected.get("meter_reading"),
    "subsidy": corrected.get("subsidy"),
    "tariff_details": corrected.get("tariff_details"),
    "average_month_units": corrected.get("average_month_units"),
    "recorded_md": corrected.get("recorded_md"),
    "energy_charges": corrected.get("energy_charges"),
    "fixed_charges": corrected.get("fixed_charges"),
    "electricity_duty": corrected.get("electricity_duty"),
    "interest_on_ed": corrected.get("interest_on_ed"),
    "surcharge": corrected.get("surcharge"),
    "adjustment": corrected.get("adjustment"),
    "interest_on_cd": corrected.get("interest_on_cd"),
    "loss_gain": corrected.get("loss_gain"),
    "gjs_subsidy": corrected.get("gjs_subsidy"),
    "net_bill_amount": corrected.get("net_bill_amount"),
    "parsed_field_meta": parse_response["field_meta"],
    "manual_override_fields": parse_response["manual_override_fields"],
    "verification_status": verification_status,
    "parser_version": parse_response["parser_version"],
    "seasonal_metadata": seasonal_context["seasonal_metadata"],
    "seasonal_behavior_insights": seasonal_context["seasonal_behavior_insights"],
    "seasonal_assumptions": seasonal_context["seasonal_assumptions"],
    "estimated_contribution_results": behavioral_estimation["category_contributions"],
    "estimated_appliance_contributions": behavioral_estimation["appliance_contributions"],
    "estimation_metadata": behavioral_estimation["estimation_metadata"],
    "behavioral_assumptions": behavioral_estimation["behavior_assumptions"],
    "estimation_generated_at": behavioral_estimation["estimation_metadata"].get("generated_at"),
    "recommendation_results": recommendation_output["recommendations"],
    "recommendation_metadata": {
      **recommendation_output["recommendation_metadata"],
      "energy_score": recommendation_output["energy_score"],
      "usage_spike": recommendation_output["usage_spike"],
    },
    "recommendation_generated_at": recommendation_output["recommendation_metadata"].get("generated_at"),
    "prediction_results": prediction_output,
    "prediction_metadata": prediction_output["prediction_metadata"],
    "prediction_generated_at": prediction_output["prediction_metadata"].get("generated_at"),
    "is_deleted": False,
    "deleted_at": None,
    "updated_at": datetime.now(timezone.utc).isoformat(),
  }

  query = supabase.table("bills")
  try:
    if payload.bill_id:
      response = query.update(record).eq("id", payload.bill_id).eq("user_id", user_id).execute()
    else:
      response = query.insert(record).execute()
  except APIError as exc:
    raise HTTPException(status_code=500, detail=exc.message or "Failed to persist bill record.")
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc))

  data = getattr(response, "data", None) or []
  if not data:
    raise HTTPException(status_code=500, detail="Failed to persist bill record.")

  bill_id = data[0].get("id") if isinstance(data[0], dict) else None
  if not bill_id:
    bill_id = payload.bill_id or ""

  return PersistedBillResponse(
    id=bill_id,
    verification_status=verification_status,
    parsed_data=parse_response["parsed"],
    corrected_data=corrected,
    uncertain_fields=parse_response["uncertain_fields"],
    errors=parse_response["errors"],
    manual_override_fields=parse_response["manual_override_fields"],
  )


def list_bill_records(user_id: str, include_deleted: bool = False) -> list[BillListItem]:
  query = supabase.table("bills").select(
    "id,bill_month,units_consumed,bill_amount,billing_days,season,uploaded_file_url,created_at,updated_at,deleted_at,is_deleted,verification_status,corrected_data,seasonal_metadata,estimated_contribution_results,behavioral_assumptions,recommendation_results,recommendation_metadata,prediction_results,prediction_metadata"
  ).eq("user_id", user_id)

  if not include_deleted:
    query = query.eq("is_deleted", False)

  response = query.order("created_at", desc=True).execute()
  data = getattr(response, "data", None) or []
  normalized = []
  for item in data:
    normalized.append({
      **item,
      "estimated_contribution_results": item.get("estimated_contribution_results") or [],
      "behavioral_assumptions": item.get("behavioral_assumptions") or [],
      "corrected_data": item.get("corrected_data") or None,
      "seasonal_metadata": item.get("seasonal_metadata") or None,
      "recommendation_results": item.get("recommendation_results") or [],
      "recommendation_metadata": item.get("recommendation_metadata") or None,
      "prediction_results": item.get("prediction_results") or None,
      "prediction_metadata": item.get("prediction_metadata") or None,
    })
  return [BillListItem(**item) for item in normalized]


def get_assistant_source_context(user_id: str) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
  household, appliances, history = get_user_household_context(user_id)
  if not history:
    raise HTTPException(status_code=400, detail="Save at least one bill before using the energy assistant.")

  current_bill = history[-1]
  previous_history = history[:-1]
  return household, appliances, current_bill, previous_history


def save_assistant_conversation(user_id: str, response_payload: dict[str, Any]) -> AssistantAskResponse:
  created_at = datetime.now(timezone.utc).isoformat()
  record = {
    "user_id": user_id,
    "question": response_payload["question"],
    "answer": response_payload["answer"],
    "assistant_category": response_payload["assistant_category"],
    "generated_insights": response_payload.get("generated_insights") or [],
    "related_recommendation_refs": response_payload.get("related_recommendations") or [],
    "grounding_metadata": response_payload.get("grounding") or {},
    "created_at": created_at,
  }
  response = supabase.table("assistant_conversations").insert(record).execute()
  data = getattr(response, "data", None) or []
  if not data:
    raise HTTPException(status_code=500, detail="Failed to save assistant conversation.")
  inserted = data[0]
  return AssistantAskResponse(
    id=inserted.get("id"),
    question=response_payload["question"],
    answer=response_payload["answer"],
    assistant_category=response_payload["assistant_category"],
    generated_insights=response_payload.get("generated_insights") or [],
    related_recommendations=response_payload.get("related_recommendations") or [],
    follow_up_suggestions=response_payload.get("follow_up_suggestions") or [],
    grounding=response_payload.get("grounding") or {},
    created_at=inserted.get("created_at") or created_at,
  )


def list_assistant_conversations(user_id: str) -> list[AssistantConversationItem]:
  response = supabase.table("assistant_conversations").select(
    "id,question,answer,assistant_category,generated_insights,related_recommendation_refs,grounding_metadata,created_at"
  ).eq("user_id", user_id).order("created_at", desc=False).execute()
  data = getattr(response, "data", None) or []
  return [
    AssistantConversationItem(
      id=item["id"],
      question=item["question"],
      answer=item["answer"],
      assistant_category=item.get("assistant_category"),
      generated_insights=item.get("generated_insights") or [],
      related_recommendation_refs=item.get("related_recommendation_refs") or [],
      grounding_metadata=item.get("grounding_metadata") or {},
      created_at=item.get("created_at"),
    )
    for item in data
  ]


def build_energy_assistant_reply(user_id: str, question: str) -> AssistantAskResponse:
  household, appliances, current_bill, history = get_assistant_source_context(user_id)
  seasonal_intelligence = build_seasonal_intelligence(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
  )
  behavioral_estimation = build_behavioral_estimation(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_assumptions=seasonal_intelligence.get("behavior", {}).get("seasonal_assumptions", []),
  )
  recommendation_output = build_recommendation_engine_output(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )
  prediction_output = build_future_bill_prediction(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )
  assistant_context = build_assistant_context(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
    recommendation_analysis=recommendation_output,
    prediction_analysis=prediction_output,
  )
  response_payload = build_assistant_response(question, assistant_context)
  return save_assistant_conversation(user_id, response_payload)


def build_energy_assistant_summary(user_id: str) -> dict[str, Any] | None:
  household, appliances, current_bill, history = get_assistant_source_context(user_id)
  seasonal_intelligence = build_seasonal_intelligence(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
  )
  behavioral_estimation = build_behavioral_estimation(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_assumptions=seasonal_intelligence.get("behavior", {}).get("seasonal_assumptions", []),
  )
  recommendation_output = build_recommendation_engine_output(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )
  prediction_output = build_future_bill_prediction(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
  )
  assistant_context = build_assistant_context(
    household=household,
    appliances=appliances,
    current_bill=current_bill,
    history=history,
    seasonal_intelligence=seasonal_intelligence,
    behavioral_estimation=behavioral_estimation,
    recommendation_analysis=recommendation_output,
    prediction_analysis=prediction_output,
  )
  return build_assistant_summary(assistant_context)


def soft_delete_bill(user_id: str, bill_id: str) -> BillActionResponse:
  response = supabase.table("bills").update({
    "is_deleted": True,
    "deleted_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat(),
  }).eq("id", bill_id).eq("user_id", user_id).eq("is_deleted", False).execute()

  data = getattr(response, "data", None) or []
  if not data:
    raise HTTPException(status_code=404, detail="Bill not found or already deleted.")

  return BillActionResponse(id=bill_id, detail="Bill deleted successfully.")


def restore_deleted_bill(user_id: str, bill_id: str) -> BillActionResponse:
  response = supabase.table("bills").update({
    "is_deleted": False,
    "deleted_at": None,
    "updated_at": datetime.now(timezone.utc).isoformat(),
  }).eq("id", bill_id).eq("user_id", user_id).eq("is_deleted", True).execute()

  data = getattr(response, "data", None) or []
  if not data:
    raise HTTPException(status_code=404, detail="Deleted bill not found.")

  return BillActionResponse(id=bill_id, detail="Bill restored successfully.")


def permanently_delete_bill(user_id: str, bill_id: str) -> BillActionResponse:
  response = supabase.table("bills").delete().eq("id", bill_id).eq("user_id", user_id).eq("is_deleted", True).execute()

  data = getattr(response, "data", None) or []
  if not data:
    raise HTTPException(status_code=404, detail="Deleted bill not found for permanent removal.")

  return BillActionResponse(id=bill_id, detail="Bill permanently deleted.")


@app.get("/health")
def health_check():
  return {"status": "ok", "parser_version": PARSER_VERSION}


@app.post("/api/bills/upload")
async def upload_bill(
  file: UploadFile = File(...),
  authorization: Optional[str] = Header(default=None)
):
  user_id = get_user_id(authorization)

  if not file.filename:
    raise HTTPException(status_code=400, detail="Missing file name.")

  extension = os.path.splitext(file.filename.lower())[1]
  if extension not in ALLOWED_EXTENSIONS:
    raise HTTPException(
      status_code=400,
      detail="Unsupported file format. Use JPG, PNG, or PDF."
    )

  file_bytes = await file.read()
  size_mb = len(file_bytes) / (1024 * 1024)
  if size_mb > MAX_UPLOAD_MB:
    raise HTTPException(
      status_code=413,
      detail=f"File exceeds {MAX_UPLOAD_MB} MB limit."
    )

  safe_name = file.filename.replace(" ", "_")
  file_path = f"{user_id}/{uuid.uuid4()}-{safe_name}"

  upload_response = supabase.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
    file_path,
    file_bytes,
    {"content-type": file.content_type or "application/octet-stream"}
  )

  if isinstance(upload_response, dict) and upload_response.get("error"):
    raise HTTPException(status_code=500, detail="Failed to upload file.")

  public_url = supabase.storage.from_(SUPABASE_STORAGE_BUCKET).get_public_url(file_path)

  try:
    if extension == ".pdf":
      text, ocr_confidence = extract_text_from_pdf(file_bytes)
    else:
      text, ocr_confidence = extract_text_from_image(file_bytes)
  except TesseractNotFoundError:
    return {
      "success": False,
      "file_path": file_path,
      "file_url": public_url,
      "error": "Tesseract is not installed on the OCR server."
    }
  except Exception as exc:
    return {
      "success": False,
      "file_path": file_path,
      "file_url": public_url,
      "error": f"OCR failed: {exc}"
    }

  return {
    "success": True,
    "file_path": file_path,
    "file_url": public_url,
    "text": text,
    "ocr_confidence": ocr_confidence
  }


@app.post("/api/bills/parse")
async def parse_bill(
  payload: ParseRequest,
  authorization: Optional[str] = Header(default=None)
):
  get_user_id(authorization)
  return build_parse_response(payload)


@app.post("/api/bills/save", response_model=PersistedBillResponse)
async def save_bill(
  payload: SaveBillRequest,
  authorization: Optional[str] = Header(default=None)
):
  user_id = get_user_id(authorization)
  return persist_bill_record(user_id, payload)


@app.get("/api/bills")
async def get_bills(
  include_deleted: bool = Query(default=False),
  authorization: Optional[str] = Header(default=None),
):
  user_id = get_user_id(authorization)
  try:
    return [item.model_dump() for item in list_bill_records(user_id, include_deleted)]
  except APIError as exc:
    raise HTTPException(status_code=500, detail=exc.message or "Failed to load bills.")
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc))


@app.put("/api/bills/{bill_id}", response_model=PersistedBillResponse)
async def update_bill(
  bill_id: str,
  payload: SaveBillRequest,
  authorization: Optional[str] = Header(default=None),
):
  user_id = get_user_id(authorization)
  return persist_bill_record(
    user_id,
    SaveBillRequest(
      **payload.model_dump(),
      bill_id=bill_id,
    ),
  )


@app.delete("/api/bills/{bill_id}", response_model=BillActionResponse)
async def delete_bill(
  bill_id: str,
  authorization: Optional[str] = Header(default=None),
):
  user_id = get_user_id(authorization)
  return soft_delete_bill(user_id, bill_id)


@app.post("/api/bills/{bill_id}/restore", response_model=BillActionResponse)
async def restore_bill(
  bill_id: str,
  authorization: Optional[str] = Header(default=None),
):
  user_id = get_user_id(authorization)
  return restore_deleted_bill(user_id, bill_id)


@app.delete("/api/bills/{bill_id}/permanent", response_model=BillActionResponse)
async def delete_bill_permanently(
  bill_id: str,
  authorization: Optional[str] = Header(default=None),
):
  user_id = get_user_id(authorization)
  return permanently_delete_bill(user_id, bill_id)


@app.post("/api/seasonal/analyze")
async def analyze_seasonal_context(
  payload: SeasonalAnalysisRequest,
  authorization: Optional[str] = Header(default=None)
):
  get_user_id(authorization)
  return build_seasonal_intelligence(
    household=payload.household,
    appliances=payload.appliances,
    current_bill=payload.current_bill,
    history=payload.history,
  )


@app.post("/api/behavioral/analyze")
async def analyze_behavioral_estimation(
  payload: BehavioralAnalysisRequest,
  authorization: Optional[str] = Header(default=None)
):
  get_user_id(authorization)
  return build_behavioral_estimation(
    household=payload.household,
    appliances=payload.appliances,
    current_bill=payload.current_bill,
    history=payload.history,
    seasonal_assumptions=payload.seasonal_assumptions,
  )


@app.post("/api/recommendations/analyze")
async def analyze_recommendations(
  payload: RecommendationAnalysisRequest,
  authorization: Optional[str] = Header(default=None)
):
  get_user_id(authorization)
  return build_recommendation_engine_output(
    household=payload.household,
    appliances=payload.appliances,
    current_bill=payload.current_bill,
    history=payload.history,
    seasonal_intelligence=payload.seasonal_intelligence,
    behavioral_estimation=payload.behavioral_estimation,
  )


@app.post("/api/predictions/analyze")
async def analyze_prediction(
  payload: PredictionAnalysisRequest,
  authorization: Optional[str] = Header(default=None)
):
  get_user_id(authorization)
  return build_future_bill_prediction(
    household=payload.household,
    appliances=payload.appliances,
    current_bill=payload.current_bill,
    history=payload.history,
    seasonal_intelligence=payload.seasonal_intelligence,
    behavioral_estimation=payload.behavioral_estimation,
  )


@app.get("/api/assistant/conversations")
async def get_assistant_conversations(
  authorization: Optional[str] = Header(default=None)
):
  user_id = get_user_id(authorization)
  try:
    assistant_summary = None
    try:
      assistant_summary = build_energy_assistant_summary(user_id)
    except HTTPException:
      assistant_summary = None
    return {
      "suggested_questions": default_suggested_questions(),
      "assistant_summary": assistant_summary,
      "conversations": [item.model_dump() for item in list_assistant_conversations(user_id)],
    }
  except APIError as exc:
    raise HTTPException(status_code=500, detail=exc.message or "Failed to load assistant history.")
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/assistant/ask", response_model=AssistantAskResponse)
async def ask_energy_assistant(
  payload: AssistantAskRequest,
  authorization: Optional[str] = Header(default=None)
):
  user_id = get_user_id(authorization)
  question = payload.question.strip()
  if not question:
    raise HTTPException(status_code=400, detail="Question is required.")
  return build_energy_assistant_reply(user_id, question)
