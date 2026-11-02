import {act} from '@testing-library/react';
import {compgeoGuidedLessons} from './compgeoGuidedLessons';
import {getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, sceneActions} from '../runtime/lessonCatalog';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonAction} from '../model';
import {UnsupportedLessonActionError} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {OrientationGraph} from '../../graphs/compgeo/OrientationGraph';
import {PolygonAreaGraph} from '../../graphs/compgeo/PolygonAreaGraph';
import {orientationReadout} from '../../graphs/compgeo/orientationReadout';
import {areaReadout} from '../../graphs/compgeo/areaReadout';
import {reverseVertices} from '../../compgeo/pointSetModel';
import {orient} from '../../compgeo/predicates';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

const lessonOf = (id: DemonstrationId) => getLessonForDemonstration(id)!;
const sceneOf = (id: DemonstrationId, stepId: string): LessonAction[] =>
    lessonOf(id).steps.find(step => step.id === stepId)!.scene!.actions as LessonAction[];

/** Runs the scene of each step in order, in one synchronous act, the way a lesson session applies them, and collects `read` after each. */
function walk<T>(id: 'orientation' | 'polygon-area', stepIds: readonly string[], read: (graph: OrientationGraph & PolygonAreaGraph) => T): T[] {
    const mounted = mountGraph(createGraph(id));
    try {
        const capabilities = mounted.graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const seen: T[] = [];
        act(() => {
            for (const stepId of stepIds) {
                capabilities.restoreState(checkpoint);
                for (const action of sceneOf(id, stepId)) capabilities.apply(action);
                seen.push(read(mounted.graph as unknown as OrientationGraph & PolygonAreaGraph));
            }
        });
        return seen;
    } finally {
        mounted.view.unmount();
    }
}

