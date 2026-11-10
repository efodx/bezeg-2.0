# Families-prep spec brief (handoff-v13, shared by every spec worker)

Your dispatch message names your family or families, the target spec path(s) and your note path. This file holds the rest.

## Role and permissions

You are a `bezeg-worker` writing one family spec (a document, no code). You may create only the spec file(s) named in your dispatch and your note file. Do not edit `docs/specs/new-lesson-families.md`, stream files, ADRs, locale catalogs or source code; the handler integrates. Do not commit, stage or push. Preserve unrelated working-tree changes (another worker may be writing a sibling spec in parallel).

## Goal and acceptance

Write `docs/specs/<family>-lessons.md` so a later F0 plan can create task files from it without new research. Accepted when:

1. **Structure** follows [linear-maps-lessons.md](../../../specs/linear-maps-lessons.md) (read its headings first, then whole sections only as needed): title with Slovenian working name; `Status:` (`draft, 2026-11-10 (stream families-prep); not scheduled for release`), `Agreed:` (owner scheduled preparation 2026-11-10), `Source:` lines; Problem Statement; Solution with **Release batches** (Batch 0 foundation kernel + ADRs, then lesson batches, each with an acceptance gate); **Reuse and new modules**; **Decisions needing an ADR** (each with at least two real alternatives and the proposal); kernel section if the family owns one; **Concept contracts and acceptance criteria** per lesson; User Stories; **Terms**; Implementation Decisions; Testing Decisions with a batch-wide acceptance gate; Correctness Notes; Out of Scope; Further Notes.
2. **Concept contract per lesson** (match L1–L5 in the template): learning goal; scene and controls; ordered steps (predict → drag → observe where possible); **checked numbers** — every quoted number computed by you with `node -e` and stated with its inputs (never guessed); acceptance criteria that a reviewer can check against kernel output; prose notes (guidance for one-shot text, [one-shot rule](../../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)). Say whether each picture is an **argument** (its construction establishes the claim) or an **illustration**.
3. **Reuse is verified:** every existing module, graph, lesson id or route you name was found by search in `src/` (give the path). Search before proposing a new module; if something exists, reuse it. Lesson ids of existing lessons are in `src/learning/content/`.
4. **Sources.** Start from the family's entry in the [top-15 research note](../../../research/lesson-family-candidates-2026-11-09.md) (and, for E5/E9/E10, the [expansion research](../../../research/lesson-family-candidates-2026-10-31-expansion.md)). Matura anchors: the PIK M-MAT-2026 text extraction is at `C:\Users\1337Hacker\AppData\Local\Temp\pik-2026\M-MAT-2026.txt` (from `pdftotext -layout`; diacritics are stripped, so write Slovenian quotes with diacritics restored; the table of contents is at lines 70–90). Cite the section number and page you actually read there; never cite a section you did not find. Higher-level (VR) items cannot be told apart reliably in this extraction; say "level marker not verified" if it matters.
5. **Terms** table: Slovenian proposal, English, where it appears, and the reason, decided by [choosing new terms](../../../localization.md#choosing-new-terms) (read that section). Grep `src/i18n/` (or wherever `sl.ts` lives) for terms the app already uses and reuse them.
6. **Gating** in the Implementation section, per the stream's boundary ([families-prep.md](../../../tasks/feature-streams/families-prep.md), section "Boundary with the Controls stream"): mark which slices are ungated now (spec, F0, F1 kernels as new pure TypeScript files with oracle tests; F2a only for families #1, #2, #5, #6) and which wait on Controls step 5 or step 7. The spec must not plan edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/` or existing graph panels; if the family needs a shared-control or host change, list it as a dependency on the owning stream instead.
7. **Mathematics** is correct and robust: discrete decisions (parallel, tangent, ambiguous case, classification) state exact arithmetic on snapped inputs or a stated tolerance, and never present a tolerance as exact ([shared constraints](../../../specs/new-lesson-families.md#shared-constraints)). Name the independent oracle each kernel test compares against.
8. **Size:** about 180–260 lines; prose is short and concrete. Lesson math in prose uses `\(...\)`.

## Settled decisions (record them in the spec, do not reopen)

- Owner rules from the research note's "Ranking rules" apply: #4 uses seeded sampling with a fixed, visible seed and the exact distribution drawn alongside; #8 extends the existing 3D surface view (`SceneMesh`, patches) rather than adding a renderer, measured first; #2 is analytic geometry of lines with the dot product as a tool, not a standalone vectors lesson.
- Lesson text is one-shot (see link above). Lessons have no exercises, grading or progress.
- The app is static and client-only; Slovenian default with English in lockstep.
- Decide open spec questions yourself and record the reason in the spec ("Handler decision, reversible" style). Do not ask.

## Checks

- Every checked number: show the `node -e` expression in your note file (not in the spec), with its output.
- Run `just lint docs` only if it exists for markdown; otherwise no command checks are required. Verify every relative link you write resolves (Glob the target).

## Return (≤250 words)

Spec path and line count; PIK anchors verified (section, page) or "not found"; the decisions you made that the handler should check; anything unverified. Bulky evidence (number computations, search results) goes in your note file.

## Budget

On `HANDOFF` from the budget hook, stop, write what remains to your note file, and return partial.
