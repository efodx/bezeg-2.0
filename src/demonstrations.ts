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
    {id: '/bezeg-2.0/curve-geometry', title: 'curve_geometry'},
    {id: '/bezeg-2.0/interpolation', title: 'interpolation_and_approximation'},
    {id: '/bezeg-2.0/patches', title: 'bezier_patches'},
    {id: '/bezeg-2.0/functions', title: 'functions_and_calculus'},
    {id: 'analysis', title: 'analysis'},
    {id: 'maps', title: 'maps_of_the_plane'},
    {id: 'plane-geometry', title: 'plane_geometry'},
    {id: 'computational-geometry', title: 'computational_geometry'},
    {id: 'projective', title: 'projective_conics'},
] as const;
export type FamilyId = typeof families[number]['id'];
type Definition = {
    id: string; path: string; family: FamilyId; title: TextKey; heading?: TextKey;
    prompts: readonly [TextKey, TextKey]; fit?: false;
    /** `'surface'` marks a demonstration whose main view is orbited, not panned: it has no pan or zoom actions. */
    view?: 'surface';
    /** Set to `false` only for a Demonstration that deliberately ships without a guided lesson; lesson tests enforce the rest. */
    lesson?: false;
};

// Order is the teaching catalog order, independent of wording and graph imports.
const definitions = [
    {id: 'bernstein', path: '/bezeg-2.0/bernstein', family: 'basics', title: 'bernstein_polynomials', prompts: ['prompt_bernstein', 'prompt_compare'], fit: false},
    {id: 'complex-multiplication', path: '/bezeg-2.0/complex-multiplication', family: 'basics', title: 'complex_multiplication', prompts: ['prompt_complex_multiplication', 'prompt_compare']},
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
    {id: 'curve-parametric', path: '/bezeg-2.0/curve-geometry/parametric', family: '/bezeg-2.0/curve-geometry', title: 'parametric_curves_title', prompts: ['prompt_parametric_curve', 'prompt_compare']},
    {id: 'curve-curvature', path: '/bezeg-2.0/curve-geometry/curvature', family: '/bezeg-2.0/curve-geometry', title: 'curvature_circle_title', prompts: ['prompt_curvature', 'prompt_compare']},
    {id: 'interp-lagrange', path: '/bezeg-2.0/interpolation/lagrange', family: '/bezeg-2.0/interpolation', title: 'interp_lagrange_title', prompts: ['prompt_interp_lagrange', 'prompt_compare']},
    {id: 'interp-hermite', path: '/bezeg-2.0/interpolation/hermite', family: '/bezeg-2.0/interpolation', title: 'interp_hermite_title', prompts: ['prompt_interp_hermite', 'prompt_compare']},
    {id: 'interp-subdivision', path: '/bezeg-2.0/interpolation/subdivision', family: '/bezeg-2.0/interpolation', title: 'interp_subdivision_title', prompts: ['prompt_interp_subdivision', 'prompt_compare']},
    {id: 'patch-tensor', path: '/bezeg-2.0/patches/tensor', family: '/bezeg-2.0/patches', title: 'tensor_product_bezier_patch', prompts: ['prompt_patch_net', 'prompt_patch_degree'], view: 'surface'},
    {id: 'patch-decasteljau', path: '/bezeg-2.0/patches/decasteljau', family: '/bezeg-2.0/patches', title: 'patch_decasteljau_algorithm', prompts: ['prompt_patch_decasteljau_order', 'prompt_patch_decasteljau_levels'], view: 'surface'},
    {id: 'patch-derivatives', path: '/bezeg-2.0/patches/derivatives', family: '/bezeg-2.0/patches', title: 'patch_derivatives_title', prompts: ['prompt_patch_derivatives_tangents', 'prompt_patch_derivatives_normal'], view: 'surface'},
    {id: 'patch-subdivision', path: '/bezeg-2.0/patches/subdivision', family: '/bezeg-2.0/patches', title: 'patch_subdivision_title', prompts: ['prompt_patch_subdivision_pieces', 'prompt_patch_subdivision_elevation'], view: 'surface'},
    {id: 'patch-joins', path: '/bezeg-2.0/patches/joins', family: '/bezeg-2.0/patches', title: 'patch_joins_title', prompts: ['prompt_patch_joins_c1', 'prompt_patch_joins_g1'], view: 'surface'},
    {id: 'patch-triangular', path: '/bezeg-2.0/patches/triangular', family: '/bezeg-2.0/patches', title: 'triangular_bezier_patch', prompts: ['prompt_patch_triangular_net', 'prompt_patch_barycentric'], view: 'surface'},
    {id: 'patch-coons', path: '/bezeg-2.0/patches/coons', family: '/bezeg-2.0/patches', title: 'coons_patch_title', prompts: ['prompt_coons_boundaries', 'prompt_coons_blend'], view: 'surface', lesson: false},
    {id: 'linear-function', path: '/bezeg-2.0/functions/linear', family: '/bezeg-2.0/functions', title: 'linear_function', prompts: ['prompt_linear_function', 'prompt_compare']},
    {id: 'exponential-function', path: '/bezeg-2.0/functions/exponential', family: '/bezeg-2.0/functions', title: 'exponential_function', prompts: ['prompt_exponential_function', 'prompt_compare']},
    {id: 'trigonometric-functions', path: '/bezeg-2.0/functions/trigonometric', family: '/bezeg-2.0/functions', title: 'trigonometric_functions', prompts: ['prompt_trigonometric_functions', 'prompt_compare']},
    {id: 'function-transformation', path: '/bezeg-2.0/functions/transformations', family: '/bezeg-2.0/functions', title: 'function_transformation_title', prompts: ['prompt_function_transformation', 'prompt_compare'], lesson: false},
    {id: 'function-inverse', path: '/bezeg-2.0/functions/inverse', family: '/bezeg-2.0/functions', title: 'function_inverse_title', prompts: ['prompt_function_inverse', 'prompt_compare'], lesson: false},
    {id: 'continuity', path: '/bezeg-2.0/functions/continuity', family: '/bezeg-2.0/functions', title: 'continuity', prompts: ['prompt_continuity', 'prompt_compare']},
    {id: 'derivative', path: '/bezeg-2.0/functions/derivative', family: '/bezeg-2.0/functions', title: 'derivative', prompts: ['prompt_derivative', 'prompt_compare']},
    {id: 'definite-integral', path: '/bezeg-2.0/functions/integral', family: '/bezeg-2.0/functions', title: 'definite_integral', prompts: ['prompt_definite_integral', 'prompt_compare']},
    {id: 'area-between-curves', path: '/bezeg-2.0/functions/area-between', family: '/bezeg-2.0/functions', title: 'area_between_curves', prompts: ['prompt_area_between_curves', 'prompt_compare']},
    {id: 'arc-length', path: '/bezeg-2.0/functions/arc-length', family: '/bezeg-2.0/functions', title: 'curve_arc_length', prompts: ['prompt_curve_arc_length', 'prompt_compare']},
    {id: 'bisection', path: '/bezeg-2.0/analysis/bisection', family: 'analysis', title: 'bisection', prompts: ['prompt_bisection', 'prompt_compare']},
    {id: 'root-finding', path: '/bezeg-2.0/analysis/root-finding', family: 'analysis', title: 'root_finding_title', prompts: ['prompt_root_finding', 'prompt_compare'], lesson: false},
    {id: 'mean-value', path: '/bezeg-2.0/analysis/mean-value', family: 'analysis', title: 'mean_value', prompts: ['prompt_mean_value', 'prompt_compare']},
    {id: 'accumulation', path: '/bezeg-2.0/analysis/accumulation', family: 'analysis', title: 'accumulation', prompts: ['prompt_accumulation', 'prompt_compare']},
    {id: 'darboux', path: '/bezeg-2.0/analysis/darboux', family: 'analysis', title: 'darboux', prompts: ['prompt_darboux', 'prompt_compare']},
    {id: 'extrema', path: '/bezeg-2.0/analysis/extrema', family: 'analysis', title: 'extrema', prompts: ['prompt_extrema', 'prompt_compare']},
    {id: 'convexity', path: '/bezeg-2.0/analysis/convexity', family: 'analysis', title: 'convexity', prompts: ['prompt_convexity', 'prompt_compare']},
    {id: 'taylor', path: '/bezeg-2.0/analysis/taylor', family: 'analysis', title: 'taylor', prompts: ['prompt_taylor', 'prompt_compare']},
    {id: 'sequence', path: '/bezeg-2.0/analysis/sequence', family: 'analysis', title: 'sequence', prompts: ['prompt_sequence', 'prompt_compare']},
    {id: 'uniform-convergence', path: '/bezeg-2.0/analysis/uniform-convergence', family: 'analysis', title: 'uniform_convergence', prompts: ['prompt_uniform_convergence', 'prompt_compare']},
    {id: 'fourier-series', path: '/bezeg-2.0/analysis/fourier-series', family: 'analysis', title: 'fourier_series_title', prompts: ['prompt_fourier_series', 'prompt_compare'], lesson: false},
    {id: 'fixed-point', path: '/bezeg-2.0/analysis/fixed-point', family: 'analysis', title: 'fixed_point', prompts: ['prompt_fixed_point', 'prompt_compare']},
    {id: 'linear-map', path: '/bezeg-2.0/linear-map', family: 'maps', title: 'linear_map_title', prompts: ['linear_map_prompt', 'prompt_compare']},
    {id: 'complex-reciprocal', path: '/bezeg-2.0/complex-reciprocal', family: 'maps', title: 'complex_reciprocal_title', prompts: ['complex_reciprocal_prompt', 'prompt_compare']},
    {id: 'complex-roots', path: '/bezeg-2.0/complex-roots', family: 'maps', title: 'complex_roots_title', prompts: ['complex_roots_prompt', 'prompt_compare']},
    {id: 'triangle-centres', path: '/bezeg-2.0/triangle-centres', family: 'plane-geometry', title: 'triangle_centres_title', prompts: ['triangle_centres_prompt', 'prompt_compare']},
    {id: 'inscribed-angle', path: '/bezeg-2.0/inscribed-angle', family: 'plane-geometry', title: 'inscribed_angle_title', prompts: ['inscribed_angle_prompt', 'prompt_compare']},
    {id: 'orientation', path: '/bezeg-2.0/compgeo/orientation', family: 'computational-geometry', title: 'compgeo_orientation_title', prompts: ['prompt_compgeo_orientation_turn', 'prompt_compgeo_orientation_collinear']},
    {id: 'polygon-area', path: '/bezeg-2.0/compgeo/polygon-area', family: 'computational-geometry', title: 'compgeo_polygon_area_title', prompts: ['prompt_compgeo_polygon_area_shoelace', 'prompt_compgeo_polygon_area_pick']},
    {id: 'convex-hull', path: '/bezeg-2.0/compgeo/convex-hull', family: 'computational-geometry', title: 'compgeo_convex_hull_title', prompts: ['prompt_compgeo_convex_hull_trace', 'prompt_compgeo_convex_hull_degenerate']},
    {id: 'ear-clipping', path: '/bezeg-2.0/compgeo/ear-clipping', family: 'computational-geometry', title: 'compgeo_ear_clipping_title', prompts: ['prompt_compgeo_ear_clipping_ears', 'prompt_compgeo_ear_clipping_reflex']},
    {id: 'interval-sweep', path: '/bezeg-2.0/compgeo/interval-sweep', family: 'computational-geometry', title: 'compgeo_interval_sweep_title', prompts: ['prompt_compgeo_interval_sweep_events', 'prompt_compgeo_interval_sweep_depth']},
    {id: 'segment-intersections', path: '/bezeg-2.0/compgeo/segment-intersections', family: 'computational-geometry', title: 'compgeo_segment_intersections_title', prompts: ['prompt_compgeo_segment_intersections_neighbours', 'prompt_compgeo_segment_intersections_swap']},
    {id: 'projective-cross-ratio', path: '/bezeg-2.0/projective/cross-ratio', family: 'projective', title: 'projective_cross_ratio_title', prompts: ['prompt_projective_cross_ratio_preserved', 'prompt_projective_cross_ratio_infinity'], lesson: false},
    {id: 'projective-pascal', path: '/bezeg-2.0/projective/pascal', family: 'projective', title: 'projective_pascal_title', prompts: ['prompt_projective_pascal_collinear', 'prompt_projective_pascal_degenerate'], lesson: false},
    {id: 'projective-pole-polar', path: '/bezeg-2.0/projective/pole-polar', family: 'projective', title: 'projective_pole_polar_title', prompts: ['prompt_projective_pole_polar_tangents', 'prompt_projective_pole_polar_infinity'], lesson: false},
] as const satisfies readonly Definition[];
export type DemonstrationId = typeof definitions[number]['id'];
/** The Demonstrations that deliberately ship without a guided lesson (`lesson: false`). */
export type LessonlessDemonstrationId = Extract<typeof definitions[number], {lesson: false}>['id'];
/** The Demonstrations that must have guided-lesson content (ownership, preview copy). */
export type GuidedLessonDemonstrationId = Exclude<DemonstrationId, LessonlessDemonstrationId>;
/**
 * Ids of the Demonstrations that offer a guided lesson: every definition unless it opts out with `lesson: false`.
 * Lightweight on purpose (no lesson content is imported), so the home page and catalog can read it; the lesson tests fail
 * when this set and the authored lesson content disagree.
 */
