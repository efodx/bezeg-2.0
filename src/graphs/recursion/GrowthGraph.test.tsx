import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, settle} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {DEFAULT_GROWTH_STATE, deriveGrowth, GrowthPanel} from '../../recursion/recursionModel';
import {barsPath, chord, sampleCurve} from './growthScene';
import {GrowthGraph, LOG_POINTS} from './GrowthGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

/** Exposes the board and the disposal and rebuild the scene replacement calls. */
class ObservedGraph extends GrowthGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    rebuildNow() { this.syncReplacedScene(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type Probe = {id: string; elType: string; dataX?: number[]; dataY?: number[]; plaintext?: string; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const curves = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve');
const markers = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'point');
const texts = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'text' && o.plaintext !== '0,0');
/** Ids of the objects of the scene: tick labels come and go with the window of the panel and are not the scene's. */
const ownIds = (graph: ObservedGraph) => probes(graph).filter(o => !o.id.includes('_ticks_')).map(o => o.id);
const visible = (list: Probe[]) => list.filter(o => o.evalVisProp('visible'));
const shown = (graph: ObservedGraph) => visible(texts(graph)).map(o => o.plaintext ?? '');
/** The owned objects: 12 curves (2 sequence, 4 interest + 4 legend, 2 logarithm), 32 points (n-th term, 31 logarithm points), 11 captions. */
const CURVES = 12;
const SCENE_OBJECTS = CURVES + (1 + LOG_POINTS) + 11;
/** Curve indices in creation order. */
const BARS = 0, LIMIT = 1, SIMPLE = 2, COMPOUND = 3, RELATIVE = 4, CONTINUOUS = 5, LEGEND = 6, LOG_LINE = 10, CHORD = 11;

/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const find = (label: string) => screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] as HTMLInputElement | undefined;
const field = (label: string) => find(label) ?? screen.getByLabelText(label) as HTMLInputElement;
/** The range input of a slider named `label`. */
const rangeOf = (label: string) => screen.getByRole('slider', {name: label}) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = () => document.querySelector('[data-recursion-status]')!.textContent!;
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const select = (label: string) => screen.getByRole('combobox', {name: label}) as HTMLSelectElement;
const choose = (label: string, value: string) => act(() => { fireEvent.change(select(label), {target: {value}}); });
const panel = (value: GrowthPanel) => choose(t('recursion_graph_growth_panel_label'), value);
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const described = (input: HTMLElement) => (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
const near = (actual: number | undefined, expected: number, digits = 6) => expect(actual).toBeCloseTo(expected, digits);
const board = (graph: ObservedGraph) => (graph.liveBoard().containerObj as HTMLElement).getAttribute('aria-label');

describe('mount and the sequence panel', () => {
    test('the default is the spec example: a1 = 3, d = 2, n = 10, so a10 = 21 and S10 = 120, exact', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({panel: 'sequence', kind: 'arithmetic', a1: 3, d: 2, n: 10});
        expect(readout('first')).toBe('3');
        expect(readout('difference')).toBe('2');
        expect(readout('terms')).toBe('3; 5; 7; 9; 11; 13; …');
        expect(readout('nth')).toBe('21');
        expect(readout('sum')).toBe('120');
        expect(readout('precision')).toBe(t('recursion_graph_growth_precision_exact'));
        expect(document.querySelector('[data-readout="nth"] dt')!.textContent).toBe(t('recursion_graph_growth_r_nth', {value0: '₁₀'}));
        expect(status()).toBe(t('recursion_graph_growth_status_arithmetic', {value0: '₁₀', value1: '21', value2: '120'}));
        expect(board(graph)).toBe(t('recursion_graph_growth_board_sequence'));
        expect(graph.ownedObjectCount()).toBe(SCENE_OBJECTS);
        noBadText();
    });

    test('the bars curve holds the scene data, the n-th term is marked, and every shown caption names an element', () => {
        const {graph} = mountGraph();
        const [bars] = curves(graph);
        const hand = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
        const path = barsPath(hand);
        expect([bars.dataX, bars.dataY]).toEqual([path.x, path.y]);
        expect(bars.dataY!.slice(0, 5)).toEqual([0, 3, 3, 0, 0]);
        expect(bars.dataY!.slice(-5)).toEqual([0, 21, 21, 0, 0]);
        expect(bars.dataX!.slice(-5)).toEqual([9.64, 9.64, 10.36, 10.36, 9.64]);
        expect(visible(curves(graph))).toHaveLength(1); // no limit line for an arithmetic sequence
        expect(visible(markers(graph))).toHaveLength(1);
        expect(shown(graph)).toEqual([
            t('recursion_graph_growth_cap_bars', {value0: 10}), t('recursion_graph_growth_cap_nth', {value0: '₁₀', value1: '21'}),
            t('recursion_graph_growth_cap_x_sequence'), t('recursion_graph_growth_cap_y_sequence'),
        ]);
    });

    test('geometric with q = 2: a10 = 1536, S10 = 3069 exact, no limit line', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({kind: 'geometric', a1: 3, q: 20, n: 10}); });
        expect(readout('ratio')).toBe('2');
        expect(readout('nth')).toBe('1536');
        expect(readout('sum')).toBe('3069');
        expect(readout('precision')).toBe(t('recursion_graph_growth_precision_exact'));
        expect(readout('limit')).toBe(t('recursion_graph_growth_limit_none'));
        expect(visible(curves(graph))).toHaveLength(1);
        expect(status()).toBe(t('recursion_graph_growth_status_geometric_exact', {value0: '₁₀', value1: '1536', value2: '3069'}));
        expect(shown(graph)).toHaveLength(4);
        expect(find(t('recursion_graph_growth_d_label'))).toBeUndefined();
    });

    test('geometric with q = 0,5: the sum is computed, the limit 6 is a line and a caption, and the status says it is not the last term', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({kind: 'geometric', a1: 3, q: 5, n: 10}); });
        expect(readout('sum')).toBe('5,994141'); // 5,994140625 at six decimals
        expect(readout('nth')).toBe('0,005859'); // 3 * 0,5^9
        expect(readout('precision')).toBe(t('recursion_graph_growth_precision_computed'));
        expect(readout('limit')).toBe(t('recursion_graph_growth_limit_value', {value0: '6'}));
        const line = curves(graph)[LIMIT];
        expect(line.evalVisProp('visible')).toBe(true);
        expect(line.dataY).toEqual([6, 6]);
        expect(shown(graph)).toContain(t('recursion_graph_growth_cap_limit', {value0: '6'}));
        expect(status()).toContain(t('recursion_graph_growth_status_limit', {value0: '6'}));
        act(() => { graph.setState({q: 10}); }); // |q| = 1: no limit
        expect(readout('limit')).toBe(t('recursion_graph_growth_limit_none'));
        expect(curves(graph)[LIMIT].evalVisProp('visible')).toBe(false);
        act(() => { graph.setState({q: -5}); }); // |q| < 1 with a negative ratio: the limit is a1/(1 - q) = 2
        expect(readout('limit')).toBe(t('recursion_graph_growth_limit_value', {value0: '2'}));
    });

    test('whole ratio (Q % 10 = 0) stays exact in BigInt beyond 2^53, with the true minus', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({kind: 'geometric', a1: 99, q: 30, n: 30}); });
        expect(readout('nth')).toBe('6794407359123417'); // 99 * 3^29
        expect(readout('sum')).toBe('10191611038685076'); // 99 * (3^30 - 1) / 2, above 2^53
        expect(readout('precision')).toBe(t('recursion_graph_growth_precision_exact'));
        act(() => { graph.setState({a1: 100, q: -20}); });
        expect(readout('nth')).toBe('−53687091200'); // 100 * (-2)^29
        expect(readout('sum')).toBe('−35791394100'); // 100 * (1 - (-2)^30) / 3
        act(() => { graph.setState({q: -30, a1: -100}); });
        expect(readout('first')).toBe('−100');
        expect(readout('nth')).toBe('6863037736488300'); // -100 * (-3)^29 = 100 * 3^29
        noBadText();
    });

    test('a ratio with a decimal part is computed with doubles, and the status says so', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({kind: 'geometric', a1: 1, q: 25, n: 3}); });
        expect(readout('nth')).toBe('6,25');
        expect(readout('sum')).toBe('9,75');
        expect(readout('terms')).toBe('1; 2,5; 6,25');
        expect(readout('precision')).toBe(t('recursion_graph_growth_precision_computed'));
        expect(status()).toContain(t('recursion_graph_growth_status_geometric_computed', {value0: '₃', value1: '6,25', value2: '9,75'}));
    });

    test('the board window follows the panel and the data: a negative sequence reaches below the axis', () => {
        const {graph} = mountGraph();
        const before = graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));
        act(() => { graph.setState({a1: -50, d: -10}); });
        const after = graph.liveBoard().getBoundingBox();
        expect(after[3]).toBeLessThan(-140); // the lowest term, with room below it
        expect(after[3]).toBeLessThan(before[3]);
        expect(readout('nth')).toBe('−140');
        expect(readout('sum')).toBe('−950');
    });
});

