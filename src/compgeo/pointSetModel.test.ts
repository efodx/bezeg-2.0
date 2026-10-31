import {describe, expect, it} from 'vitest';
import {GRID_COORD_LIMIT} from './grid';
import {
    addPoint, clearPoints, EMPTY_POINT_SET_MODEL, gridToBoard, insertPoint, movePoint, nudgePoint, parsePointSetModel,
    PointSetModel, removePoint, reverseVertices, serializePointSetModel, setClosed, setMode, snapToGrid,
} from './pointSetModel';

const pts = (...xy: number[][]) => xy.map(([x, y]) => ({x, y}));
const poly = (...xy: number[][]): PointSetModel => ({mode: 'polygon', points: pts(...xy), closed: false, gridStepExponent: 0});
const model = (r: ReturnType<typeof addPoint>): PointSetModel => {
    if (!r.ok) throw new Error(r.reason);
    return r.model;
};

describe('edits', () => {
    it('adds points, allows duplicates and refuses at the limit', () => {
        let m = model(addPoint(EMPTY_POINT_SET_MODEL, {x: 1, y: 2}));
        m = model(addPoint(m, {x: 1, y: 2}));
        expect(m.points).toEqual(pts([1, 2], [1, 2]));
        expect(addPoint(m, {x: 0, y: 0}, {pointLimit: 2})).toEqual({ok: false, reason: 'limit'});
        let full = EMPTY_POINT_SET_MODEL;
        for (let i = 0; i < 40; i++) full = model(addPoint(full, {x: i, y: 0}));
        expect(addPoint(full, {x: 0, y: 0})).toEqual({ok: false, reason: 'limit'});
        expect(addPoint(EMPTY_POINT_SET_MODEL, {x: GRID_COORD_LIMIT + 1, y: 0})).toEqual({ok: false, reason: 'range'});
    });

    it('inserts in polygon mode only, with index and limit refusals', () => {
        const m = poly([0, 0], [4, 0]);
        expect(model(insertPoint(m, 1, {x: 2, y: 2})).points).toEqual(pts([0, 0], [2, 2], [4, 0]));
        expect(model(insertPoint(m, 2, {x: 2, y: 2})).points.length).toBe(3);
        expect(insertPoint(m, 3, {x: 2, y: 2})).toEqual({ok: false, reason: 'index'});
        expect(insertPoint(m, -1, {x: 2, y: 2})).toEqual({ok: false, reason: 'index'});
        expect(insertPoint(m, 1, {x: 2, y: 2}, {pointLimit: 2})).toEqual({ok: false, reason: 'limit'});
        expect(insertPoint({...m, mode: 'points'}, 1, {x: 2, y: 2})).toEqual({ok: false, reason: 'mode'});
        expect(insertPoint(m, 1, {x: 1.5, y: 2})).toEqual({ok: false, reason: 'range'});
    });

    it('removes, moves and nudges with index and range refusals', () => {
        const m = poly([0, 0], [4, 0], [2, 2]);
        expect(model(removePoint(m, 1)).points).toEqual(pts([0, 0], [2, 2]));
        expect(removePoint(m, 3)).toEqual({ok: false, reason: 'index'});
        expect(model(movePoint(m, 2, {x: 9, y: 9})).points[2]).toEqual({x: 9, y: 9});
        expect(movePoint(m, 5, {x: 0, y: 0})).toEqual({ok: false, reason: 'index'});
        expect(movePoint(m, 0, {x: 0, y: -GRID_COORD_LIMIT - 1})).toEqual({ok: false, reason: 'range'});
        expect(model(nudgePoint(m, 0, -3, 2)).points[0]).toEqual({x: -3, y: 2});
        expect(nudgePoint(m, 9, 1, 1)).toEqual({ok: false, reason: 'index'});
        expect(nudgePoint(m, 0, 0.5, 0)).toEqual({ok: false, reason: 'range'});
        const edge = poly([GRID_COORD_LIMIT, 0]);
        expect(nudgePoint(edge, 0, 1, 0)).toEqual({ok: false, reason: 'range'});
        expect(model(nudgePoint(edge, 0, -1, 0)).points[0].x).toBe(GRID_COORD_LIMIT - 1);
    });

    it('clears, closes and switches mode', () => {
        const m = {...poly([0, 0], [1, 1], [2, 0]), closed: true};
        expect(clearPoints(m)).toEqual({...m, points: [], closed: false});
        expect(setClosed(poly([0, 0]), true)).toEqual({ok: true, model: {...poly([0, 0]), closed: true}});
        expect(setClosed(m, false)).toEqual({ok: true, model: {...m, closed: false}});
        expect(setClosed({...m, mode: 'points', closed: false}, true)).toEqual({ok: false, reason: 'mode'});
        expect(setMode(m, 'points')).toEqual({...m, mode: 'points', closed: false});
        expect(setMode(m, 'polygon').points).toEqual(m.points);
    });

    it('does not mutate models or arrays', () => {
        const m = poly([0, 0], [4, 0], [2, 2]);
        const frozen = JSON.stringify(m);
        const edits = [addPoint(m, {x: 1, y: 1}), insertPoint(m, 1, {x: 1, y: 1}), removePoint(m, 0),
            movePoint(m, 0, {x: 5, y: 5}), nudgePoint(m, 0, 1, 1), setClosed(m, true)];
        edits.forEach(r => expect(r.ok).toBe(true));
        clearPoints(m); setMode(m, 'points');
        expect(JSON.stringify(m)).toBe(frozen);
        const a = pts([0, 0]);
        const moved = model(movePoint({...m, points: a}, 0, {x: 3, y: 3}));
        expect(a).toEqual(pts([0, 0]));
        expect(moved.points).not.toBe(a);
        const input = {x: 7, y: 8};
        const added = model(addPoint(m, input));
        expect(added.points[3]).not.toBe(input);
    });
});