export const LESSON_DEMONSTRATION_IDS: readonly DemonstrationId[] = definitions
    .filter((definition: Definition) => definition.lesson !== false).map(definition => definition.id);
export type Demonstration = Readonly<{
    id: DemonstrationId; path: string; family: FamilyId; catalogTitle: string; workspaceTitle: string;
    prompts: readonly [string, string]; navigationActions: readonly NavigationAction[];
    /** The kind of main view: a pannable board, or a surface view with its own gestures. */
    view: 'board' | 'surface';
}>;

/** Resolves one definition into its localized demonstration; exported so tests can resolve fixture definitions. */
export function resolveDemonstrationDefinition(definition: Definition & {id: DemonstrationId}): Demonstration {
    const text = (key: TextKey) => renderMessage({key, params: {}});
    return {
        id: definition.id, path: definition.path, family: definition.family,
        catalogTitle: text(definition.title), workspaceTitle: text(definition.heading ?? definition.title),
        prompts: [text(definition.prompts[0]), text(definition.prompts[1])],
        navigationActions: definition.view === 'surface' ? []
            : definition.fit === false ? navigationActions.filter(action => action !== 'fit') : [...navigationActions],
        view: definition.view ?? 'board',
    };
}

/** Exact lookup; home, catalog, and unsupported paths have no Demonstration. */
export function findDemonstration(pathname: string): Demonstration | undefined {
    const definition = definitions.find(entry => entry.path === pathname);
    return definition && resolveDemonstrationDefinition(definition);
}

/** Fresh localized values; callers keep their existing language subscriptions. */
export function getDemonstrationCatalog() {
    const demonstrations = definitions.map(resolveDemonstrationDefinition);
    const starting = [
        {id: 'bezier', title: 'bezier_curve_209', description: 'example_bezier', caption: 'points_to_shape'},
        {id: 'decasteljau', title: 'de_casteljau', description: 'example_decasteljau', caption: 'interpolation_to_curve'},
        {id: 'ph-cubic', title: 'degree_3_ph_curve', description: 'example_ph', caption: 'ph_curve_to_offsets'},
    ] as const;
    return {
        demonstrations,
        // A family with no shipped demonstration is not part of the catalog, so neither page renders an empty topic.
        families: families.map(family => ({
            id: family.id, title: t(family.title),
            demonstrations: demonstrations.filter(entry => entry.family === family.id),
        })).filter(family => family.demonstrations.length > 0),
        starting: starting.map(entry => ({
            demonstration: demonstrations.find(demonstration => demonstration.id === entry.id)!,
            title: t(entry.title), description: t(entry.description), caption: t(entry.caption),
        })),
    };
}
