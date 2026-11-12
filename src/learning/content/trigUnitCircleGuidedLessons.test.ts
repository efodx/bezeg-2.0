/**
 * TR1 and TR2 (unit-circle): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a
 * restored checkpoint, out of order and twice), and every decimal the lessons quote equals a value recomputed here with `Math`.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {unitCircleAdditionLesson, unitCircleRadianLesson} from './trigUnitCircleGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {UnitCircleGraph} from '../../graphs/trig/UnitCircleGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const rad = (degrees: number) => degrees * Math.PI / 180;
const cos = (degrees: number) => Math.cos(rad(degrees));
const sin = (degrees: number) => Math.sin(rad(degrees));

interface Expected {
    readonly first: number;
    readonly second?: number;
    readonly cosine?: boolean;
    readonly symmetries?: boolean;
    readonly addition?: boolean;
    /** Decimals (7 places) the step's text may quote besides cos and sin of the first angle. */
    readonly extra?: readonly number[];
}

const TR1: Record<string, Expected> = {
    'tr1-start': {first: 0},
    'tr1-arc': {first: 114.5, extra: [180 / Math.PI, 3 * Math.PI / 4, Math.cos(2), Math.sin(2), 2 * 180 / Math.PI]},
    'tr1-sine': {first: 30},
    'tr1-cosine': {first: 200, cosine: true},
    'tr1-pythagoras': {first: 30, cosine: true},
    'tr1-special': {first: 45, cosine: true},
    'tr1-explore': {first: 60, cosine: true},
};
const TR2: Record<string, Expected> = {
    'tr2-reflect': {first: 30, symmetries: true},
    'tr2-identities': {first: 30, symmetries: true},
    'tr2-frame': {first: 60, second: 45, addition: true},
    'tr2-rotated-point': {first: 60, second: 45, addition: true},
    'tr2-formulas': {first: 60, second: 45, addition: true},
    'tr2-numeric': {first: 60, second: 45, addition: true},
    'tr2-explore': {first: 60, second: 45, addition: true, symmetries: true},
};

const stepOf = (lesson: GuidedLesson, stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
/** All the text of a step in a language: the step itself and its worked example. */
const proseOf = (lesson: GuidedLesson, step: GuidedLessonStep, language: 'sl' | 'en') => {
    const pick = (value: unknown): string => JSON.stringify(value, (_key, item) => (item && typeof item === 'object' && 'sl' in item && 'en' in item ? (item as Record<string, string>)[language] : item));
    return pick([step, lesson.workedExamples.filter(example => example.id === step.workedExampleId)]);
};
const decimalsIn = (prose: string, language: 'sl' | 'en'): number[] => {
    const pattern = language === 'sl' ? /-?\d+\{,\}\d+/g : /-?\d+\.\d+/g;
    return (prose.match(pattern) ?? []).map(item => Number(item.replace('{,}', '.')));
};
const fixed = (value: number, language: 'sl' | 'en', places = 7) => {
    const text = (Math.abs(value) < 5e-8 ? 0 : value).toFixed(places).replace(/0+$/, '').replace(/\.$/, '');
    return language === 'sl' ? text.replace('.', '{,}') : text;
};
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
/** The numbers of a readout text, with the Unicode minus and the decimal comma read. */
const numbers = (text: string | null) => (text ?? '').replace(/√\d+\/\d+/g, '').replace(/−/g, '-').replace(/(\d),(\d)/g, '$1.$2').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];

function mount() {
    const graph = createGraph('unit-circle');
    if (!(graph instanceof UnitCircleGraph)) throw new Error('unit-circle must be the unit-circle graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, checkpoint,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (lesson: GuidedLesson, stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(stepOf(lesson, stepId).scene!)) capabilities.apply(action);
        }),
    };
}

