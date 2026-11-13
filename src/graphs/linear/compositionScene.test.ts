import {describe, expect, it} from 'vitest';
import {DEFAULT_LINEAR_MAP_STATE, type LinearMapState} from '../../linear/linearMapModel';
import {affineTranslationForm} from '../../linear/composition2';
import {COMPOSITION_BASE_VIEW, deriveComposition, fitScale, isExactMatrix, translationSegment, viewBoxOf} from './compositionScene';

const state = (extra: Partial<LinearMapState>): LinearMapState => ({...DEFAULT_LINEAR_MAP_STATE, mode: 'composition', ...extra});
/** `multiply` leaves -0 in places (shared kernel); the comparisons here are about values. */
const plain = (m: readonly (readonly number[])[]) => m.map(row => row.map(x => x + 0));
const R = {kind: 'rotation', k: 6} as const;
const F = {kind: 'reflection', k: 0} as const;

describe('deriveComposition', () => {
    it('A = R, B = F (the product F R, the spec "FR") is [[0, -1], [-1, 0]] with determinant -1 and a reflection as the named product', () => {
        const v = deriveComposition(state({element: R, secondElement: F}));
        expect(v.a).toEqual([[0, -1], [1, 0]]);
        expect(v.b).toEqual([[1, 0], [0, -1]]);
        expect(plain(v.product)).toEqual([[0, -1], [-1, 0]]);
        expect(v.determinant).toBe(-1);
        expect(v.orientation).toBe(-1);
        expect(v.productElement).toEqual({kind: 'reflection', k: 18});
        expect(v.pivotSet).toBe(false);
    });

    it('A = F, B = R (the spec "RF") is [[0, 1], [1, 0]]; R twice gives -I; both with the exact orientation', () => {
        const fr = deriveComposition(state({element: F, secondElement: R}));
        expect(plain(fr.product)).toEqual([[0, 1], [1, 0]]);
        expect(fr.productElement).toEqual({kind: 'reflection', k: 6});
        expect(fr.determinant).toBe(-1);
        expect(fr.orientation).toBe(-1);
        const rr = deriveComposition(state({element: R, secondElement: R}));
        expect(plain(rr.product)).toEqual([[-1, 0], [0, -1]]);
        expect(rr.determinant).toBe(1);
        expect(rr.orientation).toBe(1);
        expect(rr.productElement).toEqual({kind: 'rotation', k: 12});
    });

    it('a pivot at (3, 1) with a quarter turn sends the fixture to (4, -1), (1, 0), (2, 2), (5, 3), with t = c - M c', () => {
        const v = deriveComposition(state({element: R, pivot: [3, 1]}));
        expect(v.image).toEqual([[4, -1], [1, 0], [2, 2], [5, 3]]);
        expect(v.pivotSet).toBe(true);
        expect(v.translationForm).toEqual([4, -2]);
        expect(v.translationForm).toEqual(affineTranslationForm(v.product, [3, 1], [0, 0]));
        expect(v.pivotImage).toEqual([3, 1]);
    });

    it('the translation shifts every image and the segment runs from the pivot to its image', () => {
        const v = deriveComposition(state({translation: [1, -2], pivot: [2, 0]}));
        expect(v.image).toEqual([[2, -2], [3, 1], [5, 0], [6, -3]]);
        expect(v.pivotImage).toEqual([3, -2]);
        expect(translationSegment(v)).toEqual({x: [2, 3], y: [0, -2]});
        expect(v.translationForm).toEqual([1, -2]);
    });

    it('free entries and the identity second map apply when no element and no second matrix are stored', () => {
        const v = deriveComposition(state({matrix: [[2, 0], [0, 1]]}));
        expect(v.b).toEqual([[1, 0], [0, 1]]);
        expect(plain(v.product)).toEqual([[2, 0], [0, 1]]);
        expect(v.productElement).toBeUndefined();
        expect(v.orientation).toBe(1);
        expect(deriveComposition(state({matrix: [[0, 0], [0, 0]]})).orientation).toBe(0);
    });
});

describe('the view', () => {
    it('stays at scale 1 for points inside the base view and grows in half steps', () => {
        expect(fitScale([[5, 5]])).toBe(1);
        expect(fitScale([[11, 0]])).toBe(1);
        expect(fitScale([[12, 0]])).toBe(1.5);
        expect(fitScale([[0, -20]])).toBe(2.5);
        expect(viewBoxOf(2)).toEqual([-24, 18, 24, -18]);
        expect(viewBoxOf(1)).toEqual([...COMPOSITION_BASE_VIEW]);
    });

    it('recognises matrices on the quarter grid as exact', () => {
        expect(isExactMatrix([[1, 0.25], [-4, 0]])).toBe(true);
        expect(isExactMatrix([[Math.SQRT1_2, 0], [0, 1]])).toBe(false);
    });
});
