# Make lesson instructions hideable without ending the lesson

**Source spec:** [Keep the graph usable during Guided lessons](../../specs/lesson-graph-access.md)
**Status:** queued for future work; design option still to be selected; do not implement during task preparation.

## Goal

Resolve the reported Observation prompt obstruction so learners can use the graph, reopen instructions, and continue their current lesson. See the source spec for the screenshot, alternatives, constraints, and acceptance criteria.

## Work

1. Reproduce the long higher-degree/Lagrange-error prompt on a narrow board and in Presentation mode. Record the actual close behavior, usable graph area, and current hide/continue/session transitions. Inspect current master and coordinate with any chapter/activity work already landed.
2. Present a bounded layout proposal using the spec's alternatives. Start with a small lesson tab that reopens instructions; evaluate responsive docking if needed. Resolve the design choice before coding a wider redesign and update the source spec's status and decision.
3. Implement reversible instruction visibility independently of session exit. Preserve frame, edited graph, view, and board ownership; make reopen, continue, and exit unambiguous. Handle focus, touch, long text, viewport resize, text enlargement, language switches, and animation behavior.
4. Add focused state/interaction coverage, run the applicable command-guide checks, and complete the shared-runtime browser review specified by the source spec. Record before/after screenshots, results, and incomplete coverage here.
5. Update affected interaction guidance and architecture documentation after behavior changes. Review, commit, and release according to AGENTS.md when implementation is authorized.

## Completion evidence

Map each source-spec acceptance criterion to tests or browser evidence. Include the exact route/lesson/frame, viewport sizes, language/text-size coverage, hide/edit/reopen/continue sequence, exit restoration, and animation behavior. Task preparation provides no implementation or runtime verification evidence.
