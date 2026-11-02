import type {ReactNode} from 'react';
import {act, render} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {coonsGuidedLessons} from './coonsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../../graphs/base/realGraphTestHarness';
import type CoonsPatchGraph from '../../graphs/patches/CoonsPatchGraph';
import {coonsMismatches, defaultCoonsBoundaries} from '../../graphs/patches/coonsScene';
import {coonsBicubicNet, coonsBilinearNet, coonsRuledCNet, coonsRuledDNet, type Vec3} from '../../bezeg/impl/kernels/coons';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = coonsGuidedLessons.find(entry => entry.demonstrationId === 'patch-coons')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const num = (value: number, language: 'sl' | 'en') => (language === 'sl' ? String(value).replace('.', '{,}') : String(value));

// ---- An independent evaluation of the Coons formulas (no kernel code) -------------------------------------------------

const bernstein = (t: number) => [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];
const cubic = (points: readonly Vec3[], t: number): Vec3 => {
    const w = bernstein(t);
    return [0, 1, 2].map(axis => points.reduce((sum, p, k) => sum + w[k] * p[axis], 0)) as Vec3;
};
const evalNet = (net: readonly (readonly Vec3[])[], u: number, v: number): Vec3 => {
    const wu = bernstein(u), wv = bernstein(v);
    return [0, 1, 2].map(axis => net.reduce((sum, row, i) => sum + row.reduce((inner, p, j) => inner + wu[i] * wv[j] * p[axis], 0), 0)) as Vec3;
};
const B = defaultCoonsBoundaries() as Record<'c0' | 'c1' | 'd0' | 'd1', Vec3[]>;
const corners = (b: typeof B) => ({p00: b.c0[0], p10: b.c0[3], p01: b.c1[0], p11: b.c1[3]});
/** S = (1-v) c0(u) + v c1(u) + (1-u) d0(v) + u d1(v) - bilinear(corners), straight from the definition. */
const coonsDirect = (b: typeof B, u: number, v: number): Vec3 => {
    const {p00, p10, p01, p11} = corners(b);
    const c0 = cubic(b.c0, u), c1 = cubic(b.c1, u), d0 = cubic(b.d0, v), d1 = cubic(b.d1, v);
    return [0, 1, 2].map(k => (1 - v) * c0[k] + v * c1[k] + (1 - u) * d0[k] + u * d1[k]
        - ((1 - u) * (1 - v) * p00[k] + u * (1 - v) * p10[k] + (1 - u) * v * p01[k] + u * v * p11[k])) as Vec3;
};
const close = (a: readonly number[], b: readonly number[], digits = 12) => a.forEach((x, k) => expect(Math.abs(x - b[k]), `${a} vs ${b}`).toBeLessThan(10 ** -digits));