describe('the interest panel', () => {
    test('the spec example: 1000 at 5 % for 10 years, 12 parts', () => {
        const {graph} = mountGraph();
        panel('interest');
        expect(board(graph)).toBe(t('recursion_graph_growth_board_interest'));
        expect(readout('capital')).toBe('1000');
        expect(readout('rate')).toBe('5 %');
        expect(readout('simple')).toBe('1500');
        expect(readout('compound')).toBe('1628,89');
        expect(readout('relative')).toBe('1647,01');
        expect(readout('continuous')).toBe('1648,72');
        expect(readout('conformal')).toBe('0,407412 %');
        expect(readout('doubling')).toBe(t('recursion_graph_growth_years_value', {value0: '14,2067'}));
        expect(readout('rule72')).toBe(t('recursion_graph_growth_years_value', {value0: '14,4'}));
        expect(status()).toBe(t('recursion_graph_growth_status_interest', {
            value0: 10, value1: '1500', value2: '1628,89', value3: 12, value4: '1647,01', value5: '1648,72',
        }));
        noBadText();
    });

    test('four curves at t = 0 .. years: each ends at its value; four distinct legend lines; captions name the four models', () => {
        const {graph} = mountGraph();
        panel('interest');
        const list = curves(graph);
        const ends = [SIMPLE, COMPOUND, RELATIVE, CONTINUOUS].map(index => list[index].dataY![list[index].dataY!.length - 1]);
        near(ends[0], 1500, 9);
        near(ends[1], 1000 * Math.pow(1.05, 10), 9);
        near(ends[2], 1000 * Math.pow(1 + 0.05 / 12, 120), 9);
        near(ends[3], 1000 * Math.exp(0.5), 9);
        near(ends[1], 1628.894627, 6);
        near(ends[2], 1647.009498, 6);
        near(ends[3], 1648.721271, 6);
        for (const index of [SIMPLE, COMPOUND, RELATIVE, CONTINUOUS]) {
            expect(list[index].dataX![0]).toBe(0);
            expect(list[index].dataX![list[index].dataX!.length - 1]).toBe(10);
            expect(list[index].dataY![0]).toBe(1000);
        }
        const reference = sampleCurve(time => 1000 * (1 + 0.05 * time), 0, 10);
        expect([list[SIMPLE].dataX, list[SIMPLE].dataY]).toEqual([reference.x, reference.y]);
        expect(visible(list)).toHaveLength(8);
        const styles = list.slice(SIMPLE, LEGEND + 4).filter(o => o.evalVisProp('visible'));
        const key = (o: Probe) => [o.evalVisProp('strokeColor'), o.evalVisProp('strokeWidth'), o.evalVisProp('dash')].join('|');
        const first = styles.slice(0, 4).map(key);
        expect(new Set(first).size).toBe(4);
        expect(styles.slice(4).map(key)).toEqual(first); // the legend draws a sample of each curve in its style
        expect(shown(graph)).toEqual([
            t('recursion_graph_growth_cap_simple', {value0: '1500'}), t('recursion_graph_growth_cap_compound', {value0: '1628,89'}),
            t('recursion_graph_growth_cap_relative', {value0: 12, value1: '1647,01'}), t('recursion_graph_growth_cap_continuous', {value0: '1648,72'}),
            t('recursion_graph_growth_cap_x_interest'), t('recursion_graph_growth_cap_y_interest'),
        ]);
        expect(visible(markers(graph))).toHaveLength(0);
    });

    test('the number of parts changes the relative curve and the conformal rows; 365 parts is named in words', () => {
        const {graph} = mountGraph();
        panel('interest');
        choose(t('recursion_graph_growth_parts_label'), '1');
        expect(graph.state.parts).toBe(1);
        expect(readout('relative')).toBe('1628,89'); // m = 1 is the compound value
        expect(readout('conformal')).toBe('5 %');
        choose(t('recursion_graph_growth_parts_label'), '365');
        expect(readout('relative')).toBe('1648,66');
        expect(shown(graph)).toContain(t('recursion_graph_growth_cap_relative', {value0: 365, value1: '1648,66'}));
    });

    test('the table of (1 + 1/n)^n and e', () => {
        mountGraph();
        panel('interest');
        expect(readout('e-1')).toBe('2');
        expect(readout('e-10')).toBe('2,593742');
        expect(readout('e-100')).toBe('2,704814');
        expect(readout('e-1000')).toBe('2,716924');
        expect(readout('e-1000000')).toBe('2,71828');
        expect(readout('e')).toBe('2,718282');
        expect(document.querySelector('[data-readout="e-10"] dt')!.textContent).toBe(t('recursion_graph_growth_r_e_n', {value0: '10'}));
    });

    test('the window grows to hold the largest curve', () => {
        const {graph} = mountGraph();
        panel('interest');
        const small = graph.liveBoard().getBoundingBox()[1];
        act(() => { graph.setState({capital: 50000, rate: 80, years: 40}); });
        expect(graph.liveBoard().getBoundingBox()[1]).toBeGreaterThan(small * 100);
        expect(graph.liveBoard().getBoundingBox()[2]).toBeGreaterThan(40);
    });
});

