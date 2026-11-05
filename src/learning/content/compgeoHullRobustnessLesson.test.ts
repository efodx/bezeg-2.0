import {act} from '@testing-library/react';
import {compgeoGuidedLessons, ROBUST_CELL, ROBUST_COLLINEAR, ROBUST_DUPLICATE_POINTS, ROBUST_STEPS} from './compgeoGuidedLessons';
import {convexityChapter} from './convexityChapter';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {HullRobustnessGraph} from '../../graphs/compgeo/HullRobustnessGraph';
import {kettnerSignMap} from '../../compgeo/inexactOrientation';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('hull-robustness')!;
/** The authored lesson, which keeps the scene's expected state, the worked examples and the prerequisites the runtime lesson drops. */
const authored = () => compgeoGuidedLessons.find(l => l.demonstrationId === 'hull-robustness')!;
const sceneOf = (stepId: string): LessonAction[] => lesson().steps.find(step => step.id === stepId)!.scene!.actions as LessonAction[];
const STEPS = ['robust-collinear', 'robust-predict', 'robust-pop-rules', 'robust-duplicates', 'robust-kettner-inexact', 'robust-kettner-exact', 'robust-explore'];

const part = (name: string) => document.querySelector(`[data-hull-robustness="${name}"]`)?.textContent ?? null;
const traceText = (name: string) => document.querySelector(`[data-hull-trace="${name}"]`)?.textContent ?? null;
const ps = (operation: string, fields: object = {}) => ({kind: 'point-set', operation, ...fields}) as unknown as LessonAction;
const nextStep = (): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command: 'next-step'});

