import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {GeometryElement} from 'jsxgraph';
import CurveEnvelopeGraph, {ENVELOPE_DEFAULT_POINTS, ENVELOPE_LINES_DEFAULT, ENVELOPE_T_DEFAULT} from './CurveEnvelopeGraph';
import {envelopeFamily, tangentSegment} from './curveEnvelope';
import {setLanguage, t} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';
import {LessonAction} from '../../../learning/model';

/** Counts live language subscriptions, so a leaked listener shows even though the overlay also guards its callback. */
const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

type BoardObject = GeometryElement & {
    plaintext?: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number; visProp: { visible: boolean | (() => boolean) };
};

class Probe extends CurveEnvelopeGraph {
    liveBoard() { return this.board; }
    act(action: LessonAction) { this.applyLessonAction(action); }
    private owned() { return this.envelope()!.ownedElements() as unknown as BoardObject[]; }
    family() { return this.owned().filter(element => element.elType === 'curve')[0]; }
    highlight() { return this.owned().filter(element => element.elType === 'curve')[1]; }
    touch() { return this.owned().find(element => element.elType === 'point')!; }
    captions() { return this.owned().filter(element => element.elType === 'text').map(element => element.plaintext ?? '').filter(Boolean); }
    published(): string { return this['liveReadout'].getSnapshot(); }
    curveVisible(): boolean { return this.getFirstJxgCurve().getJxgCurve().visProp.visible as boolean; }
    /** A lesson step on a hidden curve: its scene shows the curve again, and its action hides it, all in one batch. */
    sceneThenHide() {
        this.setEnvelopeCurveShown(true);
        this.syncReplacedScene();
        this.setEnvelopeCurveShown(false);
    }
    movePoint(index: number, to: number[]) {
        const point = this.getFirstJxgCurve().getJxgPoints()[index];
        point.moveTo(to, 0);
        (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
        this.liveBoard().update();
    }
    countWithoutTickLabels(): number {
        const owned = this.envelope()?.ownedElements() ?? [];
        return (this.board.objectsList as GeometryElement[]).filter(element => !(element.elType === 'text' && !owned.includes(element))).length;
    }
}

function mount() {
    const graph = new Probe();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

/** The board's drawn family must be the kernel's, sample for sample (NaN included), for the control rows now on the board. */
function expectFamilyIsKernel(graph: Probe, count: number) {
    const expected = envelopeFamily(graph.controlRows()!, count);
    expect(expected.x.length).toBe(3 * count - 1);
    expect(graph.family().dataX).toEqual(expected.x);
    expect(graph.family().dataY).toEqual(expected.y);
}

/** The highlighted segment and touching point against a de Casteljau point computed here, independently of the kernel. */
function expectTouchIsDeCasteljau(graph: Probe, t: number) {
    let level = graph.controlRows()!;
    const lastTwo: number[][][] = [];
    while (level.length > 1) {
        lastTwo[0] = level;
        level = level.slice(1).map((row, i) => [(1 - t) * level[i][0] + t * row[0], (1 - t) * level[i][1] + t * row[1]]);
    }
    const [q0, q1] = lastTwo[0];
    const point = level[0];
    expect(graph.touch().X!()).toBeCloseTo(point[0], 9);
    expect(graph.touch().Y!()).toBeCloseTo(point[1], 9);
    const h = graph.highlight();
    expect(h.dataX).toEqual([q0[0], q1[0]]);
    expect(h.dataY).toEqual([q0[1], q1[1]]);
    // The point lies on the highlighted segment.
    expect(Math.abs((q1[0] - q0[0]) * (point[1] - q0[1]) - (q1[1] - q0[1]) * (point[0] - q0[0]))).toBeLessThan(1e-9);
}

describe('mounting and the opening scene', () => {
    test('the default curve, state, and a family obeying x/(1-t) + y/t = 1 with the touching point on sqrt(x) + sqrt(y) = 1', () => {
        const {graph, view} = mount();
        try {
            expect(graph.controlRows()).toEqual(ENVELOPE_DEFAULT_POINTS);
            expect(graph.state).toMatchObject({envelopeT: ENVELOPE_T_DEFAULT, envelopeLineCount: ENVELOPE_LINES_DEFAULT,
                envelopeLinesShown: true, envelopeCurveShown: true, envelopeTouchShown: true});
            expectFamilyIsKernel(graph, ENVELOPE_LINES_DEFAULT);
            const x = graph.family().dataX!, y = graph.family().dataY!;
            for (let i = 0; i < ENVELOPE_LINES_DEFAULT; i++) {
                const t = (i + 1) / (ENVELOPE_LINES_DEFAULT + 1);
                for (const k of [3 * i, 3 * i + 1]) expect(x[k] / (1 - t) + y[k] / t).toBeCloseTo(1, 9);
            }
            expectTouchIsDeCasteljau(graph, 0.5);
            expect(Math.sqrt(graph.touch().X!()) + Math.sqrt(graph.touch().Y!())).toBeCloseTo(1, 9);
            expect(graph.captions()).toEqual([t('envelope_readout_lines', {value0: '16'}), t('envelope_readout_t', {value0: '0,5'})]);
        } finally { view.unmount(); }
    });
});

describe('the touching point and the highlighted segment', () => {
    test('follow t at degree 2 and at degree 3, and the segment direction is that of B\'(t)', async () => {
        const {graph, view} = mount();
        try {
            for (const tt of [0, 0.2, 0.5, 0.77, 1]) {
                act(() => graph.setEnvelopeT(tt));
                expectTouchIsDeCasteljau(graph, tt);
            }
            act(() => graph.getFirstJxgCurve().elevate());
            [[-2, -1], [-1, 3], [2, 2.5], [3, -1.5]].forEach((to, index) => act(() => graph.movePoint(index, to)));
            expect(graph.controlRows()).toHaveLength(4);
            for (const tt of [0, 0.3, 0.5, 0.9, 1]) {
                act(() => graph.setEnvelopeT(tt));
                expectTouchIsDeCasteljau(graph, tt);
                // B'(t) for a cubic from the hodograph formula, independent of the kernel.
                const p = graph.controlRows()!;
                const d = [0, 1, 2].map(i => [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]]);
                const w = [(1 - tt) ** 2, 2 * tt * (1 - tt), tt * tt];
                const tangent = [0, 1].map(c => 3 * d.reduce((s, row, i) => s + w[i] * row[c], 0));
                const dx = graph.highlight().dataX!, dy = graph.highlight().dataY!;
                const segment = [dx[1] - dx[0], dy[1] - dy[0]];
                expect(Math.abs(segment[0] * tangent[1] - segment[1] * tangent[0])).toBeLessThan(1e-9);
            }
        } finally { view.unmount(); }
    });

    test('degree elevation keeps B(t) and redraws the segment', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setEnvelopeT(0.3));
            const before = [graph.touch().X!(), graph.touch().Y!()];
            act(() => { graph.getFirstJxgCurve().elevate(); graph.liveBoard().update(); });
            expect(graph.controlRows()).toHaveLength(4);
            expectTouchIsDeCasteljau(graph, 0.3);
            expect(graph.touch().X!()).toBeCloseTo(before[0], 9);
            expect(graph.touch().Y!()).toBeCloseTo(before[1], 9);
            expectFamilyIsKernel(graph, ENVELOPE_LINES_DEFAULT);
        } finally { view.unmount(); }
    });

    test('dragging a control point redraws the family and the touching point', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setEnvelopeT(0.4));
            const familyBefore = [...graph.family().dataX!];
            act(() => graph.movePoint(1, [0.5, 0.8]));
            expect(graph.controlRows()![1][0]).toBeCloseTo(0.5, 9);
            expect(graph.family().dataX).not.toEqual(familyBefore);
            expectFamilyIsKernel(graph, ENVELOPE_LINES_DEFAULT);
            expectTouchIsDeCasteljau(graph, 0.4);
            const s = tangentSegment(graph.controlRows()!, 0.4)!;
            expect(graph.touch().X!()).toBeCloseTo(s.touch[0], 9);
        } finally { view.unmount(); }
    });
});

