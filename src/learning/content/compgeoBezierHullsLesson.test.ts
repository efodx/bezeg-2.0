import {act} from '@testing-library/react';
import {BEZIER_HULLS_CROSSING, BEZIER_HULLS_NEAR_MISS, BEZIER_HULLS_SHIFTED, BEZIER_HULLS_STEPS, compgeoGuidedLessons} from './compgeoGuidedLessons';
import {convexityChapter} from './convexityChapter';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import type {LessonAction, LessonPoint} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {BezierHullsGraph} from '../../graphs/compgeo/BezierHullsGraph';
import {curvePieces} from '../../compgeo/curvePairSubdivision';
import {hullsSeparated} from '../../compgeo/hullSeparation';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
const STEPS = ['bh-hull', 'bh-split', 'bh-predict', 'bh-discard', 'bh-depth4', 'bh-near-miss', 'bh-explore'];

const lesson = () => getLessonForDemonstration('bezier-hulls')!;
/** The authored lesson, which keeps the scene's expected state, the worked examples and the prerequisites the runtime lesson drops. */
const authored = () => compgeoGuidedLessons.find(l => l.demonstrationId === 'bezier-hulls')!;
const authoredStep = (stepId: string) => authored().steps.find(step => step.id === stepId)!;
const sceneOf = (stepId: string): LessonAction[] => lesson().steps.find(step => step.id === stepId)!.scene!.actions as LessonAction[];
const chapterSection = () => convexityChapter.sections.find(s => s.id === 'bezier-hulls')!;

const nextStep = (): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command: 'next-step'});
const setPoints = (points: readonly LessonPoint[]): LessonAction => ({kind: 'point-set', operation: 'set-points', mode: 'points', points});
const numbers = (name: string): number[] | null => {
    const text = document.querySelector(`[data-bezier-hulls="${name}"]`)?.textContent;
    return text === undefined || text === null ? null : (text.match(/\d+/g) ?? []).map(Number);
};
/** The readout as numbers per line: null where the line is absent at the shown step. */
const readout = () => ({
    step: numbers('step'), depth: numbers('depth'), candidates: numbers('candidates'), kept: numbers('kept'), tests: numbers('tests'),
    empty: numbers('empty') !== null, remaining: numbers('remaining') !== null,
});

function mountLesson() {
    const graph = new BezierHullsGraph();
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
        /** The scene actions of a step with no restore in between (a scene change inside one tick). */
        sceneOnly: (stepId: string) => applyAll(sceneOf(stepId)),
        restoreCheckpoint: () => act(() => { capabilities.restoreState(checkpoint); }),
        language: (language: Language) => act(() => { setLanguage(language); }),
        /** Everything a scene sets, as observable state. */
        snapshot: () => ({
            step: graph.step, playing: graph.isPlaying, points: graph.model.points.map(p => [p.x, p.y]),
            overlays: [graph.overlayShown('control'), graph.overlayShown('hull'), graph.overlayShown('pieces')], readout: readout(),
        }),
    };
}
type Harness = ReturnType<typeof mountLesson>;
const withLesson = (body: (h: Harness) => void) => () => {
    const h = mountLesson();
    try { body(h); } finally { h.mounted.view.unmount(); }
};

