# Standalone learning through study chapters

Status: planning proposal, 2026-10-16. The owner confirmed the learning goal, exclusions, and Bézier pilot topic; the chapter structure, detailed outline, and presentation remain proposals. This document does not authorize application implementation.

## Confirmed owner direction

- Bezeg should eventually be a place to learn its concepts, including their motivation and mathematical development, rather than requiring an accompanying course or textbook to supply those explanations.
- The eventual audience spans ages and levels. Assumed knowledge depends on the mathematical family and topic; there is no single beginner level for the entire app.
- Start with higher concepts, following the owner's interests and the existing advanced demonstrations. Building a complete elementary prerequisite sequence is not a condition for starting.
- Include reading, explanation, and graph exploration. Do not include practice exercises or assessment in this direction.
- Lead with intuition and precise mathematical statements. Include derivations or proofs only when their reasoning or intuition can be made readily apparent through the graph.
- Guided lessons remain useful, but placing all study material into their sequential frames would make revisiting and studying it cumbersome.

Standalone means self-contained within an explicitly stated prerequisite boundary. It does not mean every chapter starts from elementary mathematics. External sources may offer further reading, but should not supply a missing essential explanation inside that boundary.

## Problem

The current [Guided lesson](guided-lessons.md) is attached to one Demonstration and moves through bounded explanation, calculation, and observation frames. This suits directed graph exploration. A learner also needs a readable account of the question being answered, why the concept is useful, how its mathematics develops, and how it connects to other ideas. Those explanations must be easy to revisit without replaying a graph sequence.

The proposed addition is a study chapter that interleaves mathematical reading and focused graph activities, while also working as reference material. This extends the earlier exclusion of curriculum navigation; it does not introduce a course platform.

## Proposed content structure

| Content | Responsibility |
| --- | --- |
| Family overview | Describe the area's questions, expected background, and suggested reading order. The reading order can differ from the demonstration catalog. |
| Study chapter | Develop one coherent learning goal through motivation, explanation, precise mathematics, author-worked examples, and graph activities. |
| Guided lesson | Lead a focused investigation of a prepared graph, retaining enough context to work when opened directly. |
| Demonstration | Provide open mathematical exploration, direct links, presentation, presets, and figure export. |

These are proposed editorial roles, not settled domain vocabulary or a database schema. A chapter may use more than one Demonstration; a Demonstration may support more than one chapter. Start with a small authored reading order and ordinary links, without a prerequisite engine or a fixed hierarchy of courses, units, and modules.

### Chapter contents

Each chapter should answer:

1. What question or problem motivates this concept, and why is solving it useful?
2. What knowledge is assumed? Which unfamiliar notation needs introducing here?
3. What is the mathematical idea, and how does the explanation lead to its definition or result?
4. What does a worked example illustrate?
5. What can the learner investigate on a graph, and how does the subsequent explanation interpret it?
6. What assumptions, limitations, and misleading intuitions matter?
7. How does this connect to earlier and later concepts?

Use sections appropriate to the subject rather than requiring this list as a rigid template. Author-worked examples are exposition, not exercises for the student to complete. Graph manipulation and observation remain part of learning; do not add answer submissions, quizzes, exercise sets, marks, or mastery checks.

The main account uses intuition and precise statements, including their assumptions. Include a derivation or proof only when its reasoning or intuition can be made readily apparent through the graph; do not promise a separate proof library or add symbolic derivations by default. For each proposed derivation, explain what the graph makes clear and what mathematical argument is still required. Distinguish visual evidence, intuition, definitions, and mathematical justification: a graph must not be presented as proof of a general claim. When a proof is omitted, state the result accurately and explain its meaning without claiming to have established it visually.

### Reading and revision

- Offer a suggested sequence for a first visit, with explanations before and after graph activities where useful.
- Keep headings, an accessible contents list, and stable section links so students can find a definition, example, or justification directly.
- Let students read without opening every activity. Follow-up explanations must remain intelligible with a stated expected observation.
- Use conceptual headings instead of a succession of generic Next screens.
- Treat optional deeper reading as a possible presentation choice, not a reason to hide assumptions or essential explanations.
- Do not lock later sections or infer understanding from clicks, reading position, or graph interaction.

### Different levels without an age mode

State prerequisites at family and chapter level. Higher-level chapters may assume calculus, linear algebra, or earlier curve concepts when appropriate. Introduce chapter-specific notation and link to available prerequisite explanations. Identify any required knowledge Bezeg does not yet teach rather than claiming complete prerequisite coverage.

