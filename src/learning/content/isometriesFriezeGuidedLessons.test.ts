/**
 * L5 (isometries, friezes). Part A: every scene opens on the real IsometryGraph in the state, status and rows its text states (both languages, out of
 * order, twice in one act), the restore returns the free state, the labels the prompts name exist, no opening already is what the prompt asks for, the
 * learner actions the text asks for give the quoted statuses and rows, and a predicting step does not render the answer of its own observation.
 * Part B (below): the types, the images per period and the shortened period are recomputed by a brute-force closure, independent of src/isometry.
 */
import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {IsometryGraph} from '../../graphs/isometry/IsometryGraph';
import {sceneActions} from '../runtime/lessonCatalog';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t, type Language} from '../../localization';
import type {GuidedLessonStep, LocalizedText} from './guidedLessons';
import {friezeLesson, friezeSceneActions, L5_COPIES, L5_SHORTENING_COMBINATIONS, L5_VALID_COMBINATIONS} from './isometriesFriezeGuidedLessons';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => {
    cleanup();
    setLanguage('sl');
});

const LANGUAGES: readonly Language[] = ['sl', 'en'];
const STEP_IDS = ['l5-half-turn', 'l5-glide-mirror', 'l5-two-mirrors', 'l5-shorter-period', 'l5-seven-types', 'l5-free'];
const stepOf = (id: string): GuidedLessonStep => friezeLesson.steps.find(step => step.id === id)!;

// ---- Reference model: brute-force closure of the generators on the strip (not src/isometry) ---------------------------------------------

/** The motion (x, y) -> (sx x + t, sy y) of the strip, with the translation part t taken modulo the period L (translations by L are in every frieze group). */
interface Motion {readonly sx: 1 | -1; readonly sy: 1 | -1; readonly t: number}
type Feature = 'vertical' | 'horizontal' | 'halfTurn' | 'glide';
const FEATURES: readonly Feature[] = ['vertical', 'horizontal', 'halfTurn', 'glide'];
type Ticks = Readonly<Record<Feature, boolean>>;
const ticks = (...on: Feature[]): Ticks => ({vertical: on.includes('vertical'), horizontal: on.includes('horizontal'), halfTurn: on.includes('halfTurn'), glide: on.includes('glide')});
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** a after b. */
const compose = (a: Motion, b: Motion, L: number): Motion => ({sx: (a.sx * b.sx) as 1 | -1, sy: (a.sy * b.sy) as 1 | -1, t: mod(a.sx * b.t + a.t, L)});
const idKey = (m: Motion) => `${m.sx}|${m.sy}|${m.t}`;
/** Mirror at x = 0, mirror in the line y = 0, half-turn at the origin, glide by L / 2. */
const generatorOf = (feature: Feature, L: number): Motion => ({
    vertical: {sx: -1, sy: 1, t: 0},
    horizontal: {sx: 1, sy: -1, t: 0},
    halfTurn: {sx: -1, sy: -1, t: 0},
    glide: {sx: 1, sy: -1, t: L / 2},
} as Record<Feature, Motion>)[feature];

function closure(on: Ticks, L: number): Motion[] {
    const generators = FEATURES.filter(f => on[f]).map(f => generatorOf(f, L));
    const found = new Map<string, Motion>([[idKey({sx: 1, sy: 1, t: 0}), {sx: 1, sy: 1, t: 0}]]);
    for (let grew = true; grew;) {
        grew = false;
        for (const a of [...found.values()]) for (const g of generators) {
            const c = compose(g, a, L);
            if (!found.has(idKey(c))) { found.set(idKey(c), c); grew = true; }
        }
    }
    return [...found.values()];
}
/** Images of a generic point per period (the point (0.3, 0.7), x taken modulo the period). */
const imagesPerPeriod = (group: Motion[], L: number) => new Set(group.map(m => `${mod(m.sx * 0.3 + m.t, L).toFixed(6)}|${(m.sy * 0.7).toFixed(6)}`)).size;

