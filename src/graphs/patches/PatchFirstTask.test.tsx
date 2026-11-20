/**
 * Surface patch routes, first task first (batch 2): the route's own first task leads its Edit panel; the starting
 * patch and degrees (and, on the joins route, the example pairs) follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {act} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {FakeSurfaceView} from './FakeSurfaceView';
import TensorDeCasteljauGraph from './TensorDeCasteljauGraph';
import TensorDerivativesGraph from './TensorDerivativesGraph';
import TensorJoinGraph from './TensorJoinGraph';
import TensorSubdivisionGraph from './TensorSubdivisionGraph';
import TensorPatchGraph from './TensorPatchGraph';
import TriangularPatchGraph from './TriangularPatchGraph';
import CoonsPatchGraph from './CoonsPatchGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;
interface Plan {mount: () => ReturnType<typeof mountGraph>; first: Label; later: Label[]}

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
    'patch-decasteljau': {mount: () => mountGraph(new TensorDeCasteljauGraph(options)), first: () => t('patch_parameter_u'),
        later: [() => t('patch_parameter_v'), () => t('patch_starting_heading'), () => t('patch_degree_u')]},
    'patch-derivatives': {mount: () => mountGraph(new TensorDerivativesGraph(options)), first: () => t('patch_parameter_u'),
        later: [() => t('patch_parameter_v'), () => t('patch_starting_heading'), () => t('patch_degree_u')]},
    'patch-subdivision': {mount: () => mountGraph(new TensorSubdivisionGraph(options)), first: () => t('patch_split_direction'), later: [() => t('patch_starting_heading')]},
    'patch-joins': {mount: () => mountGraph(new TensorJoinGraph(options)), first: () => t('patch_join_mode'),
        later: [() => t('patch_join_scenes_heading'), () => t('patch_starting_heading')]},
};

describe.each(Object.keys(plan))('%s', key => {
    test('the first task leads the Edit panel', () => {
        plan[key].mount();
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.includes(label()));
        expect(at(plan[key].first), names.join(' | ')).toBe(0);
        for (const label of plan[key].later) expect(at(label), label()).toBeGreaterThan(0);
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
        expect(names.findIndex(name => name.includes(t('coons_shown')))).toBeGreaterThan(0);
        expect(names.findIndex(name => name.includes(t('coons_linked_corners')))).toBeGreaterThan(0);
        act(() => graph.selectBoundaryPoint('c1', 2));
        precedes(editor(), t('coons_shown_heading'));
        precedes(editor(), t('coons_corners_heading'));
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
    test('patches/tensor: the control-point indices lead, starting patch, degrees and u, v follow', () => {
        const {graph} = mountGraph(new TensorPatchGraph(options)) as unknown as {graph: TensorPatchGraph};
        const names = editControls();
        expect(names[0], names.join(' | ')).toContain(t('patch_index_i'));
        for (const label of [t('patch_starting_heading'), t('patch_degree_u'), t('patch_parameter_u')]) expect(names.findIndex(name => name.includes(label)), label).toBeGreaterThan(0);
        act(() => graph.selectIndex(1, 2));
        precedes(editor(), t('patch_starting_heading'));
        precedes(editor(), t('patch_point_heading'));
    });
});
