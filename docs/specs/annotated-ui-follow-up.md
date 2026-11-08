# Browser annotation follow-up

Planned 2026-11-08 from ten owner annotations on the hosted homepage and the Bézier curves and B-splines chapters. Use the existing cream, green and ochre palette and the elderflower identity. The reader should stay easy to scan, and the playground should give a learner something enjoyable to do with a curve before introducing its editing vocabulary.

## Tasks and acceptance

| Task | Comments | Done when |
| --- | --- | --- |
| [01 Chapter links](../tasks/annotated-ui-follow-up/01-chapter-links.md) | 1, 4, 7 | The Learn return and prerequisite links have a clear visual hierarchy. Section headings lose the ¶ and remain directly shareable. |
| [02 Inline math](../tasks/annotated-ui-follow-up/02-inline-math.md) | 3, 5, 8 | Ordinary inline notation reads with the sentence, without tiny scrollbars. Wide expressions are fully readable even in a narrow, enlarged layout. |
| [03 First curve](../tasks/annotated-ui-follow-up/03-first-curve.md) | 2 | A new learner can bend a visible starter curve immediately, then draw their own. Existing drawings and the keyboard editing path still work. |
| [04 Overlay checkboxes](../tasks/annotated-ui-follow-up/04-overlay-checkboxes.md) | 6 | The four overlay choices have aligned labels, clear checked states, and comfortable keyboard and touch targets. |
| [05 Homepage clip playback](../tasks/annotated-ui-follow-up/05-homepage-clip-playback.md) | 9 | Switching the featured demonstration starts its existing animation under the conditions in the task. |
| [06 Homepage elderflower](../tasks/annotated-ui-follow-up/06-homepage-elderflower.md) | 10 | The sprig reads clearly as a decorative accent at desktop, tablet and phone widths and sits clear of content and controls. |

## Order and boundaries

Prioritize the reader fixes and the first curve. Tasks 01 and 02 share `ChapterPage.css`. Tasks 03 and 04 share `DrawingPlayground.css`. Keep each pair sequential or coordinate ownership before implementation. The homepage tasks can proceed independently, with a final check of the combined composition.

Keep section IDs, chapter routes, link destinations, curve geometry, saved drawings and graph presets compatible. Scope carousel playback to the featured homepage preview and artwork to the homepage. Use targeted production-preview browser checks from [the browser checklist](../smoke-tests.md). Verify the affected states in Slovenian and English and include keyboard, narrow-layout and enlarged-text coverage where specified in the tasks.
