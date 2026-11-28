/**
 * Surface patch routes, first task first (batch 2): the route's own first task leads its Edit panel; the starting
 * patch and degrees (and, on the joins route, the example pairs) follow.
 */
import {installBoardShims, mountGraph, puckControl, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {act} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {FakeSurfaceView} from './FakeSurfaceView';
import TensorDeCasteljauGraph, {DECASTELJAU_ORDER_KEY} from './TensorDeCasteljauGraph';
import TensorDerivativesGraph from './TensorDerivativesGraph';
import TensorJoinGraph, {JOIN_MODE_KEY} from './TensorJoinGraph';
import TensorSubdivisionGraph from './TensorSubdivisionGraph';
import TensorPatchGraph, {PATCH_PARAMETER_KEYS} from './TensorPatchGraph';
import TriangularPatchGraph from './TriangularPatchGraph';
import CoonsPatchGraph from './CoonsPatchGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;
/** `pucks`: arbiter keys that are board pucks on the strip; `absent`: their old Edit labels, gone from Edit. */
interface Plan {mount: () => ReturnType<typeof mountGraph>; first: Label; later: Label[]; pucks?: string[]; absent?: Label[]}

/** The Edit panel's controls in document order, by accessible name. */
const editControls = (): string[] => {
    const edit = document.querySelector('#inspector-edit')!;
    return [...edit.querySelectorAll('input:not([type="hidden"]), select, button, [role="slider"]')].map(element => {
        const labelled = element.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
        const action = element.getAttribute('data-action'); if (action) return 'action:' + action;
        return element.getAttribute('aria-label') ?? labelled ?? (element.id && document.querySelector(`label[for="${element.id}"]`)?.textContent) ?? element.textContent ?? '';
    });
};

const options = {viewFactory: () => new FakeSurfaceView()};
const plan: Record<string, Plan> = {
    // u, v and the construction order are board pucks: they live on the puck strip, so the starting patch leads Edit.
    'patch-decasteljau': {mount: () => mountGraph(new TensorDeCasteljauGraph(options)), first: () => t('patch_starting_heading'),
        later: [() => t('patch_degree_u')], pucks: [PATCH_PARAMETER_KEYS.u, PATCH_PARAMETER_KEYS.v, DECASTELJAU_ORDER_KEY],
        absent: [() => t('patch_parameter_u'), () => t('patch_parameter_v'), () => t('patch_decasteljau_order')]},
    // u and v are board pucks; the corner shortcuts (the lesson's "compare the four corners") lead what stays in Edit.
    'patch-derivatives': {mount: () => mountGraph(new TensorDerivativesGraph(options)), first: () => t('patch_derivatives_corners'),
        later: [() => t('patch_starting_heading'), () => t('patch_degree_u')], pucks: [PATCH_PARAMETER_KEYS.u, PATCH_PARAMETER_KEYS.v],
        absent: [() => t('patch_parameter_u'), () => t('patch_parameter_v')]},
    'patch-subdivision': {mount: () => mountGraph(new TensorSubdivisionGraph(options)), first: () => t('patch_split_direction'), later: [() => t('patch_starting_heading')]},
    // The join mode is a board puck; the ratio alpha (a puck too once G1 is chosen, here with the reason it is unavailable) leads Edit.
    'patch-joins': {mount: () => mountGraph(new TensorJoinGraph(options)), first: () => t('patch_join_alpha'),
        later: [() => t('patch_join_scenes_heading'), () => t('patch_starting_heading')], pucks: [JOIN_MODE_KEY], absent: [() => t('patch_join_mode')]},
};

describe.each(Object.keys(plan))('%s', key => {
    test('the first task leads the Edit panel', async () => {
        plan[key].mount();
        const pucks = plan[key].pucks ?? [];
        if (pucks.length > 0) await waitForPucks(pucks[pucks.length - 1]);
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.includes(label()));
        expect(at(plan[key].first), names.join(' | ')).toBe(0);
        for (const label of plan[key].later) expect(at(label), label()).toBeGreaterThan(0);
        for (const label of plan[key].absent ?? []) expect(at(label), names.join(' | ')).toBe(-1);
        for (const puck of pucks) expect(document.querySelector(`[data-puck-strip] [data-puck-key="${puck}"]`), puck).not.toBeNull();
    });
});

