/**
 * PH family, first use (graph-control first use, wave 3 batch 1). The curve selection leads and the hodograph group follows it
 * directly, so selecting the curve and editing its hodograph read as one sequence; offsets and the other groups come after.
 */
import {act, fireEvent, screen, within} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {t} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

interface Pt {X(): number; Y(): number}
interface Evaluable {eval(u: number): Pt}
interface PhJxg {
    getCurve(): Evaluable & {w: Pt[]; getOffsetCurves(): Evaluable[]};
    getNumberOfOffsetCurves(): number;
    isShowingOffsetCurve(): boolean;
    setShowOffsetCurve(show: boolean): void;
    getJxgPoints(): Array<Pt & {setPositionDirectly(method: number, to: number[]): void; triggerEventHandlers(events: string[], args: unknown[]): void}>;
}
type Run = BaseGraph<BaseGraphState> & {editing: {select(curve: unknown): void}; jxgCurves: PhJxg[]; getSelectedCurve(): unknown};

type Key = 'ph-cubic' | 'ph-quintic' | 'uniform-parameterization';
const mount = (key: Key) => mountGraph(graphFactories[key]()).graph as Run;
const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
const hodographHeading = () => inEdit(t('hodograph')).filter(element => element.tagName === 'H3')[0] as HTMLElement | undefined;
const select = (graph: Run) => act(() => graph.editing.select(graph.jxgCurves[0]));
const follows = (a: Element, b: Element) => expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
const group = (heading: Element) => heading.closest('.inspector-group, .tools') as HTMLElement;
const editGroups = () => [...document.querySelectorAll('#inspector-edit .inspector-group, #inspector-edit .tools')];
const typeInto = (field: HTMLElement, value: string) => act(() => { fireEvent.change(field, {target: {value}}); fireEvent.blur(field); });
const at = (curve: Evaluable) => [0.25, 0.5, 0.75].map(u => { const p = curve.eval(u); return [p.X(), p.Y()]; });
const offsets = (curve: PhJxg) => JSON.stringify(curve.getCurve().getOffsetCurves().map(at));

describe.each(['ph-cubic', 'ph-quintic'] as const)('%s: select, then edit the hodograph', key => {
    test('before selection there is no hodograph group; after it, the group is the next one after the curve selection', () => {
        const graph = mount(key);
        expect(hodographHeading()).toBeUndefined();
        select(graph);
        const hodograph = hodographHeading()!;
        const [selection] = inEdit(t('curve_selection'));
        expect(hodograph).toBeTruthy();
        follows(selection, hodograph);
        expect(editGroups()[editGroups().indexOf(group(selection)) + 1]).toBe(group(hodograph));
        for (const heading of inEdit(t('curve_offsets'))) follows(hodograph, heading);
        for (const field of screen.queryAllByRole('spinbutton')) {
            if (!group(selection).contains(field) && !group(hodograph).contains(field)) follows(hodograph, field);
        }
    });

    test('acceptance: a typed free hodograph point changes the curve and the offsets update with it', () => {
        const graph = mount(key);
        select(graph);
        const curve = graph.jxgCurves[0];
        act(() => curve.setShowOffsetCurve(true));
        const before = JSON.stringify(at(curve.getCurve()));
        const offsetCount = curve.getNumberOfOffsetCurves();
        const offsetBefore = offsets(curve);
        const fields = [...group(hodographHeading()!).querySelectorAll('input')] as HTMLInputElement[];
        expect(fields.length).toBeGreaterThanOrEqual(4);
        const w1y = curve.getCurve().w[1].Y();
        typeInto(fields[3], String(w1y + 1.5));
        expect(curve.getCurve().w[1].Y()).toBeCloseTo(w1y + 1.5, 6);
        expect(JSON.stringify(at(curve.getCurve()))).not.toEqual(before);
        expect(curve.getNumberOfOffsetCurves()).toBe(offsetCount);
        expect(curve.isShowingOffsetCurve()).toBe(true);
        expect(offsets(curve)).not.toEqual(offsetBefore);
    });

    test('clearing the selection returns to ordinary curve selection: the hodograph group goes, the edited curve stays and re-selecting brings it back', () => {
        const graph = mount(key);
        select(graph);
        const curve = graph.jxgCurves[0];
        const fields = () => [...group(hodographHeading()!).querySelectorAll('input')] as HTMLInputElement[];
        typeInto(fields()[3], String(curve.getCurve().w[1].Y() + 1.5));
        const edited = JSON.stringify(at(curve.getCurve()));
        fireEvent.click(screen.getByRole('button', {name: t('clear_selection')}));
        expect(graph.getSelectedCurve()).toBeFalsy();
        expect(hodographHeading()).toBeUndefined();
        expect(inEdit(t('curve_selection')).length).toBeGreaterThan(0);
        expect(JSON.stringify(at(curve.getCurve()))).toEqual(edited);
        select(graph);
        expect(hodographHeading()).toBeTruthy();
        expect(JSON.stringify(at(curve.getCurve()))).toEqual(edited);
    });
});

describe.each(['ph-cubic', 'ph-quintic', 'uniform-parameterization'] as const)('%s: offset parameters share one group', key => {
    test('the offset count and the offset distance are adjacent controls in the same edit group, after the hodograph group', () => {
        const graph = mount(key);
        select(graph);
        fireEvent.click(screen.getByRole('checkbox', {name: t('curve_offsets'), hidden: true}));
        const count = inEdit(t('number_of_offsets'))[0];
        const offsetGroup = group(count);
        if (key === 'ph-cubic' || key === 'uniform-parameterization') {
            // The declared cubic and the declared uniform parameterization own d as a board puck (parameter `ph-offset-d`), not as a control in the Edit group.
            expect(inEdit(t('offset_distance_d'))).toHaveLength(0);
            expect(screen.getAllByRole('slider', {hidden: true}).some(element => element.getAttribute('aria-label')?.startsWith(t('offset_d_name')))).toBe(true);
            expect(offsetGroup.querySelector('h3')!.textContent).toBe(t('curve_offsets'));
            follows(group(hodographHeading()!), offsetGroup);
            return;
        }
        const distance = inEdit(t('offset_distance_d'))[0];
        expect(offsetGroup).toBe(group(distance));
        expect(offsetGroup.querySelector('h3')!.textContent).toBe(t('curve_offsets'));
        follows(count, distance);
        expect(offsetGroup.children[1].children).toHaveLength(2);
        follows(group(hodographHeading()!), offsetGroup);
    });
});

describe('cubic: the polygon angles and lengths are one control in one group', () => {
    test('a single switch under polygon geometry drives the angles and lengths, outside the hodograph group', () => {
        const graph = mount('ph-cubic');
        select(graph);
        const heading = screen.getAllByText(t('ph_curve_geometry')).find(element => element.tagName === 'H3')!;
        expect(within(group(heading)).getAllByRole('checkbox', {hidden: true})).toHaveLength(1);
        expect(within(group(heading)).getByText(t('control_polygon_geometry'))).toBeTruthy();
        expect(group(hodographHeading()!).contains(heading)).toBe(false);
    });
});

describe('uniform parametrization: construction group, selection, then hodograph', () => {
    test('the construction group stays first and the hodograph follows the selection', () => {
        const graph = mount('uniform-parameterization');
        select(graph);
        const [selection] = inEdit(t('curve_selection'));
        const hodograph = hodographHeading()!;
        expect(group(selection)).not.toBe(editGroups()[0]);
        follows(editGroups()[0], selection);
        expect(editGroups()[editGroups().indexOf(group(selection)) + 1]).toBe(group(hodograph));
    });
});
