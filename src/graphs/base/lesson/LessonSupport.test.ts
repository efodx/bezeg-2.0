import {LessonAction, UnsupportedLessonActionError} from '../../../learning/model';
import {LessonActionRegistry} from './LessonActionRegistry';
import {graphFactories} from '../../../Routes';

describe('support is precise', () => {
    test('a handler with a `supports` predicate handles only the actions it accepts, and an override inherits it', () => {
        const calls: string[] = [];
        const registry = new LessonActionRegistry()
            .on('function-parameter', action => calls.push(action.name), {supports: action => action.name === 'a'})
            .on('function-parameter', (action, previous) => previous(action));
        expect(registry.handles({kind: 'function-parameter', name: 'a', value: 1})).toBe(true);
        expect(registry.handles({kind: 'function-parameter', name: 'b', value: 1})).toBe(false);
        expect(() => registry.apply({kind: 'function-parameter', name: 'b', value: 1})).toThrow(UnsupportedLessonActionError);
        registry.apply({kind: 'function-parameter', name: 'a', value: 1});
        expect(calls).toEqual(['a']);
    });

    const supports = (id: keyof typeof graphFactories, action: LessonAction) => graphFactories[id]().supportsLessonAction(action);

    test('function graphs handle only the parameters, elements and choices they own', () => {
        expect(supports('linear-function', {kind: 'function-parameter', name: 'k', value: 1})).toBe(true);
        expect(supports('linear-function', {kind: 'function-parameter', name: 'a', value: 1})).toBe(false);
        expect(supports('linear-function', {kind: 'function-visibility', target: 'tangent', visible: true})).toBe(false);
        expect(supports('exponential-function', {kind: 'function-visibility', target: 'mirror', visible: true})).toBe(true);
        expect(supports('exponential-function', {kind: 'function-visibility', target: 'reference', visible: true})).toBe(false);
        expect(supports('trigonometric-functions', {kind: 'function-choice', name: 'trig-function', value: 'sin'})).toBe(true);
        expect(supports('trigonometric-functions', {kind: 'function-choice', name: 'area-mode', value: 'between'})).toBe(false);
        expect(supports('continuity', {kind: 'function-parameter', name: 'n', value: 1})).toBe(false);
    });

    test('curve graphs handle the scheme and weights only when their curves can show them', () => {
        const scheme: LessonAction = {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true};
        const weights: LessonAction = {kind: 'curve-visibility', target: 'weights', visible: true};
        expect(supports('decasteljau', scheme)).toBe(true);
        expect(supports('decasteljau', weights)).toBe(false);
        expect(supports('rational-decasteljau', weights)).toBe(true);
        expect(supports('rational', weights)).toBe(true);
        expect(supports('spline-cn', scheme)).toBe(false);
        expect(supports('spline-cn', weights)).toBe(false);
        expect(supports('bezier', {kind: 'curve-visibility', target: 'control-polygon', visible: true})).toBe(true);
        const fullCurve: LessonAction = {kind: 'curve-visibility', target: 'decasteljau-full-curve', visible: true};
        expect(supports('decasteljau', fullCurve)).toBe(true);
        expect(supports('bezier', fullCurve)).toBe(false);
    });
});