describe('the logarithm panel (n, ln y) on an ordinary axis', () => {
    test('exponential y = 1000 * 1,05^n: the points lie on a line of slope ln 1,05, said as the logarithm', () => {
        const {graph} = mountGraph();
        panel('log');
        expect(board(graph)).toBe(t('recursion_graph_growth_board_log'));
        expect(readout('model')).toBe(t('recursion_graph_growth_model_exponential'));
        expect(readout('factor')).toBe('1,05');
        expect(readout('slope')).toBe('0,04879');
        expect(readout('slope-first')).toBe('0,04879');
        expect(readout('slope-last')).toBe('0,04879');
        expect(readout('ln-q')).toBe(t('recursion_graph_growth_computed_value', {value0: '0,04879'}));
        expect(readout('q-from-slope')).toBe(t('recursion_graph_growth_computed_value', {value0: '1,05'}));
        expect(readout('line')).toBe(t('recursion_graph_growth_line_yes'));
        expect(readout('last-y')).toBe('1628,894627');
        expect(status()).toBe(t('recursion_graph_growth_status_log_line', {value0: '0,04879', value1: '0,04879', value2: '1,05'}));
        const line = curves(graph)[LOG_LINE];
        expect(line.dataX).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        near(line.dataY![0], Math.log(1000), 12);
        near(line.dataY![10], Math.log(1000) + 10 * Math.log(1.05), 9);
        near(line.dataY![10], 7.395657, 6);
        const derived = deriveGrowth(graph.state);
        const expected = chord(derived.log.ns, derived.log.lnY);
        expect([curves(graph)[CHORD].dataX, curves(graph)[CHORD].dataY]).toEqual([expected.x, expected.y]);
        expect(curves(graph)[CHORD].dataX).toEqual([0, 10]);
        expect(visible(markers(graph))).toHaveLength(11);
        noBadText();
    });

    test('the axis caption says ln y (the logarithm), never plain y; the board label says the axis is not a logarithmic scale', () => {
        const {graph} = mountGraph();
        panel('log');
        const caption = t('recursion_graph_growth_cap_y_log');
        expect(shown(graph)).toContain(caption);
        expect(caption).toMatch(/^ln y/);
        expect(shown(graph)).not.toContain('y');
        expect(shown(graph)).toEqual([
            t('recursion_graph_growth_cap_points_exponential'), t('recursion_graph_growth_cap_chord', {value0: '0,04879'}),
            t('recursion_graph_growth_cap_x_log'), caption,
        ]);
        expect(t('recursion_graph_growth_board_log')).toMatch(/ln y/);
    });

    test('power y = 1000 * n^2: n = 1 .. 11, the slope differs along the run, the points are not a line', () => {
        const {graph} = mountGraph();
        panel('log');
        choose(t('recursion_graph_growth_model_label'), 'power');
        expect(curves(graph)[LOG_LINE].dataX).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        near(curves(graph)[LOG_LINE].dataY![10], Math.log(121000), 12);
        expect(readout('slope')).toBe('0,479579'); // ln 121 / 10
        expect(readout('slope-first')).toBe('1,386294'); // ln 4
        expect(readout('slope-last')).toBe('0,19062'); // ln (121 / 100)
        expect(readout('line')).toBe(t('recursion_graph_growth_line_no'));
        expect(readout('ln-q')).toBeUndefined();
        expect(readout('factor')).toBeUndefined();
        expect(find(t('recursion_graph_growth_logq_label'))).toBeUndefined();
        expect(status()).toBe(t('recursion_graph_growth_status_log_curve', {value0: '1,386294', value1: '0,19062'}));
        expect(shown(graph)).toContain(t('recursion_graph_growth_cap_points_power'));
        expect(visible(markers(graph))).toHaveLength(11);
    });

    test('the number of visible points follows n, from 2 (n = 1) to all 31 (n = 30)', () => {
        const {graph} = mountGraph();
        panel('log');
        act(() => { graph.setState({n: 1}); });
        expect(visible(markers(graph))).toHaveLength(2);
        expect(readout('slope')).toBe('0,04879');
        act(() => { graph.setState({n: 30}); });
        expect(visible(markers(graph))).toHaveLength(LOG_POINTS);
        expect(graph.ownedObjectCount()).toBe(SCENE_OBJECTS);
    });
});