interface SceneExpectation {
    id: string; step: number; overlays: boolean[]; points: readonly LessonPoint[];
    depth: number[] | null; candidates: number[] | null; kept: number[] | null; tests: number[] | null;
    /** The numbers the text quotes from the readout, as integers. */
    quoted: number[];
}
const ON = [true, true, true];
const SCENES: readonly SceneExpectation[] = [
    {id: 'bh-hull', step: 0, overlays: [true, true, false], points: BEZIER_HULLS_CROSSING, depth: [0, 4], candidates: null, kept: [1, 1], tests: [1, 0], quoted: [0, 4, 1]},
    {id: 'bh-split', step: 1, overlays: ON, points: BEZIER_HULLS_CROSSING, depth: [1, 4], candidates: [4], kept: null, tests: null, quoted: [1, 4]},
    {id: 'bh-predict', step: 1, overlays: ON, points: BEZIER_HULLS_CROSSING, depth: [1, 4], candidates: [4], kept: null, tests: null, quoted: [4]},
    {id: 'bh-discard', step: 2, overlays: ON, points: BEZIER_HULLS_CROSSING, depth: [1, 4], candidates: null, kept: [2, 4], tests: [4, 2], quoted: [2, 4, 2]},
    {id: 'bh-depth4', step: 8, overlays: ON, points: BEZIER_HULLS_CROSSING, depth: [4, 4], candidates: null, kept: [8, 256], tests: [32, 24], quoted: [8, 256, 32, 24]},
    {id: 'bh-near-miss', step: 8, overlays: ON, points: BEZIER_HULLS_NEAR_MISS, depth: [4, 4], candidates: null, kept: [1, 256], tests: [4, 3], quoted: [1, 256, 4, 3]},
    {id: 'bh-explore', step: 0, overlays: ON, points: BEZIER_HULLS_CROSSING, depth: [0, 4], candidates: null, kept: [1, 1], tests: [1, 0], quoted: [0, 4, 1]},
];
const KEPT_LINE: Record<Language, (kept: number, of: number) => string> = {
    sl: (kept, of) => `Ostane parov odsekov: ${kept} od ${of}`,
    en: (kept, of) => `Piece pairs that remain: ${kept} of ${of}`,
};
const TESTS_LINE: Record<Language, (tested: number, discarded: number) => string> = {
    sl: (tested, discarded) => `Preizkušenih parov: ${tested}, zavrženih: ${discarded}`,
    en: (tested, discarded) => `Pairs tested: ${tested}, discarded: ${discarded}`,
};
const lineText = (name: string) => document.querySelector(`[data-bezier-hulls="${name}"]`)?.textContent ?? null;

/** The text fields of a step in which the readout numbers are quoted. */
const quotedFields = (stepId: string, language: Language) => {
    const step = authoredStep(stepId);
    return {
        explanation: step.explanation[language], expectedState: step.scene!.expectedState[language], observation: step.expectedObservations[0][language],
    };
};

test('the seven scenes put the pair, the overlays, the step and the readout where the text relies on them, in one synchronous sequence, in both languages', withLesson(h => {
    expect(authored().steps.map(s => s.id)).toEqual(SCENES.map(s => s.id));
    for (const scene of SCENES) {
        h.scene(scene.id);
        const s = h.snapshot();
        expect(s.points, scene.id).toEqual(scene.points);
        expect([s.step, s.playing, s.overlays], scene.id).toEqual([scene.step, false, scene.overlays]);
        for (const language of LANGUAGES) {
            h.language(language);
            const r = readout();
            expect({step: r.step, depth: r.depth, candidates: r.candidates, kept: r.kept, tests: r.tests}, `${scene.id} ${language}`)
                .toEqual({step: [scene.step + 1, 9], depth: scene.depth, candidates: scene.candidates, kept: scene.kept, tests: scene.tests});
            if (scene.kept) expect(lineText('kept'), `${scene.id} ${language}`).toBe(KEPT_LINE[language](scene.kept[0], scene.kept[1]));
            if (scene.tests) expect(lineText('tests'), `${scene.id} ${language}`).toBe(TESTS_LINE[language](scene.tests[0], scene.tests[1]));
            // The remaining-pairs note shows at the end of a run that keeps pairs, never in the middle.
            expect([r.empty, r.remaining], `${scene.id} ${language}`).toEqual([false, scene.step === BEZIER_HULLS_STEPS.end]);
        }
        h.language('sl');
    }
    expect(BEZIER_HULLS_STEPS).toEqual({split: 1, discard: 2, end: 8});
    expect(h.graph.run().length - 1).toBe(BEZIER_HULLS_STEPS.end);
}));

test('each scene is set-points, the three overlays and the trace step last (set-points returns the trace to step 0)', () => {
    const traceSteps: Array<number | 'end'> = [0, 1, 1, 2, 'end', 'end', 0];
    STEPS.forEach((stepId, index) => {
        const actions = sceneOf(stepId).filter(a => a.kind === 'point-set');
        expect(actions.map(a => (a as {operation: string}).operation), stepId)
            .toEqual(['set-points', 'set-overlay', 'set-overlay', 'set-overlay', 'set-trace-step']);
        expect(actions.at(-1), stepId).toEqual({kind: 'point-set', operation: 'set-trace-step', step: traceSteps[index]});
    });
});