describe('snapping', () => {
    it('rounds half away from zero with exponent 0', () => {
        expect(snapToGrid(0.5, -0.5, 0)).toEqual({x: 1, y: -1});
        expect(snapToGrid(1.5, 2.5, 0)).toEqual({x: 2, y: 3});
        expect(snapToGrid(-1.5, -2.4, 0)).toEqual({x: -2, y: -2});
        expect(snapToGrid(-0.2, 0.2, 0)).toEqual({x: 0, y: 0});
        expect(Object.is(snapToGrid(-0.2, 0, 0).x, 0)).toBe(true);
    });

    it('snaps with exponent -2 (step 0.25)', () => {
        expect(snapToGrid(0.125, -0.125, -2)).toEqual({x: 1, y: -1});
        expect(snapToGrid(0.6, -0.6, -2)).toEqual({x: 2, y: -2});
        expect(snapToGrid(-0.375, 0.37, -2)).toEqual({x: -2, y: 1});
        expect(gridToBoard({x: 3, y: -5}, -2)).toEqual({x: 0.75, y: -1.25});
        expect(gridToBoard({x: 3, y: -5}, 2)).toEqual({x: 12, y: -20});
    });
});

describe('parsePointSetModel', () => {
    const base = {mode: 'polygon', points: [{x: 1, y: 2}, {x: -3, y: 4}], closed: true, gridStepExponent: -2};

    it('round-trips serialization and drops unknown properties', () => {
        const m: PointSetModel = {mode: 'polygon', points: pts([1, 2], [-3, 4]), closed: true, gridStepExponent: -2};
        const r = parsePointSetModel(JSON.parse(JSON.stringify(serializePointSetModel(m))));
        expect(r).toEqual({ok: true, model: m});
        const dirty = parsePointSetModel({...base, extra: 1, points: [{x: 1, y: 2, z: 3}]});
        expect(dirty.ok && Object.keys(dirty.model).sort()).toEqual(['closed', 'gridStepExponent', 'mode', 'points']);
        expect(dirty.ok && dirty.model.points[0]).toEqual({x: 1, y: 2});
    });

    it('defaults closed and grid step when missing and honours the limit option', () => {
        expect(parsePointSetModel({mode: 'points', points: []})).toEqual({ok: true, model: EMPTY_POINT_SET_MODEL});
        expect(parsePointSetModel({...base}, {pointLimit: 1})).toEqual({ok: false, reason: 'too-many-points', limit: 1});
    });

    it('refuses with each reason', () => {
        for (const bad of [null, 3, 'x', [], undefined]) expect(parsePointSetModel(bad)).toEqual({ok: false, reason: 'not-an-object'});
        expect(parsePointSetModel({...base, mode: 'lines'})).toEqual({ok: false, reason: 'unknown-mode'});
        expect(parsePointSetModel({...base, points: {}})).toEqual({ok: false, reason: 'points-not-array'});
        const many = Array.from({length: 41}, (_, i) => ({x: i, y: 0}));
        expect(parsePointSetModel({...base, points: many})).toEqual({ok: false, reason: 'too-many-points', limit: 40});
        expect(parsePointSetModel({...base, points: [null]})).toEqual({ok: false, reason: 'point-not-object'});
        for (const c of [1.5, NaN, Infinity, '1', undefined, null]) {
            expect(parsePointSetModel({...base, points: [{x: c, y: 0}]})).toEqual({ok: false, reason: 'non-integer-coordinate'});
            expect(parsePointSetModel({...base, points: [{x: 0, y: c}]})).toEqual({ok: false, reason: 'non-integer-coordinate'});
        }
        for (const c of [2 ** 25 + 1, -(2 ** 25) - 1, 1e20]) {
            expect(parsePointSetModel({...base, points: [{x: 0, y: c}]}))
                .toEqual({ok: false, reason: 'coordinate-out-of-range', bound: 2 ** 25});
        }
        expect(parsePointSetModel({...base, points: [{x: 2 ** 25, y: -(2 ** 25)}]}).ok).toBe(true);
        for (const e of [0.5, 9, -9, '0', NaN, null]) {
            expect(parsePointSetModel({...base, gridStepExponent: e})).toEqual({ok: false, reason: 'invalid-grid-step'});
        }
        expect(parsePointSetModel({...base, gridStepExponent: 8}).ok).toBe(true);
        expect(parsePointSetModel({...base, gridStepExponent: -8}).ok).toBe(true);
        expect(parsePointSetModel({...base, closed: 'yes'})).toEqual({ok: false, reason: 'closed-not-boolean'});
        expect(parsePointSetModel({...base, mode: 'points'})).toEqual({ok: false, reason: 'closed-in-points-mode'});
        expect(parsePointSetModel({...base, mode: 'points', closed: false}).ok).toBe(true);
    });
});

describe('reverseVertices', () => {
    const closedPoly: PointSetModel = {...poly([0, 0], [4, 0], [4, 3], [0, 3]), closed: true, gridStepExponent: 2};

    it('keeps the first vertex, reverses the rest and keeps everything else', () => {
        const r = reverseVertices(closedPoly);
        expect(r.points).toEqual(pts([0, 0], [0, 3], [4, 3], [4, 0]));
        expect(r).toMatchObject({mode: 'polygon', closed: true, gridStepExponent: 2});
    });

    it('is an involution, does not mutate and leaves short models unchanged', () => {
        const before = JSON.stringify(closedPoly);
        expect(reverseVertices(reverseVertices(closedPoly))).toEqual(closedPoly);
        expect(JSON.stringify(closedPoly)).toBe(before);
        const one = poly([1, 1]);
        expect(reverseVertices(one)).toEqual(one);
        expect(reverseVertices(EMPTY_POINT_SET_MODEL).points).toEqual([]);
    });
});