describe('panels', () => {
    test('a panel change shows its own objects, hides the others, changes the board label, and builds nothing', () => {
        const {graph} = mountGraph();
        const ids = new Set(ownIds(graph));
        const counts = {} as Record<GrowthPanel, number>;
        for (const name of ['sequence', 'interest', 'log'] as const) {
            panel(name);
            expect(new Set(ownIds(graph))).toEqual(ids);
            expect(graph.ownedObjectCount()).toBe(SCENE_OBJECTS);
            counts[name] = visible(curves(graph)).length;
            expect(board(graph)).toBe(t(`recursion_graph_growth_board_${name}`));
            expect(document.querySelector('[data-recursion-note]')!.textContent).toBe(t(`recursion_graph_growth_note_${name}`));
        }
        expect(counts).toEqual({sequence: 1, interest: 8, log: 2});
    });

    test('the control set follows the panel', () => {
        mountGraph();
        const has = (...labels: string[]) => labels.every(label => find(label) !== undefined);
        expect(has(t('recursion_graph_growth_a1_label'), t('recursion_graph_growth_d_label'), t('recursion_graph_growth_n_label'))).toBe(true);
        panel('interest');
        expect(has(t('recursion_graph_growth_capital_label'), t('recursion_graph_growth_rate_label'), t('recursion_graph_growth_years_label'))).toBe(true);
        expect(screen.getByRole('combobox', {name: t('recursion_graph_growth_parts_label')})).toBeTruthy();
        expect(find(t('recursion_graph_growth_a1_label'))).toBeUndefined();
        panel('log');
        expect(has(t('recursion_graph_growth_y0_label'), t('recursion_graph_growth_logq_label'), t('recursion_graph_growth_steps_label'))).toBe(true);
    });
});

