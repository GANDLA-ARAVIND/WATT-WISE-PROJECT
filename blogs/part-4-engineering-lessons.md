# Five Engineering Lessons I Learned Building WattWise

> **Series:** Building WattWise · **Part 4 of 4**
> **Estimated reading time:** 15 minutes
> **Prerequisite:** [Part 3 — The OCR Pipeline](./part-3-ocr-pipeline.md)

---

## Table of Contents

1. [A Note on Method](#a-note-on-method)
2. [Lesson 1 — Uncertainty Belongs in the Schema](#lesson-1--uncertainty-belongs-in-the-schema)
3. [Lesson 2 — Compute-at-Write Is a Loan, Not a Gift](#lesson-2--compute-at-write-is-a-loan-not-a-gift)
4. [Lesson 3 — Duplicated Logic Is a Deadline, Not a Smell](#lesson-3--duplicated-logic-is-a-deadline-not-a-smell)
5. [Lesson 4 — Architecture That Depends on Discipline Will Eventually Fail](#lesson-4--architecture-that-depends-on-discipline-will-eventually-fail)
6. [Lesson 5 — Perceived Performance Is Architecture, Not Polish](#lesson-5--perceived-performance-is-architecture-not-polish)
7. [Mistakes Worth Naming](#mistakes-worth-naming)
8. [Trade-offs I Would Make Again](#trade-offs-i-would-make-again)
9. [Scaling: What Breaks and In What Order](#scaling-what-breaks-and-in-what-order)
10. [Security Lessons](#security-lessons)
11. [Roadmap](#roadmap)
12. [Personal Reflections](#personal-reflections)
13. [Key Takeaways](#key-takeaways)

---

## A Note on Method

The lessons below are derived from the code as it stands, not from a reconstructed narrative of how it got there. The repository's git history is five commits, all from a single deployment-preparation session, so I cannot honestly claim "we refactored X into Y in week six." What I *can* do is read the artifacts the evolution left behind — duplicated modules, superseded hooks that still exist alongside their replacements, defensive fallbacks written against specific failures, tests that exist for one bug — and reason about what they mean.

Where I infer a sequence, I say so. Where the code states a fact, I cite it.

---

## Lesson 1 — Uncertainty Belongs in the Schema

### The problem

The system makes claims it cannot fully verify. It says cooling is 38% of your bill without measuring cooling. It says next month lands between ₹2,400 and ₹2,900 from five data points. It says a field reads 318 units based on a photograph.

The naive approach is to compute a number, render it, and add a disclaimer somewhere. That fails for a structural reason: **disclaimers live in the presentation layer, and the presentation layer forgets.** A new page gets built, the number gets rendered, the disclaimer does not come along.

### What the code does instead

Uncertainty is a field. Everywhere.

```python
# behavioral_estimation_engine.py
"estimated_analysis_label": "Estimated Analysis",

# prediction_engine.py
"estimated_analysis_label": "Estimated Forecast",
"prediction_confidence": {"level": "Medium", "reason": "The forecast has enough recent history…"},

# estimation_calculation_service.py — every contribution item
"estimated_percentage": 38.2,
"estimated_units": 121.4,
"estimated_reason": "AC appears to be one of the stronger estimated contributors…",

# ml_prediction_service.py — the model that produced the number
"model": "single_point_baseline",  # or linear_regression / polyfit_fallback / insufficient_history

# main.py — per-bill trust state
"verification_status": "needs_review",   # or "verified"
"ocr_confidence": 0.71,
```

A frontend developer building a new page cannot render a contribution percentage without the `estimated_reason` sitting right there in the object. The uncertainty is not adjacent to the data; it is *inside* it.

The same idea extends to degraded states, which are named rather than implied:

```python
"mode": "insufficient_appliance_context"
"mode": "insufficient_household_context"
"model": "insufficient_history"
```

An empty array could mean "no contributions" or "we could not compute contributions." A `mode` field removes the ambiguity, and the client can render a setup prompt instead of an empty chart.

### What I would improve

The confidence model is currently three levels — Low, Medium, High — derived from a threshold cascade. That is probably right for a UI badge and wrong for anything programmatic. A continuous score plus a human-readable band would let the frontend make finer decisions without exposing a number nobody can interpret.

### The generalization

> If a value in your system can be wrong, the fact that it can be wrong is part of the value. Model it, do not annotate it.

---

## Lesson 2 — Compute-at-Write Is a Loan, Not a Gift

### The decision

When a bill is saved, `persist_bill_record` runs the entire intelligence stack and writes all four results into JSONB columns on the same row:

```python
"seasonal_metadata": seasonal_context["seasonal_metadata"],
"seasonal_behavior_insights": seasonal_context["seasonal_behavior_insights"],
"estimated_contribution_results": behavioral_estimation["category_contributions"],
"estimation_generated_at": behavioral_estimation["estimation_metadata"].get("generated_at"),
"recommendation_results": recommendation_output["recommendations"],
"recommendation_generated_at": recommendation_output["recommendation_metadata"].get("generated_at"),
"prediction_results": prediction_output,
"prediction_generated_at": prediction_output["prediction_metadata"].get("generated_at"),
```

### What it bought

**Fast reads.** Bill history renders contribution splits and recommendation counts from one indexed `select`.

**A visible optimization in the dashboard:**

```typescript
if (currentBill.prediction_results) {
  setPredictionLoading(false);
  setPrediction(currentBill.prediction_results);
  return;                                    // network call skipped entirely
}
```

**Self-contained history.** Each bill is an analytical artifact you can render, export or diff without recomputation.

**Temporal honesty.** A recommendation generated in June reflects June's context. Recomputing it in December would produce different advice for the same bill, which is arguably *less* correct as a historical record.

### What it cost

**Staleness, and there is no invalidation.** Change your family size from 4 to 6 in settings and `occupancy_factor` moves from 1.10 to 1.18. Every previously saved bill still carries contributions computed at 1.10. Nothing recomputes them. The dashboard's *live* analysis uses the new profile, so a user can see a stored recommendation and a live recommendation that disagree, on the same screen, with no explanation.

**Schema weight.** The `bills` table has roughly 45 columns, twelve of them JSONB analysis payloads plus three `*_generated_at` timestamps.

**Write amplification.** Every save performs three sequential reads, four in-process analyses and one wide write. It is the slowest endpoint in the system by a wide margin.

### The fix I would build

The `*_generated_at` columns are already there — the design anticipated this problem and stopped one step short. Add a `profile_version` (or a hash of the household inputs) to the row, compare it on read, and either recompute lazily or mark the snapshot as stale in the UI:

```
if (bill.profile_version !== currentProfileVersion) {
  // show "computed under a previous household profile" and offer to refresh
}
```

That is a small change and it converts a silent correctness bug into a visible, explainable state.

### The generalization

> Caching computed results at write time trades freshness for speed. The trade is often right. It is only safe if you also build the invalidation, and "we'll add invalidation later" means "we have a stale cache."

---

## Lesson 3 — Duplicated Logic Is a Deadline, Not a Smell

Three pieces of logic exist in two languages in this codebase. Each was duplicated for a defensible reason. Each is now on a clock.

### Duplication 1 — The energy score

`backend/services/efficiency_analysis_service.py`:

```python
score = 78
if units_per_person <= 55:  score += 8
elif units_per_person >= 90: score -= 7
if units_per_room <= 85:    score += 5
elif units_per_room >= 130:  score -= 5
if 0 < daily_average <= 7.5: score += 5
if daily_average >= 13:      score -= 6
score = min(96, max(42, round(score)))
```

`lib/analytics/analytics-utility.ts`:

```typescript
let score = 78;
if (unitsPerPerson <= 55) score += 8;
else if (unitsPerPerson >= 90) score -= 7;
if (unitsPerRoom <= 85) score += 5;
else if (unitsPerRoom >= 130) score -= 5;
if (dailyAverage <= 7.5 && dailyAverage > 0) score += 5;
if (dailyAverage >= 13) score -= 6;
score = Math.min(96, Math.max(42, Math.round(score)));
```

Identical constants, identical thresholds, identical clamps, identical grade boundaries. **Twelve magic numbers duplicated across a language boundary.**

Why it happened is easy to reconstruct: the dashboard wanted a score without waiting for a network round trip. That is a real requirement. But the consequence is that tuning the model means editing two files in two languages, and forgetting one produces a UI that disagrees with its own API.

**The fix:** delete the TypeScript implementation. The dashboard already calls `/api/behavioral/analyze` — the score can ride along in that response, or the stored `recommendation_metadata.energy_score` (which is already persisted on every bill) can be read instead. There is no requirement here that the backend cannot satisfy.

### Duplication 2 — Bill chronology

`backend/services/bill_chronology.py` and `lib/bill-chronology.ts` implement the same algorithm: parse a month name and optional year from `bill_month`, fall back to a `MM/YYYY` numeric form, fall back to `created_at`, fall back to zero. Same regex. Same month map. Same fallback order.

This one is more defensible — the client genuinely needs to sort locally-held arrays without a round trip — but it is still two implementations of one truth. The structural fix is upstream: **store `bill_month` as a real `date` column** instead of text. Then Postgres sorts it, `ORDER BY` replaces both implementations, and the parsing logic exists only in the ingest path where it belongs.

### Duplication 3 — Two ways to read bills

Bills are readable directly from Supabase via `useBills` (RLS-protected) and through `GET /api/bills` on FastAPI (`.eq("user_id", …)`-protected). The dashboard uses the first; the bills workspace uses the second.

Both paths are correct today. They have different shapes — the FastAPI path normalizes null JSONB into empty arrays, the Supabase path does not — so `BillRecord` (TypeScript) and `BillListItem` (Pydantic) are two definitions of one entity that must be manually kept in sync.

### The pattern

Every one of these had a real justification at the moment it was created. None of them was careless. And all three are now maintenance liabilities, because **the justification was about the moment and the cost is permanent.**

> Duplication introduced for a good reason is still duplication. Write down the date and the reason next to the code, then treat it as a deadline rather than a decision.

---

## Lesson 4 — Architecture That Depends on Discipline Will Eventually Fail

### The setup

The FastAPI backend authenticates to Supabase with the service role key, which bypasses row-level security completely. Every RLS policy in the schema is invisible to it.

That is a necessary choice: the backend writes `verification_status`, `parser_version`, `ocr_confidence` and every analysis snapshot. Those are server-authored facts, and if the browser could write them through RLS, a user could claim any energy score they liked.

The consequence is that authorization becomes application code:

```python
supabase.table("bills").select(...).eq("user_id", user_id)
supabase.table("bills").update(record).eq("id", bill_id).eq("user_id", user_id)
supabase.table("bills").delete().eq("id", bill_id).eq("user_id", user_id).eq("is_deleted", True)
supabase.table("appliances").select(...).eq("user_id", user_id)
supabase.table("assistant_conversations").select(...).eq("user_id", user_id)
supabase.table("users").select(...).eq("id", user_id)
```

### Why this is the thing that worries me most

Every one of those filters is currently correct. I checked all of them.

But "currently correct" is a property of a snapshot, not of a design. There is nothing in the type system, nothing in the test suite and nothing in the framework that would catch a new endpoint whose author forgot the filter. The failure mode is not a crash or a 500 — it is a successful response containing another user's electricity bills.

**Compare this to the RLS path.** For direct browser reads, the policy `auth.uid() = user_id` is enforced by Postgres. A frontend developer *cannot* write a query that returns someone else's rows, no matter what they type. The security property holds regardless of what the application code does.

One layer makes the mistake impossible. The other makes it a code review away.

### The structural fix

```python
class BillRepository:
    def __init__(self, client, user_id: str):
        self._client = client
        self._user_id = user_id          # not optional, not defaulted

    def _scoped(self):
        return self._client.table("bills").eq("user_id", self._user_id)

    def list_active(self):
        return self._scoped().eq("is_deleted", False).order("created_at", desc=True).execute()

    def soft_delete(self, bill_id: str):
        return self._scoped().eq("id", bill_id).eq("is_deleted", False).update({...}).execute()
```

Wire it through FastAPI's `Depends` (which this codebase should be using anyway — see [Part 2](./part-2-fastapi-backend.md#dependency-injection-what-i-did-and-what-i-should-have-done)) and an unscoped query is not a mistake that can be made. The scope is a constructor argument, so there is no code path that omits it.

Roughly a day of work. It is the highest-value refactor available in this repository.

### The generalization

> There is a real difference between "we always remember to do X" and "X cannot be forgotten." The first is a process; the second is a design. Any security property that rests on the first will eventually be violated, and the violation will be silent.

---

## Lesson 5 — Perceived Performance Is Architecture, Not Polish

Every meaningful performance decision in this codebase is structural, made once, and invisible afterward.

### The five that matter

**1. Lazy chart bundles.** All four Recharts components load through `next/dynamic` with `ssr: false` and skeleton fallbacks. Recharts pulls in D3 modules and is the heaviest dependency in the app; keeping it out of the initial route bundle is the largest single win available.

**2. Middleware that skips prefetch.** The sharpest optimization here, and the one I am most pleased with:

```ts
{
  source: "/dashboard/:path*",
  missing: [
    { type: "header", key: "next-router-prefetch" },
    { type: "header", key: "purpose", value: "prefetch" }
  ]
}
```

Next.js prefetches linked routes aggressively. `supabase.auth.getUser()` makes a network call to the Supabase Auth API. Without this, hovering the sidebar fires six auth round trips before the user clicks anything. The security reasoning holds — a prefetch renders nothing, and the real navigation is checked normally.

**3. Module-level cache with in-flight deduplication.**

```typescript
let billsCache: BillsCache | null = null;
let billsFetchPromise: Promise<BillsCache> | null = null;
const billsListeners = new Set<(cache: BillsCache | null) => void>();

if (!billsFetchPromise || billsFetchPromiseUserId !== user.id) {
  billsFetchPromiseUserId = user.id;
  billsFetchPromise = fetchBills().finally(() => {
    billsFetchPromise = null;
    billsFetchPromiseUserId = null;
  });
}
const nextCache = await billsFetchPromise;
```

Three components calling `useBills` on the same render produce one query. Navigation between dashboard routes serves from cache with zero network. The listener set broadcasts updates so every consumer stays in sync.

**4. Collapsing the hook waterfall.** The original composition was `useSeasonalIntelligence` → `useBehavioralEstimation` (waits for seasonal) → `useRecommendations` (waits for both). Three sequential round trips, each with its own loading state, producing visibly cascading spinners. `useDashboardAnalytics` and `useIntelligenceBundle` run the same chain inside one effect with a `cancelled` flag for cleanup and a single `initialLoading` derived from whether the whole chain has settled.

**5. Structurally accurate skeletons.** `app/(dashboard)/loading.tsx` renders a stat row, a chart panel and an insight list — the actual shape of the page. Content fills in rather than replacing a spinner, so there is no layout jump.

### The honest asterisk

**None of this is measured.** No Lighthouse budget, no bundle analyzer, no Web Vitals reporting, no timing on the backend. These are well-reasoned optimizations; they are not verified ones.

That distinction matters more than it sounds. The double median filter in the OCR preprocessing chain (Pillow's `MedianFilter(3)` followed by OpenCV's `medianBlur(3)`) is exactly the kind of thing that survives in an unmeasured codebase — it *seems* to help, nothing contradicts it, so it stays. Some fraction of the "optimizations" in any unmeasured system are placebo, and without measurement you cannot tell which.

### The other asterisk: the caches have no invalidation

`billsCache`, `applianceCache` and `profileCache` have no TTL and no cross-tab awareness. `refresh({ force: true })` exists and is called after mutations, so the common paths are covered — but two tabs open on the same account can diverge indefinitely.

### The generalization

> Perceived performance comes from a handful of structural decisions — what loads lazily, what is cached, what runs in parallel — made early and rarely revisited. It does not come from micro-optimizations. But structural decisions you never measure are beliefs, not facts.

---

## Mistakes Worth Naming

**Committed `__pycache__` artifacts.** `git ls-files` returns 193 files, and a substantial number are `.pyc` files under `backend/services/__pycache__/`. The `.gitignore` covers `node_modules`, `.next`, env files, logs and `*.tsbuildinfo` — but has no `__pycache__` entry. A five-second fix that survived because nothing ever complained. It is a small thing, and it is exactly the kind of small thing a CI pipeline catches on day one.

**No CI, with a real test suite sitting there.** Eight test files, including a genuinely well-designed fixture-driven parser regression suite. Nothing runs them automatically. Tests that do not run on every push are documentation with a `.py` extension.

**`main.py` at 1,119 lines.** It holds routes, twelve Pydantic models, the entire OCR pipeline, type coercion helpers, auth extraction and six orchestration functions. The OCR functions in particular have nothing to do with routing and belong in `services/ocr_service.py`. The service layer got decomposed beautifully into 35 modules; the entry point never did.

**`bill_month` stored as text.** Every chronological operation — sorting, seasonal grouping, duplicate detection, month-over-month comparison — parses a string. Two implementations of that parsing exist (Python and TypeScript). A `date` column would delete both and let Postgres do the work.

**Dead code paths that were never removed.** `useSeasonalIntelligence`, `useBehavioralEstimation` and `useRecommendations` still exist alongside the consolidated `useDashboardAnalytics` and `useIntelligenceBundle` that were built to replace them, and some pages still use the old ones. A partial migration is worse than either endpoint of it, because a reader cannot tell which pattern is current.

**A 60-line workaround for a missing migration story.** `useProfile` detects PostgREST "schema cache" errors mentioning `onboarding_completed_at` or `onboarding_skipped_at`, retries with a narrower column list, and stores the skip flag in `localStorage` instead. It works. It exists because a deployed database was behind the application, and the fix for that is versioned migrations, not defensive client code.

**No storage cleanup on permanent delete.** `DELETE /api/bills/{id}/permanent` removes the row and leaves the uploaded file in the bucket forever. Orphaned objects accumulate, and for documents containing names and account numbers that is a data-retention problem, not just a storage one.

---

## Trade-offs I Would Make Again

**Rule-based intelligence over machine learning.** There is no ground truth for appliance attribution — nobody knows what fraction of a bill was cooling. A supervised model has nothing to learn from. A multiplier chain (`quantity × base_factor × seasonal_multiplier × occupancy × room_spread × house_type × activity`) can be read, argued with, corrected one constant at a time, and — critically — can explain itself. `estimated_reason` exists on every contribution item precisely because the model is transparent enough to have a reason.

**A deterministic assistant instead of an LLM.** `_classify_intent` is a keyword cascade over ten intents, each routing to an explainer that reads a computed context. It cannot hallucinate a number because it has no generative capacity. Every figure it reports was calculated by a service and stored. For a product whose entire value is trustworthy numbers about your money, that constraint is a feature.

The cost is real — unanticipated phrasings fall through to `explain_general` — and the upgrade path is clean: the context object assembled by `build_assistant_context` is already a near-perfect LLM prompt payload. Adding a generative layer *on top of* grounded context is a strictly better position than starting generative and retrofitting grounding.

**The mandatory onboarding gate.** Blocking navigation with `inert` and a scroll lock until household setup is complete feels hostile. It is the only reason a first-time dashboard has content on it. Without `family_members`, `room_count`, `house_type` and appliances, behavioral estimation returns `insufficient_appliance_context` and every card renders empty. Blocking is kinder than a blank page.

**The Next.js proxy.** It keeps the browser on one origin (CORS off the hot path), hides the backend URL, enforces auth at the edge before traffic reaches Python, and closes path traversal by construction. 119 lines for four distinct properties.

**Storing provenance obsessively.** `ocr_raw_text`, `parsed_data`, `corrected_data`, `parsed_field_meta`, `manual_override_fields`, `ocr_confidence`, `parser_version` — seven columns of history per bill. That is the difference between a parser you can improve with evidence and one you improve by guessing. `manual_override_fields` alone is a live, user-generated dataset of exactly which fields the parser gets wrong.

---

## Scaling: What Breaks and In What Order

| # | Breaks at | What happens | Fix |
|---|---|---|---|
| 1 | Concurrent uploads | Blocking `pytesseract`/`cv2` calls inside `async def` handlers stall the event loop; one OCR request blocks all others | Change handlers to `def` (Starlette threads them), then move to a job queue |
| 2 | ~50 bills per user | `get_user_household_context` loads *every* non-deleted bill on every save | Window to the last 24 months |
| 3 | Assistant usage | `GET /api/assistant/conversations` recomputes the entire intelligence stack just to render a summary header | Read the latest bill's stored snapshots instead |
| 4 | Any abuse | No rate limiting anywhere; `/api/bills/upload` runs Tesseract at 300 dpi per page | Per-user limits on upload and assistant |
| 5 | Any incident | No structured logging, no request ids, no metrics | JSON logs + request-id middleware + timing |
| 6 | Multiple workers | Module-level client caches diverge across tabs and instances | Move to a proper query cache with invalidation |
| 7 | Table growth | JSONB analysis columns make `bills` rows wide | Partition analysis into a separate table if row size becomes a problem |

Number 1 is both the most severe and the cheapest to fix. Removing `async` from `upload_bill` is a one-word change that lets Starlette run it in a thread pool. It has not been done.

**What already scales well:** the four analysis endpoints are pure functions over their request payloads with no database access. They are trivially parallel, trivially cacheable, and could be extracted into a separate service without touching a line of their logic. The compute-at-write design also means read paths are cheap — rendering bill history with contribution splits is one indexed `select`.

---

## Security Lessons

**Layered guards are worth the redundancy.** Middleware, `ProtectedRoute`, `MandatoryOnboardingGate`, the proxy's Bearer check, `get_user_id`, per-query ownership filters, and RLS. That is seven layers, and they are not equivalent — the middleware protects rendering, the proxy protects the backend from unauthenticated traffic, RLS protects the data. Each covers a different failure.

**`safeRedirectPath` appearing three times is correct duplication.** Login, register and the auth callback each implement it independently. Centralizing it would be cleaner, but an open redirect in an auth flow is a real vulnerability, and three independent guards fail independently. This is the one duplication in the codebase I would not remove.

**Public storage URLs for personally identifying documents is the issue I would fix first.** `get_public_url` implies a public bucket. Electricity bills contain names, addresses, service numbers and account numbers. Anyone with the URL can read one. Signed, expiring URLs are the correct choice and the change is small.

**Fail-fast configuration is a security feature.** Four frontend files and the backend all throw at module load when required environment variables are missing. A misconfigured deploy that starts successfully and then behaves unpredictably is far worse than one that refuses to start.

**Validation bounds catch security-adjacent bugs.** `1 ≤ billing_days ≤ 60` exists to catch OCR misreads, but it also bounds a value that flows into division (`units / billing_days`). Domain constraints and defensive programming overlap more than they are usually credited for.

---

## Roadmap

**P0 — Correctness and safety**
1. Repository layer with mandatory `user_id` scoping (removes the class of bug that leaks data)
2. CI running `python -m unittest discover`, `tsc --noEmit` and `next lint`
3. Versioned migrations replacing the idempotent `schema.sql` script
4. Signed storage URLs instead of public ones
5. `.gitignore` entry for `__pycache__` and removal of the tracked `.pyc` files

**P1 — Removing debt**
6. Delete the TypeScript energy score; read it from the API or the stored snapshot
7. `bill_month` as a `date` column; delete both chronology implementations
8. Snapshot staleness detection via a profile version on each bill
9. Extract OCR and orchestration out of `main.py`
10. Finish the hook migration and delete the superseded hooks
11. Adopt FastAPI `Depends` for auth and repositories

**P2 — Operations**
12. Structured JSON logging with request ids and timing
13. `/health/ready` that verifies Supabase connectivity and Tesseract availability
14. Rate limiting on upload and assistant endpoints
15. Background OCR queue with job status
16. Storage cleanup on permanent delete

**P3 — Product**
17. Region-configurable season mapping (currently hard-coded for southern India)
18. PDF text-layer extraction before rasterization
19. Layout-aware field extraction using the bounding boxes `image_to_data` already returns and currently discards
20. Mine `manual_override_fields` to produce a user-generated parser backlog
21. Optional LLM layer over the existing grounded context object

---

## Personal Reflections

**The hardest problem was not technical.** Building the OCR pipeline was difficult in a familiar way — thirteen preprocessing operations, a scoring ladder, a token gate. Deciding *how confident to sound* was harder, and it turned out to be an engineering problem rather than a copywriting one. The answer — put uncertainty in the schema — only became obvious after trying and abandoning the alternative of handling it in the UI.

**Small modules paid off more than I expected.** Thirty-one service files, most under 100 lines. `budget_risk_analyzer.py` is 32 lines. That felt excessive while writing it and felt correct every time afterward: each one is independently testable with plain dictionaries, and the composition roots read like specifications.

**The consolidated hooks are the change I would make earliest next time.** Naively composed hooks — each waiting on the previous one's data — produce a waterfall that is invisible in development against localhost and painful in production. `useDashboardAnalytics` fixed it by running the chain in one effect. Recognizing that pattern earlier would have saved the intermediate implementation that is still sitting in the repository.

**Writing this documentation found bugs.** Tracing the analysis-snapshot lifecycle to write [Lesson 2](#lesson-2--compute-at-write-is-a-loan-not-a-gift) is what surfaced that there is no invalidation when the household profile changes. Enumerating the ownership filters for [Lesson 4](#lesson-4--architecture-that-depends-on-discipline-will-eventually-fail) is what made the service-role risk concrete rather than abstract. Comparing the two energy score implementations line by line is what confirmed all twelve constants are duplicated. Documentation is a code review you perform on yourself, and it is unusually good at finding the class of problem that only appears when you look at a whole subsystem at once.

**What I am genuinely proud of:** the parser's alias list containing `"blll amount"` and `"unlts consmed"`. It is unglamorous and slightly absurd to read, and it is the result of looking at what actually broke rather than what should theoretically break. Most of the good decisions in this codebase have that shape.

---

## Key Takeaways

1. **Uncertainty belongs in the schema, not the UI.** A field cannot be forgotten by a new page; a disclaimer can.
2. **Compute-at-write is a loan.** It buys read speed against future staleness. Build the invalidation when you build the cache, or accept that you have a stale cache.
3. **Justified duplication is still duplication.** Record the reason and the date next to the code, and treat it as a deadline.
4. **"We always remember" is not a security property.** Make the mistake impossible rather than unlikely — a scoped repository beats a code review.
5. **Perceived performance is a handful of structural decisions.** Lazy bundles, a prefetch-aware auth guard, deduplicated fetches, a collapsed waterfall. Make them early — and then measure them, because unmeasured optimizations include placebos you cannot identify.

---

**Previous:** [← Part 3 — The OCR Pipeline](./part-3-ocr-pipeline.md)
**Start over:** [Part 1 — Building WattWise](./part-1-building-wattwise.md)

**Reference docs:** [Architecture](./architecture.md) · [Database](./database.md) · [API Reference](./api-reference.md)
**All diagrams:** [assets/diagrams/](./assets/diagrams/) · **All flowcharts:** [assets/flowcharts/](./assets/flowcharts/)