function mountLesson() {
    const graph = new HullRobustnessGraph();
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
        hull: () => graph.run().view(graph.step).hull,
        /** Everything a scene sets, as observable state. */
        snapshot: () => ({
            mode: graph.robustnessMode, pop: graph.popRule, duplicates: graph.duplicateRule, panel: graph.kettnerPanel, cell: {...graph.kettnerCell}, step: graph.step,
            points: graph.model.points.map(p => [p.x, p.y]), overlays: [graph.overlayShown('trace'), graph.overlayShown('hull')],
            output: part('output'), repeated: part('repeated'), pending: part('output-pending'), cellTitle: part('cell-title'), count: traceText('count'),
        }),
    };
}
type Harness = ReturnType<typeof mountLesson>;
const withLesson = (body: (h: Harness) => void) => () => {
    const h = mountLesson();
    try { body(h); } finally { h.mounted.view.unmount(); }
};

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** The double value of the selected cell parsed from the readout: sign, mantissa (decimal comma) and the superscript exponent. */
function readNaiveValue(): number {
    const text = part('cell-naive-value')!;
    const match = /(−)?(\d+)[,.](\d+)·10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/.exec(text);
    if (!match) throw new Error(`no double value in "${text}"`);
    const exponent = Number(match[4].replace('⁻', '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => String(SUPERSCRIPT_DIGITS.indexOf(c))));
    return (match[1] ? -1 : 1) * Number(`${match[2]}.${match[3]}`) * 10 ** exponent;
}

test('the seven scenes put the mode, the rules, the points, the step, the overlays and the readouts where the text relies on them, in one synchronous sequence', withLesson(h => {
    const seen = STEPS.map(stepId => {
        h.scene(stepId);
        const s = h.snapshot();
        return [s.mode, s.pop, s.duplicates, s.panel, s.step, s.points.length, s.overlays, s.output !== null, s.repeated !== null, s.pending !== null] as const;
    });
    expect(seen).toEqual([
        ['chain', 'right', 'merge', 'inexact', 11, 3, [true, true], true, true, false],
        ['chain', 'non-left', 'merge', 'inexact', 0, 9, [false, false], false, false, true],
        ['chain', 'non-left', 'merge', 'inexact', 55, 9, [true, true], true, false, false],
        ['chain', 'right', 'keep', 'inexact', 57, 10, [true, true], true, true, false],
        ['kettner', 'non-left', 'merge', 'inexact', 0, 9, [true, true], false, false, false],
        ['kettner', 'non-left', 'merge', 'exact', 0, 9, [true, true], false, false, false],
        ['chain', 'non-left', 'merge', 'inexact', 0, 9, [true, true], false, false, true],
    ]);
    expect(ROBUST_STEPS).toEqual({collinearEnd: 11, sampleEnd: 55, duplicateEnd: 57});
    h.scene('robust-collinear');
    expect(h.graph.model.points.map(p => [p.x, p.y])).toEqual(ROBUST_COLLINEAR);
    h.scene('robust-duplicates');
    expect(h.graph.model.points.map(p => [p.x, p.y])).toEqual(ROBUST_DUPLICATE_POINTS);
}));

test('step 1: three collinear points under < give 4 entries with P2 listed twice and 2 orientation tests, and the trace is at its last step', withLesson(h => {
    h.scene('robust-collinear');
    expect(traceText('step')).toBe('Korak 12 od 12');
    expect(h.hull()).toEqual([0, 1, 2, 1]);
    expect(part('output')).toMatch(/^Izpis ovojnice \(vnosov: 4\): P1 \(0, 0\), P2 \(2, 0\), P3 \(4, 0\), P2 \(2, 0\)$/);
    expect(part('repeated')).toContain('P2 (2, 0)');
    expect(part('repeated')).toContain('ni rob večkotnika');
    expect(traceText('count')).toContain('2');
}));

test('step 2 predicts: the output is still pending at step 0 and no hull entry is listed', withLesson(h => {
    h.scene('robust-predict');
    expect(h.snapshot()).toMatchObject({step: 0, overlays: [false, false], output: null, repeated: null});
    expect(part('output-pending')).toContain('Izpis ovojnice se pokaže ob koncu sledi');
    expect(part('rule')).toContain('orient ≤ 0');
}));

test('step 3: under <= the output has 5 entries without (2, 0) and 23 tests; the rule < chosen by the learner and 53 presses give 6 entries with it and 22 tests', withLesson(h => {
    h.scene('robust-pop-rules');
    const index = h.graph.model.points.findIndex(p => p.x === 2 && p.y === 0);
    expect(index).toBe(7);
    expect(h.hull()).toHaveLength(5);
    expect(h.hull()).not.toContain(index);
    expect(part('output')).toContain('vnosov: 5');
    expect(part('output')).not.toContain('P8');
    expect(traceText('count')).toContain('23');
    h.applyAll([ps('set-pop-rule', {rule: 'right'}), ...Array.from({length: 53}, nextStep)]);
    expect(h.graph.step).toBe(53);
    expect(h.hull()).toHaveLength(6);
    expect(h.hull()).toContain(index);
    expect(part('output')).toContain('vnosov: 6');
    expect(part('output')).toContain('P8 (2, 0)');
    expect(traceText('count')).toContain('22');
}));

test('step 4: with the copy of (4, 0), the rule < and "keep all copies" the output has 9 entries and repeats (4, 0); merging gives 6', withLesson(h => {
    h.scene('robust-duplicates');
    expect(h.hull()).toHaveLength(9);
    expect(part('output')).toContain('vnosov: 9');
    expect(part('repeated')).toContain('(4, 0)');
    h.applyAll([ps('set-duplicates', {duplicates: 'merge'}), ...Array.from({length: ROBUST_STEPS.duplicateEnd}, nextStep)]);
    expect(h.hull()).toHaveLength(6);
    expect(part('output')).toContain('vnosov: 6');
    expect(part('repeated')).toBeNull();
}));

test('steps 5 and 6: cell (41, 48) has exact sign +, inexact sign -, the inexact value -5,68e-14 and the counts 112 of 4096 and 2052; the exact value is +9,33e-15 by a BigInt reference', withLesson(h => {
    const map = kettnerSignMap();
    expect([map.wrongSign, map.falseZero]).toEqual([112, 2052]);
    for (const [stepId, panel] of [['robust-kettner-inexact', 'inexact'], ['robust-kettner-exact', 'exact']] as const) {
        h.scene(stepId);
        expect(h.snapshot()).toMatchObject({mode: 'kettner', panel, cell: ROBUST_CELL});
        expect(part('cell-title')).toContain('i = 41, j = 48');
        expect(part('cell-exact')).toContain('+');
        expect(part('cell-naive-sign')).toContain('−');
        expect(part('counts-text')).toContain('112');
        expect(part('counts-text')).toContain('4096');
        expect(part('counts-text')).toContain('2052');
        expect(readNaiveValue()).toBeCloseTo(-5.68e-14, 16);
    }
    // The exact value of orient(p, q, r) from integers in units of 2^-53: p = (2^52 + i, 2^52 + j), q = 12 * 2^53, r = 24 * 2^53.
    const u = 2n ** 53n;
    const [px, py, qx, qy, rx, ry] = [u / 2n + 41n, u / 2n + 48n, 12n * u, 12n * u, 24n * u, 24n * u];
    const exact = (qx - px) * (ry - py) - (qy - py) * (rx - px);
    expect(exact).toBe(84n * u);
    const value = Number(exact) / 2 ** 106;
    expect(value).toBeCloseTo(9.33e-15, 17);
    expect(value).toBeGreaterThan(0);
}));

test('steps 5 and 6 differ only in the panel, and each scene names its panel', withLesson(h => {
    h.scene('robust-kettner-inexact');
    const inexact = h.snapshot();
    h.scene('robust-kettner-exact');
    const exact = h.snapshot();
    expect({...exact, panel: 'inexact'}).toEqual(inexact);
    expect(exact.panel).toBe('exact');
    const panels = (stepId: string) => sceneOf(stepId).filter(a => a.kind === 'point-set' && a.operation === 'set-panel');
    expect(panels('robust-kettner-inexact')).toEqual([ps('set-panel', {panel: 'inexact'})]);
    expect(panels('robust-kettner-exact')).toEqual([ps('set-panel', {panel: 'exact'})]);
}));

test('step 5 shows panel inexact, step 6 shows exact, and Back from step 6 returns to inexact', withLesson(h => {
    h.scene('robust-kettner-inexact');
    expect(h.graph.kettnerPanel).toBe('inexact');
    h.scene('robust-kettner-exact');
    expect(h.graph.kettnerPanel).toBe('exact');
    // Back re-applies the previous step scene on the checkpoint.
    h.scene('robust-kettner-inexact');
    expect(h.graph.kettnerPanel).toBe('inexact');
    expect(h.snapshot()).toMatchObject({mode: 'kettner', cell: ROBUST_CELL});
    // A chain scene after step 6 leaves the default panel, so the panel never leaks into the next step.
    h.scene('robust-kettner-exact');
    h.scene('robust-explore');
    expect(h.snapshot()).toMatchObject({mode: 'chain', panel: 'inexact'});
}));

/** Slovenian math keeps the decimal comma as {,}; English uses a decimal point. */
const decimal = (token: string, language: 'sl' | 'en') => language === 'en' ? token.replace('{,}', '.') : token;

test('every quoted number appears in the step text and the scene text of both languages, and the summary and chapter quote the same counts', () => {
    const quoted: Record<string, readonly string[]> = {
        'robust-collinear': ['\\(4\\)', '\\(P2\\)'],
        'robust-pop-rules': ['\\(5\\)', '\\(23\\)', '\\(6\\)', '\\(22\\)', '(2,0)'],
        'robust-duplicates': ['\\(9\\)', '\\(6\\)', '(4,0)'],
        'robust-kettner-inexact': ['\\(112\\)', '4096', '\\(2052\\)', '\\(i=41\\)', '\\(j=48\\)', '-5{,}68\\times10^{-14}'],
        'robust-kettner-exact': ['\\(i=41\\)', '\\(j=48\\)', '+9{,}33\\times10^{-15}'],
    };
    for (const [stepId, tokens] of Object.entries(quoted)) {
        const step = authored().steps.find(s => s.id === stepId)!;
        for (const language of ['sl', 'en'] as const) {
            const body = `${step.explanation[language]} ${step.scene!.expectedState[language]} ${step.expectedObservations.map(o => o[language]).join(' ')}`;
            for (const token of tokens) expect(body, `${stepId} ${language} ${token}`).toContain(decimal(token, language));
        }
    }
    const chapter = convexityChapter.sections.find(s => s.id === 'hull-robustness')!;
    for (const language of ['sl', 'en'] as const) {
        const prose = [authored().summary[language], ...chapter.paragraphs.map(p => p[language])].join(' ');
        for (const token of ['\\(112\\)', '\\(4096\\)', '\\(2052\\)', '\\(i=41\\)', '\\(j=48\\)', '9{,}33\\times10^{-15}', '-5{,}68\\times10^{-14}']) expect(prose, `${language} ${token}`).toContain(decimal(token, language));
    }
});

/** All localized strings of the authored lesson. */
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

test('every localized string that mentions a double also says the calculation is inexact (nenatančen / inexact)', () => {
    const chapter = convexityChapter.sections.find(s => s.id === 'hull-robustness')!;
    const chapterTexts = [...chapter.paragraphs, ...Object.values(chapter.investigationPrompts ?? {})];
    const strings = [...lessonStrings(), ...chapterTexts.map((p, index) => ({where: `chapter[${index}]`, sl: p.sl, en: p.en}))];
    const mentioning = strings.filter(s => /double/i.test(s.sl) || /double/i.test(s.en));
    expect(mentioning.length).toBeGreaterThan(8);
    const missing = mentioning.flatMap(s => [
        ...(/double/i.test(s.sl) && !/nenatanč/i.test(s.sl) ? [`${s.where} sl`] : []),
        ...(/double/i.test(s.en) && !/inexact/i.test(s.en) ? [`${s.where} en`] : []),
    ]);
    expect(missing).toEqual([]);
});

test('captureState and restoreState round-trip Kettner mode, the cell, the pop rule and the panel, also from the chain at step 6', withLesson(h => {
    const read = (graph: HullRobustnessGraph) => ({mode: graph.robustnessMode, cell: {...graph.kettnerCell}, pop: graph.popRule, step: graph.step, panel: graph.kettnerPanel});
    h.applyAll([ps('set-mode', {mode: 'kettner'}), ps('select-cell', {i: 10, j: 20}), ps('set-pop-rule', {rule: 'right'}), ps('set-panel', {panel: 'exact'})]);
    const kettner = read(h.graph);
    expect(kettner).toEqual({mode: 'kettner', cell: {i: 10, j: 20}, pop: 'right', step: 0, panel: 'exact'});
    const savedKettner = h.capabilities.captureState();
    h.scene('robust-explore');
    expect(read(h.graph)).not.toEqual(kettner);
    act(() => { h.capabilities.restoreState(savedKettner); });
    expect(read(h.graph)).toEqual(kettner);

    h.applyAll([ps('set-mode', {mode: 'chain'}), ps('set-pop-rule', {rule: 'non-left'}), ...Array.from({length: 6}, nextStep)]);
    const chain = read(h.graph);
    expect(chain).toMatchObject({mode: 'chain', pop: 'non-left', step: 6});
    const savedChain = h.capabilities.captureState();
    h.scene('robust-kettner-exact');
    act(() => { h.capabilities.restoreState(savedChain); });
    expect(read(h.graph)).toEqual(chain);
}));

test('Back (the checkpoint) and a scene change restore the scene: each scene after any other scene equals that scene alone', withLesson(h => {
    const start = h.snapshot();
    h.scene('robust-duplicates');
    expect(h.snapshot().points).toHaveLength(10);
    h.restoreCheckpoint();
    expect(h.snapshot()).toEqual(start);
    const alone = new Map<string, ReturnType<typeof h.snapshot>>();
    for (const stepId of STEPS) { h.scene(stepId); alone.set(stepId, h.snapshot()); }
    for (const from of ['robust-collinear', 'robust-duplicates', 'robust-kettner-exact']) {
        for (const to of STEPS) {
            h.scene(from);
            h.applyAll([ps('set-pop-rule', {rule: from === 'robust-duplicates' ? 'non-left' : 'right'}), ps('select-cell', {i: 3, j: 4})]);
            h.scene(to);
            expect(h.snapshot(), `${from} then ${to}`).toEqual(alone.get(to));
        }
    }
}));

test('the lesson is joined once, has seven steps in order, and its prerequisite names the convex hull', () => {
    expect(compgeoGuidedLessons.filter(l => l.demonstrationId === 'hull-robustness')).toHaveLength(1);
    expect(authored().steps.map(s => s.id)).toEqual(STEPS);
    expect(lesson().steps.map(s => s.id)).toEqual(STEPS);
    expect(authored().prerequisites).toHaveLength(1);
    expect(authored().prerequisites[0].en).toContain('convex hull');
    expect(authored().prerequisites[0].sl).toContain('konveksni ovojnici');
});