interface Signature {readonly vertical: boolean; readonly horizontal: boolean; readonly halfTurn: boolean; readonly glide: boolean}
/** The spec's signatures (the rows Vertical mirror, Horizontal mirror, Half-turn, Glide): p2mm has no glide, p2mg no horizontal mirror. */
const TYPES: Readonly<Record<string, Signature>> = {
    p1: {vertical: false, horizontal: false, halfTurn: false, glide: false},
    p2: {vertical: false, horizontal: false, halfTurn: true, glide: false},
    p11g: {vertical: false, horizontal: false, halfTurn: false, glide: true},
    p1m1: {vertical: true, horizontal: false, halfTurn: false, glide: false},
    p11m: {vertical: false, horizontal: true, halfTurn: false, glide: false},
    p2mg: {vertical: true, horizontal: false, halfTurn: true, glide: true},
    p2mm: {vertical: true, horizontal: true, halfTurn: true, glide: false},
};
interface Outcome {readonly shortens: boolean; readonly signature: Signature; readonly type: string | null; readonly copies: number}
/** What the closed set of generators gives: a pure translation by less than L shortens the period; otherwise the signature names the type. */
function outcomeOf(on: Ticks, L: number): Outcome {
    const group = closure(on, L);
    const signature: Signature = {
        vertical: group.some(m => m.sx === -1 && m.sy === 1),
        horizontal: group.some(m => m.sx === 1 && m.sy === -1 && m.t === 0),
        halfTurn: group.some(m => m.sx === -1 && m.sy === -1),
        glide: group.some(m => m.sx === 1 && m.sy === -1 && m.t !== 0),
    };
    const shortens = group.some(m => m.sx === 1 && m.sy === 1 && m.t !== 0);
    const names = Object.entries(TYPES).filter(([, s]) => FEATURES.every(f => s[f] === signature[f])).map(([name]) => name);
    return {shortens, signature, type: shortens || names.length !== 1 ? null : names[0], copies: imagesPerPeriod(group, L)};
}

const yesNo = (value: boolean) => t(value ? 'isometry_graph_yes' : 'isometry_graph_no');
/** The status and rows the graph shows for ticks and period (the rows `type`, `copies`, `period`, `has-*`; a shortening has only `type` and `period`). */
function expectedView(on: Ticks, L: number) {
    const o = outcomeOf(on, L);
    if (o.shortens) return {status: t('isometry_graph_status_frieze_reduces'), rows: {type: t('isometry_graph_none'), period: String(L)}};
    return {
        status: t('isometry_graph_status_frieze', {value0: o.type!, value1: String(o.copies)}),
        rows: {
            type: o.type!, copies: String(o.copies), period: String(L),
            'has-vertical': yesNo(o.signature.vertical), 'has-horizontal': yesNo(o.signature.horizontal),
            'has-halfTurn': yesNo(o.signature.halfTurn), 'has-glide': yesNo(o.signature.glide),
        },
    };
}

interface Opening {readonly on: Ticks; readonly L: number}
const OPENINGS: Readonly<Record<string, Opening>> = {
    'l5-half-turn': {on: ticks(), L: 4},
    'l5-glide-mirror': {on: ticks('glide'), L: 4},
    'l5-two-mirrors': {on: ticks('vertical'), L: 4},
    'l5-shorter-period': {on: ticks('horizontal'), L: 4},
    'l5-seven-types': {on: ticks('vertical', 'horizontal', 'halfTurn'), L: 4},
    'l5-free': {on: ticks('glide'), L: 6},
};

// ---- Mounting and the rows ------------------------------------------------------------------------------------------------------------

