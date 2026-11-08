import {constrainPoint, stepPoint} from '../graphs/base/points';
import {GRID_COORD_LIMIT} from './grid';
import {addPoint, movePoint, nudgePoint, removePoint, PointSetModel} from './pointSetModel';

const model: PointSetModel = {mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 1, y: 1}]};
const bounds = {x: [-GRID_COORD_LIMIT, GRID_COORD_LIMIT] as const, y: [-GRID_COORD_LIMIT, GRID_COORD_LIMIT] as const};

// The graph clamps a drag or key with the shared rules before the edit; the model's own refusals are unchanged.
describe('the coordinate-limit clamp in front of the model edits', () => {
    test.each([
        ['upper x', {x: GRID_COORD_LIMIT + 5, y: 0}, {x: GRID_COORD_LIMIT, y: 0}],
        ['lower x', {x: -GRID_COORD_LIMIT - 5, y: 0}, {x: -GRID_COORD_LIMIT, y: 0}],
        ['upper y', {x: 0, y: GRID_COORD_LIMIT + 1}, {x: 0, y: GRID_COORD_LIMIT}],
        ['lower y', {x: 0, y: -GRID_COORD_LIMIT - 1}, {x: 0, y: -GRID_COORD_LIMIT}],
    ])('a drag past the %s limit stops at it and the edit is accepted', (_name, raw, expected) => {
        const [x, y] = constrainPoint([raw.x, raw.y], {bounds});
        expect({x, y}).toEqual(expected);
        expect(movePoint(model, 0, {x, y}).ok).toBe(true);
        expect(movePoint(model, 0, raw)).toEqual({ok: false, reason: 'range'});
    });

    test('a key step at the limit stays on it; the model still refuses a nudge past it', () => {
        const at: PointSetModel = {...model, points: [{x: GRID_COORD_LIMIT, y: -GRID_COORD_LIMIT}, ...model.points.slice(1)]};
        const [x, y] = stepPoint([GRID_COORD_LIMIT, -GRID_COORD_LIMIT], [10, -10], {bounds});
        expect([x, y]).toEqual([GRID_COORD_LIMIT, -GRID_COORD_LIMIT]);
        expect(movePoint(at, 0, {x, y}).ok).toBe(true);
        expect(nudgePoint(at, 0, 1, 0)).toEqual({ok: false, reason: 'range'});
    });

    test('add, remove and in-range moves are unchanged', () => {
        expect(addPoint(model, {x: 5, y: 5}).ok).toBe(true);
        expect(addPoint(model, {x: GRID_COORD_LIMIT + 1, y: 0})).toEqual({ok: false, reason: 'range'});
        expect(removePoint(model, 0).ok).toBe(true);
        const moved = movePoint(model, 1, {x: 3, y: 4});
        expect(moved.ok && moved.model.points).toEqual([{x: 0, y: 0}, {x: 3, y: 4}]);
    });
});
