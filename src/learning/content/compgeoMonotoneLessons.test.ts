import {compgeoGuidedLessons, MONOTONE_EXAMPLE_1, MONOTONE_EXAMPLE_2} from './compgeoGuidedLessons';
import {monotonePartitionTrace, type MonotonePartition, type VertexType} from '../../compgeo/sweep/monotonePartition';
import {partitionAndTriangulate} from '../../compgeo/sweep/monotoneTriangulation';
import {doubledSignedArea} from '../../compgeo/polygonMeasures';
import type {GridPoint} from '../../compgeo/grid';
import type {LocalizedText} from './guidedLessons';

/**
 * Gate F6 (sweep S2): the numbers and rules the C3 and C4 lesson text states are compared with the compgeo kernels, in both languages.
 * The panel readouts at each step are compared with the text in the two LessonActions host tests.
 */
const asPoints = (list: readonly (readonly [number, number])[]): GridPoint[] => list.map(([x, y]) => ({x, y}));
const lessonOf = (id: string) => compgeoGuidedLessons.find(lesson => lesson.demonstrationId === id)!;
const stepOf = (lessonId: string, stepId: string) => lessonOf(lessonId).steps.find(step => step.id === stepId)!;
/** Every sentence of a step a student reads: the explanation, the expected observations and the announced scene state. */
const prose = (lessonId: string, stepId: string, language: keyof LocalizedText): string => {
    const step = stepOf(lessonId, stepId);
    return [step.explanation[language], ...(step.expectedObservations ?? []).map(o => o[language]), step.scene!.expectedState[language]].join('\n');
};
const num = (value: number | bigint) => `\\(${value}\\)`;
const partitionOf = (list: readonly (readonly [number, number])[]): MonotonePartition => {
    const out = monotonePartitionTrace(asPoints(list));
    if (!out.ok) throw new Error('refused');
    return out;
};
const areaOf = (list: readonly (readonly [number, number])[], piece: readonly number[]) => Number(doubledSignedArea(piece.map(i => asPoints(list)[i]))) / 2;
const typeCount = (p: MonotonePartition, type: VertexType) => p.types.filter(t => t === type).length;

test('C3 step text quotes the types, diagonals, pieces and areas of the kernel (sl and en)', () => {
    const one = partitionOf(MONOTONE_EXAMPLE_1);
    const two = partitionOf(MONOTONE_EXAMPLE_2);
    const total = (p: MonotonePartition) => p.trace.length - 1;
    const areas1 = one.pieces.map(piece => areaOf(MONOTONE_EXAMPLE_1, piece));
    const areas2 = two.pieces.map(piece => areaOf(MONOTONE_EXAMPLE_2, piece));
    expect(total(one)).toBe(14);
    expect(total(two)).toBe(20);
    expect(areas1).toEqual([20, 20]);
    expect([...areas2].sort((a, b) => a - b)).toEqual([6, 10, 42]);
    const [s1, e1, sp1, m1, r1] = (['start', 'end', 'split', 'merge', 'regular'] as const).map(type => typeCount(one, type));
    const [s2, e2, sp2, m2, r2] = (['start', 'end', 'split', 'merge', 'regular'] as const).map(type => typeCount(two, type));
    const d1 = one.diagonals.length;
    const d2 = two.diagonals.length;
    const v = (index: number) => `v_${index + 1}`;
    for (const language of ['sl', 'en'] as const) {
        const all = (stepId: string) => prose('monotone-partition', stepId, language);
        // Step 1: polygon area and the trace length.
        expect(all('monpart-polygon'), language).toContain(num(areaOf(MONOTONE_EXAMPLE_1, [0, 1, 2, 3, 4, 5])));
        expect(all('monpart-polygon'), language).toContain(num(total(one)));
        // Step 3: the merge vertex v5 is the third vertex processed; the first two are start vertices.
        expect(one.order.slice(0, 3).map(k => one.types[k])).toEqual(['start', 'start', 'merge']);
        expect(all('monpart-classify'), language).toContain(`${v(one.order[2])}=(8,5)`);
        // Step 5: one diagonal v2-v5.
        expect(d1).toBe(1);
        expect(all('monpart-diagonal'), language).toContain(`${v(one.diagonals[0][0])}\\)–\\(${v(one.diagonals[0][1])}`);
        // Step 6: pieces = diagonals + 1, areas, type balance.
        const pieces = all('monpart-pieces');
        expect(pieces, language).toContain(num(total(one)));
        expect(pieces, language).toContain(`\\(${one.pieces.length}=${d1}+1\\)`);
        const startSplit = `\\(${s1}+${sp1}=${s1 + sp1}\\)`;
        const endMerge = `\\(${e1}+${m1}=${e1 + m1}\\)`;
        expect(pieces, language).toContain(language === 'sl'
            ? `Začetnih in razcepnih oglišč je ${startSplit}, končnih in zlivnih prav tako ${endMerge}`
            : `There are ${startSplit} start and split vertices and also ${endMerge} end and merge vertices`);
        expect(pieces, language).toContain(`${num(areas1[0])}`);
        expect(pieces, language).toContain(`${num(areas1.reduce((a, b) => a + b, 0))}`);
        expect(pieces, language).toContain(`${num(one.pieces.length)}`);
        const typeLine = language === 'sl'
            ? `oglišč je začetnih ${num(s1)}, končnih ${num(e1)}, razcepnih ${num(sp1)}, zlivnih ${num(m1)}, navadnih ${num(r1)}`
            : `the vertices are ${num(s1)} start, ${num(e1)} end, ${num(sp1)} split, ${num(m1)} merge and ${num(r1)} regular`;
        expect(pieces, language).toContain(typeLine);
        // Step 7: the second example.
        const merge = all('monpart-merge-only');
        expect(sp2).toBe(0);
        const typeLine2 = language === 'sl'
            ? `Začetnih je ${num(s2)}, končnih ${num(e2)}, razcepnih ${num(sp2)}, zlivnih ${num(m2)}, navadnih ${num(r2)}`
            : `There are ${num(s2)} start, ${num(e2)} end, ${num(sp2)} split, ${num(m2)} merge and ${num(r2)} regular`;
        expect(merge, language).toContain(typeLine2);
        expect(merge, language).toContain(`${num(d2)}`);
        expect(merge, language).toContain(`\\(${two.pieces.length}=${d2}+1\\)`);
        expect(merge, language).toContain(`${num(total(two))}`);
        for (const area of areas2) expect(merge, language).toContain(num(area));
        expect(merge, language).toContain(num(areas2.reduce((a, b) => a + b, 0)));
        for (const [a, b] of two.diagonals) expect(merge, language).toContain(`${v(a)}\\)–\\(${v(b)}`);
    }
});

