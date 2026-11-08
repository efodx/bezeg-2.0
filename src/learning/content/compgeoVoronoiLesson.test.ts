import {act, fireEvent} from '@testing-library/react';
import {
    compgeoGuidedLessons, TRI_EXAMPLE_POINTS, VORONOI_CELL_SITE, VORONOI_COUNTS, VORONOI_QUERY_AWAY, VORONOI_QUERY_FREE, VORONOI_QUOTED_VERTEX, VORONOI_TRIANGLE_INDEX,
} from './compgeoGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {UnsupportedLessonActionError} from '../model';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {VoronoiGraph} from '../../graphs/compgeo/VoronoiGraph';
import {DelaunayGraph} from '../../graphs/compgeo/DelaunayGraph';
import {PointSetGraph} from '../../graphs/compgeo/PointSetGraph';
import {DegenerateSitesGraph} from '../../graphs/compgeo/DegenerateSitesGraph';
import {delaunayTriangulation} from '../../compgeo/delaunay';
import {dualEdges, voronoiFromDelaunay} from '../../compgeo/voronoi';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('voronoi')!;
const guided = () => compgeoGuidedLessons.find(l => l.demonstrationId === 'voronoi')!;
const stepOf = (stepId: string) => lesson().steps.find(step => step.id === stepId)!;
const sceneOf = (stepId: string): LessonAction[] => stepOf(stepId).scene!.actions as LessonAction[];
const STEPS = ['vor-sites', 'vor-predict', 'vor-cell', 'vor-diagram', 'vor-dual', 'vor-drag', 'vor-explore'];
const readout = (name: string) => document.querySelector(`[data-voronoi="readout"] [data-readout="${name}"]`)?.textContent;
const panel = (name: string) => document.querySelector(`[data-voronoi="${name}"]`);
const click = (selector: string) => act(() => { (document.querySelector(selector) as HTMLElement).click(); });
const pts = TRI_EXAMPLE_POINTS.map(([x, y]) => ({x, y}));
const ps = (operation: string, extra: object): LessonAction => ({kind: 'point-set', operation, ...extra}) as LessonAction;
const queryOf = (graph: VoronoiGraph) => [graph.query.x.toNumber(), graph.query.y.toNumber()];

function kernel(points: readonly {x: number; y: number}[]) {
    const out = voronoiFromDelaunay(points);
    if (!out.ok) throw new Error('refused');
    return out.value;
}

