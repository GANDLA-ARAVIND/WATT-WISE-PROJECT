# WattWise API Reference

> Companion reference for the [Building WattWise series](./index.md).
> **Estimated reading time:** 15 minutes
> Source of truth: [`backend/main.py`](../backend/main.py) and [`app/api/backend/[...path]/route.ts`](../app/api/backend/%5B...path%5D/route.ts).

---

## Table of Contents

1. [Conventions](#conventions)
2. [The Proxy Layer](#the-proxy-layer)
3. [Authentication](#authentication)
4. [Common Errors](#common-errors)
5. [Health](#health)
6. [Bills](#bills)
7. [Intelligence](#intelligence)
8. [Assistant](#assistant)
9. [Shared Object Shapes](#shared-object-shapes)
10. [Gaps in the Contract](#gaps-in-the-contract)

---

## Conventions

**Base URLs.** From the browser, call `/api/backend/<path>`; the Next.js proxy forwards to the FastAPI service. Direct calls to the FastAPI host use the path without the prefix.

```
Browser  → /api/backend/api/bills/save
FastAPI  → /api/bills/save
```

All examples below use the direct FastAPI path. Prefix with `/api/backend` when calling from the browser.

**Content type.** `application/json` except `POST /api/bills/upload`, which is `multipart/form-data`.

**Auth.** Every route except `GET /health` requires `Authorization: Bearer <supabase_access_token>`.

**Currency and units.** Amounts are INR, consumption is kWh ("units"). Neither is tagged in the payload — a client is expected to know.

---

## The Proxy Layer

`app/api/backend/[...path]/route.ts` handles `GET`, `POST`, `PUT`, `PATCH`, `DELETE` and `OPTIONS` through one function, exported for each method, marked `export const dynamic = "force-dynamic"`.

**Guards applied before forwarding:**

| Check | Failure response |
|---|---|
| Path must start with `api/` | `404 {"detail": "Backend route is not available."}` |
| No path segment may be `..` or contain a backslash | `404` (same) |
| Non-`OPTIONS` requests must carry `Authorization: Bearer …` | `401 {"detail": "Authentication is required for this request."}` |

**Header handling:** `host` and `content-length` are stripped outbound. `content-encoding`, `content-length` and `transfer-encoding` are stripped inbound, and `x-wattwise-backend` is added identifying which backend served the request.

**Failover.** Backend candidates are tried in order: `BACKEND_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `http://127.0.0.1:8000`, `http://localhost:8000`, `http://127.0.0.1:8010`, `http://localhost:8010` (deduplicated, trailing slashes stripped). Network errors advance to the next candidate. A 5xx response is remembered and the next candidate is tried. If every candidate fails at the network level:

```json
{
  "detail": "Proxy could not reach any backend candidate (https://api.example.com, http://127.0.0.1:8000): fetch failed"
}
```
`502 Bad Gateway`

---

## Authentication

Obtain the token from the Supabase browser client:

```typescript
const { session } = useAuth();
const response = await fetch("/api/backend/api/bills", {
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

**Server-side verification** (`get_user_id`): local HS256 decode using `SUPABASE_JWT_SECRET` with `verify_aud` disabled; on any `PyJWTError` or a missing secret, falls back to `supabase.auth.get_user(token)`. The `sub` claim becomes `user_id`.

**Every data access is filtered by that id.** The backend uses the service role key, so row-level security does not apply on this path — ownership is enforced by explicit query filters.

---

## Common Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{"detail": "Missing file name."}` | Upload without a filename |
| 400 | `{"detail": "Unsupported file format. Use JPG, PNG, or PDF."}` | Extension not in the allowlist |
| 400 | `{"detail": "Question is required."}` | Empty assistant question |
| 400 | `{"detail": "Save at least one bill before using the energy assistant."}` | Assistant with no bill history |
| 401 | `{"detail": "Missing authorization token."}` | Absent or non-Bearer header |
| 401 | `{"detail": "Invalid token."}` | Signature, expiry or lookup failure |
| 404 | `{"detail": "Bill not found or already deleted."}` | Wrong id, wrong owner, or wrong lifecycle state |
| 404 | `{"detail": "Deleted bill not found."}` | Restore on a bill that is not trashed |
| 404 | `{"detail": "Deleted bill not found for permanent removal."}` | Permanent delete on an active bill |
| 413 | `{"detail": "File exceeds 10 MB limit."}` | Upload over `MAX_UPLOAD_MB` |
| 422 | FastAPI validation array | Malformed request body |
| 500 | `{"detail": "<postgrest message>"}` | Database failure |
| 502 | `{"detail": "Proxy could not reach any backend candidate …"}` | Proxy-level failure |

---

## Health

### `GET /health`

Liveness check. **No authentication.**

**Response `200`**
```json
{ "status": "ok", "parser_version": "phase4.v2" }
```

`parser_version` lets you confirm which parser build is live without consulting deploy logs.

> **Note:** this returns `ok` even if Supabase is unreachable or Tesseract is missing. It is a liveness probe, not a readiness probe.

---

## Bills

### `POST /api/bills/upload`

Stores a file and runs OCR. **The file is stored before OCR runs**, so an OCR failure still leaves a usable upload.

**Request** — `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `file` | binary | `.jpg`, `.jpeg`, `.png`, `.pdf`; max `MAX_UPLOAD_MB` (default 10) |

```bash
curl -X POST https://api.example.com/api/bills/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@march-bill.jpg"
```

**Response `200` — OCR succeeded**
```json
{
  "success": true,
  "file_path": "a3f2…/9c1e…-march-bill.jpg",
  "file_url": "https://xyz.supabase.co/storage/v1/object/public/bills/a3f2…/9c1e…-march-bill.jpg",
  "text": "Bill Month: Mar 2026\nBilling Days: 30\nUnits Consumed: 318\nBill Amount: 2340\n…",
  "ocr_confidence": 0.84
}
```

**Response `200` — OCR failed**
```json
{
  "success": false,
  "file_path": "a3f2…/9c1e…-march-bill.jpg",
  "file_url": "https://xyz.supabase.co/storage/v1/object/public/bills/a3f2…/9c1e…-march-bill.jpg",
  "error": "Tesseract is not installed on the OCR server."
}
```

> **Design note:** OCR failure is **not** an HTTP error. The upload succeeded and the file URL is returned, so the client can proceed to manual entry and still save a complete bill. Check `success` in the body, not the status code.

**Errors:** 400 (missing filename, bad extension), 401, 413, 500 (storage failure).

---

### `POST /api/bills/parse`

Parses OCR text into structured fields, merging optional manual overrides. **Stateless — nothing is persisted.**

**Request**
```json
{
  "ocr_text": "Bill Month: Mar 2026\nUnits Consumed: 318\nBlll Amount 2340\n…",
  "manual_fields": { "billing_days": 30, "bill_amount": 2340 },
  "ocr_confidence": 0.84
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `ocr_text` | string | yes | May be empty for a fully manual bill |
| `manual_fields` | object \| null | no | Human values; override machine values |
| `ocr_confidence` | number \| null | no | Below `LOW_CONFIDENCE_THRESHOLD` (0.6) flags every field |

**Response `200`**
```json
{
  "parsed": {
    "bill_month": "Mar 2026",
    "units_consumed": 318.0,
    "bill_amount": 2340.0,
    "meter_reading": 15820.0,
    "energy_charges": 1820.0
  },
  "corrected": {
    "bill_month": "Mar 2026",
    "units_consumed": 318.0,
    "bill_amount": 2340.0,
    "billing_days": 30,
    "meter_reading": 15820.0,
    "energy_charges": 1820.0
  },
  "confidence": { "bill_month": 0.8, "units_consumed": 0.88, "bill_amount": 0.88 },
  "uncertain_fields": ["meter_reading"],
  "errors": {},
  "field_meta": {
    "bill_amount": {
      "value": 2340.0,
      "confidence": 0.88,
      "source": "regex",
      "matched_on": "\\bblll\\s+amount\\b",
      "raw_line": "Blll Amount 2340",
      "requires_review": false
    },
    "billing_days": {
      "value": 30,
      "confidence": 1.0,
      "source": "manual",
      "matched_on": "manual-override",
      "raw_line": null,
      "requires_review": false
    },
    "meter_reading": {
      "value": 15820.0,
      "confidence": 0.72,
      "source": "heuristic",
      "matched_on": "meter-reading",
      "raw_line": "Present Rdg 15820",
      "requires_review": true
    }
  },
  "parser_version": "phase4.v2",
  "manual_override_fields": ["billing_days", "bill_amount"],
  "requires_verification": true
}
```

**Field semantics**

| Field | Meaning |
|---|---|
| `parsed` | Machine extraction only |
| `corrected` | `parsed` with manual overrides applied and types coerced |
| `confidence` | Per-field match score, 0–1 |
| `uncertain_fields` | Score < 0.75, or a validation error, or document confidence < 0.6 |
| `errors` | Field → human-readable validation message |
| `field_meta` | Full provenance: value, score, source, matched pattern, raw line, review flag |
| `manual_override_fields` | Fields supplied by the human |
| `requires_verification` | `uncertain_fields` is non-empty |

`source` is one of `regex`, `fuzzy`, `heuristic`, `document`, `manual`.

**Errors:** 401, 422.

---

### `POST /api/bills/save`

Parses, analyzes and persists a bill. **The heaviest endpoint in the system** — three database reads, four in-process analyses, one wide write.

**Request**
```json
{
  "ocr_text": "Bill Month: Mar 2026\nUnits Consumed: 318\n…",
  "manual_fields": {
    "bill_month": "Mar 2026",
    "billing_days": 30,
    "units_consumed": 318,
    "bill_amount": 2340,
    "net_bill_amount": 2340,
    "meter_reading": 15820,
    "energy_charges": 1820,
    "fixed_charges": 120,
    "electricity_duty": 95,
    "tariff_details": "Tariff: Domestic LT-I"
  },
  "file_url": "https://xyz.supabase.co/storage/v1/object/public/bills/…",
  "file_path": "a3f2…/9c1e…-march-bill.jpg",
  "ocr_confidence": 0.84
}
```

Every field is optional. A bill can be created entirely from `manual_fields` with empty `ocr_text`.

**Response `200`** — `PersistedBillResponse`
```json
{
  "id": "7d1f8e2a-4c3b-4a91-9f2e-1b6c8d5a3e7f",
  "verification_status": "verified",
  "parsed_data": { "bill_month": "Mar 2026", "units_consumed": 318.0, "bill_amount": 2340.0 },
  "corrected_data": { "bill_month": "Mar 2026", "units_consumed": 318.0, "bill_amount": 2340.0, "billing_days": 30 },
  "uncertain_fields": [],
  "errors": {},
  "manual_override_fields": ["billing_days"]
}
```

`verification_status` is `verified` when `uncertain_fields` is empty, otherwise `needs_review`.

**Side effects.** The row written carries far more than the response shows: `season`, all Telangana tariff columns, `ocr_raw_text`, `parsed_field_meta`, `parser_version`, and twelve JSONB analysis columns with their `*_generated_at` timestamps — seasonal metadata and insights, category and appliance contributions, recommendations with energy score and spike summary, and the full prediction payload.

**Degraded mode.** If the household profile is missing, or the profile exists but there are no appliances, fallback objects are written with `mode: "insufficient_household_context"` and a prediction payload of zeros with `model: "insufficient_history"`. The save still succeeds.

**Errors:** 401, 422, 500 (`{"detail": "Failed to persist bill record."}`).

---

### `GET /api/bills`

Lists bills for the authenticated user, newest first by `created_at`.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `include_deleted` | boolean | `false` | `true` returns active **and** trashed bills |

```bash
curl "https://api.example.com/api/bills?include_deleted=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200`** — array of `BillListItem`
```json
[
  {
    "id": "7d1f8e2a-…",
    "bill_month": "Mar 2026",
    "units_consumed": 318.0,
    "bill_amount": 2340.0,
    "billing_days": 30,
    "season": "Summer",
    "uploaded_file_url": "https://…",
    "created_at": "2026-04-02T10:14:33.120Z",
    "updated_at": "2026-04-02T10:14:33.120Z",
    "deleted_at": null,
    "is_deleted": false,
    "verification_status": "verified",
    "corrected_data": { "bill_month": "Mar 2026", "units_consumed": 318.0 },
    "seasonal_metadata": {
      "season": "Summer",
      "daily_average_units": 10.6,
      "household_intensity_per_room": 106.0,
      "seasonal_history_count": 1,
      "bill_month": "Mar 2026",
      "units_consumed": 318.0,
      "bill_amount": 2340.0
    },
    "estimated_contribution_results": [
      {
        "category": "Cooling",
        "estimated_percentage": 41.3,
        "estimated_units": 131.3,
        "color": "#10B981",
        "estimated_reason": "Cooling appliances are estimated to be a leading influence during this summer cycle."
      }
    ],
    "behavioral_assumptions": ["Cooling is estimated as the strongest category influence in the current bill."],
    "recommendation_results": [
      {
        "title": "Cooling optimization should come first",
        "text": "Cooling is estimated to be the strongest contribution category in this bill…",
        "category": "Appliance Optimization",
        "priority": "high",
        "related_appliance_category": "Cooling",
        "metadata": { "estimated_percentage": 41.3 }
      }
    ],
    "recommendation_metadata": {
      "generated_at": "2026-04-02T10:14:33.120Z",
      "season": "Summer",
      "lead_category": "Cooling",
      "recommendation_count": 7,
      "priority_breakdown": { "high": 2, "medium": 4, "low": 1 },
      "energy_score": { "grade": "B", "numeric": 76, "label": "Healthy efficiency baseline" },
      "usage_spike": { "detected": false, "severity": "none", "reasons": [], "lead_category": "Cooling", "month_over_month_change": null }
    },
    "prediction_results": { "…": "see Prediction object below" },
    "prediction_metadata": {
      "generated_at": "2026-04-02T10:14:33.120Z",
      "history_count": 0,
      "model_units": "single_point_baseline",
      "model_amount": "single_point_baseline",
      "next_month_label": "April 2026"
    }
  }
]
```

> **Normalization guarantee:** null JSONB array columns are returned as `[]`, never `null`. `corrected_data`, `seasonal_metadata`, `recommendation_metadata`, `prediction_results` and `prediction_metadata` may still be `null`.

**Errors:** 401, 500.

---

### `PUT /api/bills/{bill_id}`

Updates a bill. **Full recomputation and full row rewrite** — identical to save with `bill_id` attached, so every analysis snapshot is regenerated.

Request and response bodies match `POST /api/bills/save`. The bill being edited is excluded from its own history during analysis, so month-over-month comparison does not compare a bill against itself.

Idempotent: re-sending the same payload produces the same row.

**Errors:** 401, 422, 500. A non-existent or non-owned `bill_id` affects zero rows and produces `500 {"detail": "Failed to persist bill record."}` — arguably it should be a 404.

---

### `DELETE /api/bills/{bill_id}`

Soft delete. Sets `is_deleted = true` and `deleted_at = now()`, only on rows that are currently active.

**Response `200`**
```json
{ "id": "7d1f8e2a-…", "detail": "Bill deleted successfully." }
```

**Errors:** 401, `404 {"detail": "Bill not found or already deleted."}`

---

### `POST /api/bills/{bill_id}/restore`

Clears `is_deleted` and `deleted_at`, only on rows that are currently trashed.

**Response `200`**
```json
{ "id": "7d1f8e2a-…", "detail": "Bill restored successfully." }
```

**Errors:** 401, `404 {"detail": "Deleted bill not found."}`

---

### `DELETE /api/bills/{bill_id}/permanent`

Hard delete. Only valid on rows that are already trashed — an active bill must be soft-deleted first.

**Response `200`**
```json
{ "id": "7d1f8e2a-…", "detail": "Bill permanently deleted." }
```

> **Known gap:** the uploaded file is **not** removed from storage.

**Errors:** 401, `404 {"detail": "Deleted bill not found for permanent removal."}`

---

## Intelligence

All four endpoints are **stateless pure computation** — no database access, nothing persisted. They exist so the frontend can preview analysis on uncommitted form values.

### `POST /api/seasonal/analyze`

**Request**
```json
{
  "household": { "city": "Hyderabad", "state": "Telangana", "family_members": 4, "room_count": 3, "house_type": "2BHK", "monthly_budget_goal": 2600 },
  "appliances": [
    { "appliance_name": "AC", "quantity": 1 },
    { "appliance_name": "Fans", "quantity": 4 },
    { "appliance_name": "Lights", "quantity": 6 }
  ],
  "current_bill": { "bill_month": "Mar 2026", "units_consumed": 318, "bill_amount": 2340, "billing_days": 30 },
  "history": [
    { "bill_month": "Feb 2026", "units_consumed": 271, "bill_amount": 1980 }
  ]
}
```

**Response `200`**
```json
{
  "season": "Summer",
  "season_card": {
    "title": "Summer context detected",
    "subtitle": "Estimated seasonal behavior",
    "description": "AC and other comfort appliances are likely more active in this bill cycle."
  },
  "behavior": {
    "season": "Summer",
    "household_intensity_per_room": 106.0,
    "daily_average_units": 10.6,
    "behavior_signals": [
      "AC appears to be one of the strongest seasonal drivers in this bill cycle.",
      "Household size likely increases evening overlap across rooms and appliances.",
      "The current bill suggests a relatively active daily consumption pattern for this season."
    ],
    "priority_appliances": [
      { "appliance_name": "AC", "quantity": 1, "season_weight": 1.55, "season_reason": "AC usage typically rises in summer, especially with 1 unit(s) available." },
      { "appliance_name": "Fans", "quantity": 4, "season_weight": 5.0, "season_reason": "Fans usage typically rises in summer, especially with 4 unit(s) available." }
    ],
    "seasonal_assumptions": [
      "Cooling demand is likely elevated because warmer evenings extend fan and AC usage.",
      "Cooling appliances probably account for a larger share of household electricity this season."
    ]
  },
  "trends": {
    "current_season": "Summer",
    "current_units": 318.0,
    "current_amount": 2340.0,
    "month_over_month_change": 17.3,
    "seasonal_average_units": 0.0,
    "seasonal_average_amount": 0.0,
    "seasonal_history_count": 0
  },
  "insights": [
    { "title": "Cooling-heavy seasonal pattern", "message": "AC and Fans likely shaped a larger share of this bill…", "tone": "info" },
    { "title": "Seasonal usage climb detected", "message": "Usage moved up by about 17.3% versus the previous saved bill…", "tone": "warning" }
  ],
  "seasonal_metadata": {
    "season": "Summer",
    "daily_average_units": 10.6,
    "household_intensity_per_room": 106.0,
    "seasonal_history_count": 0
  }
}
```

`insights` is capped at 3, `behavior_signals` at 5, `priority_appliances` at 4. `tone` is `info` or `warning`.

---

### `POST /api/behavioral/analyze`

Same request shape plus an optional `seasonal_assumptions: string[]` carried over from the seasonal response.

**Response `200`**
```json
{
  "season": "Summer",
  "estimated_analysis_label": "Estimated Analysis",
  "category_contributions": [
    { "category": "Cooling", "estimated_percentage": 51.4, "estimated_units": 163.5, "color": "#10B981", "estimated_reason": "Cooling appliances are estimated to be a leading influence during this summer cycle." },
    { "category": "Lighting", "estimated_percentage": 21.8, "estimated_units": 69.3, "color": "#F59E0B", "estimated_reason": "Lighting contribution is estimated from room spread, season, and indoor-use assumptions." }
  ],
  "appliance_contributions": [
    { "appliance_name": "AC", "category": "Cooling", "quantity": 1, "estimated_percentage": 28.7, "estimated_units": 91.3, "estimated_reason": "AC appears to be one of the stronger estimated contributors in this summer bill cycle." }
  ],
  "behavior_assumptions": [
    "Cooling is estimated as the strongest category influence in the current bill.",
    "AC appears near the top of the estimated appliance contribution mix."
  ],
  "household_behavior_insights": [
    { "title": "Cooling likely led this bill", "message": "Cooling is estimated to be the strongest contribution category…", "tone": "info" }
  ],
  "estimation_metadata": {
    "estimated_units_basis": 318.0,
    "daily_average_units": 10.6,
    "occupancy_factor": 1.1,
    "room_spread_factor": 1.08,
    "house_type_factor": 1.0,
    "category_units_hint": { "Cooling": 163.5, "Lighting": 69.3 },
    "mode": "behavioral_estimation",
    "season": "Summer",
    "seasonal_history_count": 0,
    "generated_at": "2026-04-02T10:14:33.120Z"
  }
}
```

**Degraded response.** With no appliances (or all quantities zero), `category_contributions` and `appliance_contributions` are `[]` and `estimation_metadata.mode` is `"insufficient_appliance_context"`. `behavior_assumptions` is capped at 5, `household_behavior_insights` at 3.

---

### `POST /api/recommendations/analyze`

**Request** — same base shape, plus optional `seasonal_intelligence` and `behavioral_estimation` objects. If either is omitted it is recomputed server-side, which is slower but correct.

**Response `200`**
```json
{
  "estimated_analysis_label": "Estimated Analysis",
  "season": "Summer",
  "energy_score": { "grade": "B", "numeric": 76, "label": "Healthy efficiency baseline" },
  "usage_spike": {
    "detected": true,
    "severity": "medium",
    "reasons": ["Usage rose by about 17.3% compared with the previous saved bill."],
    "lead_category": "Cooling",
    "month_over_month_change": 17.3
  },
  "recommendations": [
    {
      "title": "Cooling optimization should come first",
      "text": "Cooling is estimated to be the strongest contribution category in this bill. Start with AC, cooler, and fan coordination before optimizing smaller categories.",
      "category": "Appliance Optimization",
      "priority": "high",
      "related_appliance_category": "Cooling",
      "metadata": { "estimated_percentage": 51.4 }
    },
    {
      "title": "Usage spike detected",
      "text": "Electricity usage increased by about 17.3% and cooling is one of the strongest estimated drivers in this cycle.",
      "category": "Usage Spike Alert",
      "priority": "medium",
      "related_appliance_category": "Cooling",
      "metadata": { "severity": "medium", "reasons": ["…"] }
    }
  ],
  "recommendation_metadata": {
    "generated_at": "2026-04-02T10:14:33.120Z",
    "season": "Summer",
    "lead_category": "Cooling",
    "recommendation_count": 7,
    "priority_breakdown": { "high": 2, "medium": 4, "low": 1 }
  }
}
```

`recommendations` is capped at 12, deduplicated on `(category, title)`, and sorted deterministically by `(priority, category, title)`.

**Categories:** `Seasonal Recommendation`, `Appliance Optimization`, `Tariff Awareness`, `Behavioral Suggestion`, `Household Efficiency Suggestion`, `Efficiency Improvement`, `Energy Saving Opportunity`, `Usage Spike Alert`.
**Grades:** `A` ≥90, `B+` ≥82, `B` ≥74, `C` ≥66, `D` below. Numeric is clamped to `[42, 96]`.

---

### `POST /api/predictions/analyze`

**Request** — base shape plus **required** `seasonal_intelligence` and `behavioral_estimation` objects.

**Response `200`**
```json
{
  "estimated_analysis_label": "Estimated Forecast",
  "expected_next_bill": { "min_amount": 2185.4, "max_amount": 2694.6, "center_amount": 2440.0 },
  "expected_next_units": { "min_units": 297.1, "max_units": 355.9, "center_units": 326.5 },
  "prediction_confidence": {
    "level": "Medium",
    "reason": "The forecast has enough recent history to follow your trend, but it still depends on estimated seasonal and behavioral carry-over."
  },
  "seasonal_forecast": {
    "current_season": "Summer",
    "next_season": "Rainy",
    "seasonal_spike_message": "Cooling demand may stay elevated into the next bill cycle, especially if warmer evenings continue.",
    "seasonal_spike_severity": "high",
    "seasonal_history_count": 1,
    "assumptions": ["Cooling demand is likely elevated because warmer evenings extend fan and AC usage."]
  },
  "trend_forecast": {
    "direction": "rising",
    "forecast_series": [
      { "label": "Feb 2026", "units": 271.0, "amount": 1980.0, "type": "historical" },
      { "label": "Mar 2026", "units": 318.0, "amount": 2340.0, "type": "historical" },
      { "label": "April 2026", "units": 326.5, "amount": 2440.0, "type": "predicted",
        "unitsMin": 297.1, "unitsMax": 355.9, "amountMin": 2185.4, "amountMax": 2694.6 }
    ],
    "average_units": 294.5,
    "average_amount": 2160.0
  },
  "anomaly_forecast": {
    "risk": "medium",
    "reason": "Cooling remains one of the strongest forecast sensitivities, so warmer conditions could push the next bill above your normal range.",
    "lead_category": "Cooling"
  },
  "budget_risk": {
    "budget_goal": 2600.0,
    "status": "watch",
    "message": "The upper end of the predicted bill range may exceed your budget goal if current usage pressure continues."
  },
  "appliance_contribution_forecast": [
    { "appliance_name": "AC", "estimated_percentage": 28.7, "trend_message": "AC remains part of the forecast mix, but its future influence is still estimated rather than guaranteed." }
  ],
  "prediction_reasoning": [
    "Cooling demand may stay elevated into the next bill cycle, especially if warmer evenings continue.",
    "Recent bill direction is rising, based on saved history and the latest bill pattern.",
    "The forecast has enough recent history to follow your trend…",
    "Cooling remains one of the strongest estimated forecast influences for the upcoming cycle."
  ],
  "prediction_metadata": {
    "generated_at": "2026-04-02T10:14:33.120Z",
    "history_count": 1,
    "model_units": "linear_regression",
    "model_amount": "linear_regression",
    "next_month_label": "April 2026"
  }
}
```

**Enumerations**

| Field | Values |
|---|---|
| `prediction_confidence.level` | `Low`, `Medium`, `High` |
| `trend_forecast.direction` | `rising`, `falling`, `stable` |
| `anomaly_forecast.risk` | `low`, `medium`, `high` |
| `budget_risk.status` | `safe`, `watch`, `high_risk` (whole object is `null` with no budget goal) |
| `seasonal_spike_severity` | `medium`, `high` |
| `model_units` / `model_amount` | `insufficient_history`, `single_point_baseline`, `linear_regression`, `polyfit_fallback` |

`prediction_reasoning` is capped at 4, `appliance_contribution_forecast` at 3.

---

## Assistant

### `GET /api/assistant/conversations`

Returns suggested questions, a grounded summary and the full conversation history.

**Response `200`**
```json
{
  "suggested_questions": [
    "Why is my bill high?",
    "Which appliances contribute most?",
    "Compare this month with last month",
    "What is my daily average usage?",
    "Why is cooling usage high?",
    "How can I improve my energy score?",
    "How can I reduce my electricity usage?",
    "Why is summer usage higher?",
    "What may happen next month?"
  ],
  "assistant_summary": {
    "latest_bill_month": "Mar 2026",
    "latest_units": 318.0,
    "latest_bill_amount": 2340.0,
    "season": "Summer",
    "energy_score": "B",
    "lead_category": "Cooling",
    "lead_appliance": "AC",
    "next_bill_range": { "min_amount": 2185.4, "max_amount": 2694.6, "center_amount": 2440.0 },
    "prediction_confidence": { "level": "Medium", "reason": "…" },
    "bill_count": 2
  },
  "conversations": [
    {
      "id": "b4e1…",
      "question": "Why is my bill high?",
      "answer": "Short answer: Your latest bill looks elevated mainly because cooling…",
      "assistant_category": "usage_explanation",
      "generated_insights": ["Cooling is estimated as the strongest category influence in the current bill."],
      "related_recommendation_refs": ["Cooling optimization should come first"],
      "grounding_metadata": { "season": "Summer", "lead_category": "Cooling", "energy_score": "B", "bill_count": 2 },
      "created_at": "2026-04-02T10:20:11.450Z"
    }
  ]
}
```

`assistant_summary` is `null` when the user has no saved bills — the internal 400 is caught and swallowed so the endpoint still returns history and suggestions.

> **Cost note:** producing `assistant_summary` rebuilds the entire intelligence stack (seasonal → behavioral → recommendation → prediction) on every call. This is the most expensive read in the API.

**Errors:** 401, 500.

---

### `POST /api/assistant/ask`

Answers a question from grounded context and persists the exchange.

**Request**
```json
{ "question": "Why is my bill high?" }
```

**Response `200`**
```json
{
  "id": "b4e1…",
  "question": "Why is my bill high?",
  "answer": "Short answer: Your latest bill looks elevated mainly because cooling are carrying more pressure in summer conditions. AC appears to be one of the main estimated contributors.\n\nWhy WattWise thinks that:\n- Usage is up by about 17.3% versus the previous bill, which supports that increase story.\n- A larger household size can also increase overlapping comfort and lighting demand.\n- The forecast also expects next month to stay around 297-356 units, so the system does not read this as a one-off anomaly.\nBest next moves:\n- Start with the cooling category, because that is the strongest estimated pressure point right now.\n- Use the Recommendations page to act on the highest-priority optimization card first.\n- Watch next month closely, because the forecast suggests this pattern could carry forward.",
  "assistant_category": "usage_explanation",
  "generated_insights": ["Cooling is estimated as the strongest category influence in the current bill."],
  "related_recommendations": ["Cooling optimization should come first", "Tune cooling comfort before chasing smaller loads"],
  "follow_up_suggestions": ["Which appliances contribute most?", "How can I reduce my electricity usage?", "What may happen next month?"],
  "grounding": { "season": "Summer", "lead_category": "Cooling", "energy_score": "B", "bill_count": 2 },
  "created_at": "2026-04-02T10:20:11.450Z"
}
```

**Categories** (`assistant_category`): `usage_explanation`, `bill_fact_explanation`, `bill_comparison_explanation`, `appliance_explanation`, `specific_load_explanation`, `seasonal_explanation`, `prediction_explanation`, `recommendation_explanation`, `energy_score_guidance`, `general_context`.

`follow_up_suggestions` is capped at 4 and replaces the suggestion chips in the UI.

> **Design note:** this is not an LLM. Intent is classified by keyword cascade and every figure in the answer is read from computed context, so the assistant cannot invent a number. Unanticipated phrasings fall through to `general_context`.

**Errors:** 401, `400 {"detail": "Question is required."}`, `400 {"detail": "Save at least one bill before using the energy assistant."}`, 500.

---

## Shared Object Shapes

### Household

```typescript
{
  city?: string; state?: string; house_type?: string;
  family_members?: number; room_count?: number;
  monthly_budget_goal?: number;
}
```
The frontend passes the entire `UserProfile` row; the backend reads only these fields.

### Appliance

```typescript
{ appliance_name: string; quantity: number; created_at?: string }
```
Names are normalized via an alias map (`fan`→`Fans`, `fridge`→`Refrigerator`, `air conditioner`→`AC`, …). Unknown names fall into the `Utility` category with a base factor of 1.0.

### Bill (analysis input)

```typescript
{
  bill_month: string;        // "Mar 2026" — required for season detection
  units_consumed?: number;
  bill_amount?: number;
  billing_days?: number;     // defaults to 30 when absent
  created_at?: string;       // chronology fallback
}
```

### Contribution

```typescript
{
  category: string;              // Cooling | Lighting | Always Active | Entertainment | Utility
  estimated_percentage: number;
  estimated_units: number;
  color: string;                 // server-defined hex
  estimated_reason: string;
}
```

### Recommendation

```typescript
{
  title: string;
  text: string;
  category: string;
  priority: "high" | "medium" | "low";
  related_appliance_category: string | null;
  metadata: Record<string, unknown>;   // the values that triggered the rule
}
```

---

## Gaps in the Contract

| Gap | Detail |
|---|---|
| Four endpoints lack response models | The analysis endpoints return raw dicts; the TypeScript hook types are the de facto contract |
| No pagination | `GET /api/bills` returns everything |
| No rate limiting | Upload and assistant are both expensive per call |
| `PUT` on a missing bill returns 500 | Should be 404 |
| Currency and units are implicit | Nothing in the payload declares INR or kWh |
| No API versioning | No `/v1` prefix; a breaking change has no migration path |
| No `ETag` / conditional requests | Bill lists are re-fetched in full |
| No OpenAPI customization | FastAPI generates `/docs` from what models exist; the four untyped endpoints appear without schemas |

---

**Related:** [Architecture](./architecture.md) · [Database](./database.md) · [Part 2 — FastAPI Backend](./part-2-fastapi-backend.md) · [Part 3 — OCR Pipeline](./part-3-ocr-pipeline.md)
**Diagrams:** [API request flow](./assets/diagrams/api-request-flow.md) · **Flowchart:** [API lifecycle](./assets/flowcharts/api-lifecycle.md)
