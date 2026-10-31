import {LinearMapGraph} from './LinearMapGraph';
import {linearMapPresetCollection} from './linearMapPresetCollection';
import {bezierPoint, FIXTURE_CONTROL_POINTS, gridPolyline, imageControlPoints, shoelace} from './linearMapScene';
import {LessonAction} from '../../learning/model';
import {DEFAULT_LINEAR_MAP_STATE, LinearMapState} from '../../linear/linearMapModel';
import {apply, det, IDENTITY, LINEAR_MAP_EXAMPLES, type Mat2, unitSquareImage} from '../../linear/matrix2';
import {setLanguage, t} from '../../localization';

const BOX = [-12, 9, 12, -9];

function fakeBoard() {
    const board: any = {
        objectsList: [] as any[],
        unitX: 50,
        canvasWidth: 700,
        create: vi.fn((type: string, parents: any[], attributes: any) => {
            const object: any = {type, board, parents, attributes, handlers: {} as Record<string, () => void>};
            if (type === 'point') {
                const free = parents.every((parent: unknown) => typeof parent === 'number');
                object.x = free ? parents[0] : undefined;
                object.y = free ? parents[1] : undefined;
                object.X = () => (free ? object.x : parents[0]());
                object.Y = () => (free ? object.y : parents[1]());
                object.moveTo = vi.fn(([x, y]: number[]) => { object.x = x; object.y = y; });
                object.on = vi.fn((event: string, handler: () => void) => { object.handlers[event] = handler; });
            }
            board.objectsList.push(object);
            return object;
        }),
        removeObject: vi.fn((objects: any) => {
            const list = Array.isArray(objects) ? objects : [objects];
            board.objectsList = board.objectsList.filter((object: any) => !list.includes(object));
        }),
        getBoundingBox: vi.fn(() => BOX),
        setBoundingBox: vi.fn(),
        fullUpdate: vi.fn(),
        update: vi.fn(),
    };
    return board;
}

/** A graph whose React state is NOT updated synchronously, exactly like setState inside one lesson tick. */
function makeGraph() {
    const graph = new LinearMapGraph() as any;
    graph.board = fakeBoard();
    const session: any = {
        isReady: true, isAlive: true, dispose: vi.fn(() => { session.isAlive = false; }), signal: new AbortController().signal,
        waitUntilReady: () => Promise.resolve(), beginTransition: () => () => undefined,
    };
    graph.graphSession = session;
    graph.boardUpdate = vi.fn();
    graph.setState = vi.fn();
    graph.initialize();
    return graph;
}

/** Makes the React state mirror the model (what the host does after a commit), so the inspector renders the current model. */
const flush = (graph: any) => { graph.store.setState({...graph.model}); };
const act = (graph: any, change: () => void) => { change(); flush(graph); };

const ofType = (graph: any, type: string) => graph.board.objectsList.filter((object: any) => object.type === type);
const points = (graph: any) => ofType(graph, 'point');
const curves = (graph: any) => ofType(graph, 'curve');
const at = (point: any) => [point.X(), point.Y()];
const [GRID_SOURCE, GRID_IMAGE] = [0, 1];
const [H1, H2] = [6, 7];
const caption = (graph: any) => graph.captionPlainLines();

function collect(node: any, found: Record<string, any[]> = {}) {
    if (!node || typeof node !== 'object') return found;
    if (Array.isArray(node)) { node.forEach(child => collect(child, found)); return found; }
    const name = typeof node.type === 'string' ? node.type : node.type?.name;
    if (name) (found[name] ??= []).push(node);
    collect(node.props?.children, found);
    return found;
}
const controls = (graph: any) => {
    const found = collect([graph.renderControls()]);
    const [x1, y1, x2, y2] = found.NumberInput;
    const button = (action: string) => found.button.find((element: any) => element.props['data-action'] === action);
    const selects = found.ChoiceSelect;
    return {x1, y1, x2, y2, button, selects, notices: (found.p ?? []).filter((p: any) => p.props['data-linear-map-notice']), found};
};
const statusIds = (graph: any) => (collect(graph.renderReadout()).p ?? []).filter((p: any) => p.props['data-linear-map-status']).map((p: any) => p.props['data-linear-map-status']);
const readout = (graph: any, id: string) => {
    const rows = collect(graph.renderReadout()).FunctionReadout[0].props.rows as {id: string; value: string}[];
    return rows.find(row => row.id === id)?.value;
};
const matrixOf = (graph: any): Mat2 => graph.model.matrix;
const setMatrix = (graph: any, matrix: Mat2) => act(graph, () => graph.commitModel({...graph.model, matrix, exampleId: 'custom'}));