test('the lessons are bounded, bilingual, and found by the catalog', () => {
    expect(compgeoGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['orientation', 'polygon-area', 'convex-hull', 'ear-clipping', 'interval-sweep', 'segment-intersections']);
    expect(compgeoGuidedLessons.map(lesson => lesson.steps.length)).toEqual([6, 7, 7, 7, 7, 7]);
    for (const lesson of compgeoGuidedLessons) {
        expect(getGuidedLesson(lesson.demonstrationId)).toBe(lesson);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(lesson.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
        expect(lesson.sources.some(source => source.implementationCorrespondence)).toBe(true);
        const fields = [
            lesson.title, lesson.summary, ...lesson.prerequisites, ...lesson.learningGoals, ...lesson.edgeCases, ...lesson.unresolvedQuestions,
            ...lesson.formulaBlocks.flatMap(f => [f.notation, f.explanation]), ...lesson.workedExamples.flatMap(e => [e.title, e.check]),
            ...lesson.steps.flatMap(s => [s.title, s.purpose, s.explanation, s.observationPrompt, ...s.expectedObservations, s.scene!.expectedState]),
        ];
        for (const field of fields) {
            expect(field.sl.trim()).not.toBe('');
            expect(field.en.trim()).not.toBe('');
            expect(field.sl).not.toBe(field.en);
        }
        for (const step of lesson.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
            expect(() => sceneActions(step.scene!)).not.toThrow();
        }
    }
    expect(lessonOf('orientation').id).toBe('orientation-guided');
    expect(lessonOf('polygon-area').id).toBe('polygon-area-guided');
    expect(lessonOf('convex-hull').id).toBe('convex-hull-guided');
    expect(lessonOf('ear-clipping').id).toBe('ear-clipping-guided');
    expect(lessonOf('interval-sweep').id).toBe('interval-sweep-guided');
    expect(lessonOf('segment-intersections').id).toBe('segment-intersections-guided');
});

describe('A1 orientation: every quoted value is the scene readout', () => {
    const steps = ['orientation-line', 'orientation-predict', 'orientation-reveal', 'orientation-flip', 'orientation-area-step', 'orientation-explore'];

    test('the six scenes show missing, +8, +8, -8, +8 and 0 (collinear), in one synchronous sequence', () => {
        const seen = walk('orientation', steps, graph => {
            const readout = orientationReadout(graph.model.points);
            return [readout.kind === 'turn' ? `${readout.value}:${readout.turn}` : `missing${readout.have}`, graph.overlayShown('turn'), graph.model.points.length] as const;
        });
        expect(seen).toEqual([
            ['missing2', true, 2], ['8:left', false, 3], ['8:left', true, 3], ['-8:right', true, 3], ['8:left', true, 3], ['0:collinear', true, 3],
        ]);
    });

    test('the quoted values appear in the step text and the sign equals orient', () => {
        const quoted: Record<string, readonly string[]> = {
            'orientation-reveal': ['\\(+8'], 'orientation-flip': ['D=-8', 'D=0'], 'orientation-area-step': ['\\(8\\)'], 'orientation-explore': ['D=0'],
        };
        for (const [stepId, tokens] of Object.entries(quoted)) {
            const step = lessonOf('orientation').steps.find(s => s.id === stepId)!;
            for (const token of tokens) {
                expect(step.body.sl, `${stepId} sl ${token}`).toContain(token);
                expect(step.body.en, `${stepId} en ${token}`).toContain(token);
            }
        }
        const signs = walk('orientation', steps.slice(2), graph => orient(graph.model.points[0], graph.model.points[1], graph.model.points[2]));
        expect(signs).toEqual([1, -1, 1, 0]);
    });

    test('the status text is correct after a scene change and Back', () => {
        const mounted = mountGraph(createGraph('orientation'));
        try {
            const capabilities = mounted.graph.getLessonCapabilities();
            const checkpoint = capabilities.captureState();
            const status = () => document.querySelector('[data-orientation-readout]')?.textContent;
            const run = (stepId: string) => act(() => {
                capabilities.restoreState(checkpoint);
                for (const action of sceneOf('orientation', stepId)) capabilities.apply(action);
            });
            run('orientation-reveal');
            const reveal = status();
            expect(reveal).toContain('+8');
            expect(document.querySelector('[data-orientation-readout]')?.getAttribute('data-orientation-readout')).toBe('left');
            run('orientation-flip');
            expect(status()).toContain('−8');
            expect(document.querySelector('[data-orientation-readout]')?.getAttribute('data-orientation-readout')).toBe('right');
            run('orientation-reveal');
            expect(status()).toBe(reveal);
        } finally {
            mounted.view.unmount();
        }
    });
});

describe('A2 polygon area: every quoted value is the scene readout', () => {
    const steps = ['area-fan', 'area-predict', 'area-shoelace-step', 'area-reverse', 'area-pick-step', 'area-self-intersecting', 'area-explore'];

    test('the seven scenes show 42, 42, 42, -42, (36, B=16, I=11), a signed sum 0 and (42, B=8, I=18)', () => {
        const seen = walk('polygon-area', steps, graph => {
            const r = areaReadout(graph.model);
            const text = r.kind === 'simple' ? `${r.doubledSigned}:${r.doubledArea}:${r.orientation}:B${r.boundary}:I${r.interior}:${r.pick?.holds}`
                : r.kind === 'signed-sum' ? `sum${r.doubledSum}` : r.reason;
            return [text, graph.overlayShown('fan'), graph.overlayShown('lattice')] as const;
        });
        expect(seen).toEqual([
            ['42:42:ccw:B8:I18:true', true, false],
            ['42:42:ccw:B8:I18:true', false, false],
            ['42:42:ccw:B8:I18:true', true, false],
            ['-42:42:cw:B8:I18:true', true, false],
            ['36:36:ccw:B16:I11:true', false, true],
            ['sum0', true, false],
            ['42:42:ccw:B8:I18:true', true, true],
        ]);
    });

    test('the reversed scene is the graph\'s own reverse order, and the notched area is 18 by Pick', () => {
        const [hull, reversed] = walk('polygon-area', ['area-shoelace-step', 'area-reverse'], graph => graph.model);
        expect(reverseVertices(hull).points).toEqual(reversed.points);
        const [notched] = walk('polygon-area', ['area-pick-step'], graph => areaReadout(graph.model));
        expect(notched.kind === 'simple' && notched.interior! + notched.boundary / 2 - 1).toBe(18);
    });

    test('the quoted values appear in the step text', () => {
        const quoted: Record<string, readonly string[]> = {
            'area-shoelace-step': ['42', '21'], 'area-reverse': ['-42', '21'], 'area-pick-step': ['B=16', 'I=11', '36', '18'], 'area-self-intersecting': ['0'],
            'area-explore': ['21', 'B=8', 'I=18'],
        };
        for (const [stepId, tokens] of Object.entries(quoted)) {
            const step = lessonOf('polygon-area').steps.find(s => s.id === stepId)!;
            for (const token of tokens) {
                expect(step.body.sl, `${stepId} sl ${token}`).toContain(token);
                expect(step.body.en, `${stepId} en ${token}`).toContain(token);
            }
        }
    });
});

describe('point-set scene actions are strict', () => {
    const setPoints = (points: [number, number][], mode: 'points' | 'polygon' = 'points', closed?: boolean): LessonAction =>
        ({kind: 'point-set', operation: 'set-points', mode, points, ...(closed === undefined ? {} : {closed})});
    const overlayAction = (overlay: 'grid' | 'turn' | 'fan' | 'lattice' | 'trace' | 'hull' | 'values', visible = true): LessonAction =>
        ({kind: 'point-set', operation: 'set-overlay', overlay, visible});

    function outcome(id: 'orientation' | 'polygon-area', action: LessonAction): {error?: unknown; points: string; overlays: string} {
        const mounted = mountGraph(createGraph(id));
        try {
            const graph = mounted.graph as unknown as OrientationGraph;
            const before = JSON.stringify(graph.model.points);
            let error: unknown;
            act(() => {
                try { mounted.graph.getLessonCapabilities().apply(action); } catch (caught) { error = caught; }
            });
            return {error, points: before === JSON.stringify(graph.model.points) ? 'unchanged' : 'changed', overlays: JSON.stringify(graph.state.overlays)};
        } finally {
            mounted.view.unmount();
        }
    }

    test.each([
        ['off-grid x', setPoints([[0.5, 0], [1, 1]])],
        ['out of range', setPoints([[0, 0], [2 ** 40, 1]])],
        ['over the three point limit', setPoints([[0, 0], [1, 0], [2, 0], [3, 0]])],
        ['closed in points mode', setPoints([[0, 0], [1, 0]], 'points', true)],
        ['not a pair', {kind: 'point-set', operation: 'set-points', mode: 'points', points: [[1, 2, 3]] as unknown as [number, number][]} as LessonAction],
    ])('orientation rejects %s and keeps the model', (_name, action) => {
        const result = outcome('orientation', action);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.points).toBe('unchanged');
    });

    test('an over-limit polygon is rejected by the area graph too, and a snap never happens', () => {
        const forty = Array.from({length: 41}, (_, i) => [i, i * i % 7] as [number, number]);
        expect(outcome('polygon-area', setPoints(forty, 'polygon', true))).toMatchObject({points: 'unchanged'});
        expect(outcome('polygon-area', setPoints(forty, 'polygon', true)).error).toBeInstanceOf(Error);
        expect(outcome('polygon-area', setPoints([[0, 0], [1.5, 0], [0, 2]], 'polygon', true)).error).toBeInstanceOf(Error);
    });

    test.each([
        ['orientation', 'fan'], ['orientation', 'lattice'], ['orientation', 'hull'], ['orientation', 'trace'],
        ['polygon-area', 'turn'], ['polygon-area', 'hull'], ['polygon-area', 'trace'],
    ] as const)('%s rejects the overlay %s it does not own', (id, name) => {
        const result = outcome(id, overlayAction(name));
        expect(result.error).toBeInstanceOf(UnsupportedLessonActionError);
    });

    test('each graph accepts the overlays it owns, and an unknown name is rejected', () => {
        expect(outcome('orientation', overlayAction('turn', false)).overlays).toContain('"turn":false');
        expect(outcome('orientation', overlayAction('grid')).error).toBeUndefined();
        expect(outcome('polygon-area', overlayAction('lattice', false)).overlays).toContain('"lattice":false');
        expect(outcome('polygon-area', {kind: 'point-set', operation: 'set-overlay', overlay: 'bogus' as 'grid', visible: true}).error)
            .toBeInstanceOf(UnsupportedLessonActionError);
    });

    test('the catalog checks shapes and finiteness only', () => {
        const scene = (action: LessonAction) => ({id: 's', basedOn: 'demonstration-default', actions: [action], expectedState: {sl: 'a', en: 'b'}}) as const;
        expect(() => sceneActions(scene(setPoints([[0, 0]])))).not.toThrow();
        expect(() => sceneActions(scene(setPoints([[0.5, Number.NaN]])))).toThrow(/finite/);
        for (const mode of ['segments', 'intervals'] as const) expect(() => sceneActions(scene({kind: 'point-set', operation: 'set-points', mode, points: []}))).not.toThrow();
        expect(() => sceneActions(scene({kind: 'point-set', operation: 'set-points', mode: 'curve' as 'points', points: []}))).toThrow(/mode/);
        expect(() => sceneActions(scene({kind: 'point-set', operation: 'set-overlay', overlay: 'grid', visible: 1 as unknown as boolean}))).toThrow(/boolean/);
        // off-grid values are the graph's decision, not the catalog's
        expect(() => sceneActions(scene(setPoints([[0.5, 0.25]])))).not.toThrow();
    });
});

