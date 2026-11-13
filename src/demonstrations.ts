import {MessageKey, renderMessage, t} from './localization';
import type {sl} from './localization/sl';
import {mapsDemonstrationRows} from './graphs/maps/registration';
import {computationalGeometryDemonstrationRows} from './graphs/compgeo/computationalGeometry/registration';
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
// Teaching catalog order is the order of these spreads; a new family adds one spread here (see graphs/graphLoaders.ts).
const definitions = [...mapsDemonstrationRows, ...planeGeometryDemonstrationRows, ...computationalGeometryDemonstrationRows, ...complexBatchDDemonstrationRows, ...projectiveDemonstrationRows, ...analysisDemonstrationRows, ...probabilityDemonstrationRows, ...functionsDemonstrationRows, ...trigDemonstrationRows, ...lineDemonstrationRows, ...isometryDemonstrationRows, ...circleConstructionDemonstrationRows, ...combinatoricsDemonstrationRows, ...randomDemonstrationRows, ...curveGeometryDemonstrationRows, ...interpolationDemonstrationRows, ...patchesDemonstrationRows, ...kinematicsDemonstrationRows, ...mechanicsDemonstrationRows, ...recursionDemonstrationRows, ...dynamicsDemonstrationRows, ...solidsDemonstrationRows, ...levelSetsDemonstrationRows, ...wavesDemonstrationRows, ...bsplineDemonstrationRows, ...basicsDemonstrationRows, ...phDemonstrationRows, ...parameterizationDemonstrationRows, ...bezierDemonstrationRows, ...rationalDemonstrationRows, ...splineDemonstrationRows] as const satisfies readonly Definition[];
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
