/**
 * Surface patch routes, first task first (batch 2): the route's own first task leads its Edit panel; the starting
 * patch and degrees (and, on the joins route, the example pairs) follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {FakeSurfaceView} from './FakeSurfaceView';
import TensorDeCasteljauGraph from './TensorDeCasteljauGraph';
import TensorDerivativesGraph from './TensorDerivativesGraph';
import TensorJoinGraph from './TensorJoinGraph';
import TensorSubdivisionGraph from './TensorSubdivisionGraph';

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
