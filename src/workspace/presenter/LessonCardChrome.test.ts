// Task 08 bug B: at 1280x720 the lesson card is 394 px wide (374 inside) and the board leaves it about 330 px, so the stacked
// progress-above-buttons toolbar (about 45 px more chrome) left one or two lines of the prompt. The toolbar stacks only below 23rem
// (368 px), so a 374 px card keeps progress and Back/Next on one row.
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';

test('the lesson toolbar stacks only in a container narrower than a 1280 px card\'s inside width (374 px)', () => {
    const css = readFileSync('src/learning/runtime/GuidedLesson.css', 'utf8');
    const stack = /@container \(max-width: ([\d.]+)rem\) \{\s*\.guided-lesson-toolbar \{ grid-template-columns:minmax\(0, 1fr\); \}/.exec(css);
    expect(stack).not.toBeNull();
    expect(Number(stack![1]) * 16).toBeLessThan(374);
});
