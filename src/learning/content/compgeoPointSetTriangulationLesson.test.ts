import {act} from '@testing-library/react';
import {
    compgeoGuidedLessons, TRI_DELAUNAY, TRI_EXAMPLE_POINTS, TRI_FLIP_EDGE, TRI_INSIDE_POINT, TRI_NINE_POINTS, TRI_OUTSIDE_POINT, TRI_REFUSED_EDGE, TRI_T0,
} from './compgeoGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {type LessonAction, UnsupportedLessonActionError} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {TriangulationGraph} from '../../graphs/compgeo/TriangulationGraph';
import {EarClippingGraph} from '../../graphs/compgeo/EarClippingGraph';
import {HullTraceGraph, HULL_TRACE_SAMPLE_1} from '../../graphs/compgeo/HullTraceGraph';
import {TRIANGULATION_DELAUNAY, TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_T0} from '../../graphs/compgeo/triangulationPresetCollection';
import {delaunayTriangulation, angleVector} from '../../compgeo/delaunay';
import {createTriangulation, flip, triangulationCounts} from '../../compgeo/triangulation';
import {boundaryCount} from '../../compgeo/pointInsertion';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('point-set-triangulation')!;
const stepOf = (stepId: string) => lesson().steps.find(step => step.id === stepId)!;
const sceneOf = (stepId: string): LessonAction[] => stepOf(stepId).scene!.actions as LessonAction[];
const STEPS = ['tri-points', 'tri-predict', 'tri-t0', 'tri-flip', 'tri-add', 'tri-delaunay', 'tri-nine'];
const dom = (name: string) => document.querySelector(`[data-triangulation="readout"] [data-readout="${name}"]`)?.textContent;
const sortedTriples = (list: readonly (readonly number[])[]) => list.map(tri => [...tri].sort((a, b) => a - b).join(',')).sort();
const grid = (list: readonly (readonly number[])[]) => list.map(([x, y]) => ({x, y}));

/** A mounted triangulation graph; `scene` applies a step the way a lesson session does, in one synchronous act. */
function mountTri() {
    const graph = new TriangulationGraph();
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, checkpoint,
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneOf(stepId)) capabilities.apply(action);
        }),
        /** The next scene without the checkpoint restore, to see that actions alone replace the previous scene. */
        sceneOnly: (stepId: string) => act(() => { for (const action of sceneOf(stepId)) capabilities.apply(action); }),
    };
}
type Mounted = ReturnType<typeof mountTri>;
const readout = (h: Mounted) => h.graph.readout()!;
const shown = (h: Mounted) => ['triangulation', 'edges', 'angles'].map(name => h.graph.overlayShown(name as 'triangulation'));

test('the lesson data equals the kernel: T0, the Delaunay triangulation, the example and the nine hull points', () => {
    expect(TRI_EXAMPLE_POINTS).toEqual(TRIANGULATION_EXAMPLE_POINTS.points.map(p => [p.x, p.y]));
    expect(TRI_T0).toEqual(TRIANGULATION_T0);
    expect(sortedTriples(TRI_DELAUNAY)).toEqual(sortedTriples(TRIANGULATION_DELAUNAY));
    const kernel = delaunayTriangulation(grid(TRI_EXAMPLE_POINTS));
    if (!kernel.ok) throw new Error('delaunay');
    expect(sortedTriples(TRI_DELAUNAY)).toEqual(sortedTriples(kernel.value.triangles));
    expect(TRI_NINE_POINTS).toEqual(HULL_TRACE_SAMPLE_1.points.map(p => [p.x, p.y]));
    expect(compgeoGuidedLessons.map(l => l.demonstrationId)).toContain('point-set-triangulation');
});

