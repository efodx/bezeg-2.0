/**
 * Construction first on the Bezier operation routes (graph-control first use, wave 3): each route's own first task is the first
 * Edit group and stays there while the curve is selected; the plan's Acceptance line is checked on the real graph.
 */
import {act, fireEvent, screen, within} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {t} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

interface Pt {X(): number; Y(): number}
interface Poly {getPoints(): Pt[]; eval(u: number): Pt}
type Run = BaseGraph<BaseGraphState> & {
    editing: {select(curve: unknown): void};
    jxgCurves: Array<{setAttributes(attributes: object): void; getCurve(): Poly; getExtrapolationT(): number}>;
    extensionCurve?: unknown;
};

const mount = (key: keyof typeof graphFactories) => mountGraph(graphFactories[key]()).graph as Run;
const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
const firstCard = () => (screen.getAllByText(t('construction')).find(element => element.closest('.tools')))!.closest('.tools') as HTMLElement;
const select = (graph: Run) => {
    graph.jxgCurves[0].setAttributes({allowElevation: true});
    act(() => graph.editing.select(graph.jxgCurves[0]));
};
const button = (name: string | RegExp) => screen.getByRole('button', {name});
const press = (name: string | RegExp) => act(() => { fireEvent.click(button(name)); });
const xy = (p: Pt) => [p.X(), p.Y()];

/** The controls of each route's first task, as accessible queries. */
const inButton = (r: HTMLElement, name: string | RegExp) => within(r).getByRole('button', {name});
const firstTask: Record<string, Array<(root: HTMLElement) => HTMLElement>> = {
    'affine': [r => inButton(r, new RegExp(t('rotate_left'))), r => inButton(r, new RegExp(t('rotate_right')))],
    'repeated-subdivision': [r => inButton(r, t('subdivide'))],
    // The cut parameter t is a declared board puck (task 08 lane L41): off the Edit list, on the puck strip (checked below); Subdivide leads.
    'subdivision': [r => inButton(r, t('subdivide'))],
    // The extrapolation parameter t is a declared board puck (task 08 lane L41): off the Edit list, on the puck strip (checked below); Extrapolate leads.
    'extrapolation': [r => inButton(r, t('extrapolate'))],
    'elevation': [r => inButton(r, t('elevate_degree'))],
};
// Headings the plan entries place after the first task.
const later: Record<string, string[]> = {
    'affine': [t('affine_position'), t('affine_scale'), t('affine_reflection'), t('curve_selection')],
    'repeated-subdivision': [t('curve_selection')],
    'subdivision': [t('curve_selection')],
    'extrapolation': [t('curve_selection')],
    'elevation': [t('curve_selection')],
};

