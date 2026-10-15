# 0. Analysis family and iterative playback

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md) — Solution, Implementation Decisions (playback, scenes), Testing Decisions (playback)

**Dependencies:** none

**Status:** not started

## Goal

Prepare the shared contracts Batch A needs before topic graphs encode scenes: the **Analiza / Analysis** family and a generalized iterative-playback capability. Bisection (A1) is the first consumer; sequence convergence and fixed-point iteration (Batch C) reuse it.

## Part A — Analysis family

- Add the family to `families` in `src/demonstrations.ts` with `sl`/`en` titles in lockstep. The catalogue must not render a family without shipped entries; confirm the current behavior and add a test.
- Record the family decision in a new ADR in `docs/adr/` (alternatives: extend **Functions and calculus**; a separate family per batch; the approved separate **Analysis** family). Reference ADR 0007.

## Part B — Iterative playback

Today the `animation` action, `LessonAnimation`, `LessonSession.applyAnimation`, and the frame Play/Pause UI are hard-wired to `animationId: 'decasteljau'`.

- Widen the animation identifier to a declared union that includes an iteration identifier (for example `'bisection'`), keeping De Casteljau behavior and its lesson content unchanged.
- Add typed iteration commands — at least `next-step` and `reset` — alongside `play`/`pause`/`stop`. Next step and playback must call the same mathematical transition.
- Provide a reusable graph-owned iteration controller on top of `AnimationDriver`: a fixed step interval (not elapsed-time catch-up after resume), a documented finite iteration limit, completion that stops playback, and `dispose()`.
- Pause on manual edits, function/domain changes, scene changes, lesson frame transitions, exit, reset, import, capture, and route disposal. Preset loading never starts playback.
- Record the playback contract in an ADR (alternatives: per-graph ad hoc timers; extending the existing frame animation; a shared iteration controller).

## Acceptance criteria

1. Existing De Casteljau lessons and the `animation` tests pass unchanged in behavior.
2. With the injectable scheduler, a test graph shows Next step ×k and playing k steps yield identical state; pause/resume continues from the paused state; the limit stops playback; no callback runs after dispose or scene replacement.
3. Unsupported animation identifiers or commands are rejected by the registry with `UnsupportedLessonActionError`.
4. No new route, catalogue entry, or lesson is visible.

## Verification

`npx tsc --noEmit --pretty false`, `npx vitest run`, production build. Full browser checklist for the De Casteljau lesson, because the shared lesson runtime changes.
