import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {projectiveConicsGuidedLessons} from './projectiveConicsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {ThreeViewsGraph} from '../../graphs/projective/ThreeViewsGraph';
import {THREE_VIEWS_ANGLE_STEPS, THREE_VIEWS_LIMIT} from '../../graphs/projective/threeViewsModel';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);

/**
 * K5 (projective-three-views): every scene lands in the state the text states (the real graph, one synchronous sequence of actions, out of
 * order and twice), and every number the lesson quotes is recomputed here with exact integer arithmetic on c in tenths and plain doubles
 * of our own, without the projective kernel: the image conic X^2 + (c^2 - 1) Y^2 + 2cY + 1 = 0 scaled by 100 is 100 X^2 + (k^2 - 100) Y^2
 * + 20k Y + 100 = 0 for c = k / 10, reduced by the gcd; B^2 - 4AC = 4 (1 - c^2) is -12, 0, 4 for c = 2, 1, 0; the determinant is -1. The
 * graph's readout is compared with these numbers, and the quoted text with both.
 */

// ---- Independent exact recomputation -------------------------------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** The reduced image conic A X^2 + C Y^2 + E Y + F = 0 for c = k / 10, from whole numbers only (B = D = 0). */
function reducedImage(k: number) {
    const raw = [100, k * k - 100, 20 * k, 100];
    const g = raw.reduce(gcd, 0);
    const [A, C, E, F] = raw.map(v => v / g);
    return {A, C, E, F};
}
/** B^2 - 4AC of the reduced conic, and the type decided from its sign alone. */
function classification(k: number) {
    const {A, C} = reducedImage(k);
    const discriminant = A * C === 0 ? 0 : -4 * A * C;
    return {discriminant, type: discriminant < 0 ? 'ellipse' : discriminant === 0 ? 'parabola' : 'hyperbola'} as const;
}
/** The 3 x 3 determinant of [[A,0,D/2],[0,C,E/2],[D/2,E/2,F]] with D = 0 is A (C F - E^2/4); divided by A^3 (the scale cubed) it is the unscaled one. */
function normalisedDeterminant(k: number): number {
    const {A, C, E, F} = reducedImage(k);
    return (4 * A * C * F - A * E * E) / (4 * A * A * A);
}
const contactOf = (k: number) => (k * k > 100 ? 'misses' : k * k === 100 ? 'touches' : 'cuts');

const term = (coefficient: number, body: string, first: boolean, ascii: boolean): string => {
    if (coefficient === 0) return '';
    const sign = coefficient < 0 ? (ascii ? '-' : '−') : '+';
    const size = Math.abs(coefficient);
    const digits = body !== '' && size === 1 ? '' : String(size);
    if (first) return `${coefficient < 0 ? sign : ''}${digits}${body}`;
    return ascii ? `${sign}${digits}${body}` : ` ${sign} ${digits}${body}`;
};
/** `X^2+3Y^2+4Y+1` in the lesson's TeX (ascii) or `X² + 3Y² + 4Y + 1` as the graph prints it, with `= 0` or `=0`. */
function equation(k: number, ascii: boolean): string {
    const {A, C, E, F} = reducedImage(k);
    const sq = ascii ? '^2' : '²';
    const parts = [term(A, `X${sq}`, true, ascii), term(C, `Y${sq}`, false, ascii), term(E, 'Y', false, ascii), term(F, '', false, ascii)].join('');
    return ascii ? `${parts}=0` : `${parts} = 0`;
}

/** The point of the circle at `angle` steps of 15 degrees and its image (null when it lies on L); only multiples of 6 steps are taken as exact. */
function pointOf(k: number, angle: number) {
    const theta = angle * 15 * Math.PI / 180;
    const exact = angle % 6 === 0 ? [[1, 0], [0, 1], [-1, 0], [0, -1]][angle / 6] : undefined;
    const x = exact ? exact[0] : Math.cos(theta);
    const y = exact ? exact[1] : Math.sin(theta);
    const onL = exact !== undefined && exact[1] * 10 === k;
    const c = k / 10;
    return {x, y, image: onL ? null : {X: x / (y - c), Y: 1 / (y - c)}, direction: onL ? [x, 1] : null};
}
/** The points where L meets the circle (x = ±sqrt(100 - k^2) / 10, y = c), left to right. */
function idealPoints(k: number): number[] {
    if (k * k > 100) return [];
    if (k * k === 100) return [0];
    const x = Math.sqrt(100 - k * k) / 10;
    return [-x, x];
}

