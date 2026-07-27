# 📚 Building WattWise — An Engineering Case Study

A four-part deep dive into designing, building and reasoning about **WattWise**, an AI-powered household energy intelligence platform that turns a photograph of an electricity bill into structured data, seasonal analysis, appliance attribution, bill forecasts and personalized recommendations.

This is not a tutorial series. It is a case study: architecture decisions with their trade-offs, the mistakes that shaped the code, and the parts that still need work — documented honestly, from the repository itself.

---

## 🗺️ Reading Order

Read in order for the full narrative, or jump straight to the part that matches what you care about.

| # | Article | Focus | Time |
|---|---|---|---|
| **1** | [Building WattWise: Designing an AI-Powered Household Energy Intelligence Platform](./part-1-building-wattwise.md) | Problem framing, system architecture, technology choices, features, security, roadmap | 18 min |
| **2** | [Designing a Production-Ready FastAPI Backend](./part-2-fastapi-backend.md) | Layering, routing, validation, auth, service design, request lifecycle, scalability | 17 min |
| **3** | [From Electricity Bill to AI Insights: Building the OCR Pipeline](./part-3-ocr-pipeline.md) | Preprocessing, Tesseract, field extraction, validation, human correction, provenance | 18 min |
| **4** | [Five Engineering Lessons I Learned Building WattWise](./part-4-engineering-lessons.md) | Trade-offs, mistakes, duplication, scaling, security, reflections | 15 min |

**Total reading time: ~68 minutes.**

---

## 📖 The Series

### [Part 1 — Building WattWise](./part-1-building-wattwise.md)
*Designing an AI-Powered Household Energy Intelligence Platform · 18 min*

Why an electricity bill tells you the outcome and nothing about the cause, and what it takes to close that gap without installing hardware. Covers the product bet, the user journey, the full technology stack with reasoning, the system architecture, a feature walkthrough of every intelligence layer, the four engineering decisions that shaped everything else, the performance work, the security model, and an honest roadmap.

**Key ideas:** honesty as a data contract · compute-at-write · provenance over results · the gate that blocks users is the one that saves the product

---

### [Part 2 — Designing a Production-Ready FastAPI Backend](./part-2-fastapi-backend.md)
*Layering, contracts, auth and scalability · 17 min*

Why 31 small service modules and one large `main.py` is the right shape when the complexity lives in the domain — and where that choice starts to hurt. Covers the layering model, the full route table, three-stage validation, JWT verification with a network fallback, composition roots, the complete save-request lifecycle, the dependency injection that *should* have been used, configuration, error handling, testing and the bottlenecks in order.

**Key ideas:** pure functions over dicts · named degradation modes · determinism as a requirement · a failed enhancement is not a failed request

---

### [Part 3 — From Electricity Bill to AI Insights](./part-3-ocr-pipeline.md)
*Building the OCR Pipeline · 18 min*

What Tesseract actually produces on a phone photo of a thermal-printed bill, and the nine stages that turn `Blll Amount 2340` into a validated, attributed, forecastable record. Covers all thirteen preprocessing operations with the failure each one fixes, the two-pass confidence signal, the three-strategy extraction model with its scoring ladder, why fuzzy matching needs a hard gate, the human correction loop, and how provenance turns a parser into something you can improve.

**Key ideas:** design for the corruption you observe · store before you process · document confidence buys a product behavior · correction as exploration

---

### [Part 4 — Five Engineering Lessons](./part-4-engineering-lessons.md)
*Trade-offs, mistakes and reflections · 15 min*

Five lessons derived from the code as it stands: uncertainty belongs in the schema; compute-at-write is a loan; duplicated logic is a deadline; architecture that depends on discipline will eventually fail; perceived performance is architecture, not polish. Plus the mistakes worth naming, the trade-offs worth repeating, what breaks first at scale, and what documenting the system revealed about it.

**Key ideas:** "we always remember" is not a security property · unmeasured optimizations include placebos · documentation is a code review you perform on yourself

---

## 📐 Reference Documentation

| Document | Contents | Time |
|---|---|---|
| [architecture.md](./architecture.md) | Frontend, backend, database, API, OCR, auth, intelligence engines, deployment, scaling | 16 min |
| [database.md](./database.md) | All four tables column by column, indexes, constraints, RLS, triggers, storage, query patterns, known issues | 12 min |
| [api-reference.md](./api-reference.md) | All 15 endpoints with requests, responses, errors and examples | 15 min |

---

## 🧭 Diagrams

Mermaid diagrams for every major subsystem. Each file contains diagrams only.