describe('the line count and the switches', () => {
    test('N = 1, 16 and 200 draw exactly N segments; 201 and non-integers are rejected and leave the state alone', () => {
        const {graph, view} = mount();
        try {
            for (const n of [1, 16, 200]) {
                act(() => graph.setEnvelopeLineCount(n));
                expectFamilyIsKernel(graph, n);
                expect(graph.family().dataX!.filter(Number.isNaN)).toHaveLength(n - 1);
            }
            for (const bad of [201, 0, 2.5, NaN, -3]) expect(() => graph.setEnvelopeLineCount(bad)).toThrow();
            expect(() => graph.act({kind: 'envelope-lines', value: 201})).toThrow();
            expect(() => graph.act({kind: 'envelope-lines', value: 3.5})).toThrow();
            expect(() => graph.setEnvelopeT(1.2)).toThrow();
            expect(() => graph.setEnvelopeLinesShown('yes' as unknown as boolean)).toThrow();
            expect(graph.state.envelopeLineCount).toBe(200);
            expect(graph.state.envelopeT).toBe(ENVELOPE_T_DEFAULT);
        } finally { view.unmount(); }
    });

    test('the lines, the touching point and the curve switch on and off', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setEnvelopeLinesShown(false));
            expect(graph.family().dataX).toEqual([]);
            act(() => graph.setEnvelopeLinesShown(true));
            expectFamilyIsKernel(graph, ENVELOPE_LINES_DEFAULT);
            act(() => graph.setEnvelopeTouchShown(false));
            expect(graph.highlight().dataX).toEqual([]);
            act(() => graph.setEnvelopeTouchShown(true));
            expectTouchIsDeCasteljau(graph, 0.5);
            expect(graph.curveVisible()).toBe(true);
            act(() => graph.setEnvelopeCurveShown(false));
            expect(graph.curveVisible()).toBe(false);
            expect(graph.getFirstJxgCurve().getJxgPoints().length).toBe(3);
            act(() => graph.setEnvelopeCurveShown(true));
            expect(graph.curveVisible()).toBe(true);
        } finally { view.unmount(); }
    });
});

