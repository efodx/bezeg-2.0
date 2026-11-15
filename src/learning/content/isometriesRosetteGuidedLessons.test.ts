/**
 * L4 (isometries, rosettes). Part A: every scene opens on the real IsometryGraph in the state, status and rows its text states (both languages, out of
 * order, twice in one act), the restore returns the free state, the labels the prompts name exist, no opening already is what the prompt asks for, the
 * learner actions the text asks for give the quoted statuses and rows, and a predicting step does not render the answer of its own observation.
 * Part B (below): the numbers are recomputed with plain trigonometry, independent of src/isometry.
 */
import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {IsometryGraph} from '../../graphs/isometry/IsometryGraph';
import {enterNumber} from '../../inputs/testEntry';
import {sceneActions} from '../runtime/lessonCatalog';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t, type Language} from '../../localization';
import type {GuidedLessonStep, LocalizedText} from './guidedLessons';
import {rosetteLesson} from './isometriesRosetteGuidedLessons';

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
const STEP_IDS = ['l4-rotations', 'l4-mirrors', 'l4-on-mirror', 'l4-free'];
const stepOf = (id: string): GuidedLessonStep => rosetteLesson.steps.find(step => step.id === id)!;

// ---- Reference model (plain trigonometry, not src/isometry) -------------------------------------------------------------------------

type P = readonly [number, number];
interface Image {readonly at: P; readonly reflected: boolean}
const rotate = ([x, y]: P, degrees: number): P => {
    const a = (degrees * Math.PI) / 180;
    return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};
/** All motions of the rosette applied to the point: rotation j by 360 j / n, then (with mirrors) the reflection in the x axis after it. */
const motions = (n: number, mirrors: boolean, point: P): Image[] => {
    const result: Image[] = [];
    for (let j = 0; j < n; j++) {
        const r = rotate(point, (360 * j) / n);
        result.push({at: r, reflected: false});
        if (mirrors) result.push({at: [r[0], -r[1]], reflected: true});
    }
    return result;
};
const key = ([x, y]: P) => `${(Math.round(x * 1e6) / 1e6) || 0}|${(Math.round(y * 1e6) / 1e6) || 0}`;
const distinctOf = (n: number, mirrors: boolean, point: P) => new Set(motions(n, mirrors, point).map(m => key(m.at))).size;
const orderOf = (n: number, mirrors: boolean) => (mirrors ? 2 * n : n);

/** A number as the graph prints it: up to 4 decimals, no trailing zeros, Unicode minus, decimal comma in Slovenian. */
const num = (value: number, language: Language) => {
    const text = String(Number(value.toFixed(4)) || 0).replace('-', '−');
    return language === 'sl' ? text.replace('.', ',') : text;
};
const pointText = (p: P, language: Language) => (language === 'sl' ? `(${num(p[0], language)}; ${num(p[1], language)})` : `(${num(p[0], language)}, ${num(p[1], language)})`);

interface Opening {readonly n: number; readonly mirrors: boolean; readonly point: P}
const OPENINGS: Readonly<Record<string, Opening>> = {
    'l4-rotations': {n: 4, mirrors: false, point: [4, 1]},
    'l4-mirrors': {n: 5, mirrors: false, point: [4, 1]},
    'l4-on-mirror': {n: 5, mirrors: true, point: [4, 1]},
    'l4-free': {n: 6, mirrors: false, point: [3, 2]},
};

