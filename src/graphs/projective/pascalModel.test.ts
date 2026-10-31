import {
    directionIndex, evaluatePascal, handleOf, handlePoint, isLineAtInfinity, isReachable, matchesExample, parsePascalModel, PASCAL_CONIC_IDS, PASCAL_CONICS,
    PASCAL_DEFAULT_INDICES, PASCAL_EXAMPLE_IDS, PASCAL_EXAMPLES, PASCAL_ORDERS, PASCAL_VIEW_BOX, PascalModel, reachableIndices, serializePascalModel,
} from './pascalModel';
import {dragHandle, nearestIndex, setConic, setIndex, setOrder, stepHandle} from './pascalEdit';
import {describePascal} from './pascalText';
import {classify, conic, evaluate} from '../../projective/conic';
import {DIRECTION_TABLE, DIRECTION_TABLE_SIZE} from '../../projective/conicPencil';
import {isIdeal} from '../../projective/homogeneous';
import {pointText} from './polePolarModel';
import {renderMessage, setLanguage, t} from '../../localization';

beforeEach(() => setLanguage('sl'));

const custom = (patch: Partial<PascalModel>): PascalModel => ({...PASCAL_EXAMPLES.default, example: 'custom', ...patch});
const points = (model: PascalModel): string[] => evaluatePascal(model).pascalPoints.map(p => pointText(p.point));
const handleTexts = (model: PascalModel): string[] => evaluatePascal(model).handles.map(pointText);

