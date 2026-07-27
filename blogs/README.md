# blogs/

Engineering documentation for **WattWise** — an AI-powered household energy intelligence platform.

This folder contains a four-part case study plus reference documentation, diagrams and flowcharts. It is written to be read on GitHub as-is, and each article is self-contained enough to be published to LinkedIn Articles, Medium, Hashnode or a portfolio site without editing.

**Start here → [index.md](./index.md)**

---

## Contents

```txt
blogs/
├── README.md                         # this file
├── index.md                          # series landing page and navigation
│
├── part-1-building-wattwise.md       # product, architecture, features, decisions  (18 min)
├── part-2-fastapi-backend.md         # backend design, contracts, auth, scaling    (17 min)
├── part-3-ocr-pipeline.md            # OCR, parsing, validation, correction        (18 min)
├── part-4-engineering-lessons.md     # trade-offs, mistakes, reflections           (15 min)
│
├── architecture.md                   # full architecture reference                 (16 min)
├── database.md                       # schema, indexes, RLS, query patterns        (12 min)
├── api-reference.md                  # all 15 endpoints with examples              (15 min)
│
└── assets/
    ├── diagrams/                     # 12 Mermaid architecture diagram files
    └── flowcharts/                   # 16 Mermaid flowchart files
```

Every visual is a Mermaid diagram rendered from source. There are no image files, no external assets, and nothing left to supply by hand — the tree is complete as committed.

---

## How to Read This

| If you want… | Read |
|---|---|
| The whole story | [index.md](./index.md), then parts 1 → 4 |
| The system design | [architecture.md](./architecture.md) |
| The data model | [database.md](./database.md) |
| To call the API | [api-reference.md](./api-reference.md) |
| The interesting engineering | [Part 3](./part-3-ocr-pipeline.md) (OCR) and [Part 4](./part-4-engineering-lessons.md) (lessons) |
| Just the pictures | [assets/diagrams/](./assets/diagrams/) and [assets/flowcharts/](./assets/flowcharts/) |

---

## Publishing Notes

**GitHub** — renders everything natively, including all Mermaid diagrams. No build step.

**Hashnode** — renders Mermaid natively. Paste and publish.

**Portfolio sites** — every file is standard GitHub-flavored Markdown with relative links. Any static site generator that resolves relative paths (Next.js MDX, Astro, Docusaurus, VitePress) will render the tree as-is.

**LinkedIn Articles / Medium** — neither renders Mermaid, so diagram blocks show as code. The prose, tables, code samples and folder trees carry the argument on their own, so an article still reads correctly there. Rewrite relative links to absolute GitHub URLs before pasting.

---

## Accuracy Policy

Everything in this documentation is derived from the repository at the time of writing. Two rules were applied:

1. **No invented implementation details.** Constants, thresholds, formulas, column names, endpoints and file sizes are quoted from the source.
2. **Inferences are labeled.** Anything that could not be determined from the code — deployment host settings, performance measurements, the historical order of refactors — is marked as an **Assumption**.

The documentation also records known gaps: missing CI, no structured logging, no rate limiting, duplicated energy-score logic across Python and TypeScript, stored analysis snapshots with no invalidation, and public storage URLs for personal documents. These are listed with proposed fixes rather than omitted.

---

## Keeping This Current

When the code changes, these are the files most likely to go stale:

| Change | Update |
|---|---|
| New or changed endpoint | [api-reference.md](./api-reference.md), [assets/diagrams/api-request-flow.md](./assets/diagrams/api-request-flow.md) |
| Schema change | [database.md](./database.md), [assets/diagrams/database-relationships.md](./assets/diagrams/database-relationships.md) |
| Parser change | [Part 3](./part-3-ocr-pipeline.md), and the `PARSER_VERSION` references |
| New service module | [architecture.md](./architecture.md), [Part 2 folder tree](./part-2-fastapi-backend.md#folder-organization) |
| Resolved debt item | The roadmap tables in [Part 1](./part-1-building-wattwise.md#roadmap), [Part 4](./part-4-engineering-lessons.md#roadmap) and [architecture.md](./architecture.md#known-gaps-and-future-improvements) |

---

**Related:** project [README](../README.md) · [backend/](../backend/) · [supabase/schema.sql](../supabase/schema.sql)
