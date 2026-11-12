import {MessageKey, renderMessage, t} from './localization';
import type {sl} from './localization/sl';
import {projectiveDemonstrationRows} from './graphs/projective/registration';
import {trigDemonstrationRows} from './graphs/trig/registration';
import {lineDemonstrationRows} from './graphs/lines/registration';
import {isometryDemonstrationRows} from './graphs/isometry/registration';
import {circleConstructionDemonstrationRows} from './graphs/compgeo/circleConstruction/registration';
import {combinatoricsDemonstrationRows} from './graphs/combinatorics/registration';
import {randomDemonstrationRows} from './graphs/random/registration';
import {kinematicsDemonstrationRows} from './graphs/curves/kinematics/registration';
import {recursionDemonstrationRows} from './graphs/recursion/registration';
import {wavesDemonstrationRows} from './graphs/functions/waves/registration';
import {complexBatchDDemonstrationRows} from './graphs/complex/batchD/registration';
import {mechanicsDemonstrationRows} from './graphs/mechanics/registration';
import {dynamicsDemonstrationRows} from './graphs/dynamics/registration';
import {solidsDemonstrationRows} from './graphs/solids/registration';
import {levelSetsDemonstrationRows} from './graphs/levelsets/registration';
import {splineDemonstrationRows} from './graphs/curves/spline/registration';
import {bsplineDemonstrationRows} from './graphs/curves/bspline/registration';
import {basicsDemonstrationRows} from './graphs/basics/registration';
import {phDemonstrationRows} from './graphs/curves/ph/registration';
import {parameterizationDemonstrationRows} from './graphs/curves/parametrisations/registration';
import {bezierDemonstrationRows} from './graphs/curves/bezier/registration';
import {rationalDemonstrationRows} from './graphs/curves/rational/registration';

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
    {id: '/bezeg-2.0/bspline', title: 'b_splines'},
    {id: '/bezeg-2.0/patches', title: 'bezier_patches'},
    {id: '/bezeg-2.0/functions', title: 'functions_and_calculus'},
    {id: 'analysis', title: 'analysis'},
    {id: '/bezeg-2.0/probability', title: 'probability_and_statistics'},
    {id: 'combinatorics', title: 'combinatorics'},
    {id: 'maps', title: 'maps_of_the_plane'},
    {id: 'plane-geometry', title: 'plane_geometry'},
    {id: 'computational-geometry', title: 'computational_geometry'},
    {id: 'projective', title: 'projective_conics'},
] as const;
export type FamilyId = typeof families[number]['id'];
export type Definition = {
    id: string; path: string; family: FamilyId; title: TextKey; heading?: TextKey;
    prompts: readonly [TextKey, TextKey]; fit?: false;
    /** `'surface'` marks a demonstration whose main view is orbited, not panned: it has no pan or zoom actions. */
    view?: 'surface';
    /** Set to `false` only for a Demonstration that deliberately ships without a guided lesson; lesson tests enforce the rest. */
    lesson?: false;
};