/** A seeded generator (mulberry32), so the property tests are deterministic. */
function seeded(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let x = Math.imul(a ^ (a >>> 15), 1 | a);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

test('the four conics classify as ellipse, parabola, hyperbola and line pair; the coefficient order is A..F', () => {
    expect(PASCAL_CONIC_IDS.map(id => classify(PASCAL_CONICS[id].conic))).toEqual(['ellipse', 'parabola', 'hyperbola', 'parallel-lines']);
    expect(PASCAL_CONICS.ellipse.conic).toEqual(conic(9, 0, 25, 0, 0, -225));
    // y (y - 3) is zero on both lines and nowhere else on the x axis and the line y = 3
    const pair = PASCAL_CONICS.linePair.conic;
    expect([evaluate(pair, [7n, 0n, 1n]), evaluate(pair, [-2n, 3n, 1n]), evaluate(pair, [0n, 1n, 1n])]).toEqual([0n, 0n, -2n]);
});

test('every base point and every default handle lies exactly on its conic, with distinct points', () => {
    for (const id of PASCAL_CONIC_IDS) {
        const def = PASCAL_CONICS[id];
        def.bases.forEach(base => expect(evaluate(def.conic, base)).toBe(0n));
        const model = custom({conic: id, indices: PASCAL_DEFAULT_INDICES[id]});
        const handles = evaluatePascal(model).handles;
        handles.forEach(h => expect(evaluate(def.conic, h)).toBe(0n));
        expect(new Set(handleTexts(model)).size).toBe(6);
    }
});

test("the spec's ellipse points come from table directions (5,3t) and are exact", () => {
    // t = 0, 1/2, 1, 2, -1, -1/3: directions (1,0) (10,3) (5,3) (5,6) (5,-3) (5,-1), one sign per line
    expect(DIRECTION_TABLE_SIZE).toBeGreaterThan(100);
    expect(handleTexts(PASCAL_EXAMPLES.default)).toEqual(['(5, 0)', '(3, 12/5)', '(0, 3)', '(−3, 12/5)', '(0, −3)', '(4, −9/5)']);
    expect(PASCAL_EXAMPLES.default.indices).toEqual([[1, 0], [10, 3], [5, 3], [5, 6], [-5, 3], [-5, 1]].map(([p, q]) => directionIndex(p, q)));
    expect(directionIndex(5, -3)).toBe(directionIndex(-5, 3));
});

test('acceptance 1: the default example has Pascal points (-15,24), (12,3/5), (15/2,9/2) and determinant exactly 0', () => {
    const scene = evaluatePascal(PASCAL_EXAMPLES.default);
    expect(scene.result.status).toBe('ok');
    expect(points(PASCAL_EXAMPLES.default)).toEqual(['(−15, 24)', '(12, 3/5)', '(15/2, 9/2)']);
    if (scene.result.status !== 'ok') return;
    expect(scene.result.determinant).toBe(0n);
    expect(scene.result.collinear).toBe(true);
    expect(scene.result.line).not.toBeNull();
    expect(describePascal(scene, t).status).toContain('natančno kolinearna (natančen račun na natančnih točkah)');
});

test('acceptance 1: the Pappus example has Pascal points (8/5,6/5), (22/5,9/5), (3,3/2) and determinant exactly 0', () => {
    const scene = evaluatePascal(PASCAL_EXAMPLES.pappus);
    expect(handleTexts(PASCAL_EXAMPLES.pappus)).toEqual(['(0, 0)', '(2, 0)', '(5, 0)', '(1, 3)', '(4, 3)', '(6, 3)']);
    expect(scene.names).toEqual(['A₁', 'A₂', 'A₃', 'B₁', 'B₂', 'B₃']);
    expect(points(PASCAL_EXAMPLES.pappus)).toEqual(['(8/5, 6/5)', '(22/5, 9/5)', '(3, 3/2)']);
    expect(scene.result.status === 'ok' && scene.result.determinant).toBe(0n);
    expect(describePascal(scene, t).status).toContain('natančno kolinearna');
});

test('acceptance 3: the parallel sides example has an ideal Pascal point in direction (1,1) and two finite ones, determinant 0', () => {
    const model = PASCAL_EXAMPLES.infinity;
    expect(handleTexts(model)).toEqual(['(0, 0)', '(1, 0)', '(6, 0)', '(4, 3)', '(3, 3)', '(8, 3)']);
    const scene = evaluatePascal(model);
    if (scene.result.status !== 'ok') throw new Error('expected ok');
    expect(scene.result.determinant).toBe(0n);
    const [first, second, third] = scene.result.points;
    expect(isIdeal(first)).toBe(true);
    expect(first[0]).toBe(first[1]);
    expect(first[0]).not.toBe(0n);
    expect(points(model).slice(1)).toEqual(['(9/2, 3/2)', '(24/5, 9/5)']);
    expect(isIdeal(second) || isIdeal(third)).toBe(false);
    expect(scene.pascalPoints[0].view.kind).toBe('ideal');
    expect(scene.pascalPoints[0].offBox).toBe(false);
    const text = describePascal(scene, t);
    expect(text.points[0]).toContain('v neskončnosti, smer (1, 1)');
    expect(text.points.join(' ')).not.toMatch(/NaN|Infinity|undefined/);
});

test('acceptance 3: all three Pascal points ideal give the line at infinity, stated in text and not a finite line', () => {
    const at = (p: number, q: number) => directionIndex(p, q);
    const model = custom({
        conic: 'linePair', order: PASCAL_ORDERS.natural,
        // A = (0,0) (1,0) (2,0), B = (4,3) (3,3) (2,3): A3B1 and B3A1 are both parallel to (2,3)
        indices: [at(0, 1), at(-1, 3), at(-2, 3), at(4, 3), at(1, 1), at(2, 3)],
    });
    expect(handleTexts(model)).toEqual(['(0, 0)', '(1, 0)', '(2, 0)', '(4, 3)', '(3, 3)', '(2, 3)']);
    const scene = evaluatePascal(model);
    if (scene.result.status !== 'ok') throw new Error('expected ok');
    expect(scene.result.points.every(isIdeal)).toBe(true);
    expect(scene.result.determinant).toBe(0n);
    expect(scene.result.line && isLineAtInfinity(scene.result.line)).toBe(true);
    const text = describePascal(scene, t);
    expect(text.line).toBe('Pascalova premica p je premica v neskončnosti, zato je ne narišemo.');
    expect(text.points.every(line => line.includes('v neskončnosti'))).toBe(true);
    setLanguage('en');
    expect(describePascal(scene, t).line).toBe('The Pascal line p is the line at infinity, so it is not drawn.');
});

test('acceptance 2: for random handle positions and orders on all four conics, every defined hexagon has determinant exactly 0', () => {
    const random = seeded(20251031);
    for (const id of PASCAL_CONIC_IDS) {
        const usable = [0, 1, 2, 3, 4, 5].map(handle => DIRECTION_TABLE.map((_, i) => i).filter(i => handlePoint(id, handle, i) !== undefined));
        let ok = 0;
        for (let round = 0; round < 400; round++) {
            const indices = usable.map(list => list[Math.floor(random() * list.length)]);
            const order = [0, 1, 2, 3, 4, 5];
            if (round % 2 === 1) for (let i = 5; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
            const scene = evaluatePascal(custom({conic: id, indices, order}));
            for (const h of scene.handles) expect(evaluate(scene.conic, h)).toBe(0n);
            if (scene.result.status !== 'ok') continue;
            ok++;
            expect(scene.result.determinant).toBe(0n);
            expect(scene.result.collinear).toBe(true);
        }
        expect(ok).toBeGreaterThan(100);
    }
});

test('acceptance 4: coinciding neighbours make a side undefined; the text names it and there is no NaN', () => {
    const model = custom({indices: PASCAL_EXAMPLES.default.indices.map((v, i) => i === 1 ? PASCAL_EXAMPLES.default.indices[0] : v)});
    const scene = evaluatePascal(model);
    expect(scene.result).toEqual({status: 'undefined-side', side: 0});
    expect(scene.pascalPoints).toEqual([]);
    expect(scene.sides[0]).toBeUndefined();
    const text = describePascal(scene, t);
    expect(text.kind).toBe('undefined-side');
    expect(text.status).toBe('Točki A in B se ujemata, zato stranica s₁ ni določena in presečišč ni.');
    expect(text.points).toEqual([]);
    expect(JSON.stringify([text.status, text.hexagon, text.points])).not.toMatch(/NaN|Infinity|undefined/);
    setLanguage('en');
    expect(describePascal(scene, t).status).toBe('Points A and B coincide, so side s₁ is undefined and there are no intersections.');
});

test('opposite sides on the same line give their own status', () => {
    const [a, b, c, , , f] = PASCAL_EXAMPLES.default.indices;
    // A B C B A F: sides AB and BA are the same line
    const scene = evaluatePascal(custom({indices: [a, b, c, b, a, f]}));
    expect(scene.result).toEqual({status: 'coincident-opposite-sides', pair: 0});
    expect(describePascal(scene, t).status).toBe('Nasprotni stranici s₁ in s₄ ležita na isti premici, zato njuno presečišče ni določeno.');
});

test('the order decides the sides: a crossed order moves the Pascal line, a star order is a different hexagon', () => {
    const natural = points(PASCAL_EXAMPLES.default);
    const crossed = points(custom({order: PASCAL_ORDERS.pappus}));
    const star = points(custom({order: PASCAL_ORDERS.star}));
    expect(new Set([natural.join(), crossed.join(), star.join()]).size).toBe(3);
    for (const order of [PASCAL_ORDERS.pappus, PASCAL_ORDERS.star]) {
        const scene = evaluatePascal(custom({order}));
        expect(scene.result.status === 'ok' && scene.result.determinant).toBe(0n);
    }
});

test('example consistency: matchesExample holds for the named examples and an edit makes a custom set-up', () => {
    for (const id of PASCAL_EXAMPLE_IDS) expect(matchesExample(PASCAL_EXAMPLES[id])).toBe(id !== 'custom');
    const stepped = stepHandle(PASCAL_EXAMPLES.default, 0, 1);
    expect(stepped).not.toBe(PASCAL_EXAMPLES.default);
    expect(stepped.example).toBe('custom');
    expect(setConic(PASCAL_EXAMPLES.default, 'parabola').example).toBe('custom');
    expect(setOrder(PASCAL_EXAMPLES.default, PASCAL_ORDERS.star).example).toBe('custom');
    expect(setOrder(PASCAL_EXAMPLES.default, PASCAL_ORDERS.natural)).toBe(PASCAL_EXAMPLES.default);
    expect(matchesExample({...PASCAL_EXAMPLES.pappus, order: PASCAL_ORDERS.natural})).toBe(false);
    expect(matchesExample({...PASCAL_EXAMPLES.default, indices: [...PASCAL_EXAMPLES.default.indices].reverse()})).toBe(false);
});

test('example fit: every example handle and every finite Pascal point lies in the view box, except the stated P1 = (-15, 24)', () => {
    const [left, top, right, bottom] = PASCAL_VIEW_BOX;
    const inside = (x: number, y: number) => x >= left && x <= right && y >= bottom && y <= top;
    for (const id of ['default', 'pappus', 'infinity'] as const) {
        const scene = evaluatePascal(PASCAL_EXAMPLES[id]);
        for (const h of scene.handles) {
            const view = pointView(h);
            expect(inside(view.x, view.y)).toBe(true);
        }
        const off = scene.pascalPoints.map((p, i) => p.offBox ? i : -1).filter(i => i >= 0);
        expect(off).toEqual(id === 'default' ? [0] : []);
        scene.pascalPoints.forEach(p => {
            if (p.view.kind === 'finite' && !p.offBox) expect(inside(p.view.view.x, p.view.view.y)).toBe(true);
        });
    }
    // the default's Pascal line stays visible through P2 and P3, which are inside; the text still lists the off-box P1
    const text = describePascal(evaluatePascal(PASCAL_EXAMPLES.default), t);
    expect(text.points[0]).toBe('P₁ = s₁ ∩ s₄: (−15, 24) (izven prikazanega območja)');
    expect(text.points[1]).toBe('P₂ = s₂ ∩ s₅: (12, 3/5)');
});

function pointView(h: readonly [bigint, bigint, bigint]) {
    return {x: Number(h[0]) / Number(h[2]), y: Number(h[1]) / Number(h[2])};
}

test('every reachable table index of every handle is a finite point on the conic; unreachable ones are refused', () => {
    for (const id of PASCAL_CONIC_IDS) {
        for (let handle = 0; handle < 6; handle++) {
            const list = reachableIndices(id, handle);
            expect(list.length).toBeGreaterThan(20);
            for (const i of list) {
                const p = handlePoint(id, handle, i)!;
                expect(isIdeal(p)).toBe(false);
                expect(evaluate(PASCAL_CONICS[id].conic, p)).toBe(0n);
            }
        }
    }
    // the parabola's axis direction (0,1) is asymptotic (the second point is ideal), the line pair's own direction is contained
    expect(handlePoint('parabola', 0, directionIndex(0, 1))).toBeUndefined();
    expect(isReachable('parabola', 0, directionIndex(0, 1))).toBe(false);
    expect(handlePoint('linePair', 0, directionIndex(1, 0))).toBeUndefined();
    // the tangent direction gives Q0 itself, which is allowed
    expect(pointText(handlePoint('parabola', 0, directionIndex(1, 0))!)).toBe('(0, 0)');
    expect(isReachable('parabola', 0, directionIndex(1, 0))).toBe(true);
    expect(isReachable('ellipse', 0, -1)).toBe(false);
    expect(isReachable('ellipse', 0, DIRECTION_TABLE_SIZE)).toBe(false);
});

test('stepping visits only reachable positions, wraps around and is reversible', () => {
    for (const id of PASCAL_CONIC_IDS) {
        let model = custom({conic: id, indices: PASCAL_DEFAULT_INDICES[id]});
        const list = reachableIndices(id, 2);
        for (let i = 0; i < list.length + 3; i++) {
            const next = stepHandle(model, 2, 1);
            expect(isReachable(id, 2, next.indices[2])).toBe(true);
            expect(stepHandle(next, 2, -1).indices).toEqual(model.indices);
            model = next;
        }
    }
    const model = PASCAL_EXAMPLES.default;
    expect(stepHandle(model, 0, 0)).toBe(model);
    expect(stepHandle(model, 9, 1)).toBe(model);
    // one full turn is the identity; Shift steps are five positions
    const list = reachableIndices('ellipse', 0);
    expect(stepHandle(model, 0, list.length).indices).toEqual(model.indices);
    expect(list.indexOf(stepHandle(model, 0, 5).indices[0]) - list.indexOf(model.indices[0])).toBe(5);
    // stepping changes only that one index
    expect(stepHandle(model, 3, 1).indices.filter((v, i) => v !== model.indices[i])).toHaveLength(1);
});

test('dragging snaps to the table direction nearest the pointer angle from the base point and changes only the index', () => {
    const model = PASCAL_EXAMPLES.default;
    // handle B is (3, 12/5): direction (10,3) from Q0 = (-5, 0)
    expect(nearestIndex(model, 1, {x: 3, y: 2.4})).toBe(directionIndex(10, 3));
    expect(nearestIndex(model, 1, {x: 3.4, y: 2.5})).toBe(directionIndex(10, 3));
    expect(nearestIndex(model, 1, {x: 4.9, y: 0.05})).toBe(directionIndex(1, 0));
    // a pointer below the base point on the opposite side of the line is the same line direction
    expect(nearestIndex(model, 1, {x: -7, y: -0.6})).toBe(directionIndex(10, 3));
    expect(nearestIndex(model, 1, {x: -5, y: 0})).toBeUndefined();
    expect(nearestIndex(model, 1, {x: NaN, y: 0})).toBeUndefined();
    const moved = dragHandle(model, 1, {x: 0, y: -3});
    expect(moved.indices).toEqual(model.indices.map((v, i) => i === 1 ? directionIndex(5, -3) : v));
    expect(moved.conic).toBe(model.conic);
    expect(dragHandle(model, 1, {x: 3, y: 2.4})).toBe(model);
    // on the line pair the B handles are cast from (0,0): a pointer at (4,3) is direction (4,3)
    expect(nearestIndex(PASCAL_EXAMPLES.pappus, 4, {x: 4, y: 3})).toBe(directionIndex(4, 3));
});

test('switching the conic restarts the handles at that conic and keeps the order; setIndex refuses an unreachable position', () => {
    const next = setConic(custom({order: PASCAL_ORDERS.star}), 'hyperbola');
    expect(next.conic).toBe('hyperbola');
    expect(next.indices).toEqual(PASCAL_DEFAULT_INDICES.hyperbola);
    expect(next.order).toEqual(PASCAL_ORDERS.star);
    expect(setConic(next, 'hyperbola')).toBe(next);
    const parabola = setConic(next, 'parabola');
    expect(setIndex(parabola, 0, directionIndex(0, 1))).toBe(parabola);
    expect(setOrder(parabola, [0, 1, 2, 3, 4, 4])).toBe(parabola);
    expect(setOrder(parabola, [0, 1, 2])).toBe(parabola);
});

test('imports are checked field by field with actionable messages in both languages', () => {
    const good = serializePascalModel(PASCAL_EXAMPLES.pappus);
    const parsed = parsePascalModel(JSON.parse(JSON.stringify(good)));
    expect(parsed.ok && parsed.value).toEqual(good);
    const refused = (data: unknown): string => {
        const checked = parsePascalModel(data);
        if (checked.ok) throw new Error('expected a refusal');
        return renderMessage(checked.rejection);
    };
    expect(refused(null)).toContain('objekt');
    expect(refused({...good, example: 'x'})).toContain('default, pappus, infinity, custom');
    expect(refused({...good, conic: 'cubic'})).toContain('ellipse, parabola, hyperbola, linePair');
    expect(refused({...good, indices: [1, 2]})).toContain('indices');
    expect(refused({...good, indices: [1.5, 1, 1, 1, 1, 1]})).toContain('indices[0] mora biti celo število');
    expect(refused({...good, indices: [-1, 1, 1, 1, 1, 1]})).toContain(`med 0 in ${DIRECTION_TABLE_SIZE - 1}`);
    expect(refused({...good, indices: [DIRECTION_TABLE_SIZE, 1, 1, 1, 1, 1]})).toContain('indices[0]');
    expect(refused({...PASCAL_EXAMPLES.default, conic: 'parabola', indices: [directionIndex(0, 1), 1, 1, 1, 1, 1]})).toContain('indices[0] določa smer');
    expect(refused({...good, order: [0, 1, 2, 3, 4, 4]})).toContain('vsako natanko enkrat');
    expect(refused({...good, order: [0, 1, 2, 3, 4, 6]})).toContain('vsako natanko enkrat');
    expect(refused({...good, order: 'natural'})).toContain('order');
    setLanguage('en');
    expect(refused({...good, order: [0, 1, 2, 3, 4, 4]})).toContain('each exactly once');
    expect(refused({...good, indices: [-1, 1, 1, 1, 1, 1]})).toContain('between 0 and');
    // an arbitrary permutation is fine; an edited named example becomes custom
    const odd = parsePascalModel({...good, order: [1, 0, 2, 3, 4, 5]});
    expect(odd.ok && odd.value.example).toBe('custom');
    expect(odd.ok && odd.value.order).toEqual([1, 0, 2, 3, 4, 5]);
});

test('the text of every example, conic and order is free of NaN in both languages', () => {
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        for (const id of PASCAL_CONIC_IDS) {
            for (const order of Object.values(PASCAL_ORDERS)) {
                const scene = evaluatePascal(custom({conic: id, indices: PASCAL_DEFAULT_INDICES[id], order}));
                const text = describePascal(scene, t);
                expect(JSON.stringify(text)).not.toMatch(/NaN|Infinity|undefined|null/);
                expect(text.status.length).toBeGreaterThan(10);
            }
        }
    }
});

test('handleOf falls back to the base point for an index that is not a finite point', () => {
    const model = custom({conic: 'parabola', indices: [directionIndex(0, 1), ...PASCAL_DEFAULT_INDICES.parabola.slice(1)]});
    expect(pointText(handleOf(model, 0))).toBe('(0, 0)');
});
