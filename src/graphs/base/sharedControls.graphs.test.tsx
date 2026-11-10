/**
 * The shared behaviour test (spec acceptance 3) against real graphs through the real host: two graphs per control kind.
 * Bare controls: `inputs/sharedControls.behaviour.test.tsx`. Every case mounts a fresh graph.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {enterNumber} from '../../inputs/testEntry';
import {t} from '../../localization';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle, waitUntil} from './realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {countSetterBehaviour, numericFieldBehaviour, pointCollectionBehaviour, pointListBehaviour, sliderBehaviour} from '../../inputs/sharedControlBehaviour';
import {SERIES_A_MAX, SERIES_A_MIN, SERIES_TERMS_MAX, SERIES_TERMS_MIN} from '../../analysis/geometricSeriesModel';
import {curveAccess} from './curveGraphTestAccess';
import {INTERPOLATION_COORDINATE_LIMIT} from '../curves/interpolation/interpolationModel';
import {INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN} from '../../analysis/interpolation';
import {ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN} from '../../analysis/accumulation';

/** Catalog keys without placeholders (a union of keys would not type check against `t`). */
type PlainKey = 'series_terms_label' | 'accumulation_a_label' | 'series_a_label' | 'interp_slider_position' | 'bsd_point_count' | 'interp_point_count' | 'increase_count' | 'decrease_count';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

/** Mounts the graph and waits until the control with this label is on screen (the language is already set). */
async function mountWith(id: DemonstrationId, labelKey: PlainKey, fieldLabel = false) {
    const graph = createGraph(id);
    mountGraph(graph);
    const label = () => fieldLabel ? t('number_field_label', {value0: t(labelKey)}) : t(labelKey);
    await waitUntil(() => screen.queryByLabelText(label()) !== null);
    return {graph, label};
}

const reading = (field: () => HTMLElement) => () => Number(field().getAttribute('aria-valuenow'));

const numeric = (id: DemonstrationId, labelKey: PlainKey, bounds: {min: number; max: number; step: number; valid: number; outOfRange: number; bigStep?: number; integer?: boolean}) =>
    numericFieldBehaviour(`${id} ${labelKey}`, {
        ...bounds, section: 'edit',
        mount: async () => {
            const {graph, label} = await mountWith(id, labelKey);
            const field = () => screen.getByLabelText(label());
            return {get field() { return field(); }, read: reading(field), reset: () => settle(() => graph.reset())};
        },
    });

const slider = (id: DemonstrationId, labelKey: PlainKey, bounds: {min: number; max: number; step: number; valid: number; outOfRange: number}) =>
    sliderBehaviour(`${id} ${labelKey}`, {
        ...bounds, section: 'edit',
        mount: async () => {
            const {graph, label} = await mountWith(id, labelKey);
            const field = () => screen.getByLabelText(t('number_field_label', {value0: label()}));
            return {get field() { return field(); }, get range() { return screen.getByLabelText(label()); }, read: reading(field), reset: () => settle(() => graph.reset())};
        },
    });

const count = (id: DemonstrationId, labelKey: PlainKey, bounds: {min: number; max: number}) =>
    countSetterBehaviour(`${id} ${labelKey}`, {
        ...bounds, section: 'edit',
        mount: async () => {
            const {graph} = await mountWith(id, labelKey);
            const group = () => screen.getByText(t(labelKey)).closest('.count-setter') as HTMLElement;
            const button = (key: PlainKey) => () => group().querySelector(`button[aria-label="${t(key)}"]`) as HTMLElement;
            const plus = button('increase_count'), minus = button('decrease_count');
            return {get plus() { return plus(); }, get minus() { return minus(); }, read: () => Number(group().querySelector('.count-setter-value')?.textContent),
                reset: () => settle(() => graph.reset())};
        },
    });

numeric('geometric-series', 'series_terms_label', {min: SERIES_TERMS_MIN, max: SERIES_TERMS_MAX, step: 1, valid: 20, outOfRange: SERIES_TERMS_MAX + 1, integer: true});
numeric('accumulation', 'accumulation_a_label', {min: ACCUMULATION_BOUND_MIN, max: ACCUMULATION_BOUND_MAX, step: 0.1, valid: -3, outOfRange: ACCUMULATION_BOUND_MAX + 1});

slider('geometric-series', 'series_a_label', {min: SERIES_A_MIN, max: SERIES_A_MAX, step: 0.1, valid: 2, outOfRange: SERIES_A_MAX + 1});
slider('interp-lagrange', 'interp_slider_position', {min: 0, max: 1, step: 0.01, valid: 0.5, outOfRange: 2});

