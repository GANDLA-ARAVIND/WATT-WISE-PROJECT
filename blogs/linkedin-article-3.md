# OCR Is Easy Until You Try It on Real Electricity Bills

### The engineering challenges behind turning noisy utility bills into structured, trustworthy data

---

In the last article I said extracting reliable data from an electricity bill was harder than building the backend around it. This is that story, answering one question:

**why is getting trustworthy information out of a utility bill so much harder than just running OCR?**

---

## The myth about OCR

Every OCR demo uses a clean, flat, well-lit document. You pass it in, you get text back, you feel clever.

Real electricity bills arrive as a photograph taken at an angle, at night, under a ceiling light, of a thermal-printed page folded into a wallet. Sometimes as a PDF that is really just a scan wearing a PDF costume.

Here is what a real pass over one produced: "Blll Amount 2340". "Unlts Consmed 318". "Biling nays 30". "Recorded HD 1.9". "GIS Subsidy 0".

Every one of those lines is wrong. Every one is also recoverable, and that gap is where the engineering lives.

These are not random errors. They are the systematic confusions of one engine on one class of document: an `i` becomes an `l`, an `M` becomes an `H`, a `J` becomes an `I`, the `D` in "Days" disappears. Once you accept the corruption is patterned, you can design for the pattern instead of hoping for clean input.

---

## What actually happens

```mermaid
flowchart LR
  Upload --> Preprocess
  Preprocess --> OCR
  OCR --> Parse
  Parse --> Confidence
  Confidence --> Validation
  Validation --> ManualReview
  ManualReview --> Stored
```

Seven steps, and only one is what most people mean by "OCR."

Before any text extraction, the image is reoriented from its own metadata, upscaled if small, pushed for contrast and sharpness, denoised, binarised, and deskewed by fitting a rotated rectangle around the dark pixels and rotating it flat.

Each answers a specific failure. Reorientation fixes the most common total failure: a portrait photo taken with the phone rotated arrives sideways and OCR returns nothing at all. Binarising against a threshold computed per pixel, from its own neighbourhood rather than one cutoff for the page, fixes the second — a photographed bill is never evenly lit, and one global cutoff either blows out the bright patch under the lamp or loses the shadow at the fold.

---

## Why OCR alone isn't enough

I also had to tell the engine to stop being clever. Its default mode detects columns and regions, and on a ruled billing table it frequently decides the ruling lines *are* column separators — fragmenting a label and its value into disconnected blocks in unpredictable order. Forcing it to read the page as one uniform block preserved the line order the parser needs.

Even then the output is a wall of noisy lines. Turning it into nineteen structured fields took three strategies, stacked by confidence.

**Explicit patterns first** — and the number is extracted only from the text *after* the label match. On a line reading "Bill No 4471 Bill Amount 2340", the first number is the bill number. Searching after the label returns the amount.

**Approximate matching second** — where I got burned. Fuzzy matching fixed the corruption problem instantly and created a false-positive problem just as fast. "Interest on ED" and "Interest on CD" are different charges differing by a single character, and any threshold loose enough to catch real OCR damage is loose enough to confuse them permanently.

The fix was not a better threshold. It was a hard gate: a line must contain a discriminating token before fuzzy matching is attempted at all. Fuzzy matching needs a gate, not just a score.

**Content heuristics last**, for fields recognisable without a label. Meter readings came with a trap: "Meter No: 4471028" and "Meter Reading: 15820" both contain "meter" and a long number. Without an explicit exclusion, the meter *serial number* gets stored as a meter *reading* — a wrong value that looks plausible and nobody would ever question.

That is the real lesson of this layer. The dangerous OCR failure is not the garbled one — it is the confidently wrong one.

---

## Making data trustworthy

Every field carries a score that depends on how it was found. An explicit pattern match on a critical field scores highest, an approximate label match scores whatever the similarity was, and a content-based guess with no label scores lowest — deliberately below the review threshold, so **every heuristic guess is flagged for a human by default.**

There is a second, independent signal. I run the engine twice per page — once for the text, once for per-word confidence data. That roughly doubles the cost and buys something nothing else can: if document-level confidence falls below a set floor, **every field is flagged regardless of its own score.**

That is the system admitting it does not trust itself. A cleanly matched field still gets flagged, because a page the engine barely read may have produced a confidently wrong number. Trusting per-field scores on a document that came through as mush produces silent corruption — far worse than asking someone to glance at six values.

Then domain validation runs, catching what no type check can. Billing days must fall between 1 and 60. Consumption above ten thousand units is not a domestic connection. Three fields are mandatory, fourteen must be non-negative, and three may be negative because adjustments and credits go both ways.

None of those are format checks. They exist for one failure mode: **the right number landing in the wrong field.** A meter reading of 15,820 is a valid non-negative integer — obviously wrong only once it sits in a field that should never exceed 60.

---

## Why manual review exists

Because no parser gets utility bills right every time, and pretending otherwise pushes the failure onto the user.

So correction is a first-class path, not a fallback. Uncertain fields are highlighted, and each can show its confidence, how it was matched, and the raw line behind it — someone who doubts a number sees the text it came from.

Editing a field fires a short-debounced silent re-parse that merges human values over machine ones. The corrected field is marked human-confirmed at full confidence and its warning disappears. Watching uncertainty markers clear as you type makes this feel like verification, not data entry.

The bill is then stored with an explicit status — verified, or needs review — alongside both what the machine read and what the human confirmed. The machine's output is never overwritten, and that is the most valuable detail: the record of which fields humans fix most often becomes a live list of what the parser gets wrong.

---

## Trade-offs

**Preprocessing is tuned for bad inputs.** The contrast boost and denoising that rescue a dim phone photo can erode thin strokes on a clean scan. I optimised for the common case.

**Rasterising PDFs throws away perfect data.** Some bills are digitally generated with a clean text layer, and I re-derive it imperfectly instead of reading it. It buys one code path for scans and native PDFs alike. On my list to fix.

**Corrupted spellings are configuration.** "Blll amount" and "unlts consmed" are literally entries in my matching lists. Unglamorous — and it beats any general-purpose spell-correction pass, because it targets failures I observed rather than ones I imagined.

---

## Closing thoughts

OCR was never the hard part. Deciding what to believe was.

Everything above — the scoring ladder, the token gate, the confidence floor, the range checks, the review status — exists to answer one question for every field: *how much should we trust this number?*

OCR turned out to be only the beginning. Once reliable data reached the database, the next challenge became maintaining a growing analytical system without making it harder to evolve — the story I'll cover in the final article of this series.