describe('predict steps hide the values and reveal steps show them', () => {
    /** Applies each step's scene in its own act so React commits the readout, then reads the DOM attribute. */
    function perStep(id: 'orientation' | 'polygon-area', stepIds: readonly string[], selector: string, attribute: string) {
        const mounted = mountGraph(createGraph(id));
        try {
            const capabilities = mounted.graph.getLessonCapabilities();
            const checkpoint = capabilities.captureState();
            return stepIds.map(stepId => {
                act(() => {
                    capabilities.restoreState(checkpoint);
                    for (const action of sceneOf(id, stepId)) capabilities.apply(action);
                });
                return [(mounted.graph as unknown as OrientationGraph).overlayShown('values'), document.querySelector(selector)?.getAttribute(attribute)] as const;
            });
        } finally {
            mounted.view.unmount();
        }
    }

    test('A1: values are off only in the predict step, and the readout then carries no value', () => {
        const steps = ['orientation-line', 'orientation-predict', 'orientation-reveal', 'orientation-flip', 'orientation-area-step', 'orientation-explore'];
        expect(perStep('orientation', steps, '[data-orientation-readout]', 'data-orientation-value'))
            .toEqual([[true, ''], [false, ''], [true, '8'], [true, '-8'], [true, '8'], [true, '0']]);
    });

    test('A2: values are off in the fan and predict steps, and the readout then carries no area', () => {
        const steps = ['area-fan', 'area-predict', 'area-shoelace-step', 'area-reverse', 'area-pick-step', 'area-self-intersecting', 'area-explore'];
        expect(perStep('polygon-area', steps, '[data-area-readout]', 'data-area-doubled'))
            .toEqual([[false, ''], [false, ''], [true, '42'], [true, '-42'], [true, '36'], [true, '0'], [true, '42']]);
    });
});

