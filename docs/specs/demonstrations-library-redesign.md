# Demonstrations library redesign proposal

**Status:** proposed on 2026-10-15; design discussion only. No application implementation is authorized by this document. The exploratory image is in the originating conversation and is not a production asset.

## Purpose and observed problem

Following the [homepage carousel relocation](homepage-carousel-and-demonstrations-catalogue.md), the owner requested a redesign of the dedicated Demonstrations page. The homepage now provides an introduction and discovery. The catalogue should help students and educators choose a mathematical experiment deliberately.

The deployed catalogue currently exposes seven topics and 34 demonstrations. Only Osnove opens initially, showing its single Bernstein demonstration inside a much wider panel. Other topics are closed. This makes the first view sparse and hides the variety of available mathematics. Expanding topics also moves subsequent topic navigation down the page.

The design should support three intentions:

- A student browses previews and plain-language purposes to find an interesting experiment without already knowing every construction name.
- A returning learner finds a named construction quickly.
- An educator locates a topic, compares related demonstrations, and opens a graph or an available Guided lesson for class.

These are proposed design priorities, not findings from user testing.

## Recommended composition

Keep the existing shared header and a compact introduction headed Demonstracije. Use a short invitation such as “Izberi temo. Razišči graf. Razumi povezavo.” Counts remain subordinate and derived from metadata.

Below the introduction, place a visible search field and a library with two desktop columns:

- A narrow topic navigation column contains Vse teme and all seven existing families, with their counts. Give the active topic a restrained sage surface and clear focus indication. Keep navigation available while the card collection scrolls.
- A wider content column contains one continuous grid of demonstration cards. Default to all demonstrations in the existing teaching order, with a family label on every card. Do not introduce per-family grid gaps or reserve a full-width panel for the one-item Osnove family. Selecting a topic narrows the grid to its demonstrations.

Use three card columns when previews, titles, and actions fit comfortably; reduce columns as space narrows. At phone widths use a labeled topic selector above a single card column, with search still visible. Avoid a horizontally scrolling topic strip as the only way to discover later families.

Each card contains:

1. Its existing faithful route-default graph preview as the main visual.
2. A quiet family label and recognizable demonstration title.
3. One concise purpose or observation prompt that explains what the learner can investigate. Reuse existing localized prompts where they work; any new copy requires Slovenian and English counterparts and mathematical review.
4. Separate compact graph and available Guided lesson actions, with visible labels and distinct accessible names. Preserve the current green/ochre distinction and restrained ghost treatment. The lesson action follows actual lesson availability.

The image explores these relationships only. Its generated graph marks, logo, wording, and sample card sequence are not authoritative; actual metadata and reviewed previews remain the implementation sources.

## Proposed behaviour

- Search matches localized titles, family names, and purpose copy. Show the active topic, query, and result count together; search and the selected topic combine visibly.
- Provide explicit clearing controls. An empty result explains how to clear the query or search all topics, rather than leaving an unexplained blank grid.
- Preserve topic/query and scroll position when returning from a demonstration. Prefer URL-backed catalogue filters so an educator can share the selected collection without an account; exact query names remain an implementation decision.
- Make graph preview/title a clear graph destination while keeping the lesson action a separate link. Avoid nested links or making a whole card containing links into another interactive target.
- Keep every entry reachable through ordinary scrolling. No pagination is proposed for the current collection size.

## Visual direction and trade-offs

Retain cream, ivory, sage, dark green, ochre, and the existing elderflower identity. Quiet the page-wide grid so the mathematical previews provide the strongest detail. Use one card surface with a light border, modest corners, and little or no shadow. Keep typography readable for projection and allow long titles to wrap.

This replaces independently expandable family panels with a stable topic navigation and a visible collection. The benefit is faster scanning and comparison, with no empty family containers. The cost is a longer default collection and a need for small family labels on cards. Topic selection and search address that cost.

An alternative is to keep every family expanded and add topic jump links. That preserves an explicit chapter structure, but retains uneven sections for families containing one versus eight entries and makes cross-family searching less direct. Improving only accordion styling would leave most of the collection concealed. The library is the recommended direction for discussion.

Do not add another featured carousel, a large decorative hero, accounts, progress tracking, favorites, unsupported difficulty levels, or invented lesson durations. The page's value is choosing and opening mathematics.

## Boundaries and provisional acceptance criteria

This proposal broadens catalogue design beyond the earlier relocation spec. It does not change the homepage, graph routes, geometry, lesson contents or availability, Presets, storage formats, or the static/client-only product constraint. It is not an instruction to implement the older untracked visual-hierarchy draft.

Before implementation, confirm or revise this direction and turn the selected behaviour into a bounded approved brief. Proposed acceptance criteria are:

1. A fresh visit shows all current demonstrations in a continuous grid, without a one-card full-width Osnove panel or closed topic disclosures.
2. Every existing topic and demonstration remains reachable; counts and destinations come from the existing catalogue.
3. Topic selection, search, clearing, empty results, browser back, and shared filtered links behave consistently and expose their current state accessibly.
4. Each card helps a learner identify both its mathematics and its two supported ways to begin; unsupported lessons are not advertised.
5. Slovenian and English layouts work at representative desktop, tablet, phone, and enlarged-text sizes. Keyboard focus and touch targets remain usable; there is no page-level horizontal overflow.
6. Production previews retain mathematical meaning and scene provenance. This static image establishes no evidence of responsive behaviour, accessibility, or mathematical correctness.
7. Implementation verification includes appropriate component tests, TypeScript, production build, and the smoke-tester workflow on the affected catalogue and graph/lesson entry paths.

## Design evidence

The current deployed page was inspected through the browser on 2026-10-15 and compared with DemonstrationsPage and the route catalogue. The proposed desktop composition is illustrated with a built-in ImageGen mockup in the originating conversation. No runnable prototype, user study, or application changes were made for this proposal.
