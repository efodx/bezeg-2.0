import {act} from '@testing-library/react';
import {compgeoGuidedLessons, PIP_QUERY} from './compgeoGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {NOTCHED_MODEL, NOTCHED_QUERY, PENTAGRAM_MODEL, PointInPolygonGraph} from '../../graphs/compgeo/PointInPolygonGraph';
import {NOTCHED_PENTAGON, PENTAGRAM_VERTICES, rayCrossings} from '../../compgeo/pointInPolygon';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('point-in-polygon')!;
/** The authored lesson, which keeps the scene's expected state, the worked examples and the prerequisites the runtime lesson drops. */
const authored = () => compgeoGuidedLessons.find(l => l.demonstrationId === 'point-in-polygon')!;
const sceneOf = (stepId: string): LessonAction[] => lesson().steps.find(step => step.id === stepId)!.scene!.actions as LessonAction[];
const STEPS = ['pip-drag', 'pip-predict', 'pip-ray-reveal', 'pip-boundary', 'pip-winding', 'pip-pentagram', 'pip-explore'];

class Observed extends PointInPolygonGraph {
    objects() { return this.board.objectsList as {name?: string; plaintext?: string}[]; }
    named(prefix: string) { return this.objects().filter(o => (o.name ?? '').startsWith(prefix)); }
}

const readoutElement = () => document.querySelector('[data-pip-readout]') as HTMLElement;
/** What the readout under the graph shows: its kind, location, crossing count and winding number (empty strings while hidden). */
const readout = () => ({kind: readoutElement().dataset.pipReadout, location: readoutElement().dataset.pipLocation, crossings: readoutElement().dataset.pipCrossings, winding: readoutElement().dataset.pipWinding});