| Diagram | Shows |
|---|---|
| [overall-system-architecture](./assets/diagrams/overall-system-architecture.md) | The three deployable units and both data paths |
| [frontend-backend-flow](./assets/diagrams/frontend-backend-flow.md) | Hook → proxy → FastAPI sequence and proxy failover |
| [authentication-flow](./assets/diagrams/authentication-flow.md) | Password, OAuth, backend token verification, layered guards |
| [ocr-pipeline](./assets/diagrams/ocr-pipeline.md) | Upload → preprocessing → Tesseract → degradation path |
| [bill-processing](./assets/diagrams/bill-processing.md) | Parse stage, manual override merge, save composition |
| [prediction-engine](./assets/diagrams/prediction-engine.md) | Model selection, confidence grading, budget risk states |
| [recommendation-engine](./assets/diagrams/recommendation-engine.md) | Six generators, trigger conditions, energy score composition |
| [database-relationships](./assets/diagrams/database-relationships.md) | ER diagram, bill column groups, index and policy coverage |
| [dashboard-data-flow](./assets/diagrams/dashboard-data-flow.md) | Hook composition, module cache, loading states |
| [assistant-workflow](./assets/diagrams/assistant-workflow.md) | Ask sequence, intent routing, answer shape |
| [api-request-flow](./assets/diagrams/api-request-flow.md) | Full request path, error surface, route inventory |
| [deployment-architecture](./assets/diagrams/deployment-architecture.md) | Vercel, Python host, Supabase, boot-time contracts |

---

## 🔀 Flowcharts

| Flowchart | Covers |
|---|---|
| [user-onboarding](./assets/flowcharts/user-onboarding.md) | Four-step wizard and the gate resolution predicate |
| [authentication](./assets/flowcharts/authentication.md) | Route protection, sign-up validation, session revalidation, redirect guard |
| [upload-bill](./assets/flowcharts/upload-bill.md) | Client upload states and server-side handling |
| [ocr-extraction](./assets/flowcharts/ocr-extraction.md) | PDF vs image paths, per-image extraction, confidence consequences |
| [manual-review](./assets/flowcharts/manual-review.md) | Debounced re-parse, live previews, duplicate month guard |
| [database-save](./assets/flowcharts/database-save.md) | Save orchestration, what gets written, post-save client behavior |
| [dashboard-loading](./assets/flowcharts/dashboard-loading.md) | Load sequence and cache warmth across routes |
| [predictions](./assets/flowcharts/predictions.md) | Page rendering, series assembly, next-month label derivation |
| [recommendations](./assets/flowcharts/recommendations.md) | Page flow, server assembly, recommendation item contract |
| [assistant-conversation](./assets/flowcharts/assistant-conversation.md) | Conversation loop, answer construction, grounding guarantee |
| [bill-deletion](./assets/flowcharts/bill-deletion.md) | Soft delete, permanent delete, why soft delete first |
| [bill-restoration](./assets/flowcharts/bill-restoration.md) | Restore path, lifecycle state machine, snapshot freshness |
| [application-lifecycle](./assets/flowcharts/application-lifecycle.md) | Cold start to full feature availability, backend process lifecycle |
| [error-handling](./assets/flowcharts/error-handling.md) | Client handling, backend translation, partial degradation |
| [navigation-flow](./assets/flowcharts/navigation-flow.md) | Route map, primary nav, deep-link handling |
| [api-lifecycle](./assets/flowcharts/api-lifecycle.md) | Contract layers, idempotency, where time is spent |

---

## 🧱 What WattWise Actually Is

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript 5.5 strict, Tailwind 3.4, Recharts 2.12 |
| Backend | FastAPI 0.111, Python 3.11.9, uvicorn |
| OCR | Tesseract via pytesseract, OpenCV, Pillow, PyMuPDF |
| Intelligence | rapidfuzz (parsing), NumPy + scikit-learn (forecasting), rule-based engines |
| Data | Supabase — PostgreSQL with row-level security, Auth, Storage |
| Deployment | Vercel (frontend) + a Python host with system Tesseract (backend) |

**Scale of the codebase:** ~5,200 lines of Python across `main.py` and 31 service modules, ~3,100 lines of TypeScript components plus ~5,200 lines of page code, 4 database tables, 15 API endpoints, 8 backend test files.

---

## 🎯 Who This Is For

- **Engineers** evaluating document-intelligence architectures, rule-based ML alternatives, or Next.js + FastAPI + Supabase as a stack.
- **Reviewers and hiring managers** looking for evidence of engineering judgment: trade-offs named, costs acknowledged, debt tracked rather than hidden.
- **Anyone** who has wondered what it takes to make an OCR pipeline good enough for real users to tolerate.

---

## 📄 A Note on Honesty

Every technical claim in this series is derived from the repository. Where something could not be determined from the code — deployment host configuration, measurement data, the historical sequence of refactors — it is marked as an **Assumption** rather than invented.

The series also documents what is missing: no CI, no structured logging, no rate limiting, duplicated energy-score logic across two languages, stored analysis snapshots that are never invalidated, and public storage URLs for documents containing personal data. Those are listed with their fixes because a case study that only lists strengths is marketing.

---

**Start reading:** [Part 1 — Building WattWise →](./part-1-building-wattwise.md)