describe('worked examples quote the scene readouts', () => {
    const example = (lesson: 'orientation' | 'polygon-area', id: string) => compgeoGuidedLessons.find(l => l.demonstrationId === lesson)!.workedExamples.find(e => e.id === id)!;

    test('A1: the orientation example result is the reveal scene value', () => {
        const [value] = walk('orientation', ['orientation-reveal'], graph => {
            const r = orientationReadout(graph.model.points);
            return r.kind === 'turn' ? r.value : NaN;
        });
        const e = example('orientation', 'orientation-example');
        expect(e.resultLatex).toBe(`D=${value > 0 ? '+' : ''}${value}`);
        expect(e.calculationLatex.endsWith(`=${value}-0`)).toBe(true);
    });

    test('A2: the shoelace and Pick examples use the scene doubled area, B and I', () => {
        const [hull, notched] = walk('polygon-area', ['area-shoelace-step', 'area-pick-step'], graph => areaReadout(graph.model));
        if (hull.kind !== 'simple' || notched.kind !== 'simple') throw new Error('expected simple polygons');
        const shoelace = example('polygon-area', 'area-shoelace-example');
        expect(shoelace.calculationLatex).toContain(`=${hull.doubledSigned},`);
        expect(shoelace.resultLatex).toBe(`A=${Number(hull.doubledArea) / 2}`);
        const pick = example('polygon-area', 'area-pick-example');
        expect(pick.calculationLatex).toBe(`2I+B-2=2\\cdot${notched.interior}+${notched.boundary}-2=${notched.doubledArea}`);
        expect(pick.resultLatex).toBe(`A=\\tfrac{${notched.doubledArea}}{2}=${Number(notched.doubledArea) / 2}`);
    });
});
