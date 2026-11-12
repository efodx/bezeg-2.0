import {MessageKey, renderMessage, t} from './localization';
import type {sl} from './localization/sl';
import {mapsDemonstrationRows} from './graphs/maps/registration';
import {planeGeometryDemonstrationRows} from './graphs/compgeo/planeGeometry/registration';
import {probabilityDemonstrationRows} from './graphs/probability/registration';
import {analysisDemonstrationRows} from './graphs/analysis/registration';
import {functionsDemonstrationRows} from './graphs/functions/registration';
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
import {curveGeometryDemonstrationRows} from './graphs/curves/geometry/registration';
import {interpolationDemonstrationRows} from './graphs/curves/interpolation/registration';
import {patchesDemonstrationRows} from './graphs/patches/registration';
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
const definitions = [...legacyDemonstrationRows, ...mapsDemonstrationRows, ...planeGeometryDemonstrationRows, ...complexBatchDDemonstrationRows, ...projectiveDemonstrationRows, ...analysisDemonstrationRows, ...probabilityDemonstrationRows, ...functionsDemonstrationRows, ...trigDemonstrationRows, ...lineDemonstrationRows, ...isometryDemonstrationRows, ...circleConstructionDemonstrationRows, ...combinatoricsDemonstrationRows, ...randomDemonstrationRows, ...curveGeometryDemonstrationRows, ...interpolationDemonstrationRows, ...patchesDemonstrationRows, ...kinematicsDemonstrationRows, ...mechanicsDemonstrationRows, ...recursionDemonstrationRows, ...dynamicsDemonstrationRows, ...solidsDemonstrationRows, ...levelSetsDemonstrationRows, ...wavesDemonstrationRows, ...bsplineDemonstrationRows, ...basicsDemonstrationRows, ...phDemonstrationRows, ...parameterizationDemonstrationRows, ...bezierDemonstrationRows, ...rationalDemonstrationRows, ...splineDemonstrationRows] as const satisfies readonly Definition[];
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
