# If I Rebuilt WattWise Today, I'd Build These Five Things Differently

### Looking back at the architectural decisions, trade-offs and engineering lessons after completing WattWise

---

This is the last article in the series. The first three explained how WattWise works. This one is about what I got wrong.

Not catastrophically wrong — the system runs, the tests pass, the analysis is sound. Wrong in the quieter way that matters more: decisions that were reasonable when I made them and became expensive as the project grew. None of it is regret about a bad choice. Each is a choice with a bill attached, where I did not notice the bill arriving.

---

## What changed between the first commit and the final version

An honest admission: the git history will not tell you. The commit log is five commits from one deployment-preparation session. There is no tidy record of "refactored X in week six."

So I read the artifacts instead, and artifacts are a more truthful narrator. Two generations of data-fetching hooks sit side by side, because the second was written to fix the first and the migration never finished. A regression test asserts both a value *and* its Python type, which only makes sense if you know a float once got rejected by an integer column at the worst moment.

That is the real changelog — every entry a scar from a specific afternoon, each sitting at a boundary rather than inside an algorithm.

---

## Five engineering decisions I would change

### 1. I wrote the same formula in two languages

The energy score — a household efficiency grade built from a dozen weighted thresholds — exists in Python on the server and again in TypeScript on the client. Same constants, same cutoffs, same clamping, same grade boundaries. I did it because the dashboard needed a score without a network round trip, and reimplementing twelve numbers felt cheaper than restructuring the data flow.

It stopped being cheap the moment I wanted to tune the model, because tuning means editing two files in two languages and remembering the second exists. The same happened to the bill-chronology logic, also implemented twice. Two implementations of one truth do not stay identical; it is only a question of when they diverge.

Today I would delete the client copy. The score can ride along in a response the dashboard already requests, or be read from the value persisted with each bill. There was never a requirement the server could not meet.

**The lesson:** duplication introduced for a good reason is still duplication. Write the reason and date beside it, and treat it as a deadline, not a decision.

---

### 2. I wrote tests and never made them run

The backend has nine test files, some genuinely good — one is a fixture-driven regression suite where adding a case means dropping two files into a directory. I ran them by hand when I touched the relevant module. For a solo project that felt sufficient.

It is not, and the proof is embarrassing: compiled Python artifacts are committed to this repository, because the ignore file never got the relevant entry. A five-second fix survived the whole project — not because it was hard, but because nothing automated objected. If a pipeline could not catch *that*, it was not catching a broken test either.

Today I would add a pipeline on the first commit: run the suite, type-check, lint. The value is not sophistication. It is that it runs without me deciding to.

**The lesson:** a check that requires a human to remember it is not a check — it is a suggestion.

---

### 3. I let the schema evolve without versioning it

Schema changes accumulated in one idempotent setup script that re-runs safely against any state, each new field appended as an additive statement. It works, it is simple, and for a solo project with one environment, versioned migrations felt like ceremony.

It hurt somewhere I did not expect: in the frontend. Because nothing could tell whether a deployed database was current, the profile layer grew a defensive branch that detects a specific "this column does not exist yet" error, retries with a narrower request, and falls back to browser storage. That code works. It is also sixty lines of application logic paying for a missing tooling decision, somewhere unrelated.

Today I would use versioned migrations from the start — twenty minutes of setup, and I could delete that fallback instead.

**The lesson:** when infrastructure has no answer for a question, the application invents one — usually somewhere unrelated, in a form nobody recognises as the same problem.

---

### 4. I started a migration and stopped halfway

The original data hooks composed naively: each waited on the one before it, producing sequential network calls and cascading spinners. I wrote a consolidated replacement running the same chain inside a single effect, and migrated the pages that hurt most first. Incremental migration is the correct instinct.

Then I stopped once the pain stopped. Both generations still exist, and some pages still use the old ones. The cost is not performance — it is that a reader cannot tell which pattern is current, and a newcomer will often extend the deprecated path.

Today I would treat finishing the migration as part of the migration. If I could not finish in one pass, I would mark the old implementation *visibly* deprecated, so the next person is not reverse-engineering my intent from usage counts.

**The lesson:** a half-finished refactor is often worse than either endpoint, because it trades one clear pattern for two ambiguous ones.

---

### 5. I encoded regional judgment as constants instead of configuration

Several domain assumptions live as module-level constants: which months belong to which season, how strongly each appliance weighs per season, how household size scales a load estimate. These *are* judgment calls, and putting them in code where they can be read and argued with was deliberate. I would defend that part.

The problem is that constants of two very different kinds share a drawer. Some are model parameters that hold anywhere. Others encode a specific climate — a season mapping tuned for southern India, simply wrong elsewhere. Supporting that user means a code change and a redeploy.

Today I would separate them by nature, not convenience. Parameters that vary by *user context* — region, climate, tariff regime — become runtime configuration. Parameters that express the *model itself* stay in code.

**The lesson:** before promoting a number to a constant, ask whether it describes your model or your first user. Those belong in different places.

---

## Closing thoughts

Not one of these five is an algorithm problem. Every one is a boundary problem — between two languages, between code and the checks around it, between application and infrastructure, between old and new implementations, between universal and local. That pattern is the most portable thing I take from this project.

I went into it believing the interesting engineering was in the modelling: attributing a bill to appliances without ground truth, forecasting from a handful of data points. That work was interesting, and it was not where the difficulty accumulated. The difficulty accumulated at the seams — exactly what you stop looking at when everything works and you are moving quickly.

The other thing I would tell myself at the start is that documenting a system is a form of reviewing it. Almost everything here surfaced while writing the series, not while building. Tracing a data lifecycle end to end is how I noticed a cache with no invalidation. Comparing two implementations line by line is how I confirmed twelve constants had been duplicated. Explaining a system forces you to see whole subsystems at once — the only altitude at which these problems are visible.

So the honest summary is not that I built something perfect. I built something that works, then looked at it long enough to see where it would break next — worth more than the codebase, because the codebase solves one problem while the pattern recognition transfers to everything after it.

Craft, in software, is mostly this: shipping something real, resisting the urge to look away from its weak points, and carrying what you learn into the next thing. I am carrying five things forward — a better outcome than a flawless first attempt would have given.