describe.each(Object.keys(firstTask) as Array<'affine' | 'repeated-subdivision' | 'subdivision' | 'extrapolation' | 'elevation'>)('%s construction first', key => {
    test('the first task is the first Edit group, before the later controls, and stays while the curve is selected', () => {
        const graph = mount(key);
        const follows = (card: HTMLElement, element: Element) =>
            expect(card.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const check = () => {
            const card = firstCard();
            expect(card.parentElement!.querySelector('.tools')).toBe(card);
            for (const control of firstTask[key]) expect(card.contains(control(card))).toBe(true);
            for (const text of later[key]) {
                for (const heading of inEdit(text)) if (!card.contains(heading)) follows(card, heading);
            }
            for (const typed of screen.queryAllByRole('spinbutton')) if (!card.contains(typed)) follows(card, typed);
            expect(inEdit(t('graph_commands'))).toEqual([]);
        };
        check();
        select(graph);
        check();
    });

    test.runIf(key === 'subdivision')('the cut parameter is a puck on the strip, not a slider in Edit', () => {
        mount(key);
        const strip = document.querySelector('[data-puck-strip]');
        expect(strip, 'puck strip').not.toBeNull();
        expect(strip!.textContent).toContain(t('subdivision_t_name'));
        expect(screen.queryByRole('slider', {name: t('subdivision_parameter_t')})).toBeNull();
    });

    test.runIf(key === 'extrapolation')('the extrapolation parameter is a puck on the strip, not a slider in Edit', () => {
        mount(key);
        const strip = document.querySelector('[data-puck-strip]');
        expect(strip, 'puck strip').not.toBeNull();
        expect(strip!.textContent).toContain(t('extrapolation_t_name'));
        expect(screen.queryByRole('slider', {name: t('extrapolation_parameter_t')})).toBeNull();
    });

    test.runIf(key === 'affine')('the rotation leads the other transformation groups', () => {
        mount(key);
        const rotation = screen.getByText(t('affine_rotation'));
        for (const other of [t('affine_position'), t('affine_scale'), t('affine_reflection')]) {
            expect(rotation.compareDocumentPosition(screen.getByText(other)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
    });
});

describe('route acceptance', () => {
    test('affine: rotating moves the whole figure and the inverse rotation restores it', () => {
        const graph = mount('affine');
        const read = () => graph.jxgCurves[0].getCurve().getPoints().map(xy);
        const start = read();
        const startMid = xy(graph.jxgCurves[0].getCurve().eval(0.5));
        press(new RegExp(t('rotate_left')));
        const turned = read();
        expect(turned.some((p, i) => Math.hypot(p[0] - start[i][0], p[1] - start[i][1]) > 0.1)).toBe(true);
        const turnedMid = xy(graph.jxgCurves[0].getCurve().eval(0.5));
        expect(Math.hypot(turnedMid[0] - startMid[0], turnedMid[1] - startMid[1])).toBeGreaterThan(0.01);
        press(new RegExp(t('rotate_right')));
        read().forEach((p, i) => { expect(p[0]).toBeCloseTo(start[i][0], 8); expect(p[1]).toBeCloseTo(start[i][1], 8); });
    });

    test('elevation: one elevation raises the degree by one and keeps the curve', () => {
        const graph = mount('elevation');
        const before = graph.jxgCurves[0].getCurve();
        const us = [0, 0.2, 0.5, 0.8, 1];
        const samples = us.map(u => xy(before.eval(u)));
        const count = before.getPoints().length;
        press(t('elevate_degree'));
        const after = graph.jxgCurves[0].getCurve();
        expect(after.getPoints().length).toBe(count + 1);
        us.forEach((u, i) => {
            expect(after.eval(u).X()).toBeCloseTo(samples[i][0], 8);
            expect(after.eval(u).Y()).toBeCloseTo(samples[i][1], 8);
        });
    });

    test('subdivision: at an interior parameter the pieces meet at the chosen point and reproduce the curve', () => {
        const graph = mount('subdivision');
        // Subdividing rewrites the curve in place, so sample the original before pressing.
        const sampled = new Map<number, number[]>();
        for (let i = 0; i <= 1000; i++) sampled.set(i / 1000, xy(graph.jxgCurves[0].getCurve().eval(i / 1000)));
        const at = (u: number) => sampled.get(Math.round(u * 1000) / 1000)!;
        // The cut parameter is a board puck; its write is the declared binding, as a learner.
        act(() => runAs('learner', () => (graph as unknown as {parameterBindings(): Record<string, {apply(value: number): void}>}).parameterBindings()['subdivision-t'].apply(0.3)));
        press(t('subdivide'));
        expect(graph.jxgCurves.length).toBe(2);
        const [first, second] = graph.jxgCurves.map(curve => curve.getCurve());
        const meet = at(0.3);
        for (const p of [xy(first.eval(1)), xy(second.eval(0))]) {
            expect(p[0]).toBeCloseTo(meet[0], 8);
            expect(p[1]).toBeCloseTo(meet[1], 8);
        }
        for (const u of [0, 0.25, 0.5, 1]) {
            expect(xy(first.eval(u))[0]).toBeCloseTo(at(0.3 * u)[0], 6);
            expect(xy(first.eval(u))[1]).toBeCloseTo(at(0.3 * u)[1], 6);
            expect(xy(second.eval(u))[0]).toBeCloseTo(at(0.3 + 0.7 * u)[0], 6);
            expect(xy(second.eval(u))[1]).toBeCloseTo(at(0.3 + 0.7 * u)[1], 6);
        }
    });

    test('repeated subdivision: each press adds pieces whose points lie on the original curve', () => {
        const graph = mount('repeated-subdivision');
        const original = graph.jxgCurves[0].getCurve();
        const dense = Array.from({length: 4001}, (_, i) => xy(original.eval(i / 4000)));
        const onOriginal = (p: number[]) => Math.min(...dense.map(q => Math.hypot(q[0] - p[0], q[1] - p[1]))) < 2e-2;
        const counts = [graph.jxgCurves.length];
        press(t('subdivide'));
        counts.push(graph.jxgCurves.length);
        press(t('subdivide'));
        counts.push(graph.jxgCurves.length);
        expect(counts[1]).toBeGreaterThan(counts[0]);
        expect(counts[2]).toBeGreaterThan(counts[1]);
        for (const curve of graph.jxgCurves) {
            for (const u of [0, 0.5, 1]) expect(onOriginal(xy(curve.getCurve().eval(u)))).toBe(true);
        }
    });

    test('extrapolation: moving the parameter past the endpoint draws the separate extension element', () => {
        const graph = mount('extrapolation');
        act(() => runAs('learner', () => (graph as unknown as {parameterBindings(): Record<string, {apply(value: number): void}>}).parameterBindings()['extrapolation-t'].apply(1.5)));
        expect(graph.jxgCurves[0].getExtrapolationT()).toBeCloseTo(1.5, 6);
        expect(graph.extensionCurve).toBeDefined();
    });
});
