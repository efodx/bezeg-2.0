import {describe, expect, it} from 'vitest';
import {exampleReferences, hasEquivalentExampleOrder, validateOrderedChapterContent} from './orderedContent';

describe('ordered chapter content contract', () => {
    it('keeps an interleaved authored sequence in both languages even when paragraph boundaries differ', () => {
        const sl = [
            {kind: 'paragraph', text: 'Razlaga pred prvim primerom.'},
            {kind: 'example', exampleId: 'curve-parameter'},
            {kind: 'paragraph', text: 'Razlaga med primeroma.'},
            {kind: 'example', exampleId: 'decasteljau-interpolation'},
        ] as const;
        const en = [
            {kind: 'paragraph', text: 'Explanation before the first example.'},
            {kind: 'paragraph', text: 'An expanded English explanation.'},
            {kind: 'example', exampleId: 'curve-parameter'},
            {kind: 'paragraph', text: 'Reflection between examples.'},
            {kind: 'example', exampleId: 'decasteljau-interpolation'},
        ] as const;
        expect(exampleReferences(sl)).toEqual(['curve-parameter', 'decasteljau-interpolation']);
        expect(hasEquivalentExampleOrder(sl, en)).toBe(true);
        expect(hasEquivalentExampleOrder(sl, [...en].reverse())).toBe(false);
        expect(validateOrderedChapterContent(sl, new Set(['curve-parameter', 'decasteljau-interpolation']))).toEqual([]);
    });

    it('accepts a single-example section and reports unknown and repeated references', () => {
        const single = [{kind: 'paragraph', text: 'Read this first.'}, {kind: 'example', exampleId: 'one'}] as const;
        expect(validateOrderedChapterContent(single, new Set(['one']))).toEqual([]);

        const invalid = [
            {kind: 'example', exampleId: 'one'},
            {kind: 'paragraph', text: 'Then compare.'},
            {kind: 'example', exampleId: 'one'},
            {kind: 'example', exampleId: 'missing'},
        ] as const;
        expect(validateOrderedChapterContent(invalid, new Set(['one']))).toEqual([
            {kind: 'duplicate-reference', exampleId: 'one'},
            {kind: 'unknown-reference', exampleId: 'missing'},
        ]);
    });

});