describe('fields: ranges, help, refusal, program-changed values', () => {
    test('sliders carry their range and step, counters their bounds; capital stays typed with its help; only help that explains stays', () => {
        mountGraph();
        const shape = (label: string) => { const input = rangeOf(label); return [input.min, input.max, input.step]; };
        expect(described(select(t('recursion_graph_growth_panel_label')))).toBe(t('recursion_graph_growth_panel_help'));
        expect(described(select(t('recursion_graph_growth_kind_label')))).toBe(t('recursion_graph_growth_kind_help'));
        expect(shape(t('recursion_graph_growth_a1_label'))).toEqual(['-100', '100', '1']);
        expect(shape(t('recursion_graph_growth_d_label'))).toEqual(['-20', '20', '1']);
        expect(screen.getByRole('group', {name: t('recursion_graph_growth_n_label')})).toBeTruthy();
        choose(t('recursion_graph_growth_kind_label'), 'geometric');
        expect(shape(t('recursion_graph_growth_q_label'))).toEqual(['-3', '3', '0.1']);
        expect(described(rangeOf(t('recursion_graph_growth_q_label')))).toContain(t('recursion_graph_growth_q_help'));
        panel('interest');
        expect(described(field(t('recursion_graph_growth_capital_label')))).toBe('');
        expect(shape(t('recursion_graph_growth_rate_label'))).toEqual(['0.5', '40', '0.5']);
        expect(screen.getByRole('group', {name: t('recursion_graph_growth_years_label')})).toBeTruthy();
        expect(described(select(t('recursion_graph_growth_parts_label')))).toBe(t('recursion_graph_growth_parts_help'));
        panel('log');
        expect(shape(t('recursion_graph_growth_y0_label'))).toEqual(['1', '1000', '1']);
        expect(shape(t('recursion_graph_growth_logq_label'))).toEqual(['0.5', '3', '0.01']);
        expect(screen.getByRole('group', {name: t('recursion_graph_growth_steps_label')})).toBeTruthy();
        expect(described(select(t('recursion_graph_growth_model_label')))).toBe(t('recursion_graph_growth_model_help'));
    });

    test('typed values on the grid are taken; values outside the range are refused (aria-invalid) and never clamped', () => {
        const {graph} = mountGraph();
        enter(t('recursion_graph_growth_a1_label'), '-7');
        enter(t('recursion_graph_growth_d_label'), '4');
        enter(t('recursion_graph_growth_n_label'), '12');
        expect(graph.state).toMatchObject({a1: -7, d: 4, n: 12});
        const kept = graph.state;
        enter(t('recursion_graph_growth_a1_label'), '101');
        expect(field(t('recursion_graph_growth_a1_label')).getAttribute('aria-invalid')).toBe('true');
        enter(t('recursion_graph_growth_d_label'), '-21');
        expect(field(t('recursion_graph_growth_d_label')).getAttribute('aria-invalid')).toBe('true');
        enter(t('recursion_graph_growth_n_label'), '31');
        expect(field(t('recursion_graph_growth_n_label')).getAttribute('aria-invalid')).toBe('true');
        expect(graph.state).toBe(kept);
        expect(readout('nth')).toBe('37'); // -7 + 11 * 4
    });

    test('every edit method refuses without changing the state object, and writes exactly its own stored field', () => {
        const {graph} = mountGraph();
        const kept = graph.state;
        for (const refused of [
            graph.editFirstTerm(101), graph.editFirstTerm(-100.5), graph.editFirstTerm(NaN), graph.editDifference(21), graph.editRatio(3.1), graph.editRatio(-3.1),
            graph.editRatio(0.25), graph.editTerms(0), graph.editTerms(31), graph.editTerms(Infinity), graph.editCapital(0), graph.editCapital(100001),
            graph.editRate(0), graph.editRate(40.5), graph.editRate(0.25), graph.editYears(0), graph.editYears(41), graph.editStartValue(0), graph.editStartValue(1001),
            graph.editGrowthFactor(0.49), graph.editGrowthFactor(3.01), graph.editGrowthFactor(1.005), graph.editParts(3), graph.editParts(0),
        ]) expect(refused).toBe(false);
        expect(graph.state).toBe(kept);
        // The computed-key patch: each accepted edit writes one field, the stored integer, and no other.
        const edits: Array<[string, boolean, Record<string, number>]> = [
            ['a1', graph.editFirstTerm(-100), {a1: -100}], ['d', graph.editDifference(-20), {d: -20}], ['q', graph.editRatio(-3), {q: -30}],
            ['n', graph.editTerms(30), {n: 30}], ['capital', graph.editCapital(100000), {capital: 100000}], ['rate', graph.editRate(40), {rate: 80}],
            ['years', graph.editYears(40), {years: 40}], ['y0', graph.editStartValue(1000), {y0: 1000}], ['logQ', graph.editGrowthFactor(3), {logQ: 300}],
            ['parts', graph.editParts(365), {parts: 365}],
        ];
        for (const [, accepted] of edits) expect(accepted).toBe(true);
        const all = Object.assign({}, ...edits.map(([, , patch]) => patch));
        expect(graph.state).toMatchObject({...DEFAULT_GROWTH_STATE, ...all});
        expect(graph.editRate(0.5)).toBe(true);
        expect(graph.state.rate).toBe(1);
        expect(graph.editGrowthFactor(0.5)).toBe(true);
        expect(graph.state.logQ).toBe(50);
        expect(Object.keys(graph.state).sort()).toEqual(['initialized', ...Object.keys(DEFAULT_GROWTH_STATE)].sort());
    });

    test('a value changed by the program (setState from outside) updates the picture and is announced in the live status', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        const live = () => document.querySelector('[data-readout-live]')!.textContent!;
        expect(live()).toContain(t('recursion_graph_growth_status_arithmetic', {value0: '₁₀', value1: '21', value2: '120'}));
        act(() => { graph.setState({n: 20}); });
        expect(field(t('recursion_graph_growth_n_label')).value).toBe('20');
        expect(readout('nth')).toBe('41');
        expect(curves(graph)[BARS].dataX!.length).toBe(20 * 5 + 19);
        act(() => { vi.advanceTimersByTime(1000); });
        expect(live()).toContain(t('recursion_graph_growth_status_arithmetic', {value0: '₂₀', value1: '41', value2: '440'}));
        act(() => { graph.setState({a1: 4, d: 3, n: 5}); }); // one synchronous write of several fields
        expect(readout('nth')).toBe('16');
        expect(readout('sum')).toBe('50');
        act(() => { graph.setState({panel: 'interest', rate: 20}); });
        expect(readout('rate')).toBe('10 %');
        expect(readout('simple')).toBe('2000');
        act(() => { vi.advanceTimersByTime(1000); });
        expect(live()).toContain(t('recursion_graph_growth_status_interest', {
            value0: 10, value1: '2000', value2: '2593,74', value3: 12, value4: '2707,04', value5: '2718,28',
        }));
    });

    test('decimal comma in Slovenian, decimal point in English; the true minus in both', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({kind: 'geometric', a1: -3, q: 25, n: 3}); });
        expect(readout('ratio')).toBe('2,5');
        expect(readout('nth')).toBe('−18,75');
        act(() => { setLanguage('en'); });
        expect(readout('ratio')).toBe('2.5');
        expect(readout('nth')).toBe('−18.75');
        expect(field(t('recursion_graph_growth_q_label')).value).toMatch(/2\.5/);
    });
});

