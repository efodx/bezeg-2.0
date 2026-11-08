/**
 * The shared behaviour test (spec acceptance 3) against real graphs through the real host: two graphs per control kind.
 * Bare controls: `inputs/sharedControls.behaviour.test.tsx`. Every case mounts a fresh graph.
 */
import {screen} from '@testing-library/react';
import {t} from '../../localization';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle, waitUntil} from './realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {countSetterBehaviour, numericFieldBehaviour, sliderBehaviour} from '../../inputs/sharedControlBehaviour';
import {SERIES_A_MAX, SERIES_A_MIN, SERIES_TERMS_MAX, SERIES_TERMS_MIN} from '../../analysis/geometricSeriesModel';
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

/** NumberInput keeps its range hint when the host Reset changes the model value: the hint state is only cleared by an edit (`NumberInput.tsx:97`, the effect syncs the draft but not the hint). */
const STALE_HINT = 'NumberInput keeps its hint after a host Reset';

const numeric = (id: DemonstrationId, labelKey: PlainKey, bounds: {min: number; max: number; step: number; valid: number; outOfRange: number; bigStep?: number}) =>
    numericFieldBehaviour(`${id} ${labelKey}`, {
        ...bounds, section: 'edit', knownGap: {reset: STALE_HINT},
        mount: async () => {
            const {graph, label} = await mountWith(id, labelKey);
            const field = () => screen.getByLabelText(label());
            return {get field() { return field(); }, read: reading(field), reset: () => settle(() => graph.reset())};
        },
    });

const slider = (id: DemonstrationId, labelKey: PlainKey, bounds: {min: number; max: number; step: number; valid: number; outOfRange: number}) =>
    sliderBehaviour(`${id} ${labelKey}`, {
        ...bounds, section: 'edit', knownGap: {reset: STALE_HINT},
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

numeric('geometric-series', 'series_terms_label', {min: SERIES_TERMS_MIN, max: SERIES_TERMS_MAX, step: 1, valid: 20, outOfRange: SERIES_TERMS_MAX + 1});
numeric('accumulation', 'accumulation_a_label', {min: ACCUMULATION_BOUND_MIN, max: ACCUMULATION_BOUND_MAX, step: 0.1, valid: -3, outOfRange: ACCUMULATION_BOUND_MAX + 1});

slider('geometric-series', 'series_a_label', {min: SERIES_A_MIN, max: SERIES_A_MAX, step: 0.1, valid: 2, outOfRange: SERIES_A_MAX + 1});
slider('interp-lagrange', 'interp_slider_position', {min: 0, max: 1, step: 0.01, valid: 0.5, outOfRange: 2});

count('bspline-deboor', 'bsd_point_count', {min: 3, max: 12});
count('interp-lagrange', 'interp_point_count', {min: 2, max: 12});