// ---- Lesson accessors ----------------------------------------------------------------------------------------------------------------

const lesson: GuidedLesson = projectiveConicsGuidedLessons.find(entry => entry.demonstrationId === 'projective-three-views')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
type Language = 'sl' | 'en';
/** The text fields of a step that quote scene values (the worked example is checked on its own). */
const fields = (step: GuidedLessonStep, language: Language): string[] =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])];
const prose = (step: GuidedLessonStep, language: Language) => fields(step, language).join(' ');

interface Expected {
    /** c in tenths. */
    readonly k: number;
    /** The angle step of the shown point, or null when the point is off. */
    readonly angle: number | null;
}
const SCENES: Record<string, Expected> = {
    'three-views-source': {k: 20, angle: null},
    'three-views-predict': {k: 20, angle: null},
    'three-views-ellipse': {k: 20, angle: 3},
    'three-views-parabola': {k: 10, angle: 6},
    'three-views-hyperbola': {k: 0, angle: 0},
    'three-views-infinity': {k: 0, angle: null},
    'three-views-explore': {k: -15, angle: null},
};

function mount() {
    const graph = createGraph('projective-three-views');
    if (!(graph instanceof ThreeViewsGraph)) throw new Error('projective-three-views must be the three-views graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? null;
const statusNode = () => document.querySelector('[data-projective-status]');

/** A number as the graph prints it (the decimal comma in Slovenian, a true minus sign) or as the lesson writes it in TeX (`{,}` and `-`). */
const shown = (value: number, language: Language, digits: number): string => {
    const raw = String(Number(value.toFixed(digits)));
    const text = language === 'sl' ? raw.replace('.', ',') : raw;
    return text.replace('-', '−');
};
const printedPair = (a: number, b: number, language: Language) => `(${shown(a, language, 4)}, ${shown(b, language, 4)})`;
const texNumber = (value: number, language: Language, digits = 4): string => {
    const raw = String(Number(value.toFixed(digits)));
    return language === 'sl' ? raw.replace('.', '{,}') : raw;
};
/** A point as the lesson text writes it: `(0{,}7071;\ 0{,}7071)` in Slovenian, `(0.7071,\ 0.7071)` in English; whole numbers get no separator padding. */
const texPair = (a: number, b: number, language: Language, decimals: boolean): string =>
    decimals ? `(${texNumber(a, language)}${language === 'sl' ? ';' : ','}\\ ${texNumber(b, language)})` : `(${a},${b})`;

// ---- Tests ---------------------------------------------------------------------------------------------------------------------------

test('K5 has seven ordered steps, each with a scene of its own that uses only three-views operations', () => {
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
    for (const step of lesson.steps) {
        const operations = actionsOf(step).flatMap(action => (action.kind === 'projective' ? [action.operation] : []));
        expect(operations.length, step.id).toBeGreaterThan(0);
        expect(operations.every(operation => operation.startsWith('three-views-')), step.id).toBe(true);
    }
});

test('K5: the spec numbers, recomputed from c in tenths with whole numbers (-12, 0, 4; determinant -1; the equations)', () => {
    expect([20, 10, 0].map(k => classification(k))).toEqual([
        {discriminant: -12, type: 'ellipse'}, {discriminant: 0, type: 'parabola'}, {discriminant: 4, type: 'hyperbola'},
    ]);
    // B^2 - 4AC = 4 (1 - c^2) for the unscaled equation; the three quoted values have scale 1, so the reduced and unscaled values agree.
    for (const k of [20, 10, 0]) {
        expect(reducedImage(k).A, `scale at k=${k}`).toBe(1);
        expect(classification(k).discriminant * 100).toBe(4 * (100 - k * k));
    }
    expect([20, 10, 0, -15, 5, -25].map(k => normalisedDeterminant(k))).toEqual([-1, -1, -1, -1, -1, -1]);
    expect([20, 10, 0].map(k => equation(k, false))).toEqual(['X² + 3Y² + 4Y + 1 = 0', 'X² + 2Y + 1 = 0', 'X² − Y² + 1 = 0']);
    // The parabola of c = 1 is Y = -(X^2 + 1) / 2 and the hyperbola of c = 0 is Y^2 - X^2 = 1.
    const parabola = reducedImage(10);
    expect([parabola.A, parabola.C, parabola.E, parabola.F]).toEqual([1, 0, 2, 1]);
    const hyperbola = reducedImage(0);
    expect([hyperbola.A, hyperbola.C, hyperbola.E, hyperbola.F]).toEqual([1, -1, 0, 1]);
    // The type is decided from the integer k alone: c = 1 is exactly the parabola, its neighbours are not.
    expect([9, 10, 11].map(k => classification(k).type)).toEqual(['hyperbola', 'parabola', 'ellipse']);
    // The images of 200 points of the circle satisfy the image equation (a check on drawn doubles, in the spec's c = 2, 1, 0, 1/2).
    for (const k of [20, 10, 0, 5]) {
        const c = k / 10;
        for (let i = 0; i < 200; i++) {
            const theta = (2 * Math.PI * (i + 0.5)) / 200;
            const x = Math.cos(theta);
            const y = Math.sin(theta);
            if (Math.abs(y - c) < 1e-3) continue;
            const X = x / (y - c);
            const Y = 1 / (y - c);
            const terms = [X * X, (c * c - 1) * Y * Y, 2 * c * Y, 1];
            const residual = Math.abs(terms.reduce((a, b) => a + b, 0)) / terms.reduce((a, b) => a + Math.abs(b), 0);
            expect(residual, `k=${k} i=${i}`).toBeLessThan(1e-12);
        }
    }
});

test('K5: every scene, applied in one synchronous sequence out of order and twice, lands on the state its text states', () => {
    const m = mount();
    try {
        const order = ['three-views-hyperbola', 'three-views-explore', 'three-views-source', 'three-views-parabola', 'three-views-infinity', 'three-views-ellipse', 'three-views-predict'];
        expect([...order].sort()).toEqual(Object.keys(SCENES).sort());
        for (const language of ['sl', 'en'] as const) {
            act(() => { setLanguage(language); });
            for (const id of [...order, ...[...order].reverse()]) {
                const e = SCENES[id];
                m.scene(id);
                const model = m.graph.model;
                expect([model.c, model.pointOn], `${id} ${language} model`).toEqual([e.k, e.angle !== null]);
                if (e.angle !== null) expect(model.angle, `${id} ${language} angle`).toBe(e.angle);
                const {type, discriminant} = classification(e.k);
                expect(statusNode()?.getAttribute('data-projective-status'), `${id} ${language} type`).toBe(type);
                expect(statusNode()?.getAttribute('data-projective-contact'), `${id} ${language} contact`).toBe(contactOf(e.k));
                expect(line('equation'), `${id} ${language} equation`).toContain(equation(e.k, false));
                expect(line('discriminant'), `${id} ${language} discriminant`).toContain(`B² − 4AC = ${shown(discriminant, language, 0)}`);
                expect(line('determinant'), `${id} ${language} determinant`).toContain('−1');
                // The points at infinity: none, the point of tangency, or the two intersections with their directions.
                const ideal = idealPoints(e.k);
                const infinity = line('infinity')!;
                if (ideal.length === 0) expect(infinity, `${id} ${language} no infinity`).not.toMatch(/\(/);
                for (const x of ideal) {
                    expect(infinity, `${id} ${language} ideal point`).toContain(printedPair(x, e.k / 10, language));
                    expect(infinity, `${id} ${language} ideal direction`).toContain(printedPair(x, 1, language));
                }
                const point = line('point');
                if (e.angle === null) {
                    expect(point, `${id} ${language} no point`).toBeNull();
                } else {
                    const p = pointOf(e.k, e.angle);
                    expect(point, `${id} ${language} P`).toContain(printedPair(p.x, p.y, language));
                    if (p.image) expect(point, `${id} ${language} P'`).toContain(printedPair(p.image.X, p.image.Y, language));
                    else expect(point, `${id} ${language} P at infinity`).toContain(printedPair(p.direction![0], p.direction![1], language));
                }
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

// ---- The text ------------------------------------------------------------------------------------------------------------------------

/** Every `\(...\)` group of a text, with the delimiters removed. */
const mathOf = (text: string): string[] => [...text.matchAll(/\\\((.*?)\\\)/g)].map(match => match[1]);
/** A TeX group with the spaces and `\ ` thin spaces taken out. */
const squash = (math: string) => math.replace(/\\ /g, ' ').replace(/\s+/g, '');

test('K5: every c, equation, B^2 - 4AC, determinant, point and direction a step quotes, in each text field separately, is that scene\'s', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, e] of Object.entries(SCENES)) {
            const step = stepOf(id);
            const {discriminant} = classification(e.k);
            const c = e.k / 10;
            for (const field of fields(step, language)) {
                const math = mathOf(field).map(squash);
                // L is quoted as `L\colon y=c` and only with this scene's c.
                for (const m of math.filter(entry => entry.startsWith('L\\colon') && !entry.endsWith('y=c'))) {
                    expect(m, `${id} ${language} L: ${field}`).toBe(`L\\colony=${texNumber(c, language, 1)}`);
                }
                // The equation of the image, where quoted, is this scene's.
                for (const m of math.filter(entry => entry.startsWith('X^2') && entry.endsWith('=0'))) {
                    expect(m, `${id} ${language} equation: ${field}`).toBe(equation(e.k, true));
                }
                // B^2 - 4AC, and the determinant, where quoted.
                for (const m of math.filter(entry => entry.startsWith('B^2-4AC='))) {
                    expect(m.match(/^B\^2-4AC=(-?\d+)/)?.[1], `${id} ${language} discriminant: ${field}`).toBe(String(discriminant));
                }
                for (const m of math.filter(entry => entry.startsWith('P=') || entry.startsWith('P\'='))) {
                    const p = e.angle === null ? undefined : pointOf(e.k, e.angle);
                    expect(p, `${id} ${language} a point is quoted but the scene shows none: ${field}`).toBeDefined();
                    const decimals = /\d(\{,\}|\.)\d/.test(m);
                    if (m.startsWith('P=')) expect(m, `${id} ${language} P: ${field}`).toBe(`P=${texPair(p!.x, p!.y, language, decimals).replace(/\\ /g, '')}`);
                    else {
                        expect(p!.image, `${id} ${language} P' is finite: ${field}`).not.toBeNull();
                        expect(m, `${id} ${language} P': ${field}`).toBe(`P'=${texPair(p!.image!.X, p!.image!.Y, language, true).replace(/\\ /g, '')}`);
                    }
                }
                // Every decimal in the text belongs to the scene (c, a point or its image) or is a stated bound of the slider or the clipped values of the last step.
                const allowed = new Set<string>();
                if (e.angle !== null) {
                    const p = pointOf(e.k, e.angle);
                    for (const v of [p.x, p.y, p.image?.X ?? 0, p.image?.Y ?? 0]) allowed.add(texNumber(Math.abs(v), language));
                }
                if (id === 'three-views-explore') for (const v of [2.5, 1.5, 0.9, 1.1]) allowed.add(texNumber(v, language, 1));
                for (const m of field.match(/\d+(?:\{,\}|\.)\d+/g) ?? []) expect(allowed, `${id} ${language} decimal ${m}: ${field}`).toContain(m);
            }
        }
    }
});

test('K5: the contact of L with the circle, the directions at infinity and the hyperbola breaking are stated (acceptances 3 and 5)', () => {
    const words = {
        misses: {sl: /ne seka krožnice/, en: /misses the circle/},
        touches: {sl: /se dotika krožnice/, en: /touches the circle/},
        cuts: {sl: /seka krožnico/, en: /cuts the circle/},
    } as const;
    for (const language of ['sl', 'en'] as const) {
        for (const [id, e] of Object.entries(SCENES)) {
            // Acceptance 3: |c| > 1 says that L misses the circle; the tangent and secant scenes say so too. Step 6 is about the line at infinity.
            if (id === 'three-views-infinity') continue;
            expect(prose(stepOf(id), language), `${id} ${language}`).toMatch(words[contactOf(e.k)][language]);
        }
        expect(stepOf('three-views-source').scene!.expectedState[language]).toContain('|c|>1');
        // The point of tangency is the image's only point at infinity (acceptance 3).
        expect(prose(stepOf('three-views-parabola'), language)).toMatch(language === 'sl' ? /edina točka slike v neskončnosti/ : /only point of the image at infinity/);
        expect(squash(prose(stepOf('three-views-parabola'), language))).toContain('(0,1)');
        // Acceptance 5: the hyperbola breaks at the two images of the points at infinity and the branches are never joined.
        expect(stepOf('three-views-hyperbola').explanation[language]).toMatch(language === 'sl'
            ? /se pretrga v obeh slikah teh točk in obe veji nista nikoli povezani/ : /breaks at the two images of these points, and the two branches are never joined/);
        // Both directions of the hyperbola are quoted.
        for (const key of ['(-1,1)', '(1,1)']) expect(stepOf('three-views-hyperbola').explanation[language]).toContain(key);
        // Step 6 links the K4 lesson in prose and does not mention S6 anywhere.
        expect(stepOf('three-views-infinity').explanation[language]).toMatch(language === 'sl' ? /lekciji o stožnici skozi pet točk[\s\S]*nad \\\(1\\\)/ : /lesson on a conic through five points[\s\S]*above \\\(1\\\)/);
        expect(JSON.stringify(lesson)).not.toMatch(/\bS6\b/);
    }
});

test('K5: the classification theorem is a cited theorem and the drawn family an illustration, not a proof (acceptance 4)', () => {
    for (const language of ['sl', 'en'] as const) {
        const theorem = lesson.formulaBlocks.find(block => block.id === 'three-views-map')!.explanation[language];
        expect(theorem).toMatch(language === 'sl'
            ? /Izrek \(razvrstitev stožnic\)[\s\S]*projektivno enaki[\s\S]*klasifikacija stožnic[\s\S]*FMF[\s\S]*ilustracija, ne dokaz/
            : /Theorem \(classification of conics\)[\s\S]*projectively equivalent[\s\S]*klasifikacija stožnic[\s\S]*FMF[\s\S]*illustration, not a proof/);
        expect(prose(stepOf('three-views-explore'), language)).toMatch(language === 'sl' ? /ilustracija izreka[\s\S]*ne njegov dokaz/ : /illustrate the classification theorem[\s\S]*not its proof/);
    }
    expect(JSON.stringify(lesson.sources)).toContain('klasifikacija stožnic');
});

test('K5: the worked example\'s three equations are the recomputed ones', () => {
    const example = lesson.workedExamples.find(entry => entry.id === 'k5-image-equation')!;
    expect(stepOf('three-views-ellipse').workedExampleId).toBe(example.id);
    for (const language of ['sl', 'en'] as const) {
        const equations = mathOf(example.check[language]).map(squash).filter(entry => entry.startsWith('X^2') && entry.endsWith('=0'));
        // The general equation, then c = 2, 1 and 0.
        expect(equations).toEqual(['X^2+(c^2-1)Y^2+2cY+1=0', equation(20, true), equation(10, true), equation(0, true)]);
    }
});

test('K5: the strict scene operations refuse bad values and the other graphs\' operations', () => {
    const m = mount();
    try {
        const apply = (action: LessonAction) => () => m.capabilities.apply(action);
        expect(apply({kind: 'projective', operation: 'three-views-set-c', tenths: THREE_VIEWS_LIMIT + 1})).toThrow('three-views-set-c');
        expect(apply({kind: 'projective', operation: 'three-views-set-c', tenths: 0.5})).toThrow('three-views-set-c');
        expect(apply({kind: 'projective', operation: 'three-views-set-angle', step: THREE_VIEWS_ANGLE_STEPS})).toThrow('three-views-set-angle');
        expect(apply({kind: 'projective', operation: 'five-point-set-extrapolation', on: true})).toThrow('five-point-set-extrapolation');
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