/** Batch 3: the routes whose first task is a net point lead with the point chooser and, once one is selected, its coordinates. */
describe('net-point routes (batch 3)', () => {
    const editor = () => document.querySelector('#inspector-edit .patch-point-editor');
    const precedes = (a: Element | null, label: string) => {
        const other = [...document.querySelectorAll('#inspector-edit .inspector-group')].find(group => group.querySelector('h3')?.textContent === label)!;
        expect(a, 'editor shown').not.toBeNull();
        expect(a!.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING, label).toBeTruthy();
    };
    test('patches/coons: the boundary-curve choice leads, shown surface and corners follow', () => {
        const {graph} = mountGraph(new CoonsPatchGraph(options)) as unknown as {graph: CoonsPatchGraph};
        const names = editControls();
        expect(names[0], names.join(' | ')).toContain(t('coons_boundary'));
        // The shown-surface choice and the linked-corners switch are declared board pucks: they live on the puck strip, not in Edit.
        const strip = document.querySelector('[data-puck-strip]');
        expect(strip, 'puck strip').not.toBeNull();
        for (const label of [t('coons_shown'), t('coons_linked_corners')]) {
            expect(names.findIndex(name => name.includes(label)), names.join(' | ')).toBe(-1);
        }
        expect(strip!.textContent).toContain(t('coons_shown_short_lc'));
        act(() => graph.selectBoundaryPoint('c1', 2));
        expect(editor(), 'editor shown').not.toBeNull();
    });
    test('patches/triangular: the point indices lead, starting patch, degree and parameters follow', () => {
        const {graph} = mountGraph(new TriangularPatchGraph(options)) as unknown as {graph: TriangularPatchGraph};
        const names = editControls();
        expect(names[0], names.join(' | ')).toContain(t('patch_triangular_index'));
        for (const label of [t('patch_starting_heading'), t('patch_triangular_degree'), t('patch_parameter_u')]) expect(names.findIndex(name => name.includes(label)), label).toBeGreaterThan(0);
        act(() => graph.selectIndex([2, 0, 1]));
        precedes(editor(), t('patch_starting_heading'));
        precedes(editor(), t('patch_degree_heading'));
        precedes(editor(), t('patch_point_heading'));
    });
    test('patches/tensor: the control-point indices lead, starting patch and degrees follow; u, v are board pucks', async () => {
        const {graph} = mountGraph(new TensorPatchGraph(options)) as unknown as {graph: TensorPatchGraph};
        await waitForPucks(PATCH_PARAMETER_KEYS.v);
        const names = editControls();
        expect(names[0], names.join(' | ')).toContain(t('patch_index_i'));
        for (const label of [t('patch_starting_heading'), t('patch_degree_u')]) expect(names.findIndex(name => name.includes(label)), label).toBeGreaterThan(0);
        // u and v are declared board pucks: they live on the puck strip, not in Edit.
        for (const label of [t('patch_parameter_u'), t('patch_parameter_v')]) expect(names.findIndex(name => name.includes(label)), names.join(' | ')).toBe(-1);
        expect(document.querySelector('[data-puck-strip]'), 'puck strip').not.toBeNull();
        for (const key of [PATCH_PARAMETER_KEYS.u, PATCH_PARAMETER_KEYS.v]) expect(puckControl(key), key).toBeTruthy();
        act(() => graph.selectIndex(1, 2));
        precedes(editor(), t('patch_starting_heading'));
        precedes(editor(), t('patch_point_heading'));
    });
});
