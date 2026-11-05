import type {DemonstrationId, GuidedLessonDemonstrationId, LessonlessDemonstrationId} from '../../demonstrations';
import {getDemonstrationCatalog, LESSON_DEMONSTRATION_IDS} from '../../demonstrations';
import {bezierChapter} from '../content/bezierChapter';
import {familyChapters} from '../content/familyChapters';
import {patchChapter} from '../content/patchChapter';
import {chapterOwnedLessons, getChapterOwnedLessons} from '../content/chapterOwnedLessons';
import {GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonAvailability';
import {getRetainedExampleForLegacyOwner, retainedExampleHomes} from './retainedExamples';

export type GuidedLessonOwner = Readonly<{chapterId: string; sectionId: string}>;

/** Authored chapter destination for each reviewed lesson. Keep this map in lockstep with the allowlist. A lessonless Demonstration may pre-register the destination its future lesson will use. */
export const guidedLessonOwners: Readonly<Record<GuidedLessonDemonstrationId, GuidedLessonOwner> & Partial<Record<LessonlessDemonstrationId, GuidedLessonOwner>>> = {
    bezier: {chapterId: 'bezier-curves', sectionId: 'control-points'},
    decasteljau: {chapterId: 'bezier-curves', sectionId: 'interpolation'},
    affine: {chapterId: 'bezier-curves', sectionId: 'affine-transformations'},
    elevation: {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    rational: {chapterId: 'rational-curves', sectionId: 'why-rational'},
    'rational-decasteljau': {chapterId: 'rational-curves', sectionId: 'operations'},
    'ph-cubic': {chapterId: 'ph-curves', sectionId: 'arc-length-problem'},
    'ph-quintic': {chapterId: 'ph-curves', sectionId: 'offsets'},
    bernstein: {chapterId: 'foundations', sectionId: 'why-weights'},
    'rational-elevation': {chapterId: 'rational-curves', sectionId: 'operations'},
    'weighted-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
    'uniform-parameterization': {chapterId: 'parametrization', sectionId: 'uniform-timing'},
    subdivision: {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    'repeated-subdivision': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    'rational-subdivision': {chapterId: 'rational-curves', sectionId: 'operations'},
    extrapolation: {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    'rational-extrapolation': {chapterId: 'rational-curves', sectionId: 'investigate-rational'},
    'decasteljau-alternative': {chapterId: 'bezier-curves', sectionId: 'interpolation'},
    farin: {chapterId: 'rational-curves', sectionId: 'operations'},
    circle: {chapterId: 'rational-curves', sectionId: 'worked-conic'},
    // Projective conics K1 (cross-ratio), K2 (Pascal) and K3 (pole and polar): one section each of the Projective geometry of conics chapter (F4).
    'projective-cross-ratio': {chapterId: 'projective-conics', sectionId: 'projective-cross-ratio'},
    'projective-pascal': {chapterId: 'projective-conics', sectionId: 'projective-pascal'},
    'projective-pole-polar': {chapterId: 'projective-conics', sectionId: 'projective-pole-polar'},
    // K4 (five-point conic) and K5 (three views): sections of the same chapter (07g).
    'projective-five-point': {chapterId: 'projective-conics', sectionId: 'projective-five-point'},
    'projective-three-views': {chapterId: 'projective-conics', sectionId: 'projective-three-views'},
    'spline-cn': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-c1': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-c2': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-g1': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
    'spline-g1-symmetric': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
    'spline-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
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
    continuity: {chapterId: 'functions-and-calculus', sectionId: 'continuity'},
    derivative: {chapterId: 'functions-and-calculus', sectionId: 'derivatives'},
    'definite-integral': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
    // The probability chapter owns the lessons of spec P1 to P5; it links back to the definite integral.
    'prob-density': {chapterId: 'probability', sectionId: 'density'},
    'prob-binomial-normal': {chapterId: 'probability', sectionId: 'binomial-normal'},
    'prob-clt': {chapterId: 'probability', sectionId: 'clt'},
    'prob-summary': {chapterId: 'probability', sectionId: 'summary'},
    'prob-correlation': {chapterId: 'probability', sectionId: 'correlation'},
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
    'complex-multiplication': {chapterId: 'foundations', sectionId: 'complex-plane'},
    'fixed-point': {chapterId: 'analysis', sectionId: 'convergence'},
    // The Numerical methods chapter owns the root-finding lesson (N1 Newton, N2 when Newton fails, N3 secant), the quadrature lesson (N4) and the Euler lesson (N5) in one section each.
    'root-finding': {chapterId: 'numerical-methods', sectionId: 'root-finding'},
    'quadrature': {chapterId: 'numerical-methods', sectionId: 'quadrature'},
    'euler-method': {chapterId: 'numerical-methods', sectionId: 'euler-method'},
    // The first activity of the linear maps chapter (the determinant activity is the second owner, derived from the chapter).
    'linear-map': {chapterId: 'linear-maps', sectionId: 'matrix-and-image'},
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
    // The Geometry of curves chapter owns the parametric and polar curves and the curvature lessons (CG-B1-4).
    'curve-parametric': {chapterId: 'curve-geometry', sectionId: 'curve-parametric'},
    'curve-curvature': {chapterId: 'curve-geometry', sectionId: 'curve-curvature'},
    // The Sweep-line algorithms chapter owns the interval sweep and segment intersection lessons (batch S1).
    'interval-sweep': {chapterId: 'sweep-algorithms', sectionId: 'interval-sweep'},
    'interp-lagrange': {chapterId: 'interpolation', sectionId: 'lagrange'},
    'interp-hermite': {chapterId: 'interpolation', sectionId: 'hermite'},
    'interp-runge': {chapterId: 'interpolation', sectionId: 'runge'},
    'interp-least-squares': {chapterId: 'interpolation', sectionId: 'least-squares'},
    'segment-intersections': {chapterId: 'sweep-algorithms', sectionId: 'segment-intersections'},
    // The Sweep-line algorithms chapter owns the monotone partition and monotone triangulation lessons (batch S2).
    'monotone-partition': {chapterId: 'sweep-algorithms', sectionId: 'monotone-partition'},
    'monotone-triangulation': {chapterId: 'sweep-algorithms', sectionId: 'monotone-triangulation'},
    // The Sweep-line algorithms chapter owns the Fortune lesson (batch S3).
    'fortune': {chapterId: 'sweep-algorithms', sectionId: 'fortune'},
    'interp-subdivision': {chapterId: 'interpolation', sectionId: 'subdivision'},
    // Each patch demonstration opens its canonical chapter-owned example by default.
    'patch-tensor': {chapterId: 'bezier-patches', sectionId: 'curve-to-patch'},
    'patch-decasteljau': {chapterId: 'bezier-patches', sectionId: 'tensor-decasteljau'},
    'patch-derivatives': {chapterId: 'bezier-patches', sectionId: 'tensor-derivatives'},
    'patch-subdivision': {chapterId: 'bezier-patches', sectionId: 'tensor-subdivision'},
    'patch-joins': {chapterId: 'bezier-patches', sectionId: 'tensor-joins'},
    'patch-triangular': {chapterId: 'bezier-patches', sectionId: 'triangular-patches'},
    // Interim owner until the advanced-Bezier F4 slice links the Coons lesson into the Bezier patches chapter (patch-coons stays in
    // CHAPTER_LINK_PENDING). bezier-patches is chapter-owned, so ?learn=1 resolves only lessons in its registry: owning patch-coons
    // there before the link would open no lesson. The lesson builds on the Bezier curves' boundary control points.
    'patch-coons': {chapterId: 'bezier-curves', sectionId: 'geometric-properties'},
    'bspline-basis': {chapterId: 'b-splines', sectionId: 'bspline-basis'},
    'bspline-deboor': {chapterId: 'b-splines', sectionId: 'bspline-deboor'},
    'bspline-insertion': {chapterId: 'b-splines', sectionId: 'bspline-insertion'},
    'bspline-extraction': {chapterId: 'b-splines', sectionId: 'bspline-extraction'},
    'bspline-nurbs': {chapterId: 'b-splines', sectionId: 'bspline-nurbs'},
    'bspline-blossom': {chapterId: 'b-splines', sectionId: 'bspline-blossom'},
};

const additionalOwners: Partial<Record<DemonstrationId, readonly GuidedLessonOwner[]>> = {
    bernstein: [{chapterId: 'bezier-curves', sectionId: 'bernstein-form'}],
};

const ownersById: Readonly<Partial<Record<DemonstrationId, GuidedLessonOwner>>> = guidedLessonOwners;

/** The reviewed owner of a Demonstration with a guided lesson; undefined for a Demonstration with `lesson: false`, even when it pre-registers a future destination. */
function primaryOwner(id: DemonstrationId): GuidedLessonOwner | undefined {
    return LESSON_DEMONSTRATION_IDS.includes(id) ? ownersById[id] : undefined;
}

export function getGuidedLessonOwners(id: DemonstrationId): readonly GuidedLessonOwner[] {
    const familyOwners = familyChapters.flatMap(chapter => chapter.sections
        .filter(section => section.demonstrationIds?.includes(id))
        .map(section => ({chapterId: chapter.id, sectionId: section.id})));
    const retainedOwners = retainedExampleHomes.filter(home => home[3] === id)
        .map(home => ({chapterId: home[1], sectionId: home[2]}));
    const ownedOwners = Object.entries(chapterOwnedLessons).flatMap(([chapterId, owned]) => owned.entries()
        .filter(([, lesson]) => lesson.demonstrationId === id).map(([sectionId]) => ({chapterId, sectionId})));
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

export function getGuidedLessonChapterTitle(owner: GuidedLessonOwner, language: 'sl' | 'en'): string {
    if (owner.chapterId === 'bezier-curves') return bezierChapter[language].title;
    if (owner.chapterId === 'bezier-patches') return patchChapter.title[language];
    return familyChapters.find(chapter => chapter.id === owner.chapterId)!.title[language];
}

export function getGuidedLessonSectionTitle(owner: GuidedLessonOwner, language: 'sl' | 'en'): string {
    if (owner.chapterId === 'bezier-curves') return bezierChapter[language].sections.find(section => section.id === owner.sectionId)!.title;
    if (owner.chapterId === 'bezier-patches') return patchChapter.sections.find(section => section.id === owner.sectionId)!.title[language];
    return familyChapters.find(chapter => chapter.id === owner.chapterId)!.sections.find(section => section.id === owner.sectionId)!.title[language];
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
    const owned = getChapterOwnedLessons(chapterId)?.lesson(sectionId);
    return owned ? [...retained, owned.demonstrationId] : retained;
}

export function getGuidedLessonOwnerForSection(id: DemonstrationId, chapterId: string, sectionId: string): GuidedLessonOwner | undefined {
    if (getChapterOwnedLessons(chapterId)?.lesson(sectionId)?.demonstrationId === id) return {chapterId, sectionId};
    return retainedExampleHomes.some(home => home[1] === chapterId && home[2] === sectionId && home[3] === id)
        ? {chapterId, sectionId}
        : undefined;
}
