import type {DemonstrationId, GuidedLessonDemonstrationId, LessonlessDemonstrationId} from '../../demonstrations';
import {getDemonstrationCatalog, LESSON_DEMONSTRATION_IDS} from '../../demonstrations';
import type {ProjectiveDemonstrationId} from '../../graphs/projective/registration';
import type {CurveGeometryDemonstrationId} from '../../graphs/curves/geometry/registration';
import type {BsplineDemonstrationId} from '../../graphs/curves/bspline/registration';
import {bsplineDemonstrationRows} from '../../graphs/curves/bspline/registration';
import {basicsAdditionalOwners, basicsPrimaryOwners} from '../../graphs/basics/registration';
import {phPrimaryOwners} from '../../graphs/curves/ph/registration';
import {parameterizationPrimaryOwners} from '../../graphs/curves/parametrisations/registration';
import {bezierDemonstrationRows, bezierDerivedOwnerIds, bezierPrimaryOwners} from '../../graphs/curves/bezier/registration';
import {rationalPrimaryOwners} from '../../graphs/curves/rational/registration';
import {curveGeometryDemonstrationRows} from '../../graphs/curves/geometry/registration';
import type {InterpolationDemonstrationId} from '../../graphs/curves/interpolation/registration';
import {interpolationDemonstrationRows} from '../../graphs/curves/interpolation/registration';
import type {PatchesDemonstrationId} from '../../graphs/patches/registration';
import {patchesDemonstrationRows} from '../../graphs/patches/registration';
import {splinePrimaryOwners} from '../../graphs/curves/spline/registration';
import {projectiveDemonstrationRows} from '../../graphs/projective/registration';
import {familyChapters} from '../content/familyChapters';
import {chapterOwnedDemonstration, chapterOwnerRows} from '../content/chapterOwnedLessons';
import {GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonAvailability';
import {getRetainedExampleForLegacyOwner, retainedExampleHomes} from './retainedExamples';

export type GuidedLessonOwner = Readonly<{chapterId: string; sectionId: string}>;

/** Family-registered Demonstrations take their primary owner from the first chapter-owned section naming them (`chapterOwnerRows()`), so they have no row here. */
type DerivedOwnerId = ProjectiveDemonstrationId | BsplineDemonstrationId | CurveGeometryDemonstrationId | InterpolationDemonstrationId | PatchesDemonstrationId | typeof bezierDerivedOwnerIds[number];

/** Family-registered Demonstrations whose primary owner cannot be derived (their chapter owns no lesson rows): the family module keeps it as explicit metadata. */
type FamilyOwnedId = keyof typeof basicsPrimaryOwners | keyof typeof phPrimaryOwners | keyof typeof parameterizationPrimaryOwners | keyof typeof bezierPrimaryOwners | keyof typeof rationalPrimaryOwners | keyof typeof splinePrimaryOwners;
const familyPrimaryOwners: Readonly<Partial<Record<FamilyOwnedId, GuidedLessonOwner>>> = {...basicsPrimaryOwners, ...phPrimaryOwners, ...parameterizationPrimaryOwners, ...bezierPrimaryOwners, ...rationalPrimaryOwners, ...splinePrimaryOwners};

/** Authored chapter destination for each reviewed lesson of a legacy (not family-registered) Demonstration. Keep this map in lockstep with the allowlist. A lessonless Demonstration may pre-register the destination its future lesson will use. */
export const guidedLessonOwners: Readonly<Record<Exclude<GuidedLessonDemonstrationId, DerivedOwnerId | FamilyOwnedId>, GuidedLessonOwner> & Partial<Record<LessonlessDemonstrationId, GuidedLessonOwner>>> = {
    'linear-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'exponential-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'trigonometric-functions': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    // School function graphs batch A: the Function graphs for the matura chapter owns S1 (graph transformations) and S2 (inverse functions), one section each.
    'function-transformation': {chapterId: 'school-function-graphs', sectionId: 'function-transformation'},
    'function-inverse': {chapterId: 'school-function-graphs', sectionId: 'function-inverse'},
    'polynomial-zeros': {chapterId: 'school-function-graphs', sectionId: 'polynomial-zeros'},
    'rational-function': {chapterId: 'school-function-graphs', sectionId: 'rational-function'},
    'geometric-series': {chapterId: 'school-function-graphs', sectionId: 'geometric-series'},
    'conic-focal': {chapterId: 'school-function-graphs', sectionId: 'conic-focal'},
    // Fourier series F1 and F3: its own section of the Fourier series chapter.
    'fourier-series': {chapterId: 'fourier-series', sectionId: 'fourier-series'},
    // Fourier coefficients F2 and F4: its own section of the Fourier series chapter.
    'fourier-coefficients': {chapterId: 'fourier-series', sectionId: 'fourier-coefficients'},
    // Epicycles F5: its own section of the Fourier series chapter.
    epicycles: {chapterId: 'fourier-series', sectionId: 'epicycles'},
    continuity: {chapterId: 'functions-and-calculus', sectionId: 'continuity'},
    derivative: {chapterId: 'functions-and-calculus', sectionId: 'derivatives'},
    'definite-integral': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
    // The probability chapter owns the lessons of spec P1 to P5; it links back to the definite integral.
    'prob-density': {chapterId: 'probability', sectionId: 'density'},
    'prob-binomial-normal': {chapterId: 'probability', sectionId: 'binomial-normal'},
    'prob-clt': {chapterId: 'probability', sectionId: 'clt'},
    'prob-summary': {chapterId: 'probability', sectionId: 'summary'},
    'prob-correlation': {chapterId: 'probability', sectionId: 'correlation'},
    // Randomness batch A: the Galton lesson (RS1) in the randomness chapter; the law-of-large-numbers lesson (RS2) is the second owner, derived from the chapter.
    'prob-simulation': {chapterId: 'randomness', sectionId: 'galton-board'},
    // Level sets batch A: the linear-programming lesson (LS5) in the level-sets chapter.
    'linear-program': {chapterId: 'level-sets', sectionId: 'linear-programming'},
    'area-between-curves': {chapterId: 'functions-and-calculus', sectionId: 'applications'},
    'arc-length': {chapterId: 'functions-and-calculus', sectionId: 'applications'},
    bisection: {chapterId: 'analysis', sectionId: 'existence'},
    'mean-value': {chapterId: 'analysis', sectionId: 'derivative-results'},
    accumulation: {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
    darboux: {chapterId: 'analysis', sectionId: 'integrability'},
    extrema: {chapterId: 'analysis', sectionId: 'derivative-results'},
    convexity: {chapterId: 'analysis', sectionId: 'derivative-results'},
    taylor: {chapterId: 'analysis', sectionId: 'taylor'},
    sequence: {chapterId: 'analysis', sectionId: 'convergence'},
    'uniform-convergence': {chapterId: 'analysis', sectionId: 'convergence'},
    'fixed-point': {chapterId: 'analysis', sectionId: 'convergence'},
    // The Numerical methods chapter owns the root-finding lesson (N1 Newton, N2 when Newton fails, N3 secant), the quadrature lesson (N4) and the Euler lesson (N5) in one section each.
    'root-finding': {chapterId: 'numerical-methods', sectionId: 'root-finding'},
    'quadrature': {chapterId: 'numerical-methods', sectionId: 'quadrature'},
    'euler-method': {chapterId: 'numerical-methods', sectionId: 'euler-method'},
    // The first activity of the linear maps chapter (the determinant activity is the second owner, derived from the chapter).
    'linear-map': {chapterId: 'linear-maps', sectionId: 'matrix-and-image'},
    // The unit circle's first activity (TR1) in the trigonometry chapter; the addition-formula activity (TR2) is the second owner, derived from the chapter.
    'unit-circle': {chapterId: 'trigonometry', sectionId: 'radian-sine-cosine'},
    // The line geometry's first activity (L1) in the analytic lines chapter; the normal-vector activity (L2) is the second owner, derived from the chapter.
    'line-geometry': {chapterId: 'analytic-lines', sectionId: 'forms-of-a-line'},
    // The circle construction's first activity (CG1) in the circle geometry chapter; the radical-axis activity (CG2) is the second owner, derived from the chapter.
    'circle-construction': {chapterId: 'circle-geometry', sectionId: 'tangents-from-a-point'},
    // Combinatorics batch A: the lattice paths (CB1) and the counting tree (CB2) each own one section of the combinatorics chapter.
    'lattice-paths': {chapterId: 'combinatorics', sectionId: 'lattice-paths-and-pascal'},
    'counting-tree': {chapterId: 'combinatorics', sectionId: 'counting-and-choices'},
    // Kinematics batch A: the first activity (KN1) in the kinematics chapter; the speed activity (KN2) is the second owner, derived from the chapter.
    'curve-kinematics': {chapterId: 'kinematics', sectionId: 'position-velocity-acceleration'},
    // Mechanical curves batch A: the race (MC1) in the mechanical-curves chapter; the track lesson (MC2) is the second owner, derived from the chapter.
    'mechanics-descent': {chapterId: 'mechanical-curves', sectionId: 'race-the-tracks'},
    // Waves batch A: superposition and phase (WV1) in the waves chapter; the beats lesson (WV2) is the second owner, derived from the chapter.
    'waves': {chapterId: 'waves', sectionId: 'superposition-and-phase'},
    // Recursion batch A: the sequence lesson (RG1) in the recursion chapter; the interest lesson (RG3) is the second owner, derived from the chapter.
    'recursion-growth': {chapterId: 'recursion', sectionId: 'sequences'},
    // The isometries' first activity (L1) in the isometries chapter; the classification activity (L2) is the second owner, derived from the chapter.
    isometries: {chapterId: 'isometries', sectionId: 'two-mirrors'},
    // Chapter-owned lessons of the Kompleksne preslikave chapter, one section each (complex maps F3+F4).
    'complex-reciprocal': {chapterId: 'complex-maps', sectionId: 'reciprocal-inversion'},
    'complex-roots': {chapterId: 'complex-maps', sectionId: 'roots'},
    // Registered without lessons (triangle geometry F2b); the Triangle geometry chapter and its sections are authored in F4.
    'triangle-centres': {chapterId: 'triangle-geometry', sectionId: 'notable-points'},
    'inscribed-angle': {chapterId: 'triangle-geometry', sectionId: 'inscribed-angle'},
    'euler-line': {chapterId: 'triangle-geometry', sectionId: 'euler-line'},
    'simson-line': {chapterId: 'triangle-geometry', sectionId: 'simson-line'},
    inversion: {chapterId: 'triangle-geometry', sectionId: 'inversion'},
    // The Convexity and hulls chapter owns the first three computational-geometry lessons, one section each.
    orientation: {chapterId: 'convexity-hulls', sectionId: 'orientation'},
    'polygon-area': {chapterId: 'convexity-hulls', sectionId: 'polygon-area'},
    'convex-hull': {chapterId: 'convexity-hulls', sectionId: 'convex-hull'},
    'point-in-polygon': {chapterId: 'convexity-hulls', sectionId: 'point-in-polygon'},
    'hull-robustness': {chapterId: 'convexity-hulls', sectionId: 'hull-robustness'},
    'bezier-hulls': {chapterId: 'convexity-hulls', sectionId: 'bezier-hulls'},
    // The Triangulations and Voronoi chapter owns the ear clipping lesson (batch T1).
    'ear-clipping': {chapterId: 'triangulations-voronoi', sectionId: 'ear-clipping'},
    // The chapter's own section for counting the triangles of a point-set triangulation (lesson B2).
    'point-set-triangulation': {chapterId: 'triangulations-voronoi', sectionId: 'point-set-triangulation'},
    // The chapter's own section for the Delaunay triangulation and Lawson flips (lesson B3).
    'delaunay': {chapterId: 'triangulations-voronoi', sectionId: 'delaunay'},
    // The chapter's own section for the Voronoi diagram and its duality with the Delaunay triangulation (lesson B4).
    'voronoi': {chapterId: 'triangulations-voronoi', sectionId: 'voronoi'},
    // The chapter's own section for degenerate sites: cocircular and collinear points (lesson B5).
    'voronoi-degenerate': {chapterId: 'triangulations-voronoi', sectionId: 'voronoi-degenerate'},
    // The Geometry of curves chapter owns the parametric and polar curves, curvature, curvature comb, evolute and offset and envelope lessons (CG-B1-4, CG-B2-3, CG-B2-4, CG-B3-3, CG-B3-4).
    // The Sweep-line algorithms chapter owns the interval sweep and segment intersection lessons (batch S1).
    'interval-sweep': {chapterId: 'sweep-algorithms', sectionId: 'interval-sweep'},
    'segment-intersections': {chapterId: 'sweep-algorithms', sectionId: 'segment-intersections'},
    // The Sweep-line algorithms chapter owns the monotone partition and monotone triangulation lessons (batch S2).
    'monotone-partition': {chapterId: 'sweep-algorithms', sectionId: 'monotone-partition'},
    'monotone-triangulation': {chapterId: 'sweep-algorithms', sectionId: 'monotone-triangulation'},
    // The Sweep-line algorithms chapter owns the Fortune lesson (batch S3).
    'fortune': {chapterId: 'sweep-algorithms', sectionId: 'fortune'},
};

const additionalOwners: Partial<Record<DemonstrationId, readonly GuidedLessonOwner[]>> = {
    ...basicsAdditionalOwners,
};

const derivedOwnerIds: ReadonlySet<string> = new Set([...projectiveDemonstrationRows, ...bsplineDemonstrationRows, ...curveGeometryDemonstrationRows, ...interpolationDemonstrationRows, ...patchesDemonstrationRows, ...bezierDemonstrationRows.filter(row => bezierDerivedOwnerIds.some(id => id === row.id))].map(row => row.id));

const ownersById: Readonly<Partial<Record<DemonstrationId, GuidedLessonOwner>>> = {...guidedLessonOwners, ...familyPrimaryOwners};

/** The reviewed owner of a Demonstration with a guided lesson; undefined for a Demonstration with `lesson: false`, even when it pre-registers a future destination. */
function primaryOwner(id: DemonstrationId): GuidedLessonOwner | undefined {
    if (!LESSON_DEMONSTRATION_IDS.includes(id)) return undefined;
    if (derivedOwnerIds.has(id)) {
        const row = chapterOwnerRows().find(item => item.demonstrationId === id);
        return row && {chapterId: row.chapterId, sectionId: row.sectionId};
    }
    return ownersById[id];
}

export function getGuidedLessonOwners(id: DemonstrationId): readonly GuidedLessonOwner[] {
    const familyOwners = familyChapters.flatMap(chapter => chapter.sections
        .filter(section => section.demonstrationIds?.includes(id))
        .map(section => ({chapterId: chapter.id, sectionId: section.id})));
    const retainedOwners = retainedExampleHomes.filter(home => home[3] === id)
        .map(home => ({chapterId: home[1], sectionId: home[2]}));
    const ownedOwners = chapterOwnerRows().filter(row => row.demonstrationId === id).map(({chapterId, sectionId}) => ({chapterId, sectionId}));
    const primary = primaryOwner(id);
    const all = [...(primary ? [primary] : []), ...(additionalOwners[id] ?? []), ...familyOwners, ...retainedOwners, ...ownedOwners];
    return all.filter((owner, index) => all.findIndex(item => item.chapterId === owner.chapterId && item.sectionId === owner.sectionId) === index);
}

/** Undefined for a Demonstration without a guided lesson (`lesson: false`). */
export function getGuidedLessonOwner(id: DemonstrationId, requested?: GuidedLessonOwner): GuidedLessonOwner | undefined {
    const primary = primaryOwner(id);
    const candidate = requested ?? primary;
    if (!candidate) return undefined;
    if (!getGuidedLessonOwners(id).some(owner => owner.chapterId === candidate.chapterId && owner.sectionId === candidate.sectionId)) {
        return primary && canonicalOwner(id, primary);
    }
    return canonicalOwner(id, candidate);
}

function canonicalOwner(id: DemonstrationId, owner: GuidedLessonOwner): GuidedLessonOwner {
    const home = getRetainedExampleForLegacyOwner(owner.chapterId, owner.sectionId, id);
    return home ? {chapterId: home[1], sectionId: home[2]} : owner;
}

/** Undefined for a Demonstration without a guided lesson (`lesson: false`). */
export function resolveGuidedLessonOwner(search: string, id: DemonstrationId): GuidedLessonOwner | undefined {
    const query = new URLSearchParams(search);
    const explicit = {chapterId: query.get('learnChapter') ?? '', sectionId: query.get('learnSection') ?? ''};
    if (getGuidedLessonOwners(id).some(owner => owner.chapterId === explicit.chapterId && owner.sectionId === explicit.sectionId)) return canonicalOwner(id, explicit);
    const legacy = query.getAll('explore');
    if (legacy.length === 1) {
        const [chapterId, sectionId, demonstrationId] = legacy[0].split('.');
        if (demonstrationId === id) {
            const owner = getGuidedLessonOwners(id).find(item => item.chapterId === chapterId && item.sectionId === sectionId);
            if (owner) return canonicalOwner(id, owner);
        }
    }
    return primaryOwner(id);
}

export function guidedLessonReturnPath(owner: GuidedLessonOwner): string {
    return `/bezeg-2.0/learn/${owner.chapterId}#${owner.sectionId}`;
}

export function guidedLessonLaunchPath(id: DemonstrationId, requested = getGuidedLessonOwner(id)): string {
    const owner = getGuidedLessonOwner(id, requested);
    if (!owner) throw new Error(`Demonstration "${id}" has no guided lesson to launch.`);
    const demo = getDemonstrationCatalog().demonstrations.find(entry => entry.id === id)!;
    return `${demo.path}?learn=1&learnChapter=${encodeURIComponent(owner.chapterId)}&learnSection=${encodeURIComponent(owner.sectionId)}`;
}

export function authoredGuidedLessonIds(chapterId: string, sectionId: string): DemonstrationId[] {
    const retained = GUIDED_LESSON_AVAILABLE_IDS.filter(id => retainedExampleHomes.some(home => home[1] === chapterId && home[2] === sectionId && home[3] === id));
    const owned = chapterOwnedDemonstration(chapterId, sectionId);
    return owned ? [...retained, owned] : retained;
}

export function getGuidedLessonOwnerForSection(id: DemonstrationId, chapterId: string, sectionId: string): GuidedLessonOwner | undefined {
    if (chapterOwnedDemonstration(chapterId, sectionId) === id) return {chapterId, sectionId};
    return retainedExampleHomes.some(home => home[1] === chapterId && home[2] === sectionId && home[3] === id)
        ? {chapterId, sectionId}
        : undefined;
}