/** Every coordinate the board holds for the curves (after updateDataArray) is finite except the NaN separators of the grid polylines. */
function nonFiniteCoordinates(graph: any): number {
    let bad = 0;
    for (const curve of curves(graph)) {
        if (typeof curve.updateDataArray === 'function') {
            curve.updateDataArray();
            for (const v of [...curve.dataX, ...curve.dataY]) if (!Number.isFinite(v) && !Number.isNaN(v)) bad++;
            // NaN may only be a separator: the entry before and after it is finite, and never at the ends.
            curve.dataX.forEach((v: number, i: number) => { if (Number.isNaN(v) && (i === 0 || !Number.isFinite(curve.dataX[i - 1]))) bad++; });
        } else {
            for (let s = 0; s <= 1; s += 0.125) {
                const x = curve.parents[0](s), y = curve.parents[1](s);
                if (!Number.isFinite(x) || !Number.isFinite(y)) bad++;
            }
        }
    }
    for (const point of points(graph)) if (!Number.isFinite(point.X()) || !Number.isFinite(point.Y())) bad++;
    return bad;
}

beforeEach(() => setLanguage('sl'));

describe('scene objects and ownership', () => {
    test('the default scene owns its objects and removes every one of them', () => {
        const graph = makeGraph();
        expect(graph.generatedObjectCount).toBeGreaterThan(10);
        expect(graph.board.objectsList.length).toBe(graph.generatedObjectCount);
        graph.removeGeneratedObjects();
        expect(graph.generatedObjectCount).toBe(0);
        expect(graph.board.objectsList).toHaveLength(0);
        expect(graph.handle1).toBeUndefined();
        expect(graph.handle2).toBeUndefined();
    });

    test('the grid image is drawn as one curve with NaN breaks and 26 finite segments', () => {
        const graph = makeGraph();
        setMatrix(graph, LINEAR_MAP_EXAMPLES['basis-default']);
        const image = curves(graph)[GRID_IMAGE];
        image.updateDataArray();
        expect(image.dataX).toHaveLength(26 * 3);
        expect(image.dataX.filter(Number.isNaN)).toHaveLength(26);
        // The line x = 0 is the segment through the images of (0, -6) and (0, 6): a2 times -6 and 6.
        const index = 6 * 3;
        expect([image.dataX[index], image.dataY[index]]).toEqual([6, -6]);
        expect([image.dataX[index + 1], image.dataY[index + 1]]).toEqual([-6, 6]);
        expect(curves(graph)[GRID_SOURCE].updateDataArray).toBeDefined();
        expect(nonFiniteCoordinates(graph)).toBe(0);
    });

    test('the image Bezier curve is the curve of the image control points (A B(1/2) = B_A(1/2)), without any curve-API transform', () => {
        const graph = makeGraph();
        setMatrix(graph, LINEAR_MAP_EXAMPLES['basis-default']);
        const control = imageControlPoints(matrixOf(graph));
        expect(control).toEqual([[2, 1], [1, 5], [6, 6], [11, 4]]);
        const imageCurve = curves(graph).at(-1);
        const half = [imageCurve.parents[0](0.5), imageCurve.parents[1](0.5)];
        const mapped = apply(matrixOf(graph), bezierPoint(FIXTURE_CONTROL_POINTS, 0.5));
        expect(half[0]).toBeCloseTo(mapped[0], 12);
        expect(half[1]).toBeCloseTo(mapped[1], 12);
        expect(half[0]).toBeCloseTo(17 / 4, 12);
        expect(half[1]).toBeCloseTo(19 / 4, 12);
    });
});

