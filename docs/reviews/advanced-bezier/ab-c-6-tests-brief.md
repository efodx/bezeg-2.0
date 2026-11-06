# AB-C-6 test gaps: brief (handoff-v12)

- **Role:** test-only slice. Edit only the three test files named below, unless a test exposes a defect: then stop and report it, with no product fix. No commits, no pushes.
- **Goal:** close gaps 3, 4 and 5 of the [D4 criterion audit](ab-c-6-criterion-audit.md#ranked-gaps), and show each new assertion failing under a deliberate mutation, reverted afterwards.

## Work

1. **`src/graphs/patches/CoonsPatchLifecycle.test.tsx`, spec D4 acceptance 4.** Extend or add beside the three-mount test: a control point moved through the real view's own drag path (look at how the view reports a move to the graph in `src/graphs/patches/surface-view/` and `CoonsPatchGraph.tsx`; a real pointer gesture is not needed if the view's callback is the same entry), then a Preset load with `importPresetData`, then unmount. The probe count returns to its baseline. Assert the mesh was rebuilt after the import, not only the state.
2. **`src/learning/content/coonsGuidedLessons.test.tsx`, lines near 79 and 95 to 96.** The `toContain` checks on `'0'`, `'3'`, `'4'`, `'12'`, `'16'` pass on any such digit. Pin the sentences or full quoted tuples in both languages: the counts in step 1 (16, 4, 12), the heights in steps 2 and 3 (height 0 against 0,75 for \(d_1\), and against 1,5 for \(c_0\)). Read the lesson text in `coonsGuidedLessons.ts` first; numbers in prose use a decimal comma in SL math.
3. **`src/learning/content/advancedBezierChapter.test.ts`, spec D4 acceptance 3 and the prompt fix.** Over the D4 section's paragraphs, investigation prompt and the card text in `guidedExamplePreviewCopy.ts`, in both languages: no twist wording (`twist`, `zasuk`), and the section says the blend is one of many (`ena izmed mnogih`, `one of many`) and that the edges alone do not determine the interior. The investigation prompt names only controls the route has: assert it does not contain `izklopiš odštevalni` or `switch off the subtracted`, and that it contains the labels `sl.coons_shown`, `sl.coons_linked_corners` and their `en` values, read from the catalogs, not retyped.

## Checks

`just unit src/graphs/patches/CoonsPatchLifecycle.test.tsx src/learning/content/coonsGuidedLessons.test.tsx src/learning/content/advancedBezierChapter.test.ts --maxWorkers=2`, and `just lint` on the three files. Cap mutations at about six. Follow `AGENTS.md`; `just --list` and `docs/commands.md` for the commands.

## Return

Reply in at most 20 lines: what each test now pins, each mutation and the failure it caused, check results, and any defect found. Do not commit.

Budget: past about 20 turns, or on `HANDOFF`, stop at a consistent point and return what you have as partial.
