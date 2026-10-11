import {MessageKey, renderMessage, t} from './localization';
import type {sl} from './localization/sl';

type TextKey = {[K in MessageKey]: typeof sl[K] extends `${string}{${string}` ? never : K}[MessageKey];
export type NavigationAction = 'left' | 'up' | 'down' | 'right' | 'in' | 'out' | 'fit';
const navigationActions: readonly NavigationAction[] = ['left', 'up', 'down', 'right', 'in', 'out', 'fit'];
const families = [
    {id: 'basics', title: 'basics'},
    {id: '/bezeg-2.0/bezier', title: 'bezier_curves'},
    {id: '/bezeg-2.0/rational', title: 'rational_bezier_curves'},
    {id: '/bezeg-2.0/spline', title: 'splines'},
    {id: '/bezeg-2.0/ph', title: 'ph_curves'},
    {id: '/bezeg-2.0/param', title: 'parametrizations'},
    {id: '/bezeg-2.0/functions', title: 'functions_and_calculus'},
] as const;
export type FamilyId = typeof families[number]['id'];
type Definition = {
    id: string; path: string; family: FamilyId; title: TextKey; heading?: TextKey;
    prompts: readonly [TextKey, TextKey]; fit?: false;
};

// Order is the teaching catalog order, independent of wording and graph imports.
const definitions = [
    {id: 'bernstein', path: '/bezeg-2.0/bernstein', family: 'basics', title: 'bernstein_polynomials', prompts: ['prompt_bernstein', 'prompt_compare'], fit: false},
    {id: 'bezier', path: '/bezeg-2.0/bezier/curve', family: '/bezeg-2.0/bezier', title: 'bezier_curve_209', heading: 'bezier_curve', prompts: ['prompt_control_points', 'prompt_control_polygon']},
    {id: 'decasteljau', path: '/bezeg-2.0/bezier/decasteljau', family: '/bezeg-2.0/bezier', title: 'de_casteljau', prompts: ['prompt_decasteljau', 'prompt_compare']},
    {id: 'decasteljau-alternative', path: '/bezeg-2.0/bezier/decasteljau2', family: '/bezeg-2.0/bezier', title: 'de_casteljau_alternative', prompts: ['prompt_decasteljau', 'prompt_compare']},
    {id: 'affine', path: '/bezeg-2.0/bezier/affine', family: '/bezeg-2.0/bezier', title: 'affine_transformations', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'subdivision', path: '/bezeg-2.0/bezier/subdivision-2', family: '/bezeg-2.0/bezier', title: 'subdivision', prompts: ['prompt_subdivision', 'prompt_compare']},
    {id: 'repeated-subdivision', path: '/bezeg-2.0/bezier/subdivision', family: '/bezeg-2.0/bezier', title: 'repeated_subdivision', prompts: ['prompt_repeated_subdivision', 'prompt_compare']},
    {id: 'extrapolation', path: '/bezeg-2.0/bezier/extrapolation', family: '/bezeg-2.0/bezier', title: 'extrapolation', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'elevation', path: '/bezeg-2.0/bezier/elevation', family: '/bezeg-2.0/bezier', title: 'degree_elevation', prompts: ['prompt_elevation', 'prompt_compare']},
    {id: 'rational', path: '/bezeg-2.0/rational/base', family: '/bezeg-2.0/rational', title: 'rational_bezier_curve', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'rational-decasteljau', path: '/bezeg-2.0/rational/rational-decasteljau', family: '/bezeg-2.0/rational', title: 'rational_de_casteljau', prompts: ['prompt_decasteljau', 'prompt_compare']},
    {id: 'rational-elevation', path: '/bezeg-2.0/rational/rational-elevation', family: '/bezeg-2.0/rational', title: 'degree_elevation', prompts: ['prompt_elevation', 'prompt_compare']},
    {id: 'rational-extrapolation', path: '/bezeg-2.0/rational/rational-extrapolation', family: '/bezeg-2.0/rational', title: 'extrapolation', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'rational-subdivision', path: '/bezeg-2.0/rational/rational-subdivision', family: '/bezeg-2.0/rational', title: 'subdivision', prompts: ['prompt_subdivision', 'prompt_compare']},
    {id: 'farin', path: '/bezeg-2.0/rational/farin-points', family: '/bezeg-2.0/rational', title: 'farin_points', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'circle', path: '/bezeg-2.0/rational/circlen', family: '/bezeg-2.0/rational', title: 'circle_from_n_pieces', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'spline-cn', path: '/bezeg-2.0/spline/spline', family: '/bezeg-2.0/spline', title: 'onesided_cn_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-c1', path: '/bezeg-2.0/spline/c1spline', family: '/bezeg-2.0/spline', title: 'symmetric_c1_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-c2', path: '/bezeg-2.0/spline/c2spline', family: '/bezeg-2.0/spline', title: 'symmetric_c2_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-g1', path: '/bezeg-2.0/spline/g1spline', family: '/bezeg-2.0/spline', title: 'onesided_g1_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-g1-symmetric', path: '/bezeg-2.0/spline/g1-sym-spline', family: '/bezeg-2.0/spline', title: 'symmetric_g1_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'ph-cubic', path: '/bezeg-2.0/ph/cubic', family: '/bezeg-2.0/ph', title: 'degree_3', heading: 'degree_3_ph_curve', prompts: ['prompt_ph', 'prompt_compare']},
    {id: 'ph-quintic', path: '/bezeg-2.0/ph/quintic', family: '/bezeg-2.0/ph', title: 'degree_5_ph_curve', prompts: ['prompt_ph', 'prompt_compare']},
    {id: 'spline-parameterization', path: '/bezeg-2.0/param/param/alphaparam2', family: '/bezeg-2.0/param', title: 'parametrizations_233', prompts: ['prompt_parameterization', 'prompt_compare']},
    {id: 'weighted-parameterization', path: '/bezeg-2.0/param/param/alphaparam', family: '/bezeg-2.0/param', title: 'weighted_parametrization_234', prompts: ['prompt_parameterization', 'prompt_compare']},
    {id: 'uniform-parameterization', path: '/bezeg-2.0/param/param/uniform', family: '/bezeg-2.0/param', title: 'uniform_parametrization_235', prompts: ['prompt_parameterization', 'prompt_compare']},
    {id: 'linear-function', path: '/bezeg-2.0/functions/linear', family: '/bezeg-2.0/functions', title: 'linear_function', prompts: ['prompt_linear_function', 'prompt_compare']},
] as const satisfies readonly Definition[];
export type DemonstrationId = typeof definitions[number]['id'];
export type Demonstration = Readonly<{
    id: DemonstrationId; path: string; family: FamilyId; catalogTitle: string; workspaceTitle: string;
    prompts: readonly [string, string]; navigationActions: readonly NavigationAction[];
}>;

function resolve(definition: Definition & {id: DemonstrationId}): Demonstration {
    const text = (key: TextKey) => renderMessage({key, params: {}});
    return {
        id: definition.id, path: definition.path, family: definition.family,
        catalogTitle: text(definition.title), workspaceTitle: text(definition.heading ?? definition.title),
        prompts: [text(definition.prompts[0]), text(definition.prompts[1])],
        navigationActions: definition.fit === false ? navigationActions.filter(action => action !== 'fit') : [...navigationActions],
    };
}

/** Exact lookup; home, catalog, and unsupported paths have no Demonstration. */
export function findDemonstration(pathname: string): Demonstration | undefined {
    const definition = definitions.find(entry => entry.path === pathname);
    return definition && resolve(definition);
}

/** Fresh localized values; callers keep their existing language subscriptions. */
export function getDemonstrationCatalog() {
    const demonstrations = definitions.map(resolve);
    const starting = [
        {id: 'bezier', title: 'bezier_curve_209', description: 'example_bezier', caption: 'points_to_shape'},
        {id: 'decasteljau', title: 'de_casteljau', description: 'example_decasteljau', caption: 'interpolation_to_curve'},
        {id: 'ph-cubic', title: 'degree_3_ph_curve', description: 'example_ph', caption: 'ph_curve_to_offsets'},
    ] as const;
    return {
        demonstrations,
        families: families.map(family => ({
            id: family.id, title: t(family.title),
            demonstrations: demonstrations.filter(entry => entry.family === family.id),
        })),
        starting: starting.map(entry => ({
            demonstration: demonstrations.find(demonstration => demonstration.id === entry.id)!,
            title: t(entry.title), description: t(entry.description), caption: t(entry.caption),
        })),
    };
}