describe('handles and numeric entries', () => {
    test('dragging a handle snaps both coordinates to 1/4 and clamps to [-4, 4]; the handle follows the snapped position', () => {
        const graph = makeGraph();
        const handle = points(graph)[H1];
        expect(at(handle)).toEqual([1, 0]);
        handle.x = 2.13; handle.y = 0.9;
        handle.handlers.drag();
        expect(matrixOf(graph)).toEqual([[2.25, 0], [1, 1]]);
        expect(graph.model.exampleId).toBe('custom');
        expect(handle.moveTo).toHaveBeenLastCalledWith([2.25, 1]);
        const second = points(graph)[H2];
        second.x = -9; second.y = 7.9;
        second.handlers.drag();
        expect(matrixOf(graph)).toEqual([[2.25, -4], [1, 4]]);
        expect(second.moveTo).toHaveBeenLastCalledWith([-4, 4]);
        // The model was written once per event and the scene was not re-synchronised under the user's hand.
        expect(graph.model.matrix[0][1]).toBe(-4);
        // A non-finite drag position never reaches the model.
        second.x = Number.NaN;
        second.handlers.drag();
        expect(matrixOf(graph)).toEqual([[2.25, -4], [1, 4]]);
    });

    test('a numeric entry snaps and clamps, and a message explains it', () => {
        const graph = makeGraph();
        act(graph, () => controls(graph).x1.props.onChange(9));
        expect(matrixOf(graph)[0][0]).toBe(4);
        expect(controls(graph).notices[0].props['data-linear-map-notice']).toBe('clamped');
        const text = JSON.stringify(controls(graph).notices[0].props.children);
        expect(text).toContain('a₁: x');
        act(graph, () => controls(graph).y2.props.onChange(0.3));
        expect(matrixOf(graph)[1][1]).toBe(0.25);
        expect(controls(graph).notices[0].props['data-linear-map-notice']).toBe('snapped');
        // An exact entry clears the message.
        act(graph, () => controls(graph).y2.props.onChange(0.5));
        expect(controls(graph).notices).toHaveLength(0);
        expect(matrixOf(graph)[1][1]).toBe(0.5);
        // The field shows the stored (clamped) value.
        expect(controls(graph).x1.props.value).toBe(4);
        // Out-of-range and non-finite input never produce a non-finite entry.
        act(graph, () => controls(graph).x1.props.onChange(-1e9));
        expect(matrixOf(graph)[0][0]).toBe(-4);
        expect(graph.ignoreOutOfDomain(() => graph.setEntryFromInput(0, 0, Number.NaN))).toBe(false);
        expect(matrixOf(graph)[0][0]).toBe(-4);
    });

    test('the message is composed from the current language', () => {
        const graph = makeGraph();
        act(graph, () => controls(graph).x1.props.onChange(9));
        const sl = JSON.stringify(controls(graph).notices[0].props.children);
        setLanguage('en');
        const en = JSON.stringify(controls(graph).notices[0].props.children);
        expect(sl).toContain('zunaj območja');
        expect(en).toContain('outside');
    });
});

describe('Reset, examples and modes', () => {
    test('Reset restores the identity in the model, the fields, the handles and the image grid, and clears the message', () => {
        const graph = makeGraph();
        act(graph, () => controls(graph).x1.props.onChange(9));
        act(graph, () => graph.setExample('basis-default'));
        setMatrix(graph, [[2, -1], [1, 1]]);
        act(graph, () => controls(graph).button('linear-map-reset').props.onClick());
        expect(matrixOf(graph)).toEqual(IDENTITY);
        expect(graph.model.exampleId).toBe('identity');
        const c = controls(graph);
        expect([c.x1, c.y1, c.x2, c.y2].map(input => input.props.value)).toEqual([1, 0, 0, 1]);
        expect(c.selects[0].props.value).toBe('identity');
        expect(c.notices).toHaveLength(0);
        expect([at(points(graph)[H1]), at(points(graph)[H2])]).toEqual([[1, 0], [0, 1]]);
        const image = curves(graph)[GRID_IMAGE];
        image.updateDataArray();
        const identity = gridPolyline(IDENTITY);
        expect(image.dataX).toEqual(identity.x);
        expect(image.dataY).toEqual(identity.y);
        expect(readout(graph, 'a1')).toBe('(1, 0)');
    });

    test('Reset keeps the mode and the display switches', () => {
        const graph = makeGraph();
        act(graph, () => graph.setMode('determinant'));
        act(graph, () => graph.setToggle('curveVisible', false));
        setMatrix(graph, [[2, 1], [0, 1]]);
        act(graph, () => graph.resetToIdentity());
        expect(graph.model).toMatchObject({mode: 'determinant', curveVisible: false, exampleId: 'identity'});
    });

    test('changing the mode keeps the matrix, the handles and the example', () => {
        const graph = makeGraph();
        act(graph, () => graph.setExample('orientation-reversing'));
        act(graph, () => controls(graph).selects[1].props.onChange('determinant'));
        expect(graph.model.mode).toBe('determinant');
        expect(matrixOf(graph)).toEqual([[1, 2], [2, 1]]);
        expect(graph.model.exampleId).toBe('orientation-reversing');
        expect(at(points(graph)[H1])).toEqual([1, 2]);
        expect(readout(graph, 'det')).toBe('−3');
        act(graph, () => controls(graph).selects[1].props.onChange('basis'));
        expect(matrixOf(graph)).toEqual([[1, 2], [2, 1]]);
        expect(readout(graph, 'det')).toBeUndefined();
    });

    test('the default numbers match the lesson: A(1,1) = (1,2), det 3, shoelace 3, B has det -3 and reversed order', () => {
        const graph = makeGraph();
        act(graph, () => graph.setMode('determinant'));
        act(graph, () => graph.setExample('basis-default'));
        expect(readout(graph, 'probe')).toBe('(1, 2)');
        expect(readout(graph, 'det')).toBe('3');
        expect(readout(graph, 'area')).toBe('3');
        expect(readout(graph, 'det-formula')).toBe('a·d − b·c = 2·1 − (−1)·1 = 3');
        expect(statusIds(graph)).toEqual(['positive']);
        expect(shoelace(unitSquareImage(matrixOf(graph)))).toBe(3);
        act(graph, () => graph.setExample('orientation-reversing'));
        expect(readout(graph, 'det')).toBe('−3');
        expect(readout(graph, 'area')).toBe('3');
        expect(readout(graph, 'orientation')).toBe('obrnjena');
        expect(statusIds(graph)).toEqual(['negative']);
        expect(shoelace(unitSquareImage(matrixOf(graph)))).toBe(-3);
    });
});

