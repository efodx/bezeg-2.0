import {expect, it} from 'vitest';
import {guidedExampleHighlightCopy} from '../content/guidedExampleHighlightCopy';
import {guidedExampleHighlightRecipes} from './guidedExampleHighlights';
import {getGuidedExamplePreviewCopy} from './guidedExamplePreviews';
import {getRetainedExampleHome} from './retainedExamples';

const highlightIds = Object.entries(guidedExampleHighlightRecipes)
    .filter(([, recipe]) => recipe.kind === 'highlight').map(([id]) => id);

it('gives every highlight recipe its own bilingual copy and no other example one', () => {
    expect(highlightIds.length).toBeGreaterThan(0);
    expect(Object.keys(guidedExampleHighlightCopy).sort()).toEqual([...highlightIds].sort());
    for (const id of highlightIds) {
        const own = guidedExampleHighlightCopy[id];
        for (const text of [own.alt, own.caption]) {
            expect(text.sl.trim().length).toBeGreaterThan(0);
            expect(text.en.trim().length).toBeGreaterThan(0);
        }
        const home = getRetainedExampleHome(id);
        if (home) expect(getGuidedExamplePreviewCopy(id, home[3])).toBe(own);
    }
});