test('C3 states the equal-height tie rule (smaller x first) and the refusal of three consecutive collinear vertices (sl and en)', () => {
    const classify = prose('monotone-partition', 'monpart-classify', 'sl');
    expect(classify).toContain('pri enaki višini najprej tisto z manjšim \\(x\\)');
    expect(classify).toContain('Tri zaporedna kolinearna oglišča program zavrne');
    const classifyEn = prose('monotone-partition', 'monpart-classify', 'en');
    expect(classifyEn).toContain('at equal height the one with the smaller \\(x\\) first');
    expect(classifyEn).toContain('Three consecutive collinear vertices are refused');
    expect(prose('monotone-partition', 'monpart-merge-only', 'sl')).toContain('najprej manjši \\(x\\)');
    expect(prose('monotone-partition', 'monpart-merge-only', 'en')).toContain('smaller \\(x\\) first');
    const explore = stepOf('monotone-partition', 'monpart-explore').explanation;
    expect(explore.sl).toContain('tri zaporedna oglišča na isti premici');
    expect(explore.en).toContain('three consecutive vertices lie on one line');
    const edge = lessonOf('monotone-partition').edgeCases!;
    expect(edge[0].sl).toContain('tri zaporedna kolinearna oglišča');
    expect(edge[0].en).toContain('three consecutive collinear vertices');
    // The tie in the second example is real: (3,7) and (7,7) are at equal height and (3,7) is handled first.
    const two = partitionOf(MONOTONE_EXAMPLE_2);
    expect(two.order.indexOf(6)).toBeLessThan(two.order.indexOf(4));
});