// Order is the teaching catalog order, independent of wording and graph imports.
export const legacyDemonstrationRows = [
    {id: 'curve-parametric', path: '/bezeg-2.0/curve-geometry/parametric', family: '/bezeg-2.0/curve-geometry', title: 'parametric_curves_title', prompts: ['prompt_parametric_curve', 'prompt_compare']},
    {id: 'curve-curvature', path: '/bezeg-2.0/curve-geometry/curvature', family: '/bezeg-2.0/curve-geometry', title: 'curvature_circle_title', prompts: ['prompt_curvature', 'prompt_compare']},
    {id: 'curve-comb', path: '/bezeg-2.0/curve-geometry/comb', family: '/bezeg-2.0/curve-geometry', title: 'curve_comb_title', prompts: ['prompt_curve_comb', 'prompt_compare']},
    {id: 'curve-evolute', path: '/bezeg-2.0/curve-geometry/evolute', family: '/bezeg-2.0/curve-geometry', title: 'curve_evolute_title', prompts: ['prompt_curve_evolute', 'prompt_compare']},
    {id: 'curve-offset', path: '/bezeg-2.0/curve-geometry/offset', family: '/bezeg-2.0/curve-geometry', title: 'curve_offset_title', prompts: ['prompt_curve_offset', 'prompt_compare']},
    {id: 'curve-envelope', path: '/bezeg-2.0/curve-geometry/envelope', family: '/bezeg-2.0/curve-geometry', title: 'curve_envelope_title', prompts: ['prompt_curve_envelope', 'prompt_compare']},
    {id: 'interp-lagrange', path: '/bezeg-2.0/interpolation/lagrange', family: '/bezeg-2.0/interpolation', title: 'interp_lagrange_title', prompts: ['prompt_interp_lagrange', 'prompt_compare']},
    {id: 'interp-hermite', path: '/bezeg-2.0/interpolation/hermite', family: '/bezeg-2.0/interpolation', title: 'interp_hermite_title', prompts: ['prompt_interp_hermite', 'prompt_compare']},
    {id: 'interp-runge', path: '/bezeg-2.0/interpolation/runge', family: '/bezeg-2.0/interpolation', title: 'interp_runge_title', prompts: ['prompt_interp_runge', 'prompt_compare']},
    {id: 'interp-least-squares', path: '/bezeg-2.0/interpolation/least-squares', family: '/bezeg-2.0/interpolation', title: 'interp_lsq_title', prompts: ['prompt_interp_least_squares', 'prompt_compare']},
    {id: 'interp-subdivision', path: '/bezeg-2.0/interpolation/subdivision', family: '/bezeg-2.0/interpolation', title: 'interp_subdivision_title', prompts: ['prompt_interp_subdivision', 'prompt_compare']},
    {id: 'patch-tensor', path: '/bezeg-2.0/patches/tensor', family: '/bezeg-2.0/patches', title: 'tensor_product_bezier_patch', prompts: ['prompt_patch_net', 'prompt_patch_degree'], view: 'surface'},
    {id: 'patch-decasteljau', path: '/bezeg-2.0/patches/decasteljau', family: '/bezeg-2.0/patches', title: 'patch_decasteljau_algorithm', prompts: ['prompt_patch_decasteljau_order', 'prompt_patch_decasteljau_levels'], view: 'surface'},
    {id: 'patch-derivatives', path: '/bezeg-2.0/patches/derivatives', family: '/bezeg-2.0/patches', title: 'patch_derivatives_title', prompts: ['prompt_patch_derivatives_tangents', 'prompt_patch_derivatives_normal'], view: 'surface'},
    {id: 'patch-subdivision', path: '/bezeg-2.0/patches/subdivision', family: '/bezeg-2.0/patches', title: 'patch_subdivision_title', prompts: ['prompt_patch_subdivision_pieces', 'prompt_patch_subdivision_elevation'], view: 'surface'},
    {id: 'patch-joins', path: '/bezeg-2.0/patches/joins', family: '/bezeg-2.0/patches', title: 'patch_joins_title', prompts: ['prompt_patch_joins_c1', 'prompt_patch_joins_g1'], view: 'surface'},
    {id: 'patch-triangular', path: '/bezeg-2.0/patches/triangular', family: '/bezeg-2.0/patches', title: 'triangular_bezier_patch', prompts: ['prompt_patch_triangular_net', 'prompt_patch_barycentric'], view: 'surface'},
    {id: 'patch-coons', path: '/bezeg-2.0/patches/coons', family: '/bezeg-2.0/patches', title: 'coons_patch_title', prompts: ['prompt_coons_boundaries', 'prompt_coons_blend'], view: 'surface'},
    {id: 'linear-function', path: '/bezeg-2.0/functions/linear', family: '/bezeg-2.0/functions', title: 'linear_function', prompts: ['prompt_linear_function', 'prompt_compare']},
    {id: 'exponential-function', path: '/bezeg-2.0/functions/exponential', family: '/bezeg-2.0/functions', title: 'exponential_function', prompts: ['prompt_exponential_function', 'prompt_compare']},
    {id: 'trigonometric-functions', path: '/bezeg-2.0/functions/trigonometric', family: '/bezeg-2.0/functions', title: 'trigonometric_functions', prompts: ['prompt_trigonometric_functions', 'prompt_compare']},
    {id: 'function-transformation', path: '/bezeg-2.0/functions/transformations', family: '/bezeg-2.0/functions', title: 'function_transformation_title', prompts: ['prompt_function_transformation', 'prompt_compare']},
    {id: 'function-inverse', path: '/bezeg-2.0/functions/inverse', family: '/bezeg-2.0/functions', title: 'function_inverse_title', prompts: ['prompt_function_inverse', 'prompt_compare']},
    {id: 'polynomial-zeros', path: '/bezeg-2.0/functions/polynomial-zeros', family: '/bezeg-2.0/functions', title: 'polynomial_zeros_title', prompts: ['prompt_polynomial_zeros', 'prompt_compare']},
    {id: 'rational-function', path: '/bezeg-2.0/functions/rational-functions', family: '/bezeg-2.0/functions', title: 'rational_function_title', prompts: ['prompt_rational_function', 'prompt_compare']},
    {id: 'geometric-series', path: '/bezeg-2.0/functions/geometric-series', family: '/bezeg-2.0/functions', title: 'geometric_series_title', prompts: ['prompt_geometric_series', 'prompt_compare']},
    {id: 'conic-focal', path: '/bezeg-2.0/functions/conics', family: '/bezeg-2.0/functions', title: 'conic_focal_title', prompts: ['prompt_conic_focal', 'prompt_compare']},
    {id: 'continuity', path: '/bezeg-2.0/functions/continuity', family: '/bezeg-2.0/functions', title: 'continuity', prompts: ['prompt_continuity', 'prompt_compare']},
    {id: 'derivative', path: '/bezeg-2.0/functions/derivative', family: '/bezeg-2.0/functions', title: 'derivative', prompts: ['prompt_derivative', 'prompt_compare']},
    {id: 'definite-integral', path: '/bezeg-2.0/functions/integral', family: '/bezeg-2.0/functions', title: 'definite_integral', prompts: ['prompt_definite_integral', 'prompt_compare']},
    {id: 'area-between-curves', path: '/bezeg-2.0/functions/area-between', family: '/bezeg-2.0/functions', title: 'area_between_curves', prompts: ['prompt_area_between_curves', 'prompt_compare']},
    {id: 'arc-length', path: '/bezeg-2.0/functions/arc-length', family: '/bezeg-2.0/functions', title: 'curve_arc_length', prompts: ['prompt_curve_arc_length', 'prompt_compare']},
    {id: 'bisection', path: '/bezeg-2.0/analysis/bisection', family: 'analysis', title: 'bisection', prompts: ['prompt_bisection', 'prompt_compare']},
    {id: 'root-finding', path: '/bezeg-2.0/analysis/root-finding', family: 'analysis', title: 'root_finding_title', prompts: ['prompt_root_finding', 'prompt_compare']},
    {id: 'quadrature', path: '/bezeg-2.0/analysis/quadrature', family: 'analysis', title: 'quadrature_title', prompts: ['prompt_quadrature', 'prompt_compare']},
    {id: 'euler-method', path: '/bezeg-2.0/analysis/euler-method', family: 'analysis', title: 'euler_ode_title', prompts: ['prompt_euler_ode', 'prompt_compare']},
    {id: 'mean-value', path: '/bezeg-2.0/analysis/mean-value', family: 'analysis', title: 'mean_value', prompts: ['prompt_mean_value', 'prompt_compare']},
    {id: 'accumulation', path: '/bezeg-2.0/analysis/accumulation', family: 'analysis', title: 'accumulation', prompts: ['prompt_accumulation', 'prompt_compare']},
    {id: 'darboux', path: '/bezeg-2.0/analysis/darboux', family: 'analysis', title: 'darboux', prompts: ['prompt_darboux', 'prompt_compare']},
    {id: 'extrema', path: '/bezeg-2.0/analysis/extrema', family: 'analysis', title: 'extrema', prompts: ['prompt_extrema', 'prompt_compare']},
    {id: 'convexity', path: '/bezeg-2.0/analysis/convexity', family: 'analysis', title: 'convexity', prompts: ['prompt_convexity', 'prompt_compare']},
    {id: 'taylor', path: '/bezeg-2.0/analysis/taylor', family: 'analysis', title: 'taylor', prompts: ['prompt_taylor', 'prompt_compare']},
    {id: 'sequence', path: '/bezeg-2.0/analysis/sequence', family: 'analysis', title: 'sequence', prompts: ['prompt_sequence', 'prompt_compare']},
    {id: 'uniform-convergence', path: '/bezeg-2.0/analysis/uniform-convergence', family: 'analysis', title: 'uniform_convergence', prompts: ['prompt_uniform_convergence', 'prompt_compare']},
    {id: 'fourier-series', path: '/bezeg-2.0/analysis/fourier-series', family: 'analysis', title: 'fourier_series_title', prompts: ['prompt_fourier_series', 'prompt_compare']},
    {id: 'fourier-coefficients', path: '/bezeg-2.0/analysis/fourier-coefficients', family: 'analysis', title: 'fourier_coefficients_title', prompts: ['prompt_fourier_coefficients', 'prompt_compare']},
    {id: 'epicycles', path: '/bezeg-2.0/analysis/epicycles', family: 'analysis', title: 'epicycles_title', prompts: ['prompt_epicycles', 'prompt_compare']},
    {id: 'fixed-point', path: '/bezeg-2.0/analysis/fixed-point', family: 'analysis', title: 'fixed_point', prompts: ['prompt_fixed_point', 'prompt_compare']},
    {id: 'prob-density', path: '/bezeg-2.0/probability/density', family: '/bezeg-2.0/probability', title: 'prob_density_title', prompts: ['prompt_prob_density', 'prompt_compare']},
    {id: 'prob-binomial-normal', path: '/bezeg-2.0/probability/binomial-normal', family: '/bezeg-2.0/probability', title: 'prob_binomial_title', prompts: ['prompt_prob_binomial_normal', 'prompt_compare']},
    {id: 'prob-clt', path: '/bezeg-2.0/probability/clt', family: '/bezeg-2.0/probability', title: 'prob_clt_title', prompts: ['prompt_prob_clt', 'prompt_compare']},
    {id: 'prob-summary', path: '/bezeg-2.0/probability/summary', family: '/bezeg-2.0/probability', title: 'prob_summary_title', prompts: ['prompt_prob_summary', 'prompt_compare']},
    {id: 'prob-correlation', path: '/bezeg-2.0/probability/correlation', family: '/bezeg-2.0/probability', title: 'prob_correlation_title', prompts: ['prompt_prob_correlation', 'prompt_compare']},
    {id: 'linear-map', path: '/bezeg-2.0/linear-map', family: 'maps', title: 'linear_map_title', prompts: ['linear_map_prompt', 'prompt_compare']},
    {id: 'complex-reciprocal', path: '/bezeg-2.0/complex-reciprocal', family: 'maps', title: 'complex_reciprocal_title', prompts: ['complex_reciprocal_prompt', 'prompt_compare']},
    {id: 'complex-roots', path: '/bezeg-2.0/complex-roots', family: 'maps', title: 'complex_roots_title', prompts: ['complex_roots_prompt', 'prompt_compare']},
    {id: 'triangle-centres', path: '/bezeg-2.0/triangle-centres', family: 'plane-geometry', title: 'triangle_centres_title', prompts: ['triangle_centres_prompt', 'prompt_compare']},
    {id: 'inscribed-angle', path: '/bezeg-2.0/inscribed-angle', family: 'plane-geometry', title: 'inscribed_angle_title', prompts: ['inscribed_angle_prompt', 'prompt_compare']},
    {id: 'euler-line', path: '/bezeg-2.0/euler-line', family: 'plane-geometry', title: 'euler_line_title', prompts: ['euler_line_prompt', 'prompt_compare']},
    {id: 'simson-line', path: '/bezeg-2.0/simson-line', family: 'plane-geometry', title: 'simson_line_title', prompts: ['simson_line_prompt', 'prompt_compare']},
    {id: 'inversion', path: '/bezeg-2.0/inversion', family: 'plane-geometry', title: 'inversion_title', prompts: ['inversion_prompt', 'prompt_compare']},
    {id: 'orientation', path: '/bezeg-2.0/compgeo/orientation', family: 'computational-geometry', title: 'compgeo_orientation_title', prompts: ['prompt_compgeo_orientation_turn', 'prompt_compgeo_orientation_collinear']},
    {id: 'polygon-area', path: '/bezeg-2.0/compgeo/polygon-area', family: 'computational-geometry', title: 'compgeo_polygon_area_title', prompts: ['prompt_compgeo_polygon_area_shoelace', 'prompt_compgeo_polygon_area_pick']},
    {id: 'convex-hull', path: '/bezeg-2.0/compgeo/convex-hull', family: 'computational-geometry', title: 'compgeo_convex_hull_title', prompts: ['prompt_compgeo_convex_hull_trace', 'prompt_compgeo_convex_hull_degenerate']},
    {id: 'point-in-polygon', path: '/bezeg-2.0/compgeo/point-in-polygon', family: 'computational-geometry', title: 'compgeo_point_in_polygon_title', prompts: ['prompt_compgeo_point_in_polygon_ray', 'prompt_compgeo_point_in_polygon_self_intersecting']},
    {id: 'hull-robustness', path: '/bezeg-2.0/compgeo/hull-robustness', family: 'computational-geometry', title: 'compgeo_hull_robustness_title', prompts: ['prompt_compgeo_hull_robustness_rule', 'prompt_compgeo_hull_robustness_kettner']},
    {id: 'bezier-hulls', path: '/bezeg-2.0/compgeo/bezier-hulls', family: 'computational-geometry', title: 'compgeo_bezier_hulls_title', prompts: ['prompt_compgeo_bezier_hulls_shrink', 'prompt_compgeo_bezier_hulls_apart']},
    {id: 'ear-clipping', path: '/bezeg-2.0/compgeo/ear-clipping', family: 'computational-geometry', title: 'compgeo_ear_clipping_title', prompts: ['prompt_compgeo_ear_clipping_ears', 'prompt_compgeo_ear_clipping_reflex']},
    {id: 'point-set-triangulation', path: '/bezeg-2.0/compgeo/point-set-triangulation', family: 'computational-geometry', title: 'compgeo_point_set_triangulation_title', prompts: ['prompt_compgeo_point_set_triangulation_flip', 'prompt_compgeo_point_set_triangulation_count']},
    {id: 'delaunay', path: '/bezeg-2.0/compgeo/delaunay', family: 'computational-geometry', title: 'compgeo_delaunay_title', prompts: ['prompt_compgeo_delaunay_illegal', 'prompt_compgeo_delaunay_cocircular']},
    {id: 'voronoi', path: '/bezeg-2.0/compgeo/voronoi', family: 'computational-geometry', title: 'compgeo_voronoi_title', prompts: ['prompt_compgeo_voronoi_cell', 'prompt_compgeo_voronoi_query']},
    {id: 'voronoi-degenerate', path: '/bezeg-2.0/compgeo/voronoi-degenerate', family: 'computational-geometry', title: 'compgeo_voronoi_degenerate_title', prompts: ['prompt_compgeo_voronoi_degenerate_cocircular', 'prompt_compgeo_voronoi_degenerate_collinear']},
    {id: 'interval-sweep', path: '/bezeg-2.0/compgeo/interval-sweep', family: 'computational-geometry', title: 'compgeo_interval_sweep_title', prompts: ['prompt_compgeo_interval_sweep_events', 'prompt_compgeo_interval_sweep_depth']},
    {id: 'segment-intersections', path: '/bezeg-2.0/compgeo/segment-intersections', family: 'computational-geometry', title: 'compgeo_segment_intersections_title', prompts: ['prompt_compgeo_segment_intersections_neighbours', 'prompt_compgeo_segment_intersections_swap']},
    {id: 'monotone-partition', path: '/bezeg-2.0/compgeo/monotone-partition', family: 'computational-geometry', title: 'compgeo_monotone_partition_title', prompts: ['prompt_compgeo_monotone_partition_vertex_types', 'prompt_compgeo_monotone_partition_diagonals']},
    {id: 'monotone-triangulation', path: '/bezeg-2.0/compgeo/monotone-triangulation', family: 'computational-geometry', title: 'compgeo_monotone_triangulation_title', prompts: ['prompt_compgeo_monotone_triangulation_stack', 'prompt_compgeo_monotone_triangulation_chains']},
    {id: 'fortune', path: '/bezeg-2.0/compgeo/fortune', family: 'computational-geometry', title: 'compgeo_fortune_title', prompts: ['prompt_compgeo_fortune_false_alarm', 'prompt_compgeo_fortune_delaunay_dual']},
] as const satisfies readonly Definition[];
// Feature-registered families follow the legacy rows (catalog order); a new family adds one spread here (see graphs/graphLoaders.ts).
const definitions = [...legacyDemonstrationRows, ...complexBatchDDemonstrationRows, ...projectiveDemonstrationRows, ...trigDemonstrationRows, ...lineDemonstrationRows, ...isometryDemonstrationRows, ...circleConstructionDemonstrationRows, ...combinatoricsDemonstrationRows, ...randomDemonstrationRows, ...kinematicsDemonstrationRows, ...mechanicsDemonstrationRows, ...recursionDemonstrationRows, ...dynamicsDemonstrationRows, ...solidsDemonstrationRows, ...levelSetsDemonstrationRows, ...wavesDemonstrationRows, ...bsplineDemonstrationRows, ...basicsDemonstrationRows, ...phDemonstrationRows, ...parameterizationDemonstrationRows, ...bezierDemonstrationRows, ...rationalDemonstrationRows, ...splineDemonstrationRows] as const satisfies readonly Definition[];
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