function mount() {
    const graph = createGraph('patch-coons');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const coons = graph as unknown as CoonsPatchGraph;
    return {
        graph: coons, mounted, capabilities, view: surfaceViewOf(graph)!,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        /** The actions of a step only, in one synchronous tick, without restoring first. */
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        reset: () => act(() => capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'})),
        edit: () => (graph as unknown as {workspaceEdit(): ReactNode}).workspaceEdit(),
    };
}

describe('the numbers the lesson quotes are the kernel values', () => {
    const language = ['sl', 'en'] as const;

    test('step 1: the boundary has 16 control points, 4 shared, 12 distinct', () => {
        const all = [...B.c0, ...B.c1, ...B.d0, ...B.d1];
        expect(all).toHaveLength(16);
        expect(new Set(all.map(p => p.join(','))).size).toBe(12);
        for (const l of language) for (const text of ['16', '4', '12']) expect(prose(stepOf('coons-boundaries'), l)).toContain(text);
    });

    test('steps 2 and 3: the centres of the ruled surfaces are 0.375 high and the other edges are missed', () => {
        const lc = evalNet(coonsRuledCNet(B), 0.5, 0.5), ld = evalNet(coonsRuledDNet(B), 0.5, 0.5);
        close(lc, [1.5, 1.5, 0.375]);
        close(ld, [1.5, 1.5, 0.375]);
        close(cubic(B.c0, 0.5), [1.5, 0, 1.5]);
        close(cubic(B.c1, 0.5), [1.5, 3, -0.75]);
        close(cubic(B.d0, 0.5), [0, 1.5, 0]);
        close(cubic(B.d1, 0.5), [3, 1.5, 0.75]);
        // L_c at u = 1 is the segment between the corners: height 0 in the middle, while d1 is at 0.75. L_d at v = 0 is at 0, c0 at 1.5.
        close(evalNet(coonsRuledCNet(B), 1, 0.5), [3, 1.5, 0]);
        close(evalNet(coonsRuledDNet(B), 0.5, 0), [1.5, 0, 0]);
        for (const l of language) {
            const c = prose(stepOf('coons-ruled-c'), l), d = prose(stepOf('coons-ruled-d'), l);
            for (const text of ['1.5', '0', '1.5', '3', '-0.75', '0.375', '0.75'].map(x => num(Number(x), l))) expect(c).toContain(text);
            for (const text of ['0', '1.5', '3', '0.75', '0.375'].map(x => num(Number(x), l))) expect(d).toContain(text);
        }
    });

    test('step 4: B is at height 0 in the centre and S(1/2, 1/2) = (1.5, 1.5, 0.75), through the kernel and the graph', () => {
        close(evalNet(coonsBilinearNet(B), 0.5, 0.5), [1.5, 1.5, 0]);
        close(evalNet(coonsBicubicNet(B), 0.5, 0.5), [1.5, 1.5, 0.75]);
        close(coonsDirect(B, 0.5, 0.5), [1.5, 1.5, 0.75]);
        const m = mount();
        try {
            m.scene(stepOf('coons-blend-step'));
            close(m.view.last.markers[0].xyz, [1.5, 1.5, 0.75]);
            m.run(stepOf('coons-ruled-c'));
            close(m.view.last.markers[0].xyz, [1.5, 1.5, 0.375]);
        } finally {
            m.mounted.view.unmount();
        }
        for (const l of language) {
            const p = prose(stepOf('coons-blend-step'), l);
            for (const text of [0.375, 0.75, 1.5].map(x => num(x, l))) expect(p).toContain(text);
        }
    });

    test('step 5: the interior net is (1,1,4/3), (1,2,1/3), (2,1,5/3), (2,2,2/3), by the kernel and by P_ij = Lc + Ld - B', () => {
        const net = coonsBicubicNet(B);
        close(net[1][1], [1, 1, 4 / 3]);
        close(net[1][2], [1, 2, 1 / 3]);
        close(net[2][1], [2, 1, 5 / 3]);
        close(net[2][2], [2, 2, 2 / 3]);
        const {p00, p10, p01, p11} = corners(B);
        for (const [i, j] of [[1, 1], [1, 2], [2, 1], [2, 2]]) {
            const s = i / 3, r = j / 3;
            const expected = [0, 1, 2].map(k => (1 - r) * B.c0[i][k] + r * B.c1[i][k] + (1 - s) * B.d0[j][k] + s * B.d1[j][k]
                - ((1 - s) * (1 - r) * p00[k] + s * (1 - r) * p10[k] + (1 - s) * r * p01[k] + s * r * p11[k]));
            close(net[i][j], expected);
        }
        // P11 pieces named in the worked example: Lc11 = (1,1,1), Ld11 = (1,1,1/3), B11 = (1,1,0).
        close(coonsRuledCNet(B)[1][1], [1, 1, 1]);
        close(coonsRuledDNet(B)[1][1], [1, 1, 1 / 3]);
        close(coonsBilinearNet(B)[1][1], [1, 1, 0]);
        const m = mount();
        try {
            m.scene(stepOf('coons-interior-net'));
            const row1 = m.view.last.polylines.find(line => line.id === 'net-row-1')!.points;
            close(row1[1], [1, 1, 4 / 3]);
            const { container } = render(<>{m.edit()}</>);
            const value = (id: string) => container.querySelector(`[data-readout="${id}"] dd`)!.textContent;
            expect([value('p-1-1'), value('p-1-2'), value('p-2-1'), value('p-2-2')]).toEqual(['(1; 1; 1,333)', '(1; 2; 0,333)', '(2; 1; 1,667)', '(2; 2; 0,667)']);
        } finally {
            m.mounted.view.unmount();
        }
        for (const l of language) {
            const p = prose(stepOf('coons-interior-net'), l);
            for (const text of ['\\tfrac43', '\\tfrac13', '\\tfrac53', '\\tfrac23', '12', '16']) expect(p).toContain(text);
            for (const text of [1.333, 0.333, 1.667, 0.667].map(x => num(x, l))) expect(p).toContain(text);
        }
    });

    test('with coinciding corners the Coons evaluation equals the bicubic net and reproduces every boundary to 1e-12', () => {
        const net = coonsBicubicNet(B);
        let seed = 12345;
        const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
        for (let k = 0; k < 200; k++) {
            const u = random(), v = random();
            close(coonsDirect(B, u, v), evalNet(net, u, v));
        }
        for (let k = 0; k <= 20; k++) {
            const s = k / 20;
            close(evalNet(net, s, 0), cubic(B.c0, s));
            close(evalNet(net, s, 1), cubic(B.c1, s));
            close(evalNet(net, 0, s), cubic(B.d0, s));
            close(evalNet(net, 1, s), cubic(B.d1, s));
        }
    });
});

describe('step 6: a broken corner', () => {
    test('the graph reports the corner mismatch and S misses both curves by half the gap', () => {
        const m = mount();
        try {
            m.scene(stepOf('coons-break-corner'));
            const {boundaries, linkedCorners, shown} = m.graph.state;
            expect([linkedCorners, shown]).toEqual([false, 's']);
            expect(boundaries.c0[3]).toEqual([3, 0, 1]);
            expect(boundaries.d1[0]).toEqual([3, 0, 0]);
            const mismatches = coonsMismatches(boundaries);
            expect(mismatches.map(entry => entry.corner)).toEqual(['u1v0']);
            expect(mismatches[0].distance).toBeCloseTo(1, 12);
            // S(1, 0) is the average of the two end points, half the gap from each.
            const net = coonsBicubicNet(boundaries as Record<'c0' | 'c1' | 'd0' | 'd1', Vec3[]>);
            const s10 = evalNet(net, 1, 0);
            close(s10, [3, 0, 0.5]);
            expect(Math.hypot(...s10.map((x, k) => x - boundaries.c0[3][k]))).toBeCloseTo(0.5, 12);
            expect(Math.hypot(...s10.map((x, k) => x - boundaries.d1[0][k]))).toBeCloseTo(0.5, 12);
            // The panel reports the gap and does not claim interpolation.
            const {container} = render(<>{m.edit()}</>);
            expect(container.querySelector('[data-corner-status="mismatch"]')).not.toBeNull();
            expect(container.querySelector('[data-corner="u1v0"]')!.textContent).toBe(t('coons_corner_mismatch', {value0: '(1, 0)', value1: '1'}));
            expect(container.textContent).toContain(t('coons_no_interpolation'));
            expect(container.querySelector('[data-corner-status="met"]')).toBeNull();
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the prose gives the gap and the miss and claims no interpolation at the broken corner', () => {
        const step = stepOf('coons-break-corner');
        const sl = prose(step, 'sl'), en = prose(step, 'en');
        for (const [text, l] of [[sl, 'sl'], [en, 'en']] as const) {
            for (const x of [1, 0.5].map(v => num(v, l))) expect(text).toContain(x);
            expect(text).toContain('(3,0,0.5)'.replace('0.5', l === 'sl' ? '0{,}5' : '0.5'));
        }
        expect(sl).toMatch(/Ne\. /);
        expect(sl).toMatch(/interpolira robne krivulje samo, kadar se vogali stikajo/);
        expect(sl).toMatch(/ne trdi interpolacije/);
        expect(en).toMatch(/No\. /);
        expect(en).toMatch(/interpolates the boundary curves only when the corners meet/);
        expect(en).toMatch(/does not claim interpolation/);
        // The step never says the surface passes through both curves.
        expect(en).not.toMatch(/passes through (both|all)/);
        expect(sl).not.toMatch(/gre skozi vse/);
    });
});

test('each scene sets the shown surface, the corner linking and the boundaries its text describes, in one synchronous sequence', () => {
    const m = mount();
    try {
        const expected: ReadonlyArray<readonly [string, string, boolean]> = [
            ['coons-boundaries', 's', true], ['coons-ruled-c', 'lc', true], ['coons-ruled-d', 'ld', true], ['coons-blend-step', 's', true],
            ['coons-interior-net', 's', true], ['coons-break-corner', 's', false], ['coons-explore', 's', true],
        ];
        for (const [stepId, shown, linked] of expected) {
            m.scene(stepOf(stepId));
            expect([m.graph.state.shown, m.graph.state.linkedCorners], stepId).toEqual([shown, linked]);
            if (stepId !== 'coons-break-corner') expect(m.graph.state.boundaries, stepId).toEqual(defaultCoonsBoundaries());
        }
        // Consecutive steps without a restore end in the last step's state.
        m.run(stepOf('coons-ruled-c'));
        m.run(stepOf('coons-break-corner'));
        m.run(stepOf('coons-explore'));
        expect([m.graph.state.shown, m.graph.state.linkedCorners]).toEqual(['s', true]);
        // Reset after a modified step returns to the default: the default boundaries, linked corners, S and a fitted camera.
        m.run(stepOf('coons-break-corner'));
        act(() => { m.graph.setShown('b'); m.graph.applyCameraPreset('top'); });
        const fitted = m.graph.state.camera;
        m.reset();
        const state = m.graph.state;
        expect(state.boundaries).toEqual(defaultCoonsBoundaries());
        expect([state.linkedCorners, state.shown]).toEqual([true, 's']);
        expect(coonsMismatches(state.boundaries)).toEqual([]);
        expect(state.camera.el).not.toBe(fitted.el);
        expect(state.camera.distance).toBeGreaterThan(0);
        expect(state.camera.target.every(Number.isFinite)).toBe(true);
        // A lesson checkpoint taken in a modified state (linked corners off, a corner moved) keeps it.
        m.run(stepOf('coons-break-corner'));
        const checkpoint = m.capabilities.captureState();
        m.reset();
        expect(m.graph.state.linkedCorners).toBe(true);
        act(() => m.capabilities.restoreState(checkpoint));
        expect(m.graph.state.linkedCorners).toBe(false);
        expect(m.graph.state.boundaries.c0[3]).toEqual([3, 0, 1]);
        expect(coonsMismatches(m.graph.state.boundaries).map(entry => entry.corner)).toEqual(['u1v0']);
    } finally {
        m.mounted.view.unmount();
    }
});

test('a linked corner moves its twin and an unlinked one does not, in the order the scenes apply them', () => {
    const m = mount();
    try {
        act(() => {
            m.capabilities.apply({kind: 'coons', operation: 'move-point', name: 'c0', index: 3, xyz: [4, 0, 1]});
        });
        expect(m.graph.state.boundaries.d1[0]).toEqual([4, 0, 1]);
        act(() => {
            m.capabilities.apply({kind: 'coons', operation: 'set-linked-corners', linked: false});
            m.capabilities.apply({kind: 'coons', operation: 'move-point', name: 'c0', index: 3, xyz: [5, 0, 1]});
        });
        expect(m.graph.state.boundaries.d1[0]).toEqual([4, 0, 1]);
        act(() => { m.capabilities.apply({kind: 'coons', operation: 'set-linked-corners', linked: true}); });
        expect(m.graph.state.boundaries.c0[3]).toEqual([4.5, 0, 1]);
        expect(m.graph.state.boundaries.d1[0]).toEqual([4.5, 0, 1]);
    } finally {
        m.mounted.view.unmount();
    }
});

test('the coons action rejects invalid inputs with a clear error', () => {
    const m = mount();
    try {
        const bad: unknown[] = [
            {kind: 'coons', operation: 'set-shown', shown: 'x'},
            {kind: 'coons', operation: 'set-linked-corners', linked: 'yes'},
            {kind: 'coons', operation: 'move-point', name: 'c2', index: 0, xyz: [0, 0, 0]},
            {kind: 'coons', operation: 'move-point', name: 'c0', index: 4, xyz: [0, 0, 0]},
            {kind: 'coons', operation: 'move-point', name: 'c0', index: 1.5, xyz: [0, 0, 0]},
            {kind: 'coons', operation: 'move-point', name: 'c0', index: 1, xyz: [0, 0]},
            {kind: 'coons', operation: 'move-point', name: 'c0', index: 1, xyz: [0, Number.NaN, 0]},
            {kind: 'coons', operation: 'rotate'},
        ];
        for (const action of bad) expect(() => m.capabilities.apply(action as LessonAction), JSON.stringify(action)).toThrow(/coons|shown|boundary|index|control point|xyz|linked|operation/i);
        expect(m.graph.state.boundaries).toEqual(defaultCoonsBoundaries());
    } finally {
        m.mounted.view.unmount();
    }
});

test('the D4 lesson has seven steps with predictions, a free last step, the one-blend caveat and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(7);
    expect(lesson.steps[6].id).toBe('coons-explore');
    for (const step of lesson.steps.slice(0, 6)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    const all = JSON.stringify(lesson);
    for (const term of ['Coonsova ploskev', 'premonosna ploskev', 'bilinearna ploskev', 'Bilinearna ploskev B']) expect(all, term).toContain(term);
    for (const language of ['sl', 'en'] as const) {
        const everything = JSON.stringify([lesson.summary[language], lesson.steps.map(step => prose(step, language)), lesson.formulaBlocks.map(block => block.explanation[language])]);
        expect(everything).toMatch(language === 'sl' ? /ena od mnogih/ : /one of many/);
        expect(everything).toMatch(language === 'sl' ? /ne določ/ : /do not determine|not the boundary alone|not only the boundary/);
        expect(everything).not.toMatch(/twist|zasuk/i);
        // Step 5 compares with the tensor patch and says the cubic Coons patch is exactly a bicubic Bézier patch.
        expect(prose(stepOf('coons-interior-net'), language)).toMatch(language === 'sl' ? /natanko bikubična Bézierjeva krpa/ : /exactly a bicubic Bézier patch/);
        expect(prose(stepOf('coons-interior-net'), language)).toMatch(language === 'sl' ? /tenzorsko krpo/ : /tensor patch/);
    }
});