describe('lesson actions run in one synchronous tick', () => {
    test('each action sets its state field, and a multi-action scene reads what the earlier action wrote', () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.act({kind: 'envelope-t', value: 0.25});
                graph.act({kind: 'envelope-lines', value: 5});
                graph.act({kind: 'curve-visibility', target: 'envelope-lines', visible: false});
                graph.act({kind: 'curve-visibility', target: 'envelope-curve', visible: false});
                graph.act({kind: 'curve-visibility', target: 'envelope-touch', visible: false});
                expect(graph.state).toMatchObject({envelopeT: 0.25, envelopeLineCount: 5, envelopeLinesShown: false, envelopeCurveShown: false, envelopeTouchShown: false});
            });
            expect(graph.curveVisible()).toBe(false);
            expect(graph.family().dataX).toEqual([]);
            expect(graph.highlight().dataX).toEqual([]);
            act(() => {
                graph.act({kind: 'curve-visibility', target: 'envelope-lines', visible: true});
                graph.act({kind: 'curve-visibility', target: 'envelope-curve', visible: true});
                graph.act({kind: 'curve-visibility', target: 'envelope-touch', visible: true});
            });
            expectFamilyIsKernel(graph, 5);
            expectTouchIsDeCasteljau(graph, 0.25);
            expect(graph.curveVisible()).toBe(true);
            expect(graph.captions()[0]).toBe(t('envelope_readout_lines', {value0: '5'}));
        } finally { view.unmount(); }
    });
});