test('every number the text quotes equals the rendered readout at that scene, in the step text, the scene text and the observation, in both languages', withLesson(h => {
    for (const scene of SCENES) {
        h.scene(scene.id);
        for (const language of LANGUAGES) {
            h.language(language);
            const r = readout();
            const shown = [r.depth, r.candidates, r.kept, r.tests].flatMap(line => line ?? []);
            for (const n of scene.quoted) expect(shown, `${scene.id} ${language} readout has ${n}`).toContain(n);
            for (const [field, body] of Object.entries(quotedFields(scene.id, language))) {
                // The free exploration step quotes the start readout in its scene text only.
                if (scene.id === 'bh-explore' && field !== 'expectedState') continue;
                for (const n of scene.quoted) expect(body, `${scene.id} ${language} ${field} ${n}`).toContain(`\\(${n}\\)`);
            }
        }
        h.language('sl');
    }
}));

test('the headline claims read as the readout lines: "k of n pairs remain" and "T tested, D discarded" at the discard, depth 4 and near-miss scenes', withLesson(h => {
    const claims: Record<string, Record<Language, RegExp>> = {
        'bh-discard': {sl: /\\\(2\\\) od \\\(4\\\) parov/, en: /\\\(2\\\) of (the )?\\\(4\\\) pairs/},
        'bh-depth4': {sl: /\\\(8\\\) od \\\(256\\\) parov/, en: /\\\(8\\\) of \\\(256\\\) pairs/},
        'bh-near-miss': {sl: /\\\(1\\\)( par)? od \\\(256\\\)/, en: /\\\(1\\\) pair of \\\(256\\\)|\\\(1\\\) of \\\(256\\\) pairs/},
    };
    for (const scene of SCENES.filter(s => s.id in claims)) {
        h.scene(scene.id);
        const [kept, of] = scene.kept!;
        const [tested, discarded] = scene.tests!;
        for (const language of LANGUAGES) {
            h.language(language);
            expect(lineText('kept')).toBe(KEPT_LINE[language](kept, of));
            expect(lineText('tests')).toBe(TESTS_LINE[language](tested, discarded));
            const tests = language === 'sl'
                ? new RegExp(`preizkušen\\w* \\\\\\(${tested}\\\\\\), zavržen\\w* \\\\\\(${discarded}\\\\\\)`)
                : new RegExp(`\\\\\\(${tested}\\\\\\) tested, \\\\\\(${discarded}\\\\\\) discarded`);
            for (const [field, body] of Object.entries(quotedFields(scene.id, language))) {
                expect(body, `${scene.id} ${language} ${field}`).toMatch(tests);
                if (field !== 'observation') expect(body, `${scene.id} ${language} ${field}`).toMatch(claims[scene.id][language]);
            }
        }
        h.language('sl');
    }
}));

/** The coordinate pairs `\((x,y)\)` of a text, in order. */
const coordinates = (text: string): LessonPoint[] => [...text.matchAll(/\\\(\((-?\d+),(-?\d+)\)\\\)/g)].map(m => [Number(m[1]), Number(m[2])] as const);

test('the inside-pieces example: the twin of the half-unit shift, loaded with set-points on the real graph, shows 2 of 256 at the end; the text quotes exactly its coordinates and "2 pairs" in both languages', withLesson(h => {
    // The twin is the doubled-grid image of the crossing pair with B moved half a unit right.
    const [a0, a1, a2, b0, b1, b2] = BEZIER_HULLS_CROSSING;
    expect(BEZIER_HULLS_SHIFTED).toEqual([[2 * a0[0], 2 * a0[1]], [2 * a1[0], 2 * a1[1]], [2 * a2[0], 2 * a2[1]], [2 * b0[0] + 1, 2 * b0[1]], [2 * b1[0] + 1, 2 * b1[1]], [2 * b2[0] + 1, 2 * b2[1]]]);
    h.applyAll([setPoints(BEZIER_HULLS_SHIFTED), {kind: 'point-set', operation: 'set-trace-step', step: 'end'}]);
    expect(h.graph.model.gridStepExponent).toBe(0);
    expect(h.graph.model.points.map(p => [p.x, p.y])).toEqual(BEZIER_HULLS_SHIFTED);
    for (const language of LANGUAGES) {
        h.language(language);
        expect(readout().kept, language).toEqual([2, 256]);
        expect(lineText('kept')).toBe(KEPT_LINE[language](2, 256));
        const body = authoredStep('bh-depth4').explanation[language];
        expect(coordinates(body), language).toEqual(BEZIER_HULLS_SHIFTED);
        expect(body, language).toMatch(language === 'sl' ? /izpis pokaže \\\(2\\\) para/ : /readout shows \\\(2\\\) pairs/);
    }
}));