test('C4 step text quotes the pieces, triangles, diagonals and predicate counts of the kernel (sl and en)', () => {
    const whole = partitionAndTriangulate(asPoints(MONOTONE_EXAMPLE_1));
    const piece1 = partitionAndTriangulate(asPoints([[0, 0], [4, 3], [8, 5], [4, 8]]));
    if (!whole.ok || !piece1.ok) throw new Error('refused');
    // The graph run drops the dead step between phases, so its last step (43) is not the kernel's trace length; the host test compares it with the panel.
    const last = 43;
    expect(whole.pieces.map(entry => entry.piece.length)).toEqual([4, 4]);
    expect(whole.triangles.length).toBe(MONOTONE_EXAMPLE_1.length - 2);
    expect(whole.diagonals.length).toBe(MONOTONE_EXAMPLE_1.length - 3);
    expect(whole.counts).toEqual({monotone: 11, earClipping: 21});
    expect(piece1.counts).toEqual({monotone: 7, earClipping: 3});
    const v = (index: number) => `v_${index + 1}`;
    for (const language of ['sl', 'en'] as const) {
        const all = (stepId: string) => prose('monotone-triangulation', stepId, language);
        const first = all('montri-piece');
        expect(first, language).toContain(`${num(whole.pieces[0].piece.length)}`);
        expect(first, language).toContain(`${num(whole.pieces[0].piece.length - 2)}`);
        expect(first, language).toContain(num(last));
        const done = all('montri-diagonal');
        expect(done, language).toContain(num(last));
        const compare = all('montri-compare');
        expect(compare, language).toContain(num(last));
        expect(compare, language).toContain(`${num(whole.triangles.length)}`);
        expect(compare, language).toContain(`${num(whole.diagonals.length)}`);
        const [mono, ear] = [num(whole.counts.monotone), num(whole.counts.earClipping)];
        expect(compare, language).toContain(language === 'sl'
            ? `jih potrebuje ${mono}, rezanje ušes na istem večkotniku (lekcija Rezanje ušes) pa ${ear}`
            : `needs ${mono}, ear clipping on the same polygon (see the lesson Ear clipping) needs ${ear}`);
        expect(compare, language).toContain(`${num(piece1.counts.monotone)}`);
        expect(compare, language).toContain(`${num(piece1.counts.earClipping)}`);
        for (const [a, b] of whole.diagonals) expect(compare, language).toContain(`${v(a)}\\)–\\(${v(b)}`);
    }
});

test('C4 says non-monotone input is partitioned first, names the ear-clipping lesson, states the growth as illustration, and claims no saving the counts do not show', () => {
    const earTitle = lessonOf('ear-clipping').title;
    const trianglesLesson = lessonOf('monotone-triangulation');
    const whole = partitionAndTriangulate(asPoints(MONOTONE_EXAMPLE_1));
    if (!whole.ok) throw new Error('refused');
    // The example is not monotone, so the partition really adds a diagonal first.
    expect(whole.partition.diagonals.length).toBeGreaterThan(0);
    const explore = stepOf('monotone-triangulation', 'montri-explore').explanation;
    expect(explore.sl).toContain('Večkotnik, ki ni monoton, se najprej razdeli na monotone kose');
    expect(explore.en).toContain('A polygon that is not monotone is partitioned into monotone pieces first');
    const first = stepOf('monotone-triangulation', 'montri-piece').explanation;
    expect(first.sl).toContain('Razdelitev je že dodala diagonalo');
    expect(first.en).toContain('The partition has already added the diagonal');
    // The comparison step names the ear-clipping lesson by the start of its title; the prerequisite names it too.
    const compare = {sl: prose('monotone-triangulation', 'montri-compare', 'sl'), en: prose('monotone-triangulation', 'montri-compare', 'en')};
    expect(earTitle.sl.startsWith('Rezanje ušes')).toBe(true);
    expect(earTitle.en.startsWith('Ear clipping')).toBe(true);
    expect(compare.sl).toContain('(lekcija Rezanje ušes)');
    expect(compare.en).toContain('(see the lesson Ear clipping)');
    expect(trianglesLesson.prerequisites![0].sl).toContain('lekcija Rezanje ušes in izrek o galeriji');
    expect(trianglesLesson.prerequisites![0].en).toContain('the lesson Ear clipping and the art gallery theorem');
    // Growth O(n^2) vs O(n) per piece, as illustration and not proof.
    expect(compare.sl).toContain('Pri rezanju ušes narašča število kot \\(O(n^2)\\); pri enem monotonem kosu je po razvrstitvi oglišč \\(O(n)\\)');
    expect(compare.en).toContain('Ear clipping grows like \\(O(n^2)\\); one monotone piece takes \\(O(n)\\) after the vertices are sorted');
    expect(compare.sl).toContain('število na majhnem večkotniku to ponazori, ne dokaže');
    expect(compare.en).toContain('a count on a small polygon illustrates this, it does not prove it');
    // Piece 1 alone: the monotone method needs more evaluations (7 > 3); the text says the order is reversed and the advantage needs large n.
    const piece1 = partitionAndTriangulate(asPoints([[0, 0], [4, 3], [8, 5], [4, 8]]));
    if (!piece1.ok) throw new Error('refused');
    expect(piece1.counts.monotone).toBeGreaterThan(piece1.counts.earClipping);
    expect(compare.sl).toContain('razmerje obrnjeno');
    expect(compare.en).toContain('the order is reversed');
    expect(compare.sl).toContain('Prednost monotone metode se pokaže šele pri velikem \\(n\\)');
    expect(compare.en).toContain('The advantage of the monotone method shows only for large \\(n\\)');
    // No claim of a saving on the small polygons themselves: neither language says the method is faster or saves tests here.
    for (const language of ['sl', 'en'] as const) {
        expect(compare[language], language).not.toMatch(/hitrejša|prihrani|prihranek|faster|saves|saving/i);
    }
});