/** The status the graph shows: centre, point on a mirror (fewer distinct images than motions) or the general rosette. */
const statusText = (n: number, mirrors: boolean, point: P) => {
    const order = String(orderOf(n, mirrors));
    const distinct = String(distinctOf(n, mirrors, point));
    if (point[0] === 0 && point[1] === 0) return t('isometry_graph_status_rosette_centre');
    if (distinct !== order) return t('isometry_graph_status_rosette_mirror', {value0: distinct, value1: order});
    return t('isometry_graph_status_rosette', {value0: order, value1: distinct});
};
const groupText = (n: number, mirrors: boolean) => t(mirrors ? 'isometry_graph_group_dihedral' : 'isometry_graph_group_cyclic', {value0: String(n)});

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
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent ?? null;
const status = () => document.querySelector('[data-isometry-status]')?.textContent ?? null;
const stateOf = (graph: IsometryGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
/** The rows and the status that the reference model predicts for a rosette. */
const expectedView = (language: Language, n: number, mirrors: boolean, point: P) => ({
    status: statusText(n, mirrors, point),
    group: groupText(n, mirrors),
    order: String(orderOf(n, mirrors)),
    distinct: String(distinctOf(n, mirrors, point)),
    point: pointText(point, language),
});
const view = () => ({status: status(), group: readout('group'), order: readout('order'), distinct: readout('distinct'), point: readout('point')});

/** A control by name, as the learner uses it (the host test's helpers). */
const type = (label: string, value: string) => act(() => {
    enterNumber(screen.getByRole('spinbutton', {name: name => name.replace(/, (vrednost|value)$/, '') === label}) as HTMLInputElement, value);
});
const toggle = (label: string) => act(() => { fireEvent.click(screen.getByLabelText(label)); });

// ---- Part A ----------------------------------------------------------------------------------------------------------------------------

describe('L4 rosettes, part A: scenes, labels, learner actions and predictions', () => {
    test('has four ordered steps with a scene each', () => {
        expect(rosetteLesson.steps.map(step => step.id)).toEqual(STEP_IDS);
        expect(rosetteLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4]);
        expect(new Set(rosetteLesson.steps.map(step => step.scene!.id)).size).toBe(4);
    });

    test.each(LANGUAGES)('[%s] every scene opens in its state, status and rows, out of order and twice in one act; the restore returns the free state', language => {
        const m = mount(language);
        const free = stateOf(m.graph);
        for (const id of [...STEP_IDS, ...STEP_IDS.slice().reverse()]) {
            const o = OPENINGS[id];
            runScene(m, id);
            expect({id, state: [m.graph.state.mode, m.graph.state.rosetteN, m.graph.state.rosetteMirrors, [m.graph.state.rosettePoint.x, m.graph.state.rosettePoint.y]]})
                .toEqual({id, state: ['rosette', o.n, o.mirrors, [...o.point]]});
            expect({id, ...view()}).toEqual({id, ...expectedView(language, o.n, o.mirrors, o.point)});
            // The cyclic openings: Image 2 is the first rotation by 360 / n.
            if (!o.mirrors) expect({id, image: readout('image-2')}).toEqual({id, image: pointText(rotate(o.point, 360 / o.n), language)});
        }
        act(() => { m.capabilities.restoreState(m.checkpoint); });
        expect(stateOf(m.graph)).toEqual(free);
    });

    test.each(LANGUAGES)('[%s] every control and readout label a prompt names exists in the graph strings and on screen', language => {
        const catalog: Record<string, string> = language === 'sl' ? sl : en;
        const named: Readonly<Record<string, readonly [string, string][]>> = {
            'l4-rotations': [['isometry_graph_n_label', 'n'], ['isometry_graph_readout_group', 'group'], ['isometry_graph_readout_order', 'order'], ['isometry_graph_readout_distinct', 'distinct']],
            'l4-mirrors': [['isometry_graph_rosette_mirrors_label', ''], ['isometry_graph_readout_group', 'group'], ['isometry_graph_readout_order', 'order']],
            'l4-on-mirror': [['isometry_graph_point_title', ''], ['isometry_graph_readout_distinct', 'distinct']],
        };
        const m = mount(language);
        runScene(m, 'l4-on-mirror');
        for (const [id, labels] of Object.entries(named)) {
            const prompt = stepOf(id).observationPrompt[language];
            for (const [catalogKey, readoutId] of labels) {
                const label = catalog[catalogKey];
                expect({id, label, found: prompt.includes(label)}).toEqual({id, label, found: true});
                if (readoutId && readoutId !== 'n') expect({id, readoutId, label: readoutLabel(readoutId)}).toEqual({id, readoutId, label});
            }
        }
        // The count field, the mirrors switch and the point fields carry the names the prompts use.
        expect(screen.getByRole('spinbutton', {name: name => name.startsWith(catalog.isometry_graph_n_label)})).toBeTruthy();
        expect(screen.getByLabelText(catalog.isometry_graph_rosette_mirrors_label)).toBeTruthy();
        expect(screen.getByRole('spinbutton', {name: name => name.startsWith('P, x')})).toBeTruthy();
        expect(document.body.textContent).toContain(catalog.isometry_graph_point_title);
    });

    test('no step opens already in the state its prompt asks the learner to produce', () => {
        expect(OPENINGS['l4-rotations'].n).not.toBe(5);
        expect(OPENINGS['l4-mirrors'].mirrors).toBe(false);
        expect(OPENINGS['l4-mirrors'].n).toBe(5);
        const third = OPENINGS['l4-on-mirror'].point;
        expect(third).not.toEqual([4, 0]);
        expect(third).not.toEqual([0, 0]);
        // The scenes really open there (read from the actions the lesson holds).
        for (const id of STEP_IDS) {
            const set = sceneActions(stepOf(id).scene!).find(action => action.kind === 'isometry' && action.operation === 'set-rosette');
            expect({id, set}).toEqual({id, set: {kind: 'isometry', operation: 'set-rosette', n: OPENINGS[id].n, mirrors: OPENINGS[id].mirrors, point: {x: OPENINGS[id].point[0], y: OPENINGS[id].point[1]}}});
        }
    });

    test.each(LANGUAGES)('[%s] the learner actions the text asks for give the quoted statuses and rows', language => {
        const nLabel = (language === 'sl' ? sl : en).isometry_graph_n_label;
        const mirrorsLabel = (language === 'sl' ? sl : en).isometry_graph_rosette_mirrors_label;
        const m = mount(language);
        // Step 1: n -> 5, C5 with 5 motions and 5 images, image 2 about (0.285, 4.1132).
        runScene(m, 'l4-rotations');
        type(nLabel, '5');
        expect(view()).toEqual(expectedView(language, 5, false, [4, 1]));
        expect(readout('group')).toBe(language === 'sl' ? 'ciklična grupa C5' : 'cyclic group C5');
        expect(readout('image-2')).toBe(language === 'sl' ? '(0,285; 4,1132)' : '(0.285, 4.1132)');
        // Step 2: mirrors on, D5 with 10 motions and 10 images.
        runScene(m, 'l4-mirrors');
        toggle(mirrorsLabel);
        expect(view()).toEqual(expectedView(language, 5, true, [4, 1]));
        expect(readout('group')).toBe(language === 'sl' ? 'diedrska grupa D5' : 'dihedral group D5');
        expect([readout('order'), readout('distinct')]).toEqual(['10', '10']);
        // Step 3: the point (4, 0) (5 of 10, Image 2 equals Image 1), then the centre (1 image, order 10).
        runScene(m, 'l4-on-mirror');
        type('P, x', '4'); type('P, y', '0');
        expect(view()).toEqual(expectedView(language, 5, true, [4, 0]));
        expect([readout('order'), readout('distinct')]).toEqual(['10', '5']);
        expect(readout('image-2')).toBe(readout('image-1'));
        type('P, x', '0'); type('P, y', '0');
        expect(view()).toEqual(expectedView(language, 5, true, [0, 0]));
        expect([readout('order'), readout('distinct')]).toEqual(['10', '1']);
        expect(status()).toBe(language === 'sl' ? 'Točka je središče rozete: vsa gibanja jo ohranijo, zato je slika ena sama.'
            : 'The point is the centre of the rosette: every motion keeps it, so there is a single image.');
    });

    test.each(LANGUAGES)('[%s] a predicting step does not render the answer of its own expected observation', language => {
        // Everything the learner sees before the change: title, purpose, explanation, referenced formula blocks, worked examples and the opening scene text.
        const shown = (id: string) => {
            const step = stepOf(id);
            const blocks = rosetteLesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
            const examples = rosetteLesson.workedExamples;
            return [step.title, step.purpose, step.explanation, step.scene!.expectedState, ...blocks.flatMap(b => [b.explanation, b.notation])]
                .map((item: LocalizedText) => item[language]).concat(blocks.map(b => b.latex), examples.map(e => JSON.stringify(e))).join('\n');
        };
        const tenMotions = language === 'sl' ? /10\s+gibanj/ : /10\s+motions/;
        const fiveOfTen = language === 'sl' ? /5\s+od\s+10/ : /\b5\b[^.]{0,30}\b(of|from)\s+10\b/;
        // Step 1 (the answer: 5 motions, 5 images, C5), step 2 (10 motions, D5), step 3 (5 of 10).
        expect(shown('l4-rotations')).not.toMatch(/C_\{?5/);
        expect(shown('l4-rotations')).not.toMatch(language === 'sl' ? /5\s+gibanj/ : /5\s+motions/);
        expect(shown('l4-mirrors')).not.toMatch(tenMotions);
        expect(shown('l4-mirrors')).not.toMatch(/D_\{?5/);
        expect(shown('l4-on-mirror')).not.toMatch(fiveOfTen);
        // Control: the answers are in the expected observations of those steps.
        expect(stepOf('l4-rotations').expectedObservations[0][language]).toMatch(/C_5/);
        expect(stepOf('l4-mirrors').expectedObservations[0][language]).toMatch(tenMotions);
        expect(stepOf('l4-on-mirror').expectedObservations[0][language]).toMatch(fiveOfTen);
    });
});

// ---- Part B: independent recomputation -----------------------------------------------------------------------------------------------

const obs = (id: string, language: Language) => stepOf(id).expectedObservations[0][language];
/** A number as the lesson LaTeX quotes it: decimal comma `{,}` in Slovenian, a point in English. */
const latexNum = (value: number, language: Language) => (language === 'sl' ? String(Number(value.toFixed(4))).replace('.', '{,}') : String(Number(value.toFixed(4))));
const polar = ([x, y]: P) => (Math.atan2(y, x) * 180) / Math.PI;
/** Every translatable string of the lesson, as [path, text]. */
const strings = (value: unknown, path = 'lesson'): [string, string, Language][] => {
    if (typeof value !== 'object' || value === null) return [];
    const record = value as Record<string, unknown>;
    if (typeof record.sl === 'string' && typeof record.en === 'string') return [[`${path}.sl`, record.sl, 'sl'], [`${path}.en`, record.en, 'en']];
    return Object.entries(record).flatMap(([name, child]) => strings(child, `${path}.${name}`));
};

describe('L4 rosettes, part B: counts, images and every quoted number recomputed', () => {
    test('rotations and reflections of (4, 1): n or 2n motions, as many distinct images, centre one, on a mirror n', () => {
        for (const n of [4, 5, 6, 12]) {
            expect({n, plain: [motions(n, false, [4, 1]).length, distinctOf(n, false, [4, 1])]}).toEqual({n, plain: [n, n]});
            expect({n, mirrors: [motions(n, true, [4, 1]).length, distinctOf(n, true, [4, 1])]}).toEqual({n, mirrors: [2 * n, 2 * n]});
            expect({n, centre: distinctOf(n, true, [0, 0])}).toEqual({n, centre: 1});
        }
        // Step 3: (4, 0) lies on the x axis, a mirror of D5: 5 distinct images from 10 motions, Image 2 equals Image 1.
        expect([motions(5, true, [4, 0]).length, distinctOf(5, true, [4, 0])]).toEqual([10, 5]);
        expect(key(motions(5, true, [4, 0])[1].at)).toBe(key(motions(5, true, [4, 0])[0].at));
        // Step 4: n = 12 at (3, 2): 24 of 24; n = 4 at (4, 0) and (4, 4), both on mirrors (the x axis and y = x): 4 of 8.
        expect([motions(12, true, [3, 2]).length, distinctOf(12, true, [3, 2])]).toEqual([24, 24]);
        for (const point of [[4, 0], [4, 4]] as P[]) expect({point, counts: [motions(4, true, point).length, distinctOf(4, true, point)]}).toEqual({point, counts: [8, 4]});
        // A generic point is on at most one mirror: no point other than the centre has fewer than n distinct images with mirrors, and n is attained on a mirror.
        for (const point of [[4, 4], [4, 0], [0, 4], [3, 3], [-5, 0]] as P[]) expect(distinctOf(6, true, point)).toBeGreaterThanOrEqual(6);
    });

    test('the direct images are the 5 rotations, the reflected ones the other 5, and they alternate in angular order for a generic point', () => {
        const all = motions(5, true, [4, 1]);
        expect([all.filter(m => !m.reflected).length, all.filter(m => m.reflected).length]).toEqual([5, 5]);
        // Orientation check: a rotation keeps the sign of the cross product of (image of A - image of O) with (image of B - image of O) for a probe triangle, a reflection reverses it.
        const probe = (index: number, reflected: boolean) => {
            const [o, a, b] = ([[0, 0], [1, 0], [0, 1]] as P[]).map(p => motions(5, true, p)[index].at);
            return Math.sign((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])) * (reflected ? -1 : 1);
        };
        all.forEach((m, index) => expect({index, kept: probe(index, m.reflected)}).toEqual({index, kept: 1}));
        const sorted = all.slice().sort((a, b) => polar(a.at) - polar(b.at));
        expect(sorted.map(m => m.reflected)).toEqual(sorted.map((_, i) => sorted[0].reflected !== (i % 2 === 1)));
        // Directly: the angles are 14.04 + 72 j (direct) and -14.04 + 72 j (reflected).
        const base = polar([4, 1]);
        const angles = [0, 1, 2, 3, 4].flatMap(j => [72 * j - base, 72 * j + base]).map(a => (a > 180 ? a - 360 : a)).sort((a, b) => a - b);
        expect(sorted.map(m => Math.round(polar(m.at) * 100) / 100)).toEqual(angles.map(a => Math.round(a * 100) / 100));
    });

    test.each(LANGUAGES)('[%s] the numbers the observations quote match the recomputation', language => {
        const sl_ = language === 'sl';
        const first = obs('l4-rotations', language);
        const second = obs('l4-mirrors', language);
        const third = obs('l4-on-mirror', language);
        const fourth = obs('l4-free', language);
        const c5 = motions(5, false, [4, 1]);
        // Step 1: 5 motions, 5 distinct images, angles 0, 72, ..., 288, Image 2 about (0.285, 4.1132).
        expect([c5.length, distinctOf(5, false, [4, 1])]).toEqual([5, 5]);
        expect(first).toContain(sl_ ? `${c5.length} gibanj in točka ${distinctOf(5, false, [4, 1])} različnih slik` : `${c5.length} motions and the point has ${distinctOf(5, false, [4, 1])} distinct images`);
        for (const degrees of [0, 1, 2, 3, 4].map(j => 360 * j / 5)) expect(first).toContain(`${degrees}^\\circ`);
        expect(first).toContain(`(${latexNum(c5[1].at[0], language)}${sl_ ? ';' : ','}\\,${latexNum(c5[1].at[1], language)})`);
        expect(first).toContain(sl_ ? 'približno' : 'about');
        // Step 2: 10 motions = 5 rotations + 5 reflections, 5 direct and 5 reflected.
        const d5 = motions(5, true, [4, 1]);
        const [direct, reflected] = [d5.filter(m => !m.reflected).length, d5.filter(m => m.reflected).length];
        expect(second).toContain(sl_ ? `${d5.length} gibanj: ${direct} vrtežev in ${reflected} zrcaljenj` : `${d5.length} motions: ${direct} rotations and ${reflected} reflections`);
        expect(second).toContain(sl_ ? `točka ima ${distinctOf(5, true, [4, 1])} različnih slik` : `the point has ${distinctOf(5, true, [4, 1])} distinct images`);
        expect(second).toContain(sl_ ? `${direct} slik navadnih (krožci) in ${reflected} zrcaljenih (rombi)` : `${direct} images are direct (circles) and ${reflected} reflected (diamonds)`);
        // Step 3: (4, 0) gives 5 of 10, the centre one image and still order 10.
        expect(third).toContain(sl_ ? `je različnih slik ${distinctOf(5, true, [4, 0])} od ${orderOf(5, true)} gibanj` : `there are ${distinctOf(5, true, [4, 0])} distinct images from ${orderOf(5, true)} motions`);
        expect(third).toContain(sl_ ? `slika ena sama; red grupe je še vedno ${orderOf(5, true)}` : `single image; the order of the group is still ${orderOf(5, true)}`);
        expect(distinctOf(5, true, [0, 0])).toBe(1);
        // Step 4: 24 of 24; 4 images from 8 motions at (4, 0) and (4, 4); 1 at the centre.
        expect(fourth).toContain(sl_ ? `${distinctOf(12, true, [3, 2])} od ${orderOf(12, true)}` : `${distinctOf(12, true, [3, 2])} of ${orderOf(12, true)}`);
        expect(fourth).toContain(sl_ ? `je slik ${distinctOf(4, true, [4, 0])} od ${orderOf(4, true)} gibanj, v središču pa ${distinctOf(4, true, [0, 0])}` : `there are ${distinctOf(4, true, [4, 0])} images from ${orderOf(4, true)} motions, and at the centre ${distinctOf(4, true, [0, 0])}`);
        expect(distinctOf(4, true, [4, 4])).toBe(distinctOf(4, true, [4, 0]));
    });

    test('the numbers of the opening scene texts match the recomputation, in both languages', () => {
        for (const id of STEP_IDS) {
            const o = OPENINGS[id];
            const order = orderOf(o.n, o.mirrors);
            const distinct = distinctOf(o.n, o.mirrors, o.point);
            const group = `${o.mirrors ? 'D' : 'C'}_${o.n}`;
            for (const language of LANGUAGES) {
                const text = stepOf(id).scene!.expectedState[language];
                expect({id, language, group: text.includes(`\\(${group}\\)`) || text.includes(`${o.mirrors ? 'D' : 'C'}_${o.n}`)}).toEqual({id, language, group: true});
                expect({id, language, n: text.includes(`n=${o.n}`), point: text.includes(`(${o.point[0]},${o.point[1]})`)}).toEqual({id, language, n: true, point: true});
                expect({id, language, counts: text.includes(language === 'sl' ? `${order} gibanj` : `${order} motions`) || text.includes(language === 'sl' ? `${order} gibanja` : `${order} motions`)})
                    .toEqual({id, language, counts: true});
                expect({id, language, distinct: text.includes(language === 'sl' ? `${distinct} različne slike` : `${distinct} distinct images`) || text.includes(`${distinct} različnih slik`)})
                    .toEqual({id, language, distinct: true});
            }
        }
    });

    test('Slovenian text has no English decimals and every rounded number is marked as approximate', () => {
        const all = strings(rosetteLesson);
        expect(all.length).toBeGreaterThan(40);
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
