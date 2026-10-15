import {LessonAction, UnsupportedLessonActionError} from '../../../learning/model';
import {LessonActionRegistry} from './LessonActionRegistry';
import {GUIDED_LESSON_AVAILABLE_IDS, getLessonForDemonstration} from '../../../learning/runtime/lessonCatalog';
import {graphFactories} from '../../../Routes';

const polygon: LessonAction = {kind: 'curve-visibility', target: 'control-polygon', visible: true};
const hull: LessonAction = {kind: 'curve-visibility', target: 'convex-hull', visible: true};

describe('LessonActionRegistry', () => {
    test('rejects an action nobody registered', () => {
        const registry = new LessonActionRegistry();
        expect(registry.handles(polygon)).toBe(false);
        expect(() => registry.apply(polygon)).toThrow(UnsupportedLessonActionError);
    });

    test('a discriminated handler wins over the handler of its kind and only matches its own target', () => {
        const calls: string[] = [];
        const registry = new LessonActionRegistry()
            .on('curve-visibility', () => calls.push('kind'))
            .onDiscriminated('curve-visibility', 'control-polygon', () => calls.push('polygon'));
        registry.apply(polygon);
        registry.apply(hull);
        expect(calls).toEqual(['polygon', 'kind']);
    });

    test('a discriminated handler alone does not handle other targets', () => {
        const registry = new LessonActionRegistry().onDiscriminated('curve-visibility', 'control-polygon', () => undefined);
        expect(registry.handles(polygon)).toBe(true);
        expect(registry.handles(hull)).toBe(false);
        expect(registry.handles({kind: 'parameter', name: 't', value: 0.5})).toBe(false);
    });

    test('a later registration replaces the earlier one and can extend it through `previous`', () => {
        const calls: string[] = [];
        const registry = new LessonActionRegistry()
            .onDiscriminated('curve-visibility', 'control-polygon', () => calls.push('shared'))
            .onDiscriminated('curve-visibility', 'control-polygon', (action, previous) => {
                previous(action);
                calls.push('extension');
            });
        registry.apply(polygon);
        expect(calls).toEqual(['shared', 'extension']);

        calls.length = 0;
        registry.onDiscriminated('curve-visibility', 'control-polygon', () => calls.push('replacement'));
        registry.apply(polygon);
        expect(calls).toEqual(['replacement']);
    });

    test('`previous` of a first registration rejects the action', () => {
        const registry = new LessonActionRegistry().on('subdivide', (action, previous) => previous(action));
        expect(() => registry.apply({kind: 'subdivide'})).toThrow(UnsupportedLessonActionError);
    });

    test('features contribute handlers through `use`', () => {
        const calls: string[] = [];
        const registry = new LessonActionRegistry().use(r => r.on('subdivide', () => calls.push('feature')));
        registry.apply({kind: 'subdivide'});
        expect(calls).toEqual(['feature']);
    });
});

describe('lesson actions resolve through each demonstration graph', () => {
    function lessonActions(id: (typeof GUIDED_LESSON_AVAILABLE_IDS)[number]): LessonAction[] {
        const lesson = getLessonForDemonstration(id)!;
        const actions: LessonAction[] = [];
        for (const step of lesson.steps) {
            actions.push(...(step.scene?.actions ?? []));
            if (step.action) actions.push(step.action.action);
            for (const frame of step.frames ?? []) {
                if (frame.action) actions.push(frame.action.action);
                if (frame.animation) actions.push({kind: 'animation', animationId: frame.animation.animationId, command: 'play'});
            }
        }
        return actions;
    }

    test('every guided lesson has a graph factory', () => {
        for (const id of GUIDED_LESSON_AVAILABLE_IDS) expect(graphFactories[id]).toBeDefined();
    });

    test.each([...GUIDED_LESSON_AVAILABLE_IDS])('%s: every lesson action has a handler', id => {
        const graph = graphFactories[id]();
        const actions = lessonActions(id);
        expect(actions.length).toBeGreaterThan(0);
        const unsupported = actions.filter(action => !graph.supportsLessonAction(action)).map(action => JSON.stringify(action));
        expect(unsupported).toEqual([]);
    });

    test('a graph rejects an action of another demonstration family', () => {
        const bezier = graphFactories['bezier']() as unknown as { applyLessonAction(action: LessonAction): void };
        expect(() => bezier.applyLessonAction({kind: 'function-parameter', name: 'a', value: 1})).toThrow(UnsupportedLessonActionError);
        expect(() => bezier.applyLessonAction({kind: 'bernstein-degree', degree: 2})).toThrow(UnsupportedLessonActionError);
        const bernstein = graphFactories['bernstein']() as unknown as { applyLessonAction(action: LessonAction): void };
        expect(() => bernstein.applyLessonAction(polygon)).toThrow(UnsupportedLessonActionError);
    });

    test('rejects animation ids and commands a graph does not support', () => {
        const registry = new LessonActionRegistry().onDiscriminated('animation', 'decasteljau', () => undefined,
            {supports: action => action.command === 'play'});
        expect(registry.handles({kind: 'animation', animationId: 'decasteljau', command: 'play'})).toBe(true);
        expect(() => registry.apply({kind: 'animation', animationId: 'bisection', command: 'play'})).toThrow(UnsupportedLessonActionError);
        expect(() => registry.apply({kind: 'animation', animationId: 'decasteljau', command: 'next-step'})).toThrow(UnsupportedLessonActionError);
        expect(() => registry.apply({kind: 'animation', animationId: 'unknown' as 'bisection', command: 'play'})).toThrow(UnsupportedLessonActionError);
    });

    test('De Casteljau keeps its frame commands and rejects iteration commands and other animations', () => {
        const graph = graphFactories['decasteljau']() as unknown as {
            applyLessonAction(action: LessonAction): void; supportsLessonAction(action: LessonAction): boolean;
        };
        for (const command of ['play', 'pause', 'replay', 'stop'] as const) {
            expect(graph.supportsLessonAction({kind: 'animation', animationId: 'decasteljau', command})).toBe(true);
        }
        for (const command of ['next-step', 'reset'] as const) {
            const action: LessonAction = {kind: 'animation', animationId: 'decasteljau', command};
            expect(graph.supportsLessonAction(action)).toBe(false);
            expect(() => graph.applyLessonAction(action)).toThrow(UnsupportedLessonActionError);
        }
        const bisection: LessonAction = {kind: 'animation', animationId: 'bisection', command: 'play'};
        expect(() => graph.applyLessonAction(bisection)).toThrow(UnsupportedLessonActionError);
    });
});
