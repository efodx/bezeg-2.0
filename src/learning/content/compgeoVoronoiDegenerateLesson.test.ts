import {act} from '@testing-library/react';
import {compgeoGuidedLessons, DEGENERATE_COLLINEAR, DEGENERATE_NEAR_OFF, DEGENERATE_NEAR_ON, DEGENERATE_SQUARE, DEGENERATE_TRAPEZOID} from './compgeoGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction, LocalizedText} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {DegenerateSitesGraph} from '../../graphs/compgeo/DegenerateSitesGraph';
import {incircleValue} from '../../compgeo/predicates';
import {voronoiFromDelaunay} from '../../compgeo/voronoi';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Pair = readonly [number, number];
const lesson = () => getLessonForDemonstration('voronoi-degenerate')!;
const guided = () => compgeoGuidedLessons.find(l => l.demonstrationId === 'voronoi-degenerate')!;
const step = (id: string) => lesson().steps.find(s => s.id === id)!;
const gstep = (id: string) => guided().steps.find(s => s.id === id)!;
const IDS = ['deg-near', 'deg-predict', 'deg-on', 'deg-off', 'deg-collinear', 'deg-convention', 'deg-explore'];
const stepText = (s: GuidedLesson['steps'][number], language: 'sl' | 'en') => [
    s.title, s.purpose, s.explanation, s.observationPrompt, ...s.expectedObservations, s.scene!.expectedState,
].map((t: LocalizedText) => t[language]).join('\n');
const pt = ([x, y]: Pair) => ({x, y});
const four = (name: string) => document.querySelector(`[data-fourpoint="${name}"]`)?.textContent ?? '';
const kernelDegrees = (points: readonly Pair[]) => {
    const out = voronoiFromDelaunay(points.map(pt));
    if (!out.ok) throw new Error('refused');
    return out.value.vertices.map(v => v.sites.length).sort((a, b) => b - a);
};
const detOf = (p: readonly Pair[]) => incircleValue(pt(p[0]), pt(p[1]), pt(p[2]), pt(p[3])).toString();

function withGraph(body: (h: {graph: DegenerateSitesGraph; run: (id: string) => void; restore: () => void; apply: (...a: LessonAction[]) => void}) => void) {
    const graph = new DegenerateSitesGraph();
    const mounted = mountGraph(graph);
    try {
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const restore = () => act(() => { capabilities.restoreState(checkpoint); });
        const run = (id: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of step(id).scene!.actions) capabilities.apply(action as LessonAction);
        });
        const apply = (...actions: LessonAction[]) => act(() => { for (const a of actions) capabilities.apply(a); });
        body({graph, run, restore, apply});
    } finally { mounted.view.unmount(); }
}

test('the quoted determinants and vertex counts equal the kernel and the panel readout at their steps, in both languages', () => {
    expect(detOf(DEGENERATE_NEAR_ON)).toBe('0');
    expect(detOf(DEGENERATE_NEAR_OFF)).toBe('-30');
    expect(detOf(DEGENERATE_SQUARE)).toBe('0');
    expect(detOf(DEGENERATE_TRAPEZOID)).toBe('0');
    expect(kernelDegrees(DEGENERATE_NEAR_ON)).toEqual([4]);
    expect(kernelDegrees(DEGENERATE_NEAR_OFF)).toEqual([3, 3]);
    expect(kernelDegrees(DEGENERATE_SQUARE)).toEqual([4]);
    expect(kernelDegrees(DEGENERATE_TRAPEZOID)).toEqual([4]);
    expect(kernelDegrees(DEGENERATE_COLLINEAR)).toEqual([]);
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        withGraph(({run}) => {
            run('deg-on');
            expect(four('incircle')).toContain('D = 0');
            expect(four('vertices')).toBe(language === 'sl' ? 'Voronojeva oglišča: 1; stopnje: 4.' : 'Voronoi vertices: 1; degrees: 4.');
            expect(four('diagonals').match(/P1–P3|P2–P4/g)).toHaveLength(2);
            run('deg-off');
            expect(four('incircle')).toContain('D = -30');
            expect(four('vertices')).toBe(language === 'sl' ? 'Voronojeva oglišča: 2; stopnje: 3, 3.' : 'Voronoi vertices: 2; degrees: 3, 3.');
            run('deg-explore');
            expect(four('incircle')).toContain('D = 0');
            expect(four('vertices')).toBe(language === 'sl' ? 'Voronojeva oglišča: 1; stopnje: 4.' : 'Voronoi vertices: 1; degrees: 4.');
        });
        for (const [id, quotes] of [['deg-on', ['D=0', '\\(4\\)', '(0,-5)']], ['deg-off', ['D=-30', '\\(2\\)', '(1,-5)']]] as const) {
            const fields = {
                explanation: gstep(id).explanation, observation: gstep(id).expectedObservations[0], scene: gstep(id).scene!.expectedState,
            };
            for (const [field, value] of Object.entries(fields)) {
                // The observation quotes the determinant and the count, not the coordinates.
                for (const quoted of field === 'observation' ? quotes.slice(0, 2) : quotes) expect(value[language], `${id} ${field} ${language} ${quoted}`).toContain(quoted);
            }
        }
        const example = guided().workedExamples![0];
        expect(example.resultLatex).toBe('D=-30');
        expect(example.check[language]).toContain('D=-30');
        expect(example.check[language]).toContain('\\(0\\)');
    }
});

