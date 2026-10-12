# 7. `useT()` and subscribable lesson session

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), finding 12 and the lesson part of finding 3. Depends on [task 3](03-scene-store-graph-host.md).

## Goal

Language changes and lesson progress reach React through subscriptions, not remember-to-call hooks or revision counters.

## Scope

- Add `useT()` in `src/localization/index.ts`: subscribes like `useLanguage()` and returns the typed `t`. Migrate components that call `useLanguage()` only to subscribe; keep `useLanguage()` for components that read `language`/`persistenceFailed`/export state. Keep the key-specific typing of `t` intact (see AGENTS.md); no casts.
- `LessonSession` exposes `subscribe`/`getSnapshot` and notifies on every transition. `GuidedLesson` reads it with `useSyncExternalStore`, creates it with `useState` (re-created when `lesson`/`capabilities` change) and disposes it in an effect. Remove the `revision` counter and `void revision`.

## Acceptance

1. No component in `src/` calls `useLanguage()` solely to re-render; a test renders a `React.memo` component using `useT()` and sees the language switch.
2. `GuidedLesson` has no revision counter; lesson navigation tests pass.
3. `npx tsc --noEmit --pretty false`, build, Jest, `npm run test:smoke`, and a smoke check of the language switch (SL/EN, live) and all guided lessons pass.

## Status (2026-10-13)

Done. The lesson session landed in f4a8808. `useT()` replaced 26 subscribe-only `useLanguage()` calls. `useLanguage()` remains in `LanguageSelector`, `GuidedLesson`, `SaveImage` and `PresetSelector`, which read language or export state. A browser check on the welcome page and eight workspace routes found that the text after a live SL→EN→SL switch matches a fresh load in each language, and the guided lesson switches live. Prototype gating (spec step 7, second half) stays deferred, as decided at approval.