test('the coordinates quoted in the text equal the nets of the scenes: the crossing pair in step 1, the nested pair in step 6', () => {
    for (const language of LANGUAGES) {
        expect(coordinates(authoredStep('bh-hull').explanation[language]), `bh-hull ${language}`).toEqual(BEZIER_HULLS_CROSSING);
        expect(coordinates(authoredStep('bh-near-miss').explanation[language]), `bh-near-miss ${language}`).toEqual(BEZIER_HULLS_NEAR_MISS);
    }
});

const net = (points: readonly LessonPoint[]) => points.map(([x, y]) => ({x, y}));
const split = (points: readonly LessonPoint[]) => [net(points.slice(0, 3)), net(points.slice(3))] as const;
/** The number of piece pairs at `depth` whose hulls are not separated, by the model alone. */
function overlappingPairs(points: readonly LessonPoint[], depth: number): number {
    const [a, b] = split(points);
    let count = 0;
    for (const p of curvePieces(a, depth)) for (const q of curvePieces(b, depth)) if (!hullsSeparated(p, q).separated) count++;
    return count;
}

test('model: the quoted counts come from the model alone, and the near-miss pair keeps 1 pair at depth 4 and discards all at depth 5', () => {
    expect([1, 2, 3, 4].map(depth => overlappingPairs(BEZIER_HULLS_CROSSING, depth))).toEqual([2, 8, 8, 8]);
    expect(overlappingPairs(BEZIER_HULLS_SHIFTED, 4)).toBe(2);
    expect(overlappingPairs(BEZIER_HULLS_NEAR_MISS, 4)).toBe(1);
    const [a, b] = split(BEZIER_HULLS_NEAR_MISS);
    expect(curvePieces(a, 5).length * curvePieces(b, 5).length).toBe(1024);
    expect(overlappingPairs(BEZIER_HULLS_NEAR_MISS, 5)).toBe(0);
    // The crossing pair does not lose its pairs at depth 5 (the crossings are real).
    expect(overlappingPairs(BEZIER_HULLS_CROSSING, 5)).toBeGreaterThan(0);
});