describe('ownership', () => {
    test('a state change does not rebuild; dispose and rebuild replace every owned object and return to the pre-mount count', () => {
        const {graph, view} = mountGraph();
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const owned = graph.ownedObjectCount();
        expect(owned).toBe(SCENE_OBJECTS);
        const base = count() - owned;
        const ids = new Set(ownIds(graph));
        act(() => { graph.setState({n: 20, d: -3}); });
        panel('log');
        expect(new Set(ownIds(graph))).toEqual(ids);
        expect(graph.ownedObjectCount()).toBe(owned);

        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(count()).toBe(base);
        const remaining = new Set(probes(graph).map(o => o.id));
        const gone = [...ids].filter(id => !remaining.has(id));
        expect(gone.length).toBeGreaterThanOrEqual(owned); // the scene's objects (tick labels may go with them)

        act(() => { graph.rebuildNow(); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(count()).toBe(base + owned);
        expect(probes(graph).some(o => gone.includes(o.id))).toBe(false); // every old scene object is gone, none reused
        expect(curves(graph)[LOG_LINE].dataX!.length).toBe(21); // the rebuilt curve draws the state again
        expect(visible(markers(graph))).toHaveLength(21);
        graph.disposeNow();
        graph.disposeNow(); // a second disposal is harmless
        expect(count()).toBe(base);

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
    });

    test('unmount removes the board label, the language listener and every timer of this graph', () => {
        vi.useFakeTimers();
        // JSXGraph leaves timers of its own for redrawn texts; the same changes on a second mount must leave the same number.
        const change = (graph: ObservedGraph) => { act(() => { graph.setState({n: 11}); }); act(() => { graph.setState({n: 12}); }); };
        const before = vi.getTimerCount();
        const reference = mountGraph();
        change(reference.graph);
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();
        const {graph, view} = mountGraph();
        change(graph);
        const live = vi.getTimerCount();
        view.unmount();
        expect(vi.getTimerCount()).toBeLessThan(live); // the pending 500 ms status settle is cancelled
        expect(vi.getTimerCount() - afterPlain).toBe(plainDelta);
        expect(() => act(() => { vi.runOnlyPendingTimers(); })).not.toThrow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('recursion_graph_growth_board_sequence')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('StrictMode: the same number of objects as a plain mount, and no timer left after unmount', () => {
        vi.useFakeTimers();
        const change = (graph: ObservedGraph) => { act(() => { graph.setState({n: 3}); }); };
        const strictBefore = vi.getTimerCount();
        const first = mountGraph(true);
        change(first.graph);
        first.view.unmount();
        const strictDelta = vi.getTimerCount() - strictBefore;
        const afterStrictPlain = vi.getTimerCount();
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        change(plain.graph);
        plain.view.unmount();
        const plainLeak = vi.getTimerCount() - afterStrictPlain;
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        change(strict.graph);
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
        expect(vi.getTimerCount() - afterStrictPlain - plainLeak).toBe(strictDelta);
    });

    test('the derived values are computed once per state object, not at every redraw', () => {
        const {graph} = mountGraph();
        const first = graph.derived();
        act(() => { graph.liveBoard().update(); });
        act(() => { graph.liveBoard().update(); });
        expect(graph.derived()).toBe(first);
        act(() => { graph.setState({n: 11}); });
        expect(graph.derived()).not.toBe(first);
    });

    test('there is no playback and no animation timer: the graph has no play control and writes only stored fields', () => {
        const {graph} = mountGraph();
        expect(screen.queryByRole('button', {name: t('play')})).toBeNull();
        expect(Object.keys(graph.state).sort()).toEqual(['initialized', ...Object.keys(DEFAULT_GROWTH_STATE)].sort());
    });
});

describe('language', () => {
    test('switching to English renames the board, the labels, the captions and the status in every panel', () => {
        const {graph} = mountGraph();
        act(() => { setLanguage('en'); });
        expect(board(graph)).toBe(t('recursion_graph_growth_board_sequence'));
        expect(rangeOf(t('recursion_graph_growth_a1_label'))).toBeTruthy();
        expect(shown(graph)).toContain(t('recursion_graph_growth_cap_nth', {value0: '₁₀', value1: '21'}));
        expect(status()).toBe(t('recursion_graph_growth_status_arithmetic', {value0: '₁₀', value1: '21', value2: '120'}));
        panel('interest');
        expect(shown(graph)).toContain(t('recursion_graph_growth_cap_compound', {value0: '1628.89'}));
        expect(status()).toContain('1647.01');
        panel('log');
        expect(shown(graph)).toContain(t('recursion_graph_growth_cap_y_log'));
        expect(board(graph)).toBe(t('recursion_graph_growth_board_log'));
        expect(document.body.textContent).not.toMatch(/recursion_graph_/);
        noBadText();
    });
});

describe('the view of a replaced scene', () => {
    const view = (graph: ObservedGraph) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));

    test('a rebuild after a disposal keeps the view the board has (a restore brings its own)', () => {
        const {graph} = mountGraph();
        const stored: [number, number, number, number] = [-3, 70, 19, -5];
        act(() => { graph.liveBoard().setBoundingBox(stored, false); });
        graph.disposeNow();
        act(() => { graph.rebuildNow(); });
        expect(view(graph)).toEqual(stored);
    });

    test('a reset shows the exact opening window, not one widened to the canvas', async () => {
        const {graph} = mountGraph();
        const opening = view(graph);
        act(() => { graph.setState({a1: -50, d: -10}); });
        act(() => { graph.liveBoard().setBoundingBox([-3, 70, 19, -5], false); });
        await settle(() => graph.reset());
        expect(view(graph)).toEqual(opening);
    });
});

describe('the vertical axis title', () => {
    test('stands right of the vertical axis, where no tick label of any panel stands', () => {
        const {graph} = mountGraph();
        for (const value of ['sequence', 'interest', 'log'] as const) {
            panel(value);
            const title = visible(texts(graph)).find(o => (o.plaintext ?? '').startsWith(t(`recursion_graph_growth_cap_y_${value}`)))! as Probe & {X(): number};
            expect(title, value).toBeDefined();
            expect(title.X(), value).toBeGreaterThan(0);
        }
    });
});

/** Board texts as pixel boxes from the board's top left corner (the glyph box from its anchor), and the axes' pixel position. */
function pixelBoxes(graph: ObservedGraph) {
    const board = graph.liveBoard() as unknown as {unitX: number; unitY: number; getBoundingBox(): number[]};
    const [left, top] = board.getBoundingBox();
    const infobox = (board as unknown as {infobox?: unknown}).infobox;
    const boxes = visible(texts(graph)).filter(o => (o as unknown) !== infobox).map(o => {
        const text = o.plaintext ?? '';
        const probe = o as Probe & {X(): number; Y(): number};
        const size = Number(o.evalVisProp('fontsize')) || 14;
        const w = text.length * size * 0.55, h = size * 1.15;
        const x = (probe.X() - left) * board.unitX, y = (top - probe.Y()) * board.unitY;
        const ax = o.evalVisProp('anchorx'), ay = o.evalVisProp('anchory');
        const x0 = ax === 'right' ? x - w : ax === 'middle' ? x - w / 2 : x;
        const y0 = ay === 'bottom' ? y - h : ay === 'middle' ? y - h / 2 : y;
        return {text, x0, y0, x1: x0 + w, y1: y0 + h};
    });
    return {boxes, axisX: Math.max(0, -left * board.unitX), axisY: top * board.unitY, left, board};
}

/** Board sizes: a small phone board and a wide one. The jsdom default is 600 x 400. */
describe.each([[600, 400], [340, 300], [840, 520]])('board texts clear of the axes and of each other (%i x %i px)', (W, H) => {
    beforeEach(() => {
        for (const [name, size] of Object.entries({clientWidth: W, offsetWidth: W, clientHeight: H, offsetHeight: H})) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: W, bottom: H, width: W, height: H, toJSON: () => ({})}) as DOMRect;
    });
    afterEach(() => {
        for (const [name, size] of [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
    });

    for (const value of ['sequence', 'interest', 'log'] as const) {
        test(`${value}: the horizontal axis title stands under the tick number row, the vertical one and the legend clear of the axis`, () => {
            const {graph} = mountGraph();
            panel(value);
            const {boxes, axisX, axisY, board} = pixelBoxes(graph);
            expect([(board as unknown as {canvasWidth: number}).canvasWidth, (board as unknown as {canvasHeight: number}).canvasHeight]).toEqual([W, H]);
            const title = boxes.find(b => b.text === t(`recursion_graph_growth_cap_x_${value}`))!;
            expect(title, 'x title').toBeDefined();
            // The tick numbers take about 22 px under the axis line.
            expect(title.y0 - axisY, `x title top ${title.y0}, axis ${axisY}`).toBeGreaterThanOrEqual(22);
            expect(title.y1).toBeLessThanOrEqual(H);
            expect(title.x1).toBeLessThanOrEqual(W);
            expect(title.x0).toBeGreaterThanOrEqual(0);
            for (const box of boxes.filter(b => b !== title && b.x0 < axisX + 400)) {
                expect(box.x0 - axisX, `"${box.text}" starts ${box.x0 - axisX} px right of the vertical axis`).toBeGreaterThanOrEqual(10);
            }
            boxes.forEach((box, i) => boxes.slice(i + 1).forEach(other => {
                const crossing = box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0;
                expect(crossing, `"${box.text}" and "${other.text}" overlap`).toBe(false);
            }));
        });
    }

    test('the interest legend samples start clear of the vertical axis', () => {
        const {graph} = mountGraph();
        panel('interest');
        const {axisX, left, board} = pixelBoxes(graph);
        for (const curve of curves(graph).slice(LEGEND, LEGEND + 4)) {
            expect((curve.dataX![0] - left) * board.unitX - axisX, 'legend sample start').toBeGreaterThanOrEqual(10);
        }
    });

    test('no x tick number is written for a negative x (the quantities start at 0 and 1), so none is cut at the left edge', () => {
        const {graph} = mountGraph();
        for (const value of ['sequence', 'interest', 'log'] as const) {
            panel(value);
            const ticks = (graph.liveBoard() as unknown as {defaultAxes: {x: {defaultTicks: {generateLabelText(tick: unknown, zero: unknown): string}}}}).defaultAxes.x.defaultTicks;
            expect(ticks.generateLabelText({usrCoords: [1, -0.1, 0]}, {distance: () => 1}), value).toBe('');
        }
    });
});