describe('singular and thin matrices', () => {
    test('det 0 is accepted, drawn collapsed with finite coordinates, named in words, and never positive or negative', () => {
        const graph = makeGraph();
        act(graph, () => graph.setMode('determinant'));
        act(graph, () => graph.setExample('singular'));
        expect(det(matrixOf(graph))).toBe(0);
        expect(statusIds(graph)).toEqual(['zero', 'collapse-line']);
        expect(readout(graph, 'det')).toBe('0');
        expect(readout(graph, 'orientation')).toBe('ni določena');
        expect(nonFiniteCoordinates(graph)).toBe(0);
        // The square lands on the segment from (0,0) to (3, 3/2).
        expect(unitSquareImage(matrixOf(graph)).map(p => p.slice())).toEqual([[0, 0], [1, 0.5], [3, 1.5], [2, 1]]);
        // No inverse anywhere in the readout or the statuses.
        expect(JSON.stringify(collect(graph.renderReadout()).FunctionReadout[0].props.rows)).not.toMatch(/inverz|inverse/i);
    });

    test('the zero matrix collapses to a point, with finite coordinates in both modes', () => {
        const graph = makeGraph();
        setMatrix(graph, [[0, 0], [0, 0]]);
        expect(statusIds(graph)).toEqual(['collapse-point']);
        expect(nonFiniteCoordinates(graph)).toBe(0);
        act(graph, () => graph.setMode('determinant'));
        expect(statusIds(graph)).toEqual(['zero', 'collapse-point']);
        expect(readout(graph, 'area')).toBe('0');
        expect(nonFiniteCoordinates(graph)).toBe(0);
        expect(caption(graph).join(' ')).toContain('det A = 0');
    });

    test('det = +-1/16 draws a thin but non-degenerate parallelogram', () => {
        for (const [matrix, sign, status] of [[[[0.25, 0], [0, 0.25]], 1, 'positive'], [[[0.25, 0], [0, -0.25]], -1, 'negative']] as const) {
            const graph = makeGraph();
            act(graph, () => graph.setMode('determinant'));
            setMatrix(graph, matrix as unknown as Mat2);
            expect(det(matrixOf(graph))).toBe(sign / 16);
            expect(readout(graph, 'det')).toBe(sign > 0 ? '0,0625' : '−0,0625');
            expect(readout(graph, 'det-formula')).toMatch(sign > 0 ? / = 0,0625$/ : / = −0,0625$/);
            expect(statusIds(graph)).toEqual([status]);
            expect(Math.abs(shoelace(unitSquareImage(matrixOf(graph))))).toBe(1 / 16);
            expect(nonFiniteCoordinates(graph)).toBe(0);
        }
    });

    test('the orientation sign flips exactly when a2 crosses the line through a1 (quarter-grid sweep)', () => {
        const graph = makeGraph();
        const signs: number[] = [];
        for (let y = -1; y <= 1; y += 0.25) {
            setMatrix(graph, [[2, 1], [1, y]]);
            signs.push(Math.sign(graph.viewOf(graph.model).determinant));
        }
        // det = 2y - 1: negative below y = 1/2, zero at y = 1/2, positive above.
        expect(signs).toEqual([-1, -1, -1, -1, -1, -1, 0, 1, 1]);
    });
});

