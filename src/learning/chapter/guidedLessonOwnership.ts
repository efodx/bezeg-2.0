import type {DemonstrationId} from '../../demonstrations';
import {getDemonstrationCatalog} from '../../demonstrations';
import {bezierChapter} from '../content/bezierChapter';
import {familyChapters} from '../content/familyChapters';
import {patchChapter} from '../content/patchChapter';
import {patchGuidedExampleRegistry} from '../content/patchGuidedExampleRegistry';
import {GUIDED_LESSON_AVAILABLE_IDS} from '../runtime/lessonAvailability';
import {getRetainedExampleForLegacyOwner, retainedExampleHomes} from './retainedExamples';

export type GuidedLessonOwner = Readonly<{chapterId: string; sectionId: string}>;

/** Authored chapter destination for each reviewed lesson. Keep this map in lockstep with the allowlist. */
export const guidedLessonOwners: Readonly<Record<DemonstrationId, GuidedLessonOwner>> = {
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
    'spline-cn': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-c1': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-c2': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-g1': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
    'spline-g1-symmetric': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
    'spline-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
    'linear-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'exponential-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'trigonometric-functions': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    continuity: {chapterId: 'functions-and-calculus', sectionId: 'continuity'},
    derivative: {chapterId: 'functions-and-calculus', sectionId: 'derivatives'},
    'definite-integral': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
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
    // Each patch demonstration opens its canonical chapter-owned example by default.
    'patch-tensor': {chapterId: 'bezier-patches', sectionId: 'curve-to-patch'},
    'patch-decasteljau': {chapterId: 'bezier-patches', sectionId: 'tensor-decasteljau'},
    'patch-derivatives': {chapterId: 'bezier-patches', sectionId: 'tensor-derivatives'},
    'patch-subdivision': {chapterId: 'bezier-patches', sectionId: 'tensor-subdivision'},
    'patch-joins': {chapterId: 'bezier-patches', sectionId: 'tensor-joins'},
    'patch-triangular': {chapterId: 'bezier-patches', sectionId: 'triangular-patches'},
};

const additionalOwners: Partial<Record<DemonstrationId, readonly GuidedLessonOwner[]>> = {
    bernstein: [{chapterId: 'bezier-curves', sectionId: 'bernstein-form'}],
};

export function getGuidedLessonOwners(id: DemonstrationId): readonly GuidedLessonOwner[] {
    const familyOwners = familyChapters.flatMap(chapter => chapter.sections
        .filter(section => section.demonstrationIds?.includes(id))
        .map(section => ({chapterId: chapter.id, sectionId: section.id})));
    const retainedOwners = retainedExampleHomes.filter(home => home[3] === id)
        .map(home => ({chapterId: home[1], sectionId: home[2]}));
    const patchOwners = Object.entries(patchGuidedExampleRegistry).filter(([, lesson]) => lesson.demonstrationId === id)
        .map(([sectionId]) => ({chapterId: 'bezier-patches', sectionId}));
    const all = [guidedLessonOwners[id], ...(additionalOwners[id] ?? []), ...familyOwners, ...retainedOwners, ...patchOwners];
    return all.filter((owner, index) => all.findIndex(item => item.chapterId === owner.chapterId && item.sectionId === owner.sectionId) === index);
}

export function getGuidedLessonOwner(id: DemonstrationId, requested?: GuidedLessonOwner): GuidedLessonOwner {
    const candidate = requested ?? guidedLessonOwners[id];
    if (!getGuidedLessonOwners(id).some(owner => owner.chapterId === candidate.chapterId && owner.sectionId === candidate.sectionId)) {
        return canonicalOwner(id, guidedLessonOwners[id]);
    }
    return canonicalOwner(id, candidate);
}

function canonicalOwner(id: DemonstrationId, owner: GuidedLessonOwner): GuidedLessonOwner {
    const home = getRetainedExampleForLegacyOwner(owner.chapterId, owner.sectionId, id);
    return home ? {chapterId: home[1], sectionId: home[2]} : owner;
}

export function resolveGuidedLessonOwner(search: string, id: DemonstrationId): GuidedLessonOwner {
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
    return guidedLessonOwners[id];
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

export function guidedLessonLaunchPath(id: DemonstrationId, owner = getGuidedLessonOwner(id)): string {
    owner = getGuidedLessonOwner(id, owner);
    const demo = getDemonstrationCatalog().demonstrations.find(entry => entry.id === id)!;
    return `${demo.path}?learn=1&learnChapter=${encodeURIComponent(owner.chapterId)}&learnSection=${encodeURIComponent(owner.sectionId)}`;
}

export function authoredGuidedLessonIds(chapterId: string, sectionId: string): DemonstrationId[] {
    const retained = GUIDED_LESSON_AVAILABLE_IDS.filter(id => retainedExampleHomes.some(home => home[1] === chapterId && home[2] === sectionId && home[3] === id));
    return chapterId === 'bezier-patches' && Object.prototype.hasOwnProperty.call(patchGuidedExampleRegistry, sectionId)
        ? [...retained, patchGuidedExampleRegistry[sectionId as keyof typeof patchGuidedExampleRegistry].demonstrationId] : retained;
}

export function getGuidedLessonOwnerForSection(id: DemonstrationId, chapterId: string, sectionId: string): GuidedLessonOwner | undefined {
    if (chapterId === 'bezier-patches' && Object.prototype.hasOwnProperty.call(patchGuidedExampleRegistry, sectionId)
        && patchGuidedExampleRegistry[sectionId as keyof typeof patchGuidedExampleRegistry].demonstrationId === id) return {chapterId, sectionId};
    return retainedExampleHomes.some(home => home[1] === chapterId && home[2] === sectionId && home[3] === id)
        ? {chapterId, sectionId}
        : undefined;
}