test('model: the crossings are at t = 1/4 and 3/4, (1, 1.5) and (3, 1.5); the nested curves do not meet and are about 0.0108 apart', () => {
    const quadratic = (p: readonly LessonPoint[], t: number): [number, number] => [0, 1].map(k =>
        (1 - t) ** 2 * p[0][k] + 2 * (1 - t) * t * p[1][k] + t ** 2 * p[2][k]) as [number, number];
    const [a, b] = [BEZIER_HULLS_CROSSING.slice(0, 3), BEZIER_HULLS_CROSSING.slice(3)];
    for (const [t, x] of [[0.25, 1], [0.75, 3]]) {
        expect(quadratic(a, t)).toEqual([x, 1.5]);
        expect(quadratic(b, t)).toEqual([x, 1.5]);
    }
    const [na, nb] = [BEZIER_HULLS_NEAR_MISS.slice(0, 3), BEZIER_HULLS_NEAR_MISS.slice(3)];
    const samples = 4000;
    const polyline = Array.from({length: samples + 1}, (_, i) => quadratic(nb, i / samples));
    const segmentDistance = (p: [number, number], u: [number, number], v: [number, number]) => {
        const [dx, dy] = [v[0] - u[0], v[1] - u[1]];
        const s = Math.max(0, Math.min(1, ((p[0] - u[0]) * dx + (p[1] - u[1]) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(p[0] - u[0] - s * dx, p[1] - u[1] - s * dy);
    };
    let distance = Infinity;
    for (let i = 0; i <= samples; i++) {
        const p = quadratic(na, i / samples);
        for (let j = 0; j < samples; j++) distance = Math.min(distance, segmentDistance(p, polyline[j], polyline[j + 1]));
    }
    expect(distance).toBeGreaterThan(0.0105);
    expect(distance).toBeLessThan(0.011);
});

test('the distance of the nested curves is quoted as about 0.01 in both languages (decimal comma in Slovenian)', () => {
    const body = (language: Language) => `${authoredStep('bh-near-miss').explanation[language]} ${authoredStep('bh-near-miss').expectedObservations[0][language]}`;
    expect(body('sl')).toContain('\\(0{,}01\\)');
    expect(body('en')).toContain('\\(0.01\\)');
    expect(body('en')).not.toContain('0{,}01');
    const chapter = (language: Language) => chapterSection().paragraphs.map(p => p[language]).join(' ');
    expect(chapter('sl')).toContain('\\(0{,}01\\)');
    expect(chapter('en')).toContain('\\(0.01\\)');
});

test('Back (the checkpoint) and a scene change restore the scene: each scene after any other scene, a moved point or extra steps equals that scene alone', withLesson(h => {
    const start = h.snapshot();
    h.scene('bh-near-miss');
    expect(h.snapshot().readout.kept).toEqual([1, 256]);
    h.restoreCheckpoint();
    expect(h.snapshot()).toEqual(start);
    const alone = new Map<string, ReturnType<typeof h.snapshot>>();
    for (const stepId of STEPS) { h.scene(stepId); alone.set(stepId, h.snapshot()); }
    const moved = setPoints([[0, 0], [1, 1], [2, 0], [0, 1], [1, 0], [2, 1]]);
    for (const from of ['bh-hull', 'bh-depth4', 'bh-near-miss']) {
        for (const to of STEPS) {
            h.scene(from);
            h.applyAll([nextStep(), nextStep(), moved, nextStep()]);
            h.scene(to);
            expect(h.snapshot(), `${from} then ${to}`).toEqual(alone.get(to));
        }
    }
    // Back from step 6 to step 5 and forward again, as the session does with the checkpoint.
    h.scene('bh-near-miss');
    h.scene('bh-depth4');
    expect(h.snapshot()).toEqual(alone.get('bh-depth4'));
    // A scene change inside one tick, without a restore, leaves the same scene (every scene starts with set-points).
    for (const [from, to] of [['bh-near-miss', 'bh-depth4'], ['bh-depth4', 'bh-hull'], ['bh-depth4', 'bh-near-miss']]) {
        h.scene(from);
        h.sceneOnly(to);
        expect(h.snapshot(), `${from} then ${to} in one tick`).toEqual(alone.get(to));
    }
}));

test('the lesson is joined once, has seven steps in order, and its prerequisites name the convex hull and the Bézier section', () => {
    expect(compgeoGuidedLessons.filter(l => l.demonstrationId === 'bezier-hulls')).toHaveLength(1);
    expect(authored().steps.map(s => s.id)).toEqual(STEPS);
    expect(authored().steps.map(s => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson().steps.map(s => s.id)).toEqual(STEPS);
    expect(authored().prerequisites).toHaveLength(2);
    expect(authored().prerequisites[0].en).toContain('convex hull');
    expect(authored().prerequisites[0].sl).toContain('konveksni ovojnici');
    expect(authored().prerequisites[1].en).toContain('Bézier');
    expect(authored().prerequisites[1].sl).toContain('Bézierjevih');
    expect(chapterSection().demonstrationIds).toEqual(['bezier-hulls']);
});

/** All localized strings of the authored lesson (and of its sources, as one language-neutral string each). */
function lessonStrings(): Array<{where: string; sl: string; en: string}> {
    const found: Array<{where: string; sl: string; en: string}> = [];
    const walk = (value: unknown, where: string) => {
        if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${where}[${index}]`));
        else if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>;
            if (typeof record.sl === 'string' && typeof record.en === 'string') found.push({where, sl: record.sl, en: record.en});
            else for (const [key, item] of Object.entries(record)) walk(item, `${where}.${key}`);
        }
    };
    walk(authored(), 'lesson');
    return found;
}
const chapterStrings = () => [...chapterSection().paragraphs, ...Object.values(chapterSection().investigationPrompts ?? {})]
    .map((p, index) => ({where: `chapter[${index}]`, sl: p.sl, en: p.en}));

describe('acceptance 4: overlap is necessary, not sufficient; the recursion stops at a fixed depth; the test is not called exact', () => {
    const NOT_SUFFICIENT: Record<Language, RegExp> = {sl: /potreben, ne zadosten/, en: /necessary, not (?:a )?sufficient/};
    const FIXED_DEPTH: Record<Language, RegExp> = {sl: /fiksni globini|najvišji globini/, en: /fixed depth|deepest depth/};

    for (const language of LANGUAGES) {
        test(`${language}: the hull step, the near-miss step, the goals and the chapter say overlap is necessary, not sufficient`, () => {
            expect(authoredStep('bh-hull').explanation[language]).toMatch(NOT_SUFFICIENT[language]);
            expect(authoredStep('bh-near-miss').explanation[language]).toMatch(NOT_SUFFICIENT[language]);
            expect(authored().learningGoals[1][language]).toMatch(NOT_SUFFICIENT[language]);
            expect(chapterSection().paragraphs.map(p => p[language]).join(' ')).toMatch(NOT_SUFFICIENT[language]);
        });

        test(`${language}: the near-miss step, the test formula and the chapter say the recursion stops at a fixed depth`, () => {
            expect(authoredStep('bh-near-miss').explanation[language]).toMatch(language === 'sl' ? /fiksni globini \\\(4\\\)/ : /fixed depth \\\(4\\\)/);
            const formula = authored().formulaBlocks.find(f => f.id === 'bh-hull-test')!;
            expect(formula.explanation[language]).toMatch(FIXED_DEPTH[language]);
            expect(chapterSection().paragraphs.map(p => p[language]).join(' ')).toMatch(FIXED_DEPTH[language]);
        });

        test(`${language}: a remaining pair is not called an intersection, and the discard step and the chapter say the separation is certified with a safety margin, not exactly`, () => {
            expect(authoredStep('bh-near-miss').explanation[language]).toMatch(language === 'sl' ? /ne pomeni/ : /does not mean/);
            expect(authoredStep('bh-discard').explanation[language]).toMatch(language === 'sl' ? /varnostno rezervo, ne z natančnim računom/ : /safety margin, not by exact arithmetic/);
            expect(chapterSection().paragraphs.map(p => p[language]).join(' ')).toMatch(language === 'sl' ? /varnostno rezervo, ne z natančnim računom/ : /safety margin, not by exact arithmetic/);
            const formula = authored().formulaBlocks.find(f => f.id === 'bh-hull-test')!;
            expect(formula.notation[language]).toMatch(language === 'sl' ? /ne z natančno aritmetiko/ : /not with exact arithmetic/);
        });

        test(`${language}: every mention of exactness in the lesson, the chapter and the sources is negated`, () => {
            const sources = authored().sources.map((s, index) => ({where: `source[${index}]`, sl: s.implementationCorrespondence ?? '', en: s.implementationCorrespondence ?? ''}));
            const strings = [...lessonStrings(), ...chapterStrings(), ...sources];
            const word = language === 'sl' ? /natančn\w*/gi : /\bexact\w*/gi;
            const negated = language === 'sl' ? /\bne\s+(?:(?:z|s|pri|v|ob)\s+)?$/i : /\bnot\s+(?:(?:by|with|at|in|an?)\s+)*$/i;
            const claims: string[] = [];
            let mentions = 0;
            for (const s of strings) {
                const text = s[language];
                for (const match of text.matchAll(word)) {
                    mentions++;
                    if (!negated.test(text.slice(Math.max(0, match.index! - 14), match.index!))) claims.push(`${s.where}: ${text.slice(Math.max(0, match.index! - 30), match.index! + 30)}`);
                }
            }
            expect(mentions).toBeGreaterThanOrEqual(3);
            expect(claims).toEqual([]);
        });
    }
});

test('the summary and the chapter quote the same counts as the readouts: 8 of 256 for the crossing pair, 1 of 256 for the nested pair', () => {
    for (const language of LANGUAGES) {
        const summary = authored().summary[language];
        const prose = chapterSection().paragraphs.map(p => p[language]).join(' ');
        expect(summary, language).toContain('\\(8\\)');
        expect(summary, language).toContain('\\(256\\)');
        expect(prose, language).toContain('\\(8\\)');
        expect(prose, language).toContain('\\(256\\)');
        expect(prose, language).toContain('\\(1\\)');
    }
});