describe('Presets', () => {
    const stored = (state: LinearMapState = DEFAULT_LINEAR_MAP_STATE) => JSON.parse(JSON.stringify(state));

    test('round trip: export, check with the collection, import into a fresh graph restores the model, the fields, the handles and the grid', () => {
        const graph = makeGraph();
        act(graph, () => graph.setMode('determinant'));
        act(graph, () => graph.setExample('basis-default'));
        act(graph, () => graph.setToggle('probeVisible', false));
        const exported = JSON.parse(JSON.stringify(graph.exportPresetData()));
        expect(Object.keys(exported).sort()).toEqual(
            ['curveVisible', 'exampleId', 'matrix', 'mode', 'probeVisible', 'squareVisible', 'testAngle']);
        const checked = linearMapPresetCollection.check(exported);
        expect('data' in checked).toBe(true);
        const fresh = makeGraph();
        act(fresh, () => fresh.importPresetData((checked as { data: LinearMapState }).data));
        expect(fresh.model).toEqual(graph.model);
        const c = controls(fresh);
        expect([c.x1, c.y1, c.x2, c.y2].map(input => input.props.value)).toEqual([2, 1, -1, 1]);
        expect(c.selects[0].props.value).toBe('basis-default');
        expect(c.selects[1].props.value).toBe('determinant');
        expect([at(points(fresh)[H1]), at(points(fresh)[H2])]).toEqual([[2, 1], [-1, 1]]);
        expect(readout(fresh, 'det')).toBe('3');
        const image = curves(fresh)[GRID_IMAGE];
        image.updateDataArray();
        expect(image.dataX).toEqual(gridPolyline([[2, -1], [1, 1]]).x);
    });

    test('importing replaces a previous message and moves the handles', () => {
        const graph = makeGraph();
        act(graph, () => controls(graph).x1.props.onChange(9));
        act(graph, () => graph.importPresetData({...DEFAULT_LINEAR_MAP_STATE, matrix: [[1, 2], [2, 1]], exampleId: 'orientation-reversing'}));
        expect(controls(graph).notices).toHaveLength(0);
        expect(at(points(graph)[H1])).toEqual([1, 2]);
    });

    test.each([
        ['an off-grid entry', {...stored(), matrix: [[0.3, 0], [0, 1]]}, 'linear_map_invalid_entry'],
        ['an entry outside [-4, 4]', {...stored(), matrix: [[5, 0], [0, 1]]}, 'linear_map_invalid_entry'],
        ['a non-finite entry', {...stored(), matrix: [[null, 0], [0, 1]]}, 'linear_map_invalid_entry'],
        ['a wrong matrix shape', {...stored(), matrix: [1, 0, 0, 1]}, 'linear_map_invalid_entry'],
        ['an unknown mode', {...stored(), mode: 'shear'}, 'linear_map_invalid_field'],
        ['a missing toggle', (() => { const s = stored(); delete s.curveVisible; return s; })(), 'linear_map_invalid_field'],
        ['an unknown example', {...stored(), exampleId: 'nonsense'}, 'linear_map_invalid_field'],
        ['a string', 'matrix', 'linear_map_invalid_data'],
        ['an array', [], 'linear_map_invalid_data'],
    ])('a malformed import is rejected with a localized, actionable reason: %s', (_name, data, key) => {
        const checked = linearMapPresetCollection.check(data);
        expect('rejection' in checked).toBe(true);
        const rejection = (checked as { rejection: { key: string; params: Record<string, unknown> } }).rejection;
        expect(rejection.key).toBe(key);
    });

    test('a rejection names the offending field in both languages', () => {
        const checked = linearMapPresetCollection.check({...stored(), matrix: [[1, 0], [0, 7]]}) as { rejection: { key: 'linear_map_invalid_entry'; params: { value0: string } } };
        expect(checked.rejection.params.value0).toBe('matrix[1][1]');
        expect(t(checked.rejection.key, {value0: checked.rejection.params.value0})).toContain('matrix[1][1]');
        setLanguage('en');
        expect(t(checked.rejection.key, {value0: 'matrix[1][1]'})).toMatch(/^invalid linear map data/);
    });

    test('derived fields in stored data are ignored and never restored', () => {
        const checked = linearMapPresetCollection.check({...stored(), determinant: 99, area: 5}) as { data: LinearMapState };
        expect(checked.data).not.toHaveProperty('determinant');
    });
});