describe('collinear and coincident controls', () => {
    test.each([['collinear', [[0, 0], [1, 1], [3, 3]]], ['coincident', [[1, 1], [1, 1], [1, 1]]]])('%s: the readout says so in both languages and nothing is NaN inside a segment', async (_name, points) => {
        const {graph, view} = mount();
        try {
            points.forEach((to, index) => act(() => graph.movePoint(index, to)));
            expect(graph.envelope()!.collinear()).toBe(true);
            expect(graph.captions()).toContain(t('envelope_readout_collinear'));
            expect((await screen.findAllByText(t('envelope_readout_collinear'))).length).toBeGreaterThan(0);
            const family = graph.family();
            expect(family.dataX!.filter(Number.isNaN)).toHaveLength(ENVELOPE_LINES_DEFAULT - 1);
            expect(family.dataX!.filter(value => !Number.isNaN(value)).every(Number.isFinite)).toBe(true);
            expect(Number.isFinite(graph.touch().X!())).toBe(true);
            expectTouchIsDeCasteljau(graph, 0.5);
            setLanguage('en');
            act(() => graph.liveBoard().update());
            expect(graph.captions()).toContain('The control points lie on one line: all lines lie on it, and the curve is a segment, not an envelope.');
            expect(t('envelope_readout_collinear')).not.toBe('');
        } finally { view.unmount(); }
    });

    test('a drag lands on the line only to a pixel, which still counts; three pixels off does not', () => {
        const {graph, view} = mount();
        try {
            const pixel = 1 / graph.liveBoard().unitX;
            act(() => graph.movePoint(1, [0.5 + 0.5 * pixel, 0.5]));
            expect(graph.envelope()!.collinear()).toBe(true);
            act(() => graph.movePoint(1, [0.5 + 5 * pixel, 0.5]));
            expect(graph.envelope()!.collinear()).toBe(false);
        } finally { view.unmount(); }
    });

    test('a proper curve has no collinear note, and moving a point onto the line adds it', () => {
        const {graph, view} = mount();
        try {
            expect(graph.captions()).not.toContain(t('envelope_readout_collinear'));
            act(() => graph.movePoint(1, [0.5, 0.5]));
            expect(graph.envelope()!.collinear()).toBe(true);
            expect(graph.captions()).toContain(t('envelope_readout_collinear'));
            act(() => graph.movePoint(1, [0, 0]));
            expect(graph.captions()).not.toContain(t('envelope_readout_collinear'));
        } finally { view.unmount(); }
    });
});

describe('Preset round trip and Reset', () => {
    test('a saved Preset restores t, the count, the switches and the hidden curve', async () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.setEnvelopeT(0.8); graph.setEnvelopeLineCount(40); graph.setEnvelopeLinesShown(false);
                graph.setEnvelopeCurveShown(false); graph.setEnvelopeTouchShown(false);
            });
            act(() => graph.saveCurrentPreset('mine'));
            act(() => { graph.setEnvelopeT(0.1); graph.setEnvelopeLineCount(3); graph.setEnvelopeLinesShown(true); graph.setEnvelopeCurveShown(true); graph.setEnvelopeTouchShown(true); });
            await settle(() => graph.selectPreset('mine'));
            expect(graph.state).toMatchObject({envelopeT: 0.8, envelopeLineCount: 40, envelopeLinesShown: false, envelopeCurveShown: false, envelopeTouchShown: false});
            expect(graph.curveVisible()).toBe(false);
            expect(graph.envelope()).toBeDefined();
            act(() => graph.setEnvelopeLinesShown(true));
            expectFamilyIsKernel(graph, 40);
            expect(screen.getByRole('slider', {name: t('envelope_line_count')})).toHaveValue('40');
        } finally { view.unmount(); }
    });

    test('a scene that shows the curve and an action that hides it again in one batch leave it hidden', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setEnvelopeCurveShown(false));
            expect(graph.curveVisible()).toBe(false);
            act(() => graph.sceneThenHide());
            expect(graph.state.envelopeCurveShown).toBe(false);
            expect(graph.curveVisible()).toBe(false);
        } finally { view.unmount(); }
    });

    test('Reset returns to the opening scene, the curve visible', async () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setEnvelopeT(0.9); graph.setEnvelopeCurveShown(false); graph.movePoint(1, [0.4, 0.4]); });
            await settle(() => graph.reset());
            expect(graph.controlRows()).toEqual(ENVELOPE_DEFAULT_POINTS);
            expect(graph.state).toMatchObject({envelopeT: ENVELOPE_T_DEFAULT, envelopeLineCount: ENVELOPE_LINES_DEFAULT, envelopeCurveShown: true});
            expect(graph.curveVisible()).toBe(true);
            expectFamilyIsKernel(graph, ENVELOPE_LINES_DEFAULT);
            expectTouchIsDeCasteljau(graph, 0.5);
        } finally { view.unmount(); }
    });
});