function mount(language: Language) {
    setLanguage(language);
    const graph = new IsometryGraph();
    render(React.createElement(MemoryRouter, null, React.createElement(GraphHost, {create: () => graph})));
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {graph, capabilities, checkpoint};
}
const runScene = (m: ReturnType<typeof mount>, id: string) => act(() => {
    // Twice in one act: the second run starts from the restored checkpoint again.
    for (let i = 0; i < 2; i++) {
        m.capabilities.restoreState(m.checkpoint);
        for (const action of sceneActions(stepOf(id).scene!)) m.capabilities.apply(action);
    }
});
const ROW_IDS = ['type', 'copies', 'period', 'has-vertical', 'has-horizontal', 'has-halfTurn', 'has-glide'];
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent ?? null;
const status = () => document.querySelector('[data-isometry-status]')?.textContent ?? null;
const rows = () => Object.fromEntries(ROW_IDS.filter(id => readout(id) !== null).map(id => [id, readout(id)]));
const view = () => ({status: status(), rows: rows()});
const stateOf = (graph: IsometryGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const labelOf = (language: Language, feature: Feature) => (language === 'sl' ? sl : en)[({
    vertical: 'isometry_graph_feature_vertical', horizontal: 'isometry_graph_feature_horizontal',
    halfTurn: 'isometry_graph_feature_half_turn', glide: 'isometry_graph_feature_glide',
} as const)[feature]];
/** A feature checkbox as the learner clicks it, by its label. */
const toggle = (language: Language, feature: Feature) => act(() => { fireEvent.click(screen.getByLabelText(labelOf(language, feature))); });
const isChecked = (language: Language, feature: Feature) => (screen.getByLabelText(labelOf(language, feature)) as HTMLInputElement).checked;
const tickedOnScreen = (language: Language): Ticks => ({
    vertical: isChecked(language, 'vertical'), horizontal: isChecked(language, 'horizontal'),
    halfTurn: isChecked(language, 'halfTurn'), glide: isChecked(language, 'glide'),
});

// ---- Part A ----------------------------------------------------------------------------------------------------------------------------

describe('L5 friezes, part A: scenes, labels, learner actions and predictions', () => {
    test('has six ordered steps with a scene each', () => {
        expect(friezeLesson.steps.map(step => step.id)).toEqual(STEP_IDS);
        expect(friezeLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(new Set(friezeLesson.steps.map(step => step.scene!.id)).size).toBe(6);
    });

    test.each(LANGUAGES)('[%s] every scene opens in its state, status and rows, out of order and twice in one act; the restore returns the free state', language => {
        const m = mount(language);
        const free = stateOf(m.graph);
        for (const id of [...STEP_IDS, ...STEP_IDS.slice().reverse()]) {
            const o = OPENINGS[id];
            runScene(m, id);
            expect({id, state: [m.graph.state.mode, m.graph.state.friezeFeatures, m.graph.state.friezePeriod]}).toEqual({id, state: ['frieze', o.on, o.L]});
            expect({id, ...view()}).toEqual({id, ...expectedView(o.on, o.L)});
            expect({id, onScreen: tickedOnScreen(language)}).toEqual({id, onScreen: o.on});
        }
        act(() => { m.capabilities.restoreState(m.checkpoint); });
        expect(stateOf(m.graph)).toEqual(free);
    });

    test.each(LANGUAGES)('[%s] every control and readout label a prompt names exists in the graph strings and on screen', language => {
        const catalog: Record<string, string> = language === 'sl' ? sl : en;
        const caption = catalog.isometry_graph_cap_frieze_type.replace(/\s*\{value0\}/, '');
        const named: Readonly<Record<string, readonly [string, string][]>> = {
            'l5-half-turn': [['isometry_graph_feature_half_turn', ''], ['isometry_graph_readout_type', 'type'], ['isometry_graph_readout_copies', 'copies']],
            'l5-glide-mirror': [['isometry_graph_feature_vertical', ''], ['isometry_graph_readout_type', 'type'], ['isometry_graph_readout_copies', 'copies']],
            'l5-two-mirrors': [['isometry_graph_feature_horizontal', ''], ['isometry_graph_readout_type', 'type'], ['isometry_graph_readout_copies', 'copies'], ['isometry_graph_feature_half_turn', 'has-halfTurn']],
            'l5-shorter-period': [['isometry_graph_feature_glide', ''], ['isometry_graph_readout_type', 'type'], ['isometry_graph_readout_period', 'period']],
            'l5-seven-types': [['isometry_graph_feature_horizontal', '']],
        };
        const m = mount(language);
        runScene(m, 'l5-half-turn');
        const labelOfRow = (readoutId: string) => (readoutId.startsWith('has-') ? null : readoutLabel(readoutId));
        for (const [id, labels] of Object.entries(named)) {
            const prompt = stepOf(id).observationPrompt[language];
            for (const [catalogKey, readoutId] of labels) {
                const label = catalog[catalogKey];
                expect({id, label, found: prompt.includes(label)}).toEqual({id, label, found: true});
                if (readoutId) expect({id, readoutId, label: labelOfRow(readoutId) ?? label}).toEqual({id, readoutId, label});
            }
        }
        // The feature checkboxes in their group, the caption named in step 1, the period slider named in step 6.
        runScene(m, 'l5-seven-types');
        for (const f of FEATURES) expect(screen.getByLabelText(labelOf(language, f))).toBeTruthy();
        expect(document.body.textContent).toContain(catalog.isometry_graph_features_group);
        expect(stepOf('l5-half-turn').explanation[language]).toContain(catalog.isometry_graph_features_group);
        expect(stepOf('l5-half-turn').observationPrompt[language]).toContain(caption);
        expect(stepOf('l5-free').explanation[language]).toContain(catalog.isometry_graph_period_label);
        expect(document.body.textContent).toContain(catalog.isometry_graph_period_label);
        expect(readoutLabel('period')).toBe(catalog.isometry_graph_readout_period);
    });

    test('no step opens already in the state its prompt asks the learner to produce', () => {
        // Steps 1-4 ask for one tick that is not ticked at the opening; step 5 asks for unticks and a tick leading to p1m1 and p2mg, not the opening state.
        expect(OPENINGS['l5-half-turn'].on.halfTurn).toBe(false);
        expect(OPENINGS['l5-glide-mirror'].on.vertical).toBe(false);
        expect(OPENINGS['l5-two-mirrors'].on.horizontal).toBe(false);
        expect(OPENINGS['l5-shorter-period'].on.glide).toBe(false);
        const five = OPENINGS['l5-seven-types'].on;
        expect([five.vertical, five.horizontal, five.halfTurn, five.glide]).toEqual([true, true, true, false]);
        expect(outcomeOf(five, 4).type).toBe('p2mm');
        // The scenes really open there (read from the actions the lesson holds), always naming all four features and the period.
        for (const id of STEP_IDS) {
            const set = sceneActions(stepOf(id).scene!).find(action => action.kind === 'isometry' && action.operation === 'set-frieze');
            expect({id, set}).toEqual({id, set: {kind: 'isometry', operation: 'set-frieze', period: OPENINGS[id].L, features: OPENINGS[id].on}});
        }
    });

    test.each(LANGUAGES)('[%s] the learner actions the text asks for (steps 1-5) give the quoted statuses and rows', language => {
        const m = mount(language);
        const after = (on: Ticks, L: number) => expect(view()).toEqual(expectedView(on, L));
        // Step 1: tick Half-turn -> p2, 2 images.
        runScene(m, 'l5-half-turn');
        toggle(language, 'halfTurn');
        after(ticks('halfTurn'), 4);
        expect([readout('type'), readout('copies')]).toEqual(['p2', '2']);
        // Step 2: with the glide, tick Vertical mirror -> p2mg, 4 images, half-turn yes (not ticked), horizontal no, glide yes.
        runScene(m, 'l5-glide-mirror');
        toggle(language, 'vertical');
        after(ticks('glide', 'vertical'), 4);
        expect([readout('type'), readout('copies'), readout('has-vertical'), readout('has-horizontal'), readout('has-halfTurn'), readout('has-glide')])
            .toEqual(['p2mg', '4', yesNo(true), yesNo(false), yesNo(true), yesNo(true)]);
        expect(isChecked(language, 'halfTurn')).toBe(false);
        // Step 3: with the vertical mirror, tick Horizontal mirror -> p2mm, 4 images, half-turn yes, glide no.
        runScene(m, 'l5-two-mirrors');
        toggle(language, 'horizontal');
        after(ticks('vertical', 'horizontal'), 4);
        expect([readout('type'), readout('copies'), readout('has-halfTurn'), readout('has-glide')]).toEqual(['p2mm', '4', yesNo(true), yesNo(false)]);
        // Step 4: with the horizontal mirror, tick Glide -> the shortening status, type none, period 4.
        runScene(m, 'l5-shorter-period');
        toggle(language, 'glide');
        after(ticks('horizontal', 'glide'), 4);
        expect(status()).toBe(t('isometry_graph_status_frieze_reduces'));
        expect(rows()).toEqual({type: t('isometry_graph_none'), period: '4'});
        // Step 5: untick Horizontal (still p2mm, 4, horizontal yes), untick Half-turn (p1m1, 2), tick Glide (p2mg, 4).
        runScene(m, 'l5-seven-types');
        toggle(language, 'horizontal');
        after(ticks('vertical', 'halfTurn'), 4);
        expect([readout('type'), readout('copies'), readout('has-horizontal')]).toEqual(['p2mm', '4', yesNo(true)]);
        toggle(language, 'halfTurn');
        after(ticks('vertical'), 4);
        expect([readout('type'), readout('copies')]).toEqual(['p1m1', '2']);
        toggle(language, 'glide');
        after(ticks('vertical', 'glide'), 4);
        expect([readout('type'), readout('copies')]).toEqual(['p2mg', '4']);
    });

    test.each(LANGUAGES)('[%s] a predicting step does not render the answer of its own expected observation', language => {
        // Everything the learner sees before the change: title, purpose, explanation, referenced formula blocks, worked examples and the opening scene text.
        const shown = (id: string) => {
            const step = stepOf(id);
            const blocks = friezeLesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
            return [step.title, step.purpose, step.explanation, step.scene!.expectedState, ...blocks.flatMap(b => [b.explanation, b.notation])]
                .map((item: LocalizedText) => item[language]).concat(blocks.map(b => b.latex), friezeLesson.workedExamples.map(e => JSON.stringify(e))).join('\n');
        };
        const mathrm = (type: string) => new RegExp(String.raw`\\mathrm\{${type}\}|\b${type}\b`);
        expect(shown('l5-half-turn')).not.toMatch(mathrm('p2'));
        expect(shown('l5-glide-mirror')).not.toMatch(mathrm('p2mg'));
        expect(shown('l5-two-mirrors')).not.toMatch(mathrm('p2mm'));
        // Control: the answers are in the expected observations of those steps.
        expect(stepOf('l5-half-turn').expectedObservations[0][language]).toMatch(mathrm('p2'));
        expect(stepOf('l5-glide-mirror').expectedObservations[0][language]).toMatch(mathrm('p2mg'));
        expect(stepOf('l5-two-mirrors').expectedObservations[0][language]).toMatch(mathrm('p2mm'));
    });
});

// ---- Part B: independent recomputation -----------------------------------------------------------------------------------------------

const obs = (id: string, language: Language) => stepOf(id).expectedObservations[0][language];
const scene = (id: string, language: Language) => stepOf(id).scene!.expectedState[language];
/** Every translatable string of the lesson, as [path, text, language]. */
const strings = (value: unknown, path = 'lesson'): [string, string, Language][] => {
    if (typeof value !== 'object' || value === null) return [];
    const record = value as Record<string, unknown>;
    if (typeof record.sl === 'string' && typeof record.en === 'string') return [[`${path}.sl`, record.sl, 'sl'], [`${path}.en`, record.en, 'en']];
    return Object.entries(record).flatMap(([name, child]) => strings(child, `${path}.${name}`));
};
/** "N image(s) of the figure" as the lesson writes it: Slovenian dual and paucal forms (1 slika, 2 sliki, 3 and 4 slike). */
const images = (n: number, language: Language) => (language === 'en' ? `${n} image${n === 1 ? '' : 's'}` : `${n} ${n === 1 ? 'slika' : n === 2 ? 'sliki' : n < 5 ? 'slike' : 'slik'}`);
/** All 16 tick combinations. */
const SUBSETS: Ticks[] = Array.from({length: 16}, (_, mask) => ticks(...FEATURES.filter((_f, i) => (mask >> i) & 1)));
const nameOf = (on: Ticks) => FEATURES.filter(f => on[f]).join('+') || 'none';

describe('L5 friezes, part B: types, images per period and the shortened period recomputed by closure', () => {
    test('of the 16 tick combinations 11 give one of the seven types, 5 shorten the period, the same for the periods 4, 6 and 8', () => {
        for (const L of [4, 6, 8]) {
            const outcomes = SUBSETS.map(on => ({name: nameOf(on), ...outcomeOf(on, L)}));
            const valid = outcomes.filter(o => !o.shortens);
            expect({L, valid: valid.length, shortening: outcomes.length - valid.length}).toEqual({L, valid: 11, shortening: 5});
            expect([L5_VALID_COMBINATIONS, L5_SHORTENING_COMBINATIONS]).toEqual([11, 5]);
            // Every valid combination names exactly one type and the seven types are all reached.
            for (const o of valid) expect({L, name: o.name, named: o.type !== null}).toEqual({L, name: o.name, named: true});
            expect(new Set(valid.map(o => o.type))).toEqual(new Set(Object.keys(TYPES)));
            // The shortening ones are exactly those the lesson lists; the valid ones are the eleven it lists.
            expect(outcomes.filter(o => o.shortens).map(o => o.name).sort())
                .toEqual(['horizontal+glide', 'vertical+horizontal+glide', 'vertical+halfTurn+glide', 'horizontal+halfTurn+glide', 'vertical+horizontal+halfTurn+glide'].sort());
            expect(valid.map(o => o.name).sort()).toEqual([
                'none', 'vertical', 'horizontal', 'halfTurn', 'glide', 'vertical+horizontal', 'vertical+halfTurn', 'vertical+horizontal+halfTurn', 'horizontal+halfTurn',
                'vertical+glide', 'halfTurn+glide',
            ].sort());
        }
        expect(Object.fromEntries(Object.keys(TYPES).map(name => [name, SUBSETS.map(on => outcomeOf(on, 4)).find(o => o.type === name)!.copies]))).toEqual(L5_COPIES);
        expect(L5_COPIES).toEqual({p1: 1, p2: 2, p11g: 2, p1m1: 2, p11m: 2, p2mg: 4, p2mm: 4});
        // Every combination giving a type has that type's copies; the period does not change type or images.
        for (const on of SUBSETS) {
            const [a, b, c] = [4, 6, 8].map(L => outcomeOf(on, L));
            expect({on: nameOf(on), same: [a.type === b.type, b.type === c.type, a.copies === b.copies, b.copies === c.copies, a.shortens === c.shortens]})
                .toEqual({on: nameOf(on), same: [true, true, true, true, true]});
            if (a.type) expect(a.copies).toBe(L5_COPIES[a.type]);
        }
    });

    test('the real graph shows the type, images, rows and the shortening of every one of the 16 combinations at the periods 4 and 6', () => {
        const m = mount('sl');
        for (const L of [4, 6]) {
            for (const on of SUBSETS) {
                act(() => {
                    m.capabilities.restoreState(m.checkpoint);
                    for (const action of friezeSceneActions('sweep', {...on, period: L})) m.capabilities.apply(action);
                });
                expect({L, on: nameOf(on), ...view()}).toEqual({L, on: nameOf(on), ...expectedView(on, L)});
            }
        }
    });

    test('the half-turn centres of step 1, the centre a quarter of the period from the mirror of step 2 and the shortened period of step 4', () => {
        for (const L of [4, 6, 8]) {
            // Step 1: the half-turn alone; the half-turns about x = (t + k L) / 2 for the group elements and the translations k L: spacing L / 2.
            const group = closure(ticks('halfTurn'), L);
            const centres = [...new Set(group.filter(m => m.sx === -1 && m.sy === -1).flatMap(m => [-2, -1, 0, 1, 2].map(k => (m.t + k * L) / 2)))].sort((a, b) => a - b);
            expect({L, spacing: centres.slice(1).map((c, i) => c - centres[i])}).toEqual({L, spacing: centres.slice(1).map(() => L / 2)});
            // Step 2: the mirror at 0 and the glide; the half-turn it contains has its centre at (t / 2), a quarter of the period from the mirror, midway between the mirrors at 0 and L / 2.
            const mirrorGlide = closure(ticks('vertical', 'glide'), L).filter(m => m.sx === -1 && m.sy === -1);
            expect({L, centres: mirrorGlide.map(m => m.t / 2)}).toEqual({L, centres: [L / 4]});
            expect(L / 4).toBe((0 + L / 2) / 2);
            // Step 4: the horizontal mirror followed by the glide is a translation by half a period; nothing shorter than L / 2 is in the group.
            const translations = closure(ticks('horizontal', 'glide'), L).filter(m => m.sx === 1 && m.sy === 1 && m.t !== 0).map(m => m.t);
            expect({L, translations}).toEqual({L, translations: [L / 2]});
        }
    });

    test.each(LANGUAGES)('[%s] the types, images and numbers the scene texts and observations quote match the recomputation', language => {
        const sl_ = language === 'sl';
        const per = (n: number) => `${images(n, language)} ${sl_ ? 'lika v periodi' : 'of the figure per period'}`;
        const mathrm = (type: string) => String.raw`\(\mathrm{${type}}\)`;
        // Scene texts: the opening's type, images per period and period.
        for (const id of STEP_IDS) {
            const o = OPENINGS[id];
            const outcome = outcomeOf(o.on, o.L);
            const text = scene(id, language);
            expect({id, type: text.includes(mathrm(outcome.type!)), images: text.includes(`${images(outcome.copies, language)} ${sl_ ? 'lika' : 'of the figure'}`), period: text.includes(`${sl_ ? 'perioda' : 'period'} ${o.L}`)})
                .toEqual({id, type: true, images: true, period: true});
        }
        // Steps 1-3: type and images per period after the change, from the closure of the ticks the learner ends with.
        const afterStep = {'l5-half-turn': ticks('halfTurn'), 'l5-glide-mirror': ticks('glide', 'vertical'), 'l5-two-mirrors': ticks('vertical', 'horizontal')};
        for (const [id, on] of Object.entries(afterStep)) {
            const outcome = outcomeOf(on, 4);
            expect(obs(id, language)).toContain(`${sl_ ? 'tipa' : 'type'} ${mathrm(outcome.type!)} ${sl_ ? 'in ima' : 'and has'} ${per(outcome.copies)}`);
        }
        // Step 1: the centres are L / 2 apart, for L = 4 at distance 2.
        expect(obs('l5-half-turn', language)).toContain(String.raw`\(\tfrac{L}{2}\)`);
        expect(obs('l5-half-turn', language)).toContain(sl_ ? String.raw`pri \(L=4\) torej za 2` : String.raw`for \(L=4\) at distance 2`);
        expect(obs('l5-half-turn', language)).toContain(String.raw`(x,y)\mapsto(-x+L,\,-y)`);
        // Step 2: the half-turn row shows yes, the centre is L / 4 from the mirror.
        const mg = outcomeOf(ticks('glide', 'vertical'), 4);
        expect([mg.signature.halfTurn, mg.signature.horizontal]).toEqual([true, false]);
        expect(obs('l5-glide-mirror', language)).toContain(sl_ ? 'Vrtež za 180° pokaže da' : 'Half-turn (180°) shows yes');
        expect(obs('l5-glide-mirror', language)).toContain(String.raw`\(\tfrac{L}{4}\)`);
        // Step 3: the half-turn row shows yes, the glide row no.
        const mm = outcomeOf(ticks('vertical', 'horizontal'), 4);
        expect([mm.signature.halfTurn, mm.signature.glide]).toEqual([true, false]);
        expect(obs('l5-two-mirrors', language)).toContain(sl_ ? 'Vrtež za 180° pokaže da' : 'Half-turn (180°) shows yes');
        expect(obs('l5-two-mirrors', language)).toContain(sl_ ? 'Zrcalni zdrs pokaže ne' : 'Glide reflection shows no');
        // Step 4: shortened period, type none, period still 4, a translation by L / 2.
        const hg = outcomeOf(ticks('horizontal', 'glide'), 4);
        expect(hg.shortens).toBe(true);
        expect(obs('l5-shorter-period', language)).toContain(sl_ ? 'Tip friza pokaže ni, vrstica Perioda ostane 4' : 'Frieze type shows none and the row Period stays 4');
        expect(obs('l5-shorter-period', language)).toContain(String.raw`\(\tfrac{L}{2}\)`);
        // Step 6: 11 of the 16 give a frieze; the shortening ones are listed; the periods 4 and 6 agree.
        const last = obs('l5-free', language);
        expect(last).toContain(sl_ ? `Od 16 kombinacij jih ${L5_VALID_COMBINATIONS} da friz` : `Of the 16 combinations, ${L5_VALID_COMBINATIONS} give a frieze`);
        for (const fragment of sl_
            ? ['Vodoravno zrcalo z zdrsom', 'Navpično in Vodoravno zrcalo z zdrsom', 'Navpično zrcalo, Vrtež in zdrs', 'Vodoravno zrcalo, Vrtež in zdrs', 'vse štiri kljukice', 'Pri periodah 4 in 6']
            : ['Horizontal mirror with Glide', 'Vertical and Horizontal mirror with Glide', 'Vertical mirror with Half-turn and Glide', 'Horizontal mirror with Half-turn and Glide', 'all four ticked', 'For the periods 4 and 6']) {
            expect({fragment, found: last.includes(fragment)}).toEqual({fragment, found: true});
        }
    });

    test.each(LANGUAGES)('[%s] step 5 quotes the seven types with their symmetry rows and images, the unticking sequence and the counts of the closure', language => {
        const sl_ = language === 'sl';
        const text = obs('l5-seven-types', language);
        const mathrm = (type: string) => String.raw`\(\mathrm{${type}}\)`;
        // The unticking sequence: only Horizontal off (p2mm, 4), Half-turn off too (p1m1, 2), then Glide on (p2mg, 4).
        const sequence = [outcomeOf(ticks('vertical', 'halfTurn'), 4), outcomeOf(ticks('vertical'), 4), outcomeOf(ticks('vertical', 'glide'), 4)];
        expect(sequence.map(o => [o.type, o.copies])).toEqual([['p2mm', 4], ['p1m1', 2], ['p2mg', 4]]);
        expect(sequence[0].signature.horizontal).toBe(true);
        expect(text).toContain(sl_ ? `je vzorec še vedno ${mathrm('p2mm')} s ${sequence[0].copies} slikami` : `the pattern is still ${mathrm('p2mm')} with ${images(sequence[0].copies, language)}`);
        expect(text).toContain(sl_ ? `tip ${mathrm('p1m1')} z ${sequence[1].copies} slikama` : `type ${mathrm('p1m1')} with ${images(sequence[1].copies, language)}`);
        expect(text).toContain(sl_ ? `je vzorec ${mathrm('p2mg')} s ${sequence[2].copies} slikami` : `the pattern is ${mathrm('p2mg')} with ${images(sequence[2].copies, language)}`);
        // The list of the seven types: each segment names the type, exactly the features of its signature, and the images per period.
        const list = text.slice(text.indexOf(': ', text.indexOf(sl_ ? 'Vseh sedem tipov' : 'All seven types')) + 2, text.indexOf(sl_ ? '. Od 16' : '. Of the 16'));
        const segments = list.split(';').map(s => s.trim());
        expect(segments.length).toBe(7);
        const words: Readonly<Record<Feature, string>> = sl_ ? {vertical: 'navpično', horizontal: 'vodoravno', halfTurn: 'vrtež', glide: 'zdrs'}
            : {vertical: 'vertical', horizontal: 'horizontal', halfTurn: 'half-turn', glide: 'glide'};
        for (const [type, signature] of Object.entries(TYPES)) {
            const segment = segments.find(s => s.startsWith(mathrm(type)))!;
            const copies = SUBSETS.map(on => outcomeOf(on, 4)).find(o => o.type === type)!.copies;
            expect({type, found: segment !== undefined}).toEqual({type, found: true});
            expect({type, features: FEATURES.filter(f => segment.toLowerCase().includes(words[f]))}).toEqual({type, features: FEATURES.filter(f => signature[f])});
            expect({type, copies: new RegExp(`, ${copies}(?: slika| image)?\\.?$`).test(segment)}).toEqual({type, copies: true});
        }
        expect(text).toContain(sl_ ? `Od 16 kombinacij kljukic jih ${L5_VALID_COMBINATIONS} da friz enega od teh sedmih tipov, ${L5_SHORTENING_COMBINATIONS} pa skrajša periodo`
            : `Of the 16 combinations of ticks, ${L5_VALID_COMBINATIONS} give a frieze of one of these seven types and ${L5_SHORTENING_COMBINATIONS} shorten the period`);
    });

    test('Slovenian text has no English decimals and every rounded number is marked as approximate', () => {
        const all = strings(friezeLesson);
        expect(all.length).toBeGreaterThan(60);
        for (const [path, text, language] of all) {
            if (language === 'sl') {
                expect({path, englishDecimal: /\d\.\d/.test(text)}).toEqual({path, englishDecimal: false});
            } else {
                expect({path, slovenianDecimal: text.includes('{,}')}).toEqual({path, slovenianDecimal: false});
            }
            const rounded = language === 'sl' ? /\d\{,\}\d/.test(text) : /\d\.\d/.test(text);
            if (rounded) expect({path, approximate: language === 'sl' ? /približno|\\approx/.test(text) : /about|\\approx/.test(text)}).toEqual({path, approximate: true});
        }
    });
});