describe('lesson actions', () => {
    // Loose helper for invalid-data tests only; valid actions below are written as typed literals.
    const bad = (action: object): LessonAction => ({kind: 'linear-map', ...action}) as unknown as LessonAction;

    test('are registered through the lesson-action registry and chain in one synchronous tick', () => {
        const graph = makeGraph();
        // Several actions in one tick, checking the model after each (the React state is behind, the model is not).
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-example', exampleId: 'basis-default'});
        expect(graph.model).toMatchObject({exampleId: 'basis-default'});
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-mode', mode: 'determinant'});
        expect(graph.model).toMatchObject({mode: 'determinant', exampleId: 'basis-default'});
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-matrix', matrix: [[1, 2], [2, 1]]});
        expect(graph.model).toMatchObject({matrix: [[1, 2], [2, 1]], mode: 'determinant', exampleId: 'custom'});
        expect(at(points(graph)[H1])).toEqual([1, 2]);
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-test-vector', angle: 45});
        expect(graph.model).toMatchObject({testAngle: 45, matrix: [[1, 2], [2, 1]]});
        graph.applyLessonAction({kind: 'linear-map', operation: 'set-matrix', matrix: [[0, 1], [1, 0]], target: 'secondMatrix'});
        expect(graph.model.secondMatrix).toEqual([[0, 1], [1, 0]]);
        expect(graph.model.matrix).toEqual([[1, 2], [2, 1]]);
    });

    test('invalid scene data is a lesson-content error naming the field; nothing is snapped', () => {
        const graph = makeGraph();
        expect(() => graph.applyLessonAction({kind: 'linear-map', operation: 'set-matrix', matrix: [[0.3, 0], [0, 1]]})).toThrow(/matrix\[0\]\[0\]/);
        expect(() => graph.applyLessonAction(bad({operation: 'set-mode', mode: 'nope'}))).toThrow(/mode/);
        expect(() => graph.applyLessonAction(bad({operation: 'set-example', exampleId: 'zzz'}))).toThrow(/exampleId/);
        expect(matrixOf(graph)).toEqual(IDENTITY);
    });
});

describe('language switch', () => {
    test('board captions, labels, statuses, readout rows and the legend follow the language', () => {
        const graph = makeGraph();
        act(graph, () => graph.setMode('determinant'));
        act(graph, () => graph.setExample('orientation-reversing'));
        expect(caption(graph).join('|')).toContain('Orientacija: obrnjena');
        expect(readout(graph, 'orientation')).toBe('obrnjena');
        expect(readout(graph, 'a1')).toBe('(1, 2)');
        const slRows = JSON.stringify(collect(graph.renderReadout()).FunctionReadout[0].props.rows);
        const slStatus = JSON.stringify(collect(graph.renderReadout()).p);
        setLanguage('en');
        expect(caption(graph).join('|')).toContain('Orientation: reversed');
        expect(readout(graph, 'orientation')).toBe('reversed');
        expect(JSON.stringify(collect(graph.renderReadout()).FunctionReadout[0].props.rows)).not.toBe(slRows);
        expect(JSON.stringify(collect(graph.renderReadout()).p)).not.toBe(slStatus);
        expect(JSON.stringify(collect(graph.renderReadout()).p)).toContain('reversed');
        const select = controls(graph).selects[0];
        expect(select.props.label).toBe('Example matrix');
        expect(select.props.options.map((option: any) => option.text)).toContain('B: reversed orientation');
        // Decimal separator follows the language: 1/4 is 0,25 in Slovenian and 0.25 in English.
        act(graph, () => controls(graph).x1.props.onChange(0.25));
        expect(caption(graph)[0]).toContain('(0.25, 2)');
        setLanguage('sl');
        expect(caption(graph)[0]).toContain('(0,25, 2)');
    });
});