describe.each([
    ['TR1', unitCircleRadianLesson, TR1, 'radian-sine-cosine'],
    ['TR2', unitCircleAdditionLesson, TR2, 'addition-formulas'],
] as const)('%s', (name, lesson, scenes, section) => {
    test('has seven ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
        const owned = getChapterOwnedLessons('trigonometry')!.lesson(section)!;
        expect(owned.steps).toHaveLength(7);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test(`${name}: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice`, () => {
        const m = mount();
        try {
            const ids = Object.keys(scenes);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const expected = scenes[id];
                m.scene(lesson, id);
                m.scene(lesson, id);
                expect({id, angle: m.graph.state.angle, second: m.graph.state.secondAngle, cosine: m.graph.state.showCosine,
                    symmetries: m.graph.state.showSymmetries, addition: m.graph.state.showAddition}).toEqual({
                    id, angle: expected.first * 2, second: expected.second === undefined ? 90 : expected.second * 2,
                    cosine: !!expected.cosine, symmetries: !!expected.symmetries, addition: !!expected.addition,
                });
                const [x, y] = [numbers(readout('cos')).at(-1)!, numbers(readout('sin')).at(-1)!];
                expect(x, `${id} cos`).toBeCloseTo(cos(expected.first), 6);
                expect(y, `${id} sin`).toBeCloseTo(sin(expected.first), 6);
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test(`${name}: every decimal the text quotes equals a recomputed value of its scene, in both languages`, () => {
        for (const [id, expected] of Object.entries(scenes)) {
            const step = stepOf(lesson, id);
            const second = expected.second ?? 45;
            // Values the text may quote: the point, the second point and the sum point of the scene, the special values, the spec's x = 0.5 rad.
            const allowed = [
                cos(expected.first), sin(expected.first), ...(expected.extra ?? []),
                cos(second), sin(second), cos(expected.first + second), sin(expected.first + second),
                Math.SQRT1_2, Math.sqrt(3) / 2, 0.5, Math.sin(0.5), Math.cos(0.5), expected.first, second,
            ];
            for (const language of ['sl', 'en'] as const) {
                for (const value of decimalsIn(proseOf(lesson, step, language), language)) {
                    const places = String(Math.abs(value)).split('.')[1]?.length ?? 0;
                    const tolerance = places >= 6 ? 5e-8 : 0.5 * 10 ** -places + 1e-12;
                    expect(allowed.some(candidate => Math.abs(Math.abs(candidate) - Math.abs(value)) <= tolerance), `${id} ${language} ${value}`).toBe(true);
                }
            }
        }
    });
});

test('TR1 quotes the values of its special and sample angles, in both languages', () => {
    const quoted: [string, number, string][] = [
        ['tr1-start', 0, '0'],
        ['tr1-arc', 114.5, fixed(cos(114.5), 'sl')],
        ['tr1-arc', 114.5, fixed(sin(114.5), 'sl')],
        ['tr1-sine', 30, fixed(cos(30), 'sl')],
        ['tr1-cosine', 200, fixed(cos(200), 'sl')],
        ['tr1-cosine', 200, fixed(sin(200), 'sl')],
        ['tr1-special', 45, fixed(cos(45), 'sl')],
    ];
    for (const [id, , sl] of quoted) {
        const step = stepOf(unitCircleRadianLesson, id);
        if (sl === '0') continue;
        expect(proseOf(unitCircleRadianLesson, step, 'sl'), `${id} sl ${sl}`).toContain(sl);
        expect(proseOf(unitCircleRadianLesson, step, 'en'), `${id} en ${sl}`).toContain(sl.replace('{,}', '.'));
    }
});

test('TR1 readouts at 30, 114.5 and 200 degrees show the quoted values', () => {
    const m = mount();
    try {
        m.scene(unitCircleRadianLesson, 'tr1-sine');
        expect(readout('cos')).toBe('√3/2 ≈ 0,8660254');
        expect(readout('sin')).toBe('1/2 ≈ 0,5');
        m.scene(unitCircleRadianLesson, 'tr1-arc');
        expect(readout('cos')).toContain('-0,4146932'.replace('-', '−'));
        expect(readout('sin')).toContain('0,9099613');
        m.scene(unitCircleRadianLesson, 'tr1-cosine');
        expect(readout('cos')).toContain('−0,9396926');
        expect(readout('sin')).toContain('−0,3420201');
    } finally {
        m.mounted.view.unmount();
    }
});

test('TR2 readouts: the three images at 30 degrees and the sum at 60 + 45 degrees', () => {
    const m = mount();
    try {
        m.scene(unitCircleAdditionLesson, 'tr2-reflect');
        const x = cos(30);
        const y = sin(30);
        const near = (text: string | null, a: number, b: number) => {
            const [px, py] = numbers(text).slice(-2);
            expect(px).toBeCloseTo(a, 6);
            expect(py).toBeCloseTo(b, 6);
        };
        near(readout('symmetry-x'), x, -y);
        near(readout('symmetry-y'), -x, y);
        near(readout('symmetry-origin'), -x, -y);
        m.scene(unitCircleAdditionLesson, 'tr2-numeric');
        expect(numbers(readout('sum-angle'))).toEqual([105]);
        near(readout('sum-point'), cos(105), sin(105));
        expect(cos(105)).toBeCloseTo(cos(60) * cos(45) - sin(60) * sin(45), 12);
        expect(sin(105)).toBeCloseTo(sin(60) * cos(45) + cos(60) * sin(45), 12);
    } finally {
        m.mounted.view.unmount();
    }
});

test('restore returns the free state: 60 and 45 degrees, every overlay off', () => {
    const m = mount();
    try {
        m.scene(unitCircleAdditionLesson, 'tr2-explore');
        expect(m.graph.state.showAddition && m.graph.state.showSymmetries).toBe(true);
        act(() => { m.capabilities.restoreState(m.checkpoint); });
        const state = m.graph.state;
        expect([state.angle, state.secondAngle, state.showCosine, state.showSymmetries, state.showAddition]).toEqual([120, 90, false, false, false]);
    } finally {
        m.mounted.view.unmount();
    }
});