test('step 2 shows no vertex count before the prediction: no readout, no four-point panel and no number or determinant in the text', () => {
    withGraph(({run, graph}) => {
        for (const id of ['deg-near', 'deg-predict']) {
            run(id);
            expect(graph.mode, id).toBe('sites');
            expect(document.querySelector('[data-voronoi="readout"]'), id).toBeNull();
            expect(document.querySelector('[data-voronoi="four-point"]'), id).toBeNull();
            expect(document.querySelector('[data-voronoi="vertices"]'), id).toBeNull();
        }
    });
    for (const language of ['sl', 'en'] as const) {
        const text = stepText(gstep('deg-predict'), language);
        expect(text).not.toMatch(/D\s*=/);
        expect(text).not.toMatch(/\\\(\s*-?\d/);
    }
});

test('step 5 shows four lines, no vertices and the collinear message (no triangulation, parallel strips) in both languages', () => {
    const expected = {sl: ['triangulacije ni', 'vzporednimi simetralami'], en: ['there is no triangulation', 'parallel bisectors']};
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        withGraph(({run, graph}) => {
            run('deg-collinear');
            expect(graph.mode).toBe('sites');
            expect(document.querySelector('[data-readout="lines"]')?.textContent).toMatch(/\b4\b/);
            expect(document.querySelector('[data-readout="vertices"]')?.textContent).toMatch(/\b0\b/);
            expect(document.querySelector('[data-voronoi="vertices"]')).toBeNull();
            const message = document.querySelector('[data-voronoi="collinear"]')?.textContent ?? '';
            for (const fragment of expected[language]) expect(message, `${language} ${fragment}`).toContain(fragment);
        });
        const text = stepText(gstep('deg-collinear'), language);
        // The two end cells are half-planes; uniqueness needs an empty circle (math review, task 23).
        expect(text).toContain(language === 'sl' ? 'polravnini' : 'half-planes');
        expect(stepText(gstep('deg-convention'), language)).toContain(language === 'sl' ? 'prazni krožnici' : 'empty circle');
        expect(text).toContain('\\(0\\)');
        expect(text).toContain('\\(4\\)');
    }
});

test('step 6 states the convention incircle <= 0 with both diagonals legal when cocircular, and the correctness notes are present', () => {
    for (const language of ['sl', 'en'] as const) {
        const text = gstep('deg-convention').explanation[language];
        expect(text).toContain('D\\le0');
        expect(text).toMatch(language === 'sl' ? /obe/ : /both/);
        expect(text).toContain('\\(D=0\\)');
        expect(text).toMatch(language === 'sl' ? /celoštevilsk/ : /integer grid/);
        expect(text).toMatch(language === 'sl' ? /stopnjo \\\(4\\\)/ : /degree \\\(4\\\)/);
        expect(text).toMatch(language === 'sl' ? /enolična, če nobene štiri točke ne ležijo na prazni krožnici/ : /unique if no four points lie on an empty circle/);
        expect(guided().formulaBlocks![0].explanation[language]).toContain('D\\le0');
        const notes = guided().edgeCases.map(e => e[language]).join('\n');
        expect(notes).toMatch(language === 'sl' ? /celoštevilski mreži/ : /integer grid/);
        expect(notes).toMatch(language === 'sl' ? /Fortunovega/ : /Fortune/);
    }
    withGraph(({run}) => {
        run('deg-convention');
        expect(four('incircle')).toContain('D = 0');
        expect(four('diagonals').match(/dovoljena/g)).toHaveLength(2);
        expect(four('diagonals')).not.toContain('nedovoljena');
    });
});

test('Back and a scene change restore the scene: restoreState undoes set-mode and set-points, a later set-mode switches back', () => {
    withGraph(({graph, run, restore, apply}) => {
        const initial = [graph.mode, graph.model.points.length];
        run('deg-on');
        expect([graph.mode, graph.model.points.length]).toEqual(['four-point', 4]);
        run('deg-collinear');
        expect([graph.mode, graph.model.points.length]).toEqual(['sites', 5]);
        run('deg-off');
        expect([graph.mode, four('incircle').includes('D = -30')]).toEqual(['four-point', true]);
        restore();
        expect([graph.mode, graph.model.points.length]).toEqual(initial);
        run('deg-on');
        apply({kind: 'point-set', operation: 'set-mode', mode: 'sites'} as LessonAction);
        expect(graph.mode).toBe('sites');
        expect(document.querySelector('[data-voronoi="four-point"]')).toBeNull();
    });
});

test('prerequisites name the Delaunay and Voronoi lessons in both languages, and both lessons exist', () => {
    const l = guided();
    expect(l.steps.map(s => s.id)).toEqual(IDS);
    expect(l.prerequisites).toHaveLength(2);
    expect(l.prerequisites[0].sl).toContain('Delaunay');
    expect(l.prerequisites[0].en).toContain('Delaunay');
    expect(l.prerequisites[1].sl).toContain('Voronoj');
    expect(l.prerequisites[1].en).toContain('Voronoi');
    expect(getLessonForDemonstration('delaunay')).toBeDefined();
    expect(getLessonForDemonstration('voronoi')).toBeDefined();
});
