# Common brief: write one lesson-family spec (handoff-v12)

- **Role:** spec writing (documentation only). Edit permission ONLY for your assigned spec file(s) under docs/specs/. Do not edit any other file, do not commit, push or delegate.
- **Worktree:** C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg\.claude\worktrees\lesson-candidates-research (work only here).
- **Goal:** a bounded, implementable spec for one new Bezeg lesson family (a bilingual Learn chapter with chapter-owned guided graph activities, each backed by a catalog Demonstration). It must let a later implementer create tasks without further research.

## Read first (by section, not whole files)
- docs/specs/new-lesson-families.md — the index you belong to: names, shared-foundation owners, dependencies, shared constraints. Link back to it.
- Your family's section in docs/research/lesson-family-candidates-2026-10-31.md or docs/research/computational-geometry-candidates-2026-10-31.md — sources, sample sequences (already numerically checked), correctness notes.
- Format model: docs/specs/analysis-guided-lessons.md (header block; Problem Statement; Solution with release batches table; per-lesson "Concept contracts and acceptance criteria"; User Stories; Implementation Decisions; Testing Decisions incl. batch-wide acceptance gate; Out of Scope; Further Notes). Follow it.
- Current learning model: docs/specs/chapter-owned-guided-learning.md (skim its headings) and how chapters/activities are registered: src/learning/content/familyChapters.ts, src/learning/model.ts (LESSON_ANIMATION_IDS, iterative next-step/reset), src/graphs/functions/IterativeFunctionGraph.tsx. Use grep -l / -n to locate; don't read big files whole.
- AGENTS.md product/engineering constraints and docs/localization.md#choosing-new-terms.

## Spec requirements
- Header: `**Status:** proposed, 2026-10-31. Specification only; implementation not scheduled.` `**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).` `**Source:**` links to the research note(s) and primary sources it cites.
- 4–7 lessons, each with: learning goal, prerequisites (link existing chapters), named default example(s) with exact numbers (reuse the research note's checked values; any NEW number you add must be computed with `node -e` or `python -I -c` and you must report it), guided step outline (5–7 steps; predict before reveal; ends in free exploration), graph capabilities needed, and numbered checkable acceptance criteria (mathematical, interaction, lifecycle/reset, both languages).
- Release batches with conditions; which existing graphs/kernels are reused (cite file paths you verified exist) vs new modules; where a decision needs an ADR, say so and list real alternatives — don't decide consequential architecture silently.
- Slovenian terms: propose SL/EN term pairs in a table, marked as proposals per localization.md.
- Correctness notes: hypotheses, degenerate cases, numerical robustness, what a picture proves vs illustrates.
- Testing decisions: unit/math tests for kernels, scene tests, lessonMathNotation, smoke scope, performance measurement where rendering is heavy.
- Out of scope: list explicitly (assessment, accounts, etc. plus family-specific deferrals).
- Do not copy source prose or figures. Do not invent page numbers; cite only what the research notes or a source you open state.
- Length: about 180–260 lines. Plain, precise English; inline math as \( \).

## Return (≤20 lines)
Path(s) written, line count, lesson list, any NEW numbers with how computed, open decisions for the owner, contradictions found (with file:line).

## Budget
Locate with grep -l/-c before grep -n, batch searches, read ≤150 lines per call, never a whole file over ~300 lines. On a HANDOFF message, or past ~30 turns, stop at a consistent point, save the spec as-is with a "Draft gaps" section, and return it as partial.