function mountLesson() {
    const graph = new Observed();
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const applyAll = (actions: readonly LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    return {
        graph, mounted, capabilities, applyAll,
        /** Applies the scene of a step the way a lesson session does: restore the checkpoint, then every action, in one synchronous act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneOf(stepId)) capabilities.apply(action);
        }),
        restoreCheckpoint: () => act(() => { capabilities.restoreState(checkpoint); }),
        /** Everything a scene sets, as observable state: the vertices, q, the three overlays and the objects the overlays draw. */
        snapshot: () => ({
            vertices: graph.model.points.map(p => [p.x, p.y]), query: [graph.query.x, graph.query.y],
            overlays: ['ray', 'winding', 'values'].map(name => graph.overlayShown(name as 'ray' | 'winding' | 'values')),
            readout: readout(), ray: graph.named('ray-').length, winding: graph.named('winding-').length,
        }),
    };
}

test('the seven scenes put the figure, the query point, the overlays and the readout where the text relies on them, in one synchronous sequence', () => {
    const h = mountLesson();
    try {
        const seen = STEPS.map(stepId => {
            h.scene(stepId);
            const s = h.snapshot();
            return [s.vertices.length, s.query, s.overlays, s.readout.kind, s.readout.location, s.readout.crossings, s.readout.winding, s.ray > 0, s.winding > 0] as const;
        });
        expect(seen).toEqual([
            [5, [3, 1], [false, false, true], 'located', 'inside', '1', '1', false, false],
            [5, [1, 3], [false, false, false], '', '', '', '', false, false],
            [5, [1, 3], [true, false, true], 'located', 'inside', '3', '1', true, false],
            [5, [1, 2], [true, false, true], 'located', 'inside', '3', '1', true, false],
            [5, [3, 3], [true, true, true], 'located', 'outside', '2', '0', true, true],
            [5, [0, 0], [true, true, true], 'located', 'rules-differ', '2', '2', true, true],
            [5, [3, 1], [true, true, true], 'located', 'inside', '1', '1', true, true],
        ]);
        // The figure of each scene is the one the text names.
        h.scene('pip-drag');
        expect(h.graph.model.points).toEqual(NOTCHED_PENTAGON);
        h.scene('pip-pentagram');
        expect(h.graph.model.points).toEqual(PENTAGRAM_VERTICES);
        expect(PIP_QUERY).toMatchObject({drag: [3, 1], predict: [1, 3], vertexRay: [1, 2], notch: [3, 3], pentagramCentre: [0, 0], pentagramTip: [0, 12], onEdge: [3, 0]});
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 2 predicts with no ray objects, no winding labels, no count and no verdict anywhere in the readout', () => {
    const h = mountLesson();
    try {
        h.scene('pip-predict');
        expect(h.snapshot()).toMatchObject({overlays: [false, false, false], ray: 0, winding: 0, readout: {kind: '', location: '', crossings: '', winding: ''}});
        const shown = readoutElement().textContent ?? '';
        expect(shown).not.toMatch(/znotraj|zunaj|presečišč|Ovojno|\d/);
        setLanguage('en');
        h.scene('pip-predict');
        expect(readoutElement().textContent ?? '').not.toMatch(/inside|outside|crossing|winding|\d/i);
        // Step 3 reveals the same point: the ray with its crossings numbered 1, 2, 3.
        h.scene('pip-ray-reveal');
        expect(h.graph.named('ray-crossing')).toHaveLength(3);
        expect(h.graph.named('ray-number').map(o => o.plaintext)).toEqual(['1', '2', '3']);
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 4: the ray through the vertex (3, 2) counts both notch edges; a query on an edge is its own verdict with no count and no winding number', () => {
    const h = mountLesson();
    try {
        h.scene('pip-boundary');
        const through = rayCrossings({x: 1, y: 2}, NOTCHED_PENTAGON);
        expect([...through.crossings].sort((a, b) => a.x.compare(b.x)).map(c => [Number(c.x.num), Number(c.x.den)])).toEqual([[3, 1], [3, 1], [6, 1]]);
        expect(readout()).toMatchObject({crossings: '3', winding: '1', location: 'inside'});
        // The same answer one grid step above the vertex, where the ray misses it.
        h.applyAll([{kind: 'point-set', operation: 'set-query-point', point: [1, 3]}]);
        expect(readout()).toMatchObject({crossings: '3', winding: '1'});
        // The quoted boundary example.
        h.applyAll([{kind: 'point-set', operation: 'set-query-point', point: [...PIP_QUERY.onEdge]}]);
        expect(readout()).toEqual({kind: 'boundary', location: 'boundary', crossings: '', winding: ''});
        expect(readoutElement().textContent).toContain('na robu');
        expect(h.graph.named('ray-')).toHaveLength(0);
        setLanguage('en');
        h.scene('pip-boundary');
        h.applyAll([{kind: 'point-set', operation: 'set-query-point', point: [...PIP_QUERY.onEdge]}]);
        expect(readoutElement().textContent).toContain('boundary');
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 6: the centre has winding number 2 and the rules disagree, a tip has 1 and they agree; the worked examples equal the crossing directions', () => {
    const h = mountLesson();
    try {
        h.scene('pip-pentagram');
        expect(readout()).toEqual({kind: 'located', location: 'rules-differ', crossings: '2', winding: '2'});
        expect(readoutElement().textContent).toContain('Sodo-liho pravilo: zunaj');
        expect(readoutElement().textContent).toContain('Neničelno pravilo: znotraj');
        h.applyAll([{kind: 'point-set', operation: 'set-query-point', point: [...PIP_QUERY.pentagramTip]}]);
        expect(readout()).toEqual({kind: 'located', location: 'inside', crossings: '1', winding: '1'});
        // The figure is announced as a lattice approximation by the page itself.
        expect(document.body.textContent).toContain('mrežni približek');
        const directions = (vertices: typeof PENTAGRAM_VERTICES, q: readonly [number, number]) =>
            [...rayCrossings({x: q[0], y: q[1]}, vertices).crossings].sort((a, b) => a.x.compare(b.x)).map(c => c.direction);
        expect(directions(NOTCHED_PENTAGON, PIP_QUERY.notch)).toEqual([-1, 1]);
        expect(directions(PENTAGRAM_VERTICES, PIP_QUERY.pentagramCentre)).toEqual([1, 1]);
        const example = (id: string) => authored().workedExamples.find(e => e.id === id)!;
        expect(example('pip-notch-example').calculationLatex).toBe('c=1+1=2,\\quad w=(-1)+(+1)=0');
        expect(example('pip-pentagram-example').calculationLatex).toBe('c=1+1=2,\\quad w=(+1)+(+1)=2');
    } finally {
        h.mounted.view.unmount();
    }
});

test('every quoted count and winding number equals the rendered readout at its step and appears in the step text and scene text of both languages', () => {
    const h = mountLesson();
    try {
        const quoted: Record<string, {crossings: string; winding: string; tokens: readonly string[]}> = {
            'pip-drag': {crossings: '1', winding: '1', tokens: ['(3,1)']},
            'pip-ray-reveal': {crossings: '3', winding: '1', tokens: ['\\(3\\)', '(1,3)']},
            'pip-boundary': {crossings: '3', winding: '1', tokens: ['\\(3\\)', '(1,2)', '(3,2)', '(3,0)']},
            'pip-winding': {crossings: '2', winding: '0', tokens: ['\\(2\\)', '\\(0\\)', '(3,3)', '\\(1\\)']},
            'pip-pentagram': {crossings: '2', winding: '2', tokens: ['\\(c=2\\)', '\\(w=2\\)', '\\(c=1\\)', '\\(w=1\\)', '(0,0)', '(0,12)', 'lattice approximation']},
        };
        for (const [stepId, {crossings, winding, tokens}] of Object.entries(quoted)) {
            h.scene(stepId);
            expect(readout(), stepId).toMatchObject({crossings, winding});
            const step = authored().steps.find(s => s.id === stepId)!;
            for (const language of ['sl', 'en'] as const) {
                const body = `${step.explanation[language]} ${step.scene!.expectedState[language]}`;
                for (const token of tokens) {
                    const wanted = token === 'lattice approximation' ? (language === 'sl' ? 'mrežni približek' : token) : token;
                    expect(body, `${stepId} ${language} ${token}`).toContain(wanted);
                }
                if (stepId !== 'pip-drag' && stepId !== 'pip-pentagram') expect(step.scene!.expectedState[language], `${stepId} ${language} scene`).toContain(`\\(${crossings}\\)`);
            }
        }
        expect(authored().steps.find(s => s.id === 'pip-pentagram')!.explanation.sl).toContain('mrežni približek');
        // Step 4 states the half-open rule in words, in both languages.
        expect(authored().steps.find(s => s.id === 'pip-boundary')!.explanation.sl).toContain('Polodprto pravilo');
        expect(authored().steps.find(s => s.id === 'pip-boundary')!.explanation.en).toContain('half-open rule');
        expect(authored().steps.find(s => s.id === 'pip-boundary')!.explanation.en).toContain('on the boundary');
    } finally {
        h.mounted.view.unmount();
    }
});

test('the lesson is joined to the list, links to the orientation and area lessons, and has seven steps', () => {
    expect(compgeoGuidedLessons.filter(l => l.demonstrationId === 'point-in-polygon')).toHaveLength(1);
    expect(authored().steps.map(s => s.id)).toEqual(STEPS);
    expect(lesson().steps.map(s => s.id)).toEqual(STEPS);
    expect(authored().prerequisites).toHaveLength(2);
    expect(authored().prerequisites[0].en).toContain('orientation');
    expect(authored().prerequisites[1].en).toContain('polygon area');
});

test('Back (the checkpoint) and a scene change restore the query point, the polygon and the overlays', () => {
    const h = mountLesson();
    try {
        const start = h.snapshot();
        expect(start).toMatchObject({vertices: NOTCHED_MODEL.points.map(p => [p.x, p.y]), query: [NOTCHED_QUERY.x, NOTCHED_QUERY.y], overlays: [true, false, true]});
        h.scene('pip-pentagram');
        const pentagram = h.snapshot();
        expect(pentagram.vertices).toEqual(PENTAGRAM_MODEL.points.map(p => [p.x, p.y]));
        h.restoreCheckpoint();
        expect(h.snapshot()).toEqual(start);
        // A scene change after the pentagram, and each scene after any other scene, leaves exactly the state of that scene alone.
        const alone = new Map<string, ReturnType<typeof h.snapshot>>();
        for (const stepId of STEPS) { h.scene(stepId); alone.set(stepId, h.snapshot()); }
        for (const from of ['pip-predict', 'pip-boundary', 'pip-pentagram']) {
            for (const to of STEPS) {
                h.scene(from);
                h.applyAll([{kind: 'point-set', operation: 'set-query-point', point: [-2, 1]}]);
                h.scene(to);
                expect(h.snapshot(), `${from} then ${to}`).toEqual(alone.get(to));
            }
        }
    } finally {
        h.mounted.view.unmount();
    }
});