function mountVor() {
    const graph = new VoronoiGraph();
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneOf(stepId)) capabilities.apply(action);
        }),
        sceneOnly: (stepId: string) => act(() => { for (const action of sceneOf(stepId)) capabilities.apply(action); }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type Mounted = ReturnType<typeof mountVor>;
const withMounted = (body: (h: Mounted) => void) => { const h = mountVor(); try { body(h); } finally { h.mounted.view.unmount(); } };

test('the lesson data equals the kernel: seven steps, 7 vertices, 8 finite edges, 5 rays, 2 bounded cells and the vertex (4,-1) of P1P2P6', () => {
    expect(lesson().steps.map(step => step.id)).toEqual(STEPS);
    const diagram = kernel(pts);
    const dual = dualEdges(diagram);
    expect([diagram.vertices.length, dual.finite.length, dual.unbounded.length]).toEqual([VORONOI_COUNTS.vertices, VORONOI_COUNTS.finite, VORONOI_COUNTS.rays]);
    expect(diagram.cells.filter(c => c.bounded).map(c => c.site)).toEqual([5, 6]);
    expect(diagram.cells.filter(c => !c.bounded)).toHaveLength(VORONOI_COUNTS.unbounded);
    const tri = delaunayTriangulation(pts);
    if (!tri.ok) throw new Error('refused');
    expect([...tri.value.triangles[VORONOI_TRIANGLE_INDEX]].sort((a, b) => a - b)).toEqual([0, 1, 5]);
    const vertex = diagram.vertices.find(v => [0, 1, 5].every(s => v.sites.includes(s)))!;
    expect([vertex.point.x.toNumber(), vertex.point.y.toNumber()]).toEqual([...VORONOI_QUOTED_VERTEX]);
    expect(VORONOI_CELL_SITE).toBe(5);
});

test('steps 1 and 2 show the sites and no diagram, count, vertex list or cell (no spoiler)', () => {
    withMounted(h => {
        for (const id of ['vor-sites', 'vor-predict']) {
            h.scene(id);
            expect(h.graph.overlayShown('diagram'), id).toBe(false);
            expect(h.graph.overlayShown('delaunay'), id).toBe(false);
            expect(panel('readout'), id).toBeNull();
            expect(panel('vertices'), id).toBeNull();
            expect(h.graph.cellSite, id).toBeNull();
        }
    });
});

test('step 3 chooses P6 and builds its cell with set-construction; step 4 reads 7, 8, 5, 2 and 5', () => {
    withMounted(h => {
        h.scene('vor-cell');
        expect(h.graph.cellSite).toBe(VORONOI_CELL_SITE);
        expect(h.graph.construction).toBe(0);
        expect(panel('readout')).toBeNull();
        h.apply(ps('set-construction', {count: 'end'}));
        expect(h.graph.construction).toBe(6);
        h.scene('vor-diagram');
        expect(h.graph.overlayShown('diagram')).toBe(true);
        expect(h.graph.cellSite).toBeNull();
        expect(readout('vertices')).toContain(String(VORONOI_COUNTS.vertices));
        expect(readout('edges')).toContain(String(VORONOI_COUNTS.finite));
        expect(readout('rays')).toContain(String(VORONOI_COUNTS.rays));
        expect(readout('bounded')).toContain(String(VORONOI_COUNTS.bounded));
        expect(readout('unbounded')).toContain(String(VORONOI_COUNTS.unbounded));
    });
});

test('step 5 selects the triangle P1P2P6 and reads the vertex (4, -1); the triangulation has 8 interior and 5 hull edges', () => {
    withMounted(h => {
        h.scene('vor-dual');
        expect(h.graph.selectedTriangle()).toBe(VORONOI_TRIANGLE_INDEX);
        expect(h.graph.overlayShown('delaunay')).toBe(true);
        expect(panel('selected-vertex')!.textContent).toContain('(4, -1)');
        const triangles = h.graph.delaunay()!.triangles;
        const count = new Map<string, number>();
        for (const [a, b, c] of triangles) for (const [u, v] of [[a, b], [b, c], [a, c]]) {
            const key = [u, v].sort().join('-');
            count.set(key, (count.get(key) ?? 0) + 1);
        }
        expect([...count.values()].filter(n => n === 2)).toHaveLength(8);
        expect([...count.values()].filter(n => n === 1)).toHaveLength(5);
    });
});

test('step 6 duality survives dragging: after a set-points move every Delaunay triangle has a Voronoi vertex of its three sites and the readout follows', () => {
    withMounted(h => {
        h.scene('vor-drag');
        const moved = pts.map(p => ({...p}));
        moved[6] = {x: 5, y: 4};
        h.apply({kind: 'point-set', operation: 'set-points', mode: 'points', points: moved.map(p => [p.x, p.y])} as LessonAction);
        const diagram = kernel(moved);
        for (const [a, b, c] of h.graph.delaunay()!.triangles) {
            expect(diagram.vertices.some(v => [a, b, c].every(s => v.sites.includes(s)))).toBe(true);
        }
        expect(h.graph.model.points[6]).toMatchObject({x: 5, y: 4});
        expect(readout('vertices')).toContain(String(diagram.vertices.length));
    });
});

test('step 7 sets the free query point and a scene change moves it back', () => {
    withMounted(h => {
        h.scene('vor-explore');
        expect(queryOf(h.graph)).toEqual([...VORONOI_QUERY_FREE]);
        h.sceneOnly('vor-sites');
        expect(queryOf(h.graph)).toEqual([...VORONOI_QUERY_AWAY]);
    });
});

test('set-construction x k equals the Next step control x k (Voronoi has no next-step animation)', () => {
    for (const k of [1, 3, 5]) {
        withMounted(h => {
            h.scene('vor-cell');
            h.apply(ps('set-construction', {count: k}));
            const viaAction = [h.graph.construction, panel('construction')?.textContent];
            h.scene('vor-cell');
            for (let i = 0; i < k; i++) click('[data-action="next-step"]');
            expect([h.graph.construction, panel('construction')?.textContent]).toEqual(viaAction);
            expect(h.graph.construction).toBe(k);
        });
    }
});

test('Back and a scene change restore: the next scene keeps neither the chosen site, the construction nor the selected triangle', () => {
    withMounted(h => {
        h.scene('vor-dual');
        expect(h.graph.selectedTriangle()).toBe(VORONOI_TRIANGLE_INDEX);
        h.sceneOnly('vor-cell');
        expect(h.graph.selectedTriangle()).toBeUndefined();
        expect(h.graph.cellSite).toBe(VORONOI_CELL_SITE);
        h.apply(ps('set-construction', {count: 3}));
        h.sceneOnly('vor-sites');
        expect(h.graph.cellSite).toBeNull();
        expect(h.graph.construction).toBe(0);
        expect(panel('readout')).toBeNull();
        h.scene('vor-diagram');
        expect(readout('vertices')).toContain('7');
        h.scene('vor-sites');
        expect(panel('readout')).toBeNull();
    });
});

test('the quoted numbers are present in both languages and nothing names the degenerate lesson', () => {
    const l = guided();
    for (const language of ['sl', 'en'] as const) {
        const text = (id: string) => l.steps.find(s => s.id === id)!.explanation[language];
        for (const n of ['\\(7\\)', '\\(8\\)', '\\(5\\)']) expect(text('vor-diagram'), `${language} ${n}`).toContain(n);
        expect(text('vor-dual'), language).toContain('(4,-1)');
    }
    const all = JSON.stringify(l).toLowerCase();
    for (const word of ['voronoi-degenerate', 'lesson b5']) expect(all).not.toContain(word);
});

test('the Delaunay lesson is the required prerequisite, and the dual step and an edge case say the picture illustrates duality without proving it', () => {
    const l = guided();
    expect(l.prerequisites[0].sl).toContain('Potrebna je lekcija o Delaunayevi triangulaciji');
    expect(l.prerequisites[0].en).toContain('The lesson on the Delaunay triangulation is required');
    expect(getLessonForDemonstration('delaunay')).toBeDefined();
    const caveat = {sl: /ilustrira,? (in je )?ne dokazuje/u, en: /illustrates duality and does not prove it/u};
    for (const language of ['sl', 'en'] as const) {
        expect(l.steps.find(s => s.id === 'vor-dual')!.explanation[language], language).toMatch(caveat[language]);
        expect(l.edgeCases.some(edge => caveat[language].test(edge[language])), language).toBe(true);
    }
});

test('the new actions are rejected by every other point-set graph', () => {
    const actions = [ps('select-site', {site: 0}), ps('set-construction', {count: 1}), ps('set-query-point', {point: [1, 1]})];
    for (const make of [() => new DelaunayGraph(), () => new PointSetGraph()]) {
        const graph = make();
        const mounted = mountGraph(graph);
        try {
            const capabilities = graph.getLessonCapabilities();
            for (const action of actions) expect(() => capabilities.apply(action)).toThrow(UnsupportedLessonActionError);
        } finally { mounted.view.unmount(); }
    }
});

test('invalid values throw and change nothing; DegenerateSitesGraph inherits the actions', () => {
    withMounted(h => {
        h.scene('vor-cell');
        const before = [h.graph.cellSite, h.graph.construction];
        for (const action of [
            ps('select-site', {site: 7}), ps('select-site', {site: -1}), ps('select-site', {site: 1.5}),
            ps('set-construction', {count: 7}), ps('set-construction', {count: -1}), ps('set-construction', {count: 'x'}),
            ps('set-query-point', {point: [1e9, 0]}), ps('set-query-point', {point: [0.3, 0]}), ps('set-query-point', {point: [NaN, 0]}), ps('set-query-point', {point: [1]}),
        ]) expect(() => h.capabilities.apply(action), JSON.stringify(action)).toThrow();
        expect([h.graph.cellSite, h.graph.construction]).toEqual(before);
        h.scene('vor-sites');
        expect(() => h.capabilities.apply(ps('set-construction', {count: 1}))).toThrow(/choose a site first/);
    });
    const graph = new DegenerateSitesGraph();
    const mounted = mountGraph(graph);
    try {
        const capabilities = graph.getLessonCapabilities();
        act(() => { capabilities.apply(ps('select-site', {site: 0})); });
        expect(graph.cellSite).toBe(0);
    } finally { mounted.view.unmount(); }
});

test('set-mode: sites and four-point on VoronoiGraph and DegenerateSitesGraph; every other point-set graph, a refused count and an unknown mode throw and change nothing', () => {
    const mode = (value: unknown) => ps('set-mode', {mode: value});
    for (const make of [() => new DelaunayGraph(), () => new PointSetGraph()]) {
        const graph = make();
        const mounted = mountGraph(graph);
        try {
            const capabilities = graph.getLessonCapabilities();
            for (const value of ['sites', 'four-point']) expect(() => capabilities.apply(mode(value))).toThrow(UnsupportedLessonActionError);
        } finally { mounted.view.unmount(); }
    }
    for (const make of [() => new VoronoiGraph(), () => new DegenerateSitesGraph()]) {
        const graph = make();
        const mounted = mountGraph(graph);
        try {
            const capabilities = graph.getLessonCapabilities();
            act(() => { capabilities.apply(ps('set-points', {mode: 'points', points: [[0, 0], [1, 0], [1, 1], [0, 1]]})); });
            act(() => { capabilities.apply(mode('four-point')); });
            expect(graph.mode).toBe('four-point');
            act(() => { capabilities.apply(mode('sites')); });
            expect(graph.mode).toBe('sites');
            for (const bad of ['circle', undefined, 4, null]) expect(() => capabilities.apply(mode(bad)), String(bad)).toThrow();
            expect(graph.mode).toBe('sites');
            act(() => { capabilities.apply(ps('set-points', {mode: 'points', points: [[0, 0], [1, 0], [2, 3]]})); });
            expect(() => capabilities.apply(mode('four-point'))).toThrow(/exactly 4 sites/);
            expect(graph.mode).toBe('sites');
            expect(document.querySelector('[data-voronoi="mode-refused"]')).toBeNull();
        } finally { mounted.view.unmount(); }
    }
});

test('set-mode does what the mode control does: sites, points and chosen site stay; the refusal message of the control is cleared', () => {
    const graph = new DegenerateSitesGraph();
    const mounted = mountGraph(graph);
    try {
        const capabilities = graph.getLessonCapabilities();
        act(() => { capabilities.apply(ps('set-mode', {mode: 'sites'})); });
        act(() => { capabilities.apply(ps('set-points', {mode: 'points', points: [[0, 0], [1, 0], [2, 3]]})); });
        act(() => { capabilities.apply(ps('select-site', {site: 1})); });
        act(() => { fireEvent.change(document.querySelector('select') as HTMLSelectElement, {target: {value: 'four-point'}}); });
        expect(document.querySelector('[data-voronoi="mode-refused"]')).not.toBeNull();
        act(() => { capabilities.apply(ps('set-mode', {mode: 'sites'})); });
        expect(document.querySelector('[data-voronoi="mode-refused"]')).toBeNull();
        expect([graph.model.points.length, graph.cellSite, graph.mode]).toEqual([3, 1, 'sites']);
    } finally { mounted.view.unmount(); }
});

test('lesson B5 validates and runs in one synchronous sequence: every scene sets its mode and points; the quoted determinants are the readouts', () => {
    const l = getLessonForDemonstration('voronoi-degenerate')!;
    expect(l.steps.map(step => step.id)).toEqual(['deg-near', 'deg-predict', 'deg-on', 'deg-off', 'deg-collinear', 'deg-convention', 'deg-explore']);
    const graph = new DegenerateSitesGraph();
    const mounted = mountGraph(graph);
    try {
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const run = (id: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of l.steps.find(step => step.id === id)!.scene!.actions) capabilities.apply(action);
        });
        const four = (name: string) => document.querySelector(`[data-fourpoint="${name}"]`)?.textContent ?? '';
        for (const id of ['deg-near', 'deg-predict']) {
            run(id);
            expect(graph.mode, id).toBe('sites');
            expect(document.querySelector('[data-voronoi="readout"]'), id).toBeNull();
            expect(document.querySelector('[data-voronoi="four-point"]'), id).toBeNull();
        }
        run('deg-on');
        expect([graph.mode, four('incircle').includes('D = 0'), four('vertices')]).toEqual(['four-point', true, 'Voronojeva oglišča: 1; stopnje: 4.']);
        run('deg-off');
        expect([four('incircle').includes('D = -30'), four('vertices')]).toEqual([true, 'Voronojeva oglišča: 2; stopnje: 3, 3.']);
        run('deg-collinear');
        expect(graph.mode).toBe('sites');
        expect(document.querySelector('[data-readout="lines"]')?.textContent).toBe('Premic: 4');
        expect(document.querySelector('[data-voronoi="collinear"]')?.textContent).toContain('triangulacije ni');
        run('deg-convention');
        expect(four('incircle')).toContain('D = 0');
        run('deg-explore');
        expect([graph.mode, four('incircle').includes('D = 0'), four('vertices')]).toEqual(['four-point', true, 'Voronojeva oglišča: 1; stopnje: 4.']);
    } finally { mounted.view.unmount(); }
});