test('the seven scenes show the overlays the text relies on, and step 1 and 2 keep the triangulation hidden', () => {
    const h = mountTri();
    try {
        const seen = STEPS.map(stepId => { h.scene(stepId); return [h.graph.model.points.length, ...shown(h)] as const; });
        expect(seen).toEqual([
            [7, false, false, false],
            [7, false, false, false],
            [7, true, false, true],
            [7, true, true, true],
            [9, true, false, false],
            [7, true, false, true],
            [9, true, false, true],
        ]);
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 3: T0 has 7 triangles, 13 edges, 8 interior, 5 on the hull, k = 5, 2n-2-k = 7 and smallest angle 1,91', () => {
    const h = mountTri();
    try {
        h.scene('tri-t0');
        const r = readout(h);
        expect(r.counts).toEqual({points: 7, triangles: 7, edges: 13, interiorEdges: 8, hullEdges: 5});
        expect([r.n, r.boundary.k, 2 * r.n - 2 - r.boundary.k]).toEqual([7, 5, 7]);
        expect(r.minAngle.toFixed(2)).toBe('1.91');
        expect(dom('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
        expect(dom('angle')).toBe('Najmanjši kot zdaj: 1,91°');
        expect(sortedTriples(h.graph.triangles)).toEqual(sortedTriples(TRI_T0));
        // The prose quotes the degree sign with the decimal comma, in both languages.
        expect(stepOf('tri-t0').body.sl).toContain('\\(1{,}91^\\circ\\)');
        expect(stepOf('tri-t0').body.en).toContain('\\(1.91^\\circ\\)');
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 4: the flip of P2-P5 keeps 7/13/8 and changes the triangles; P2-P7 is selected and a Flip press is refused as not convex', () => {
    const h = mountTri();
    try {
        h.scene('tri-t0');
        const before = sortedTriples(h.graph.triangles);
        h.scene('tri-flip');
        const r = readout(h);
        expect(r.counts).toEqual({points: 7, triangles: 7, edges: 13, interiorEdges: 8, hullEdges: 5});
        expect(sortedTriples(h.graph.triangles)).not.toEqual(before);
        // P2-P5 is index [1, 4]: the flip removed it and created P1-P6.
        const t0 = createTriangulation(grid(TRI_EXAMPLE_POINTS), TRI_T0.map(t => [...t]));
        if (!t0.ok) throw new Error('t0');
        const flipped = flip(t0.value, TRI_FLIP_EDGE);
        expect(flipped.ok).toBe(true);
        expect(sortedTriples(h.graph.triangles)).toEqual(sortedTriples(flipped.ok ? flipped.value.triangles : []));
        const tri = createTriangulation(grid(TRI_EXAMPLE_POINTS), h.graph.triangles.map(t => [...t]));
        if (!tri.ok) throw new Error('triangulation');
        expect(h.graph.selectedEdge()).toMatchObject({a: TRI_REFUSED_EDGE[0], b: TRI_REFUSED_EDGE[1], interior: true});
        const refusal = flip(tri.value, TRI_REFUSED_EDGE);
        expect(!refusal.ok && refusal.refusal.kind).toBe('not-convex');
        // The Flip button is what the text asks for: it states the reason and changes nothing.
        const triangles = h.graph.triangles;
        act(() => { document.querySelector<HTMLButtonElement>('[data-action="flip-edge"]')!.click(); });
        expect(document.querySelector('[data-triangulation="event"]')?.textContent)
            .toBe('Rob P2–P7 ni mogoče zamenjati: trikotnika ob njem ne tvorita izbočenega štirikotnika. Nič se ni spremenilo.');
        expect(h.graph.triangles).toEqual(triangles);
        expect(readout(h).counts).toEqual(r.counts);
        // The refused edge is named in the text with the panel's one-based labels.
        for (const language of ['sl', 'en'] as const) expect(stepOf('tri-flip').body[language]).toContain('\\(P_2P_7\\)');
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 5: an inside point adds 2 triangles, an outside point adds 1 (one visible hull side); n = 9, k = 6, 10 triangles', () => {
    const h = mountTri();
    try {
        h.scene('tri-t0');
        expect(readout(h).counts.triangles).toBe(7);
        const withInside = [...TRI_EXAMPLE_POINTS, TRI_INSIDE_POINT];
        act(() => { h.capabilities.apply({kind: 'point-set', operation: 'set-points', mode: 'points', points: withInside}); });
        expect(readout(h).counts).toMatchObject({points: 8, triangles: 9});
        expect(readout(h).boundary.k).toBe(5);
        h.scene('tri-add');
        const r = readout(h);
        expect(r.counts).toMatchObject({points: 9, triangles: 10});
        expect([r.n, r.boundary.k, 2 * r.n - 2 - r.boundary.k]).toEqual([9, 6, 10]);
        expect(h.graph.model.points.map(p => [p.x, p.y])).toEqual([...withInside, TRI_OUTSIDE_POINT]);
        expect(dom('triangles')).toBe('Trikotnikov: 10 = 2n − 2 − k = 2 · 9 − 2 − 6');
        // The outside point alone, over the seven points: one visible hull side, so one more triangle.
        expect(delaunayOf([...TRI_EXAMPLE_POINTS, TRI_OUTSIDE_POINT]).triangles).toBe(7 + 1);
    } finally {
        h.mounted.view.unmount();
    }
});

function delaunayOf(list: readonly (readonly number[])[]) {
    const result = delaunayTriangulation(grid(list));
    if (!result.ok) throw new Error('delaunay');
    return triangulationCounts(result.value);
}

test('step 6: the Delaunay triangulation has 7 triangles, 13 edges and smallest angle 25,35; T0 had 1,91', () => {
    const h = mountTri();
    try {
        h.scene('tri-t0');
        const t0Angle = readout(h).minAngle.toFixed(2);
        h.scene('tri-delaunay');
        const r = readout(h);
        expect(r.counts).toEqual({points: 7, triangles: 7, edges: 13, interiorEdges: 8, hullEdges: 5});
        expect([t0Angle, r.minAngle.toFixed(2)]).toEqual(['1.91', '25.35']);
        expect(dom('angle')).toBe('Najmanjši kot zdaj: 25,35°');
        const kernel = delaunayTriangulation(grid(TRI_EXAMPLE_POINTS));
        if (!kernel.ok) throw new Error('delaunay');
        expect(sortedTriples(h.graph.triangles)).toEqual(sortedTriples(kernel.value.triangles));
        expect(angleVector(kernel.value)[0].toFixed(2)).toBe('25.35');
        for (const language of ['sl', 'en'] as const) {
            const comma = (token: string) => (language === 'en' ? token.replace('{,}', '.') : token);
            expect(stepOf('tri-delaunay').body[language]).toContain(comma('\\(1{,}91^\\circ\\)'));
            expect(stepOf('tri-delaunay').body[language]).toContain(comma('\\(25{,}35^\\circ\\)'));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 7: the nine hull points have k = 6 (one collinear), 10 triangles, 18 edges, 12 interior', () => {
    const h = mountTri();
    try {
        h.scene('tri-nine');
        const r = readout(h);
        expect(r.counts).toEqual({points: 9, triangles: 10, edges: 18, interiorEdges: 12, hullEdges: 6});
        expect(r.boundary).toMatchObject({k: 6, collinear: 1});
        expect(dom('collinear')).toContain('1');
        expect(dom('k')).toBe('Točk na robu ovojnice: k = 6');
        const tri = createTriangulation(h.graph.model.points, h.graph.triangles.map(t => [...t]));
        if (!tri.ok) throw new Error('triangulation');
        expect(boundaryCount(tri.value).k).toBe(6);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the quoted numbers appear in the step text and the scene description of both languages', () => {
    const quoted: Record<string, readonly string[]> = {
        'tri-points': ['\\(n=7\\)'],
        'tri-t0': ['\\(k=5\\)', '2\\cdot7-2-5=7', '=13', '\\(8\\)', '\\(5\\)'],
        'tri-flip': ['\\(7\\)', '\\(13\\)', '\\(8\\)'],
        'tri-add': ['7+2=9', '\\(k\\)', '\\(6\\)', '\\(n=9\\)', '\\(2\\cdot9-2-6=10\\)'],
        'tri-delaunay': ['\\(7\\)', '\\(13\\)', '\\(1{,}91^\\circ\\)', '\\(25{,}35^\\circ\\)'],
        'tri-nine': ['\\(k=6\\)', '2\\cdot9-2-6=10', '3\\cdot9-3-6=18'],
    };
    for (const [stepId, tokens] of Object.entries(quoted)) {
        const step = stepOf(stepId);
        for (const token of tokens) {
            expect(step.body.sl, `${stepId} sl ${token}`).toContain(token);
            expect(step.body.en, `${stepId} en ${token}`).toContain(token.replace('{,}', '.'));
        }
    }
    const announced: Record<string, readonly string[]> = {
        'tri-t0': ['\\(7\\)', '\\(13\\)', '\\(8\\)', '\\(1{,}91^\\circ\\)'],
        'tri-add': ['\\(n=9\\)', '\\(k=6\\)', '\\(10\\)'],
        'tri-delaunay': ['\\(7\\)', '\\(13\\)', '\\(25{,}35^\\circ\\)'],
        'tri-nine': ['\\(k=6\\)', '\\(10\\)', '\\(18\\)'],
    };
    for (const [stepId, tokens] of Object.entries(announced)) {
        const expected = compgeoGuidedLessons.find(l => l.demonstrationId === 'point-set-triangulation')!.steps.find(step => step.id === stepId)!.scene!.expectedState;
        for (const token of tokens) {
            expect(expected.sl, `${stepId} scene sl ${token}`).toContain(token);
            expect(expected.en, `${stepId} scene en ${token}`).toContain(token.replace('{,}', '.'));
        }
    }
});

test('the worked examples equal the scene readouts', () => {
    const h = mountTri();
    try {
        h.scene('tri-t0');
        const t0 = readout(h);
        expect([t0.counts.triangles, t0.counts.edges]).toEqual([2 * 7 - 2 - 5, 3 * 7 - 3 - 5]);
        h.scene('tri-nine');
        const nine = readout(h);
        expect([nine.counts.triangles, nine.counts.edges]).toEqual([2 * 9 - 2 - 6, 3 * 9 - 3 - 6]);
        const examples = compgeoGuidedLessons.find(l => l.demonstrationId === 'point-set-triangulation')!.workedExamples ?? [];
        expect(examples.map(example => example.resultLatex)).toEqual(['T=7,\\; E=13', 'T=10,\\; E=18']);
    } finally {
        h.mounted.view.unmount();
    }
});

test('a scene change and the checkpoint restore bring the readouts back (no stale flip, selection or previous angle)', () => {
    const h = mountTri();
    try {
        const initial = readout(h);
        h.scene('tri-flip');
        expect(readout(h).minAngleBefore).toBeDefined();
        expect(h.graph.selectedEdge()).toBeDefined();
        // A scene change without the checkpoint: points, triangulation and the flip history are replaced.
        h.sceneOnly('tri-t0');
        expect(readout(h).minAngleBefore).toBeUndefined();
        expect(h.graph.selectedEdge()).toBeUndefined();
        expect(readout(h)).toEqual(initial);
        h.scene('tri-add');
        expect(readout(h).n).toBe(9);
        h.sceneOnly('tri-t0');
        expect(readout(h).counts).toEqual({points: 7, triangles: 7, edges: 13, interiorEdges: 8, hullEdges: 5});
        // Back: the checkpoint restores the graph's own starting scene.
        h.scene('tri-nine');
        act(() => { h.capabilities.restoreState(h.checkpoint); });
        expect(readout(h)).toEqual(initial);
        expect(h.graph.selectedEdge()).toBeUndefined();
        expect(dom('angle')).toBe('Najmanjši kot zdaj: 1,91°');
    } finally {
        h.mounted.view.unmount();
    }
});

test('every scene starts in a view that contains all its points', () => {
    for (const stepId of STEPS) {
        const actions = sceneOf(stepId);
        const prepared = actions[0];
        const pointsAction = actions.find(action => action.kind === 'point-set' && action.operation === 'set-points');
        if (prepared.kind !== 'prepared-scene' || !prepared.view || !pointsAction || pointsAction.kind !== 'point-set' || pointsAction.operation !== 'set-points') throw new Error(stepId);
        const [left, top, right, bottom] = prepared.view;
        for (const [x, y] of pointsAction.points) expect(left < x && x < right && bottom < y && y < top, `${stepId} (${x}, ${y})`).toBe(true);
    }
});

test('the other point-set graphs reject the three triangulation actions', () => {
    const actions = [
        {kind: 'point-set', operation: 'set-triangulation', triangles: [[0, 1, 2]]},
        {kind: 'point-set', operation: 'flip-edge', edge: [0, 1]},
        {kind: 'point-set', operation: 'select-edge', edge: null},
    ] as const;
    for (const graph of [new EarClippingGraph(), new HullTraceGraph()]) {
        for (const action of actions) expect(() => graph.applyPointSetAction(action)).toThrow(UnsupportedLessonActionError);
    }
    expect(new TriangulationGraph().supportsLessonAction(actions[0])).toBe(true);
});