count('bspline-deboor', 'bsd_point_count', {min: 3, max: 12});

/**
 * Interpolation's count control is the shared point collection (remove-last); BSD keeps the plain count setter. Hermite shares the same
 * wiring and has the thin check below (full behaviours run on two graphs per control kind: Interpolation and PointSet).
 */
for (const id of ['interp-lagrange'] as const) pointCollectionBehaviour(`${id} interp_point_count`, {
    section: 'edit', min: INTERPOLATION_POINTS_MIN, max: INTERPOLATION_POINTS_MAX,
    mount: async () => {
        const {graph} = await mountWith(id, 'interp_point_count');
        const group = () => screen.getByText(t('interp_point_count')).closest('.point-collection') as HTMLElement;
        const button = (key: PlainKey) => () => group().querySelector(`button[aria-label="${t(key)}"]`) as HTMLElement;
        const plus = button('increase_count'), minus = button('decrease_count');
        return {get add() { return plus(); }, get remove() { return minus(); }, read: () => Number(group().querySelector('.count-setter-value')?.textContent),
            reset: () => settle(() => graph.reset())};
    },
});

pointListBehaviour('interp-lagrange point list', {
    section: 'edit', min: -INTERPOLATION_COORDINATE_LIMIT, max: INTERPOLATION_COORDINATE_LIMIT, step: 1, valid: 7, outOfRange: INTERPOLATION_COORDINATE_LIMIT + 1,
    mount: async () => {
        const {graph} = await mountWith('interp-lagrange', 'interp_point_count');
        const name = () => t('interp_point_name', {value0: 1});
        const field = () => screen.getByRole('spinbutton', {name: `${name()}, x`});
        return {get field() { return field(); }, read: () => Number(field().getAttribute('aria-valuenow')), reset: () => settle(() => graph.reset()),
            rows: () => document.querySelectorAll('.point-list-row').length};
    },
});

/** The curve workspace: the selected curve's points are the shared point collection (remove-last, typed entry) and the shared typed list. */
async function mountSelectedCurve(id: DemonstrationId, firstField = 'p₀, x') {
    const graph = createGraph(id);
    mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    const access = curveAccess(graph);
    const select = () => act(() => { access.select(); });
    select();
    await waitUntil(() => screen.queryByRole('spinbutton', {name: firstField}) !== null);
    const points = access.points;
    // A host Reset deselects the curve; the controls are on screen again once it is selected.
    const reset = async () => { await settle(() => graph.reset()); select(); await waitUntil(() => screen.queryByRole('spinbutton', {name: firstField}) !== null); };
    return {graph, points, reset};
}

/**
 * The curve workspace and the PH hodograph are covered by one thin wiring check each (the full behaviours run on two graphs per control
 * kind: Interpolation, Hermite and PointSet): the control mounts, and one edit reaches the model.
 */
describe('curve workspace wiring of the shared point controls', () => {
    test('interp-hermite: the collection adds a point and the typed list edits one', async () => {
        await mountWith('interp-hermite', 'interp_point_count');
        const rows = () => document.querySelectorAll('.point-list-row').length;
        const start = rows();
        const add = document.querySelector<HTMLElement>(`.point-collection button[aria-label="${t('increase_count')}"]`)!;
        act(() => { fireEvent.click(add); });
        expect(rows()).toBe(start + 1);
        enterNumber(screen.getByRole('spinbutton', {name: `${t('interp_point_name', {value0: 1})}, x`}), '7');
        expect(screen.getByRole('spinbutton', {name: `${t('interp_point_name', {value0: 1})}, x`})).toHaveAttribute('aria-valuenow', '7');
    });

    test('bezier: the count control adds a point and the typed list edits one', async () => {
        const {points} = await mountSelectedCurve('bezier');
        const start = points().length;
        const add = document.querySelector<HTMLElement>(`.point-collection button[aria-label="${t('increase_count')}"]`)!;
        act(() => { fireEvent.click(add); });
        expect(points()).toHaveLength(start + 1);
        enterNumber(screen.getByRole('spinbutton', {name: 'p₁, x'}), '7');
        expect(points()[1].X()).toBe(7);
    });

    test('ph-cubic: the hodograph list edits a w point and offers no count control', async () => {
        const {graph} = await mountSelectedCurve('ph-cubic', 'w₀, x');
        enterNumber(screen.getByRole('spinbutton', {name: 'w₁, x'}), '7');
        expect(curveAccess(graph).phPoints()![1].X()).toBe(7);
        expect(document.querySelector('.point-collection')).toBeNull();
    });
});