describe('the readout', () => {
    test('a language switch keeps the collinear note, translated at once', async () => {
        const {graph, view} = mount();
        try {
            act(() => graph.movePoint(1, [0.5, 0.5]));
            await screen.findByText(t('envelope_readout_collinear'), {selector: '.inspector-help'});
            act(() => setLanguage('en'));
            expect(graph.published()).toContain(t('envelope_readout_collinear'));
            expect(screen.getByText(t('envelope_readout_collinear'), {selector: '.inspector-help'})).toBeInTheDocument();
        } finally { view.unmount(); }
    });

    test('a language switch refreshes the board caption, with the decimal comma in sl', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setEnvelopeT(0.25));
            expect(graph.captions()[1]).toBe('t = 0,25.');
            setLanguage('en');
            act(() => graph.liveBoard().update());
            expect(graph.captions()).toEqual(['Number of lines: 16.', 't = 0.25.']);
        } finally { view.unmount(); }
    });

    test('the live region is replaced at once on a scene replacement', async () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setEnvelopeLineCount(7));
            await settle(() => graph.reset());
            expect(graph.published()).toBe(`${t('envelope_readout_lines', {value0: '16'})} ${t('envelope_readout_t', {value0: '0,5'})}`);
        } finally { view.unmount(); }
    });
});

describe('ownership and disposal', () => {
    test('the owned elements leave the board on dispose, which is idempotent', () => {
        const before = liveSubscriptions.count;
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            const overlay = graph.envelope()!;
            const owned = [...overlay.ownedElements()];
            expect(owned.length).toBeGreaterThan(0);
            owned.forEach(element => expect(board.objectsList.includes(element)).toBe(true));
            const live = liveSubscriptions.count;
            overlay.dispose();
            overlay.dispose();
            expect(liveSubscriptions.count).toBe(live - 1);
            owned.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
        } finally { view.unmount(); }
        expect(liveSubscriptions.count).toBe(before);
    });

    test('scene replacements leave a constant board object count and no old owned element, and unmount removes the last', async () => {
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            const count = graph.countWithoutTickLabels();
            const seen: GeometryElement[] = [...graph.envelope()!.ownedElements()];
            const subscriptions = liveSubscriptions.count;
            for (let i = 0; i < 6; i++) {
                await settle(() => graph.reset());
                expect(graph.countWithoutTickLabels()).toBe(count);
                seen.push(...graph.envelope()!.ownedElements());
                expect(liveSubscriptions.count).toBe(subscriptions);
            }
            const last = [...graph.envelope()!.ownedElements()];
            view.unmount();
            last.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
            seen.forEach(element => expect(board.objectsList.includes(element)).toBe(false));
        } finally { view.unmount(); }
    });

    test('unmount releases the language subscription', () => {
        const before = liveSubscriptions.count;
        const {view} = mount();
        expect(liveSubscriptions.count).toBeGreaterThan(before);
        view.unmount();
        expect(liveSubscriptions.count).toBe(before);
    });
});