Do not duplicate the same chapter for arbitrary age bands or promise every concept to every age group. Broader coverage can grow through additional entry points and prerequisite chapters as they become worthwhile.

## Proposed reading-to-graph experience

Reading should have a comfortable document layout; exploration should give the graph the space and controls it needs. A permanently visible graph is not required while studying a long explanation. Preserve the graph-centered behavior of direct Demonstration visits.

An activity should identify its purpose, open the intended prepared scene, and provide a clear return to the exact chapter section. Returning should preserve reading position and chapter context. Activity entry, reset, exit, and return must distinguish continuing a learner's exploration from deliberately reapplying the authored scene.

Reuse typed, graph-owned actions and scene ownership from the existing lesson runtime where suitable. Do not simulate clicks or use stored Presets as hidden chapter scenes. The implementation spec must define pre-activity restoration, transient graph state, animation disposal, and route-change behavior explicitly. Reuse does not mean that an entire existing Guided lesson is automatically the right activity at every chapter insertion point.

Whether the graph opens inline, in an expanded view, or on a linked route remains a prototype decision. New chapter URLs and section links are also unselected. No route, stored data, or runtime behavior changes in this planning work.

## Content ownership and existing lessons

Chapters own the fuller conceptual development. Guided lessons own concise instructions and observations for their graph investigation, including enough local explanation to remain usable directly. Link activities to the relevant chapter sections for depth. Avoid independently maintained copies of long mathematical explanations.

Audit existing content before deciding what to reuse, move, rewrite, or retain. Keep current lessons available while proving the new format. Do not turn every lesson frame into a chapter section mechanically, or expand every catalog entry into a chapter regardless of educational fit.

Keep content static and source-backed, Slovenian first with English counterparts. Sources, mathematical review, notation, examples, and graph claims require the same care as existing lesson content. Publishing source citations does not replace explaining the topic inside Bezeg.

## Bounded pilot and acceptance criteria

The owner selected Bézier curves on 2026-10-16 and supplied their thesis for the motivation. The [first chapter outline](bezier-study-chapter.md) proposes moving from editable shapes through repeated interpolation to the Bézier formula and its design guarantees. The topic is selected; the detailed outline and presentation still need review. This establishes an entry point into the curve families without requiring a complete elementary sequence first.

First deliver a complete chapter outline and content draft, then a representative visual prototype and a working interaction prototype if needed to test the reading/graph transition. Apply the installed prototype skill when design work reaches that stage; do not create implementation task files yet.

The pilot is successful when:

- Its intended reader, prerequisite boundary, and learning goal are explicit.
- It supplies motivation and essential explanation within that boundary, including a worked example and relevant limitations, without requiring external reading.
- At least one sequence goes from explanation to a purposeful graph investigation and back to mathematical explanation.
- A returning reader can navigate directly to a definition or worked example without replaying activities.
- Opening and returning from an activity preserves chapter context and has specified, verified graph-state behavior.
- The chapter and activity agree mathematically; visual observations are distinguished from justification.
- Direct Demonstration and Guided lesson entry remain useful.
- No practice or assessment feature is introduced.
- Subject-matter and language review, desktop/narrow-screen reading, projection where relevant, and keyboard/touch activity navigation are recorded before calling it ready.

Content review and prototype observations must identify what is missing before extending the structure to other families. Do not use reading completion as evidence that a student understands the mathematics.

## Staging and open decisions

1. Review the selected Bézier pilot's reader and outline; identify derivations whose reasoning the graph can make clear under the confirmed editorial rule.
2. Inventory existing explanations and graph capabilities; write the missing conceptual development.
3. Review the chapter as a readable mathematical account before choosing a UI.
4. Prototype first-time reading, graph handoff/return, and direct revision access.
5. Write a bounded implementation spec with routing, scene ownership, accessibility, localization, and verification criteria based on that evidence.
6. Implement and review one chapter; expand by coherent topics and family reading orders afterward.

Open decisions: the proposed pilot reader and outline, Slovenian learner-facing names, chapter/activity layout, route structure, and whether local reading-position persistence is useful. Persistence is optional future scope, separate from understanding or completion tracking.

## Constraints and exclusions

Retain static client-only hosting, no accounts or server database, existing Preset ownership, mathematical correctness, and explicit graph lifecycle management. No authoring CMS, adaptive teaching, prerequisite enforcement, practice/exercise system, grading, learner analytics, certificates, cloud progress, or full-catalog content promise. The eventual breadth of audiences does not create a requirement to implement all prerequisite material before an advanced pilot.
