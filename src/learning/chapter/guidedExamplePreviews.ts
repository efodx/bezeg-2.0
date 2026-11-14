import type {Language} from '../../localization';
import type {DemonstrationId} from '../../demonstrations';
import type {ChapterExplorationPreview} from '../ChapterExploration';
import {
    guidedActivityPreviewCopyById,
    guidedLessonPreviewCopyByDemonstration,
    workedParabolaJoinPreviewCopy,
    type GuidedExamplePreviewCopy,
} from '../content/guidedExamplePreviewCopy';
import {guidedExampleHighlightCopy} from '../content/guidedExampleHighlightCopy';
import {getRetainedExampleHome, retainedExampleHomes} from './retainedExamples';
import {patchGuidedPreviewCopy} from '../content/patchGuidedPreviewCopy';
import {linearMapsPreviewCopy} from '../content/linearMapsPreviewCopy';
import {complexMapsPreviewCopy} from '../content/complexMapsPreviewCopy';
import {numericalPreviewCopy} from '../content/numericalPreviewCopy';
import {schoolFunctionGraphsPreviewCopy} from '../content/schoolFunctionGraphsPreviewCopy';
import {fourierPreviewCopy} from '../content/fourierPreviewCopy';
import {projectiveConicsPreviewCopy} from '../content/projectiveConicsPreviewCopy';
import {curveGeometryPreviewCopy} from '../content/curveGeometryPreviewCopy';
import {advancedBezierPreviewCopy} from '../content/advancedBezierPreviewCopy';
import {convexityPreviewCopy} from '../content/convexityPreviewCopy';
import {triangulationPreviewCopy} from '../content/triangulationPreviewCopy';
import {sweepPreviewCopy} from '../content/sweepPreviewCopy';
import {trianglePreviewCopy} from '../content/trianglePreviewCopy';
import {interpolationPreviewCopy} from '../content/interpolationPreviewCopy';
import {probabilityPreviewCopy} from '../content/probabilityPreviewCopy';
import {bsplinePreviewCopy} from '../content/bsplinePreviewCopy';
import {phasePortraitsPreviewCopy} from '../content/phasePortraitsPreviewCopy';
import {analyticLinesPreviewCopy} from '../content/analyticLinesPreviewCopy';
import {circleGeometryPreviewCopy} from '../content/circleGeometryPreviewCopy';
import {combinatoricsPreviewCopy} from '../content/combinatoricsPreviewCopy';
import {kinematicsPreviewCopy} from '../content/kinematicsPreviewCopy';
import {wavesPreviewCopy} from '../content/wavesPreviewCopy';
import {mechanicalCurvesPreviewCopy} from '../content/mechanicalCurvesPreviewCopy';
import {isometriesPreviewCopy} from '../content/isometriesPreviewCopy';
import {trigonometryPreviewCopy} from '../content/trigonometryPreviewCopy';
import {mathAltText} from './mathAltText';

const imageUrls = import.meta.glob<string>('/src/images/learning/examples/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
});

const patchImageUrls = import.meta.glob<string>('/src/images/learning/examples/patches/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
});

/** Captured images in one subdirectory per chapter-owned chapter (the chapter id, named in `chapterFamilies` of the capture script, one PNG per example id plus its manifest, written by the capture script); the patches subdirectory has its own lookup below. */
const chapterImageUrls = import.meta.glob<string>('/src/images/learning/examples/*/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
});

/**
 * Chapter-owned example cards (chapters other than patches): per-example copy keyed by example id, with
 * images in `src/images/learning/examples/<chapterId>/`. A later chapter adds one entry and one glob above.
 */
export const CHAPTER_GUIDED_EXAMPLE_PREVIEWS: Readonly<Record<string, Readonly<Record<string, GuidedExamplePreviewCopy>>>> = {
    'linear-maps': linearMapsPreviewCopy,
    'complex-maps': complexMapsPreviewCopy,
    'numerical-methods': numericalPreviewCopy,
    'school-function-graphs': schoolFunctionGraphsPreviewCopy,
    'fourier-series': fourierPreviewCopy,
    'projective-conics': projectiveConicsPreviewCopy,
    'curve-geometry': curveGeometryPreviewCopy,
    'advanced-bezier': advancedBezierPreviewCopy,
    'convexity-hulls': convexityPreviewCopy,
    'triangulations-voronoi': triangulationPreviewCopy,
    'sweep-algorithms': sweepPreviewCopy,
    'triangle-geometry': trianglePreviewCopy,
    interpolation: interpolationPreviewCopy,
    probability: probabilityPreviewCopy,
    'b-splines': bsplinePreviewCopy,
    'phase-portraits': phasePortraitsPreviewCopy,
    'analytic-lines': analyticLinesPreviewCopy,
    'circle-geometry': circleGeometryPreviewCopy,
    combinatorics: combinatoricsPreviewCopy,
    kinematics: kinematicsPreviewCopy,
    waves: wavesPreviewCopy,
    'mechanical-curves': mechanicalCurvesPreviewCopy,
    isometries: isometriesPreviewCopy,
    trigonometry: trigonometryPreviewCopy,
};

function chapterOwnedPreview(id: string): {copy: GuidedExamplePreviewCopy; src: string | undefined} | undefined {
    for (const [chapterId, copyById] of Object.entries(CHAPTER_GUIDED_EXAMPLE_PREVIEWS)) {
        if (!Object.hasOwn(copyById, id)) continue;
        return {copy: copyById[id], src: chapterImageUrls[`/src/images/learning/examples/${chapterId}/${id}.png`]};
    }
    return undefined;
}

/** The complete chapter fixture map, independent of retained root-level preview inventory. */
export const PATCH_GUIDED_EXAMPLE_PREVIEW_FIXTURES = [
    {id: 'bezier-patches.curve-to-patch.patch-tensor', sectionId: 'curve-to-patch', demonstrationId: 'patch-tensor'},
    {id: 'bezier-patches.bilinear-patch.patch-tensor', sectionId: 'bilinear-patch', demonstrationId: 'patch-tensor'},
    {id: 'bezier-patches.control-net.patch-tensor', sectionId: 'control-net', demonstrationId: 'patch-tensor'},
    {id: 'bezier-patches.boundary-iso-curves.patch-tensor', sectionId: 'boundary-iso-curves', demonstrationId: 'patch-tensor'},
    {id: 'bezier-patches.tensor-decasteljau.patch-decasteljau', sectionId: 'tensor-decasteljau', demonstrationId: 'patch-decasteljau'},
    {id: 'bezier-patches.properties.patch-tensor', sectionId: 'properties', demonstrationId: 'patch-tensor'},
    {id: 'bezier-patches.tensor-derivatives.patch-derivatives', sectionId: 'tensor-derivatives', demonstrationId: 'patch-derivatives'},
    {id: 'bezier-patches.tensor-subdivision.patch-subdivision', sectionId: 'tensor-subdivision', demonstrationId: 'patch-subdivision'},
    {id: 'bezier-patches.tensor-joins.patch-joins', sectionId: 'tensor-joins', demonstrationId: 'patch-joins'},
    {id: 'bezier-patches.triangular-patches.patch-triangular', sectionId: 'triangular-patches', demonstrationId: 'patch-triangular'},
    {id: 'bezier-patches.square-vs-triangular.patch-triangular', sectionId: 'square-vs-triangular', demonstrationId: 'patch-triangular'},
] as const;

/** Stable chapter ids required to have bilingual copy and captured subdirectory media. */
export const PATCH_GUIDED_EXAMPLE_PREVIEW_IDS: readonly string[] = PATCH_GUIDED_EXAMPLE_PREVIEW_FIXTURES.map(({id}) => id);

export function getPatchGuidedExamplePreviewSource(id: string): string | undefined {
    if (!PATCH_GUIDED_EXAMPLE_PREVIEW_IDS.includes(id)) return undefined;
    return patchImageUrls[`/src/images/learning/examples/patches/${id}.png`];
}

const workedWeightPreviewCopy: GuidedExamplePreviewCopy = {
    alt: {
        sl: 'Grafi treh kvadratnih Bernsteinovih baznih funkcij pri stopnji dve.',
        en: 'Graphs of the three quadratic Bernstein basis functions at degree two.',
    },
    caption: {
        sl: 'Srednja utež doseže vrh na sredini intervala, krajni pa dosežeta ena na nasprotnih koncih; naloženi prikaz je izklopljen.',
        en: 'The middle weight peaks at the interval midpoint, while the endpoint weights reach one at opposite ends; the stacked view is off.',
    },
};

function copyFor(id: string, demonstrationId: DemonstrationId): GuidedExamplePreviewCopy | undefined {
    if (Object.hasOwn(guidedExampleHighlightCopy, id)) return guidedExampleHighlightCopy[id];
    const chapterOwned = chapterOwnedPreview(id);
    if (chapterOwned) return chapterOwned.copy;
    const patchFixture = PATCH_GUIDED_EXAMPLE_PREVIEW_FIXTURES.find(fixture => fixture.id === id);
    if (patchFixture) return patchFixture.demonstrationId === demonstrationId
        ? patchGuidedPreviewCopy[patchFixture.sectionId]
        : undefined;
    if (id === 'splines.worked-join.spline-c1.parabola-derivatives') return workedParabolaJoinPreviewCopy;
    if (id === 'foundations.worked-weight.bernstein.degree-comparison') return workedWeightPreviewCopy;
    const home = getRetainedExampleHome(id);
    if (!home) return undefined;
    const sourceId = home[4];
    if (home[5] === 'activity') {
        return guidedActivityPreviewCopyById[sourceId as keyof typeof guidedActivityPreviewCopyById];
    }
    const copyByDemonstration: Readonly<Partial<Record<DemonstrationId, GuidedExamplePreviewCopy>>> = guidedLessonPreviewCopyByDemonstration;
    return copyByDemonstration[demonstrationId];
}

export function getGuidedExamplePreviewCopy(id: string, demonstrationId: DemonstrationId): GuidedExamplePreviewCopy | undefined {
    return copyFor(id, demonstrationId);
}

export function resolveGuidedExamplePreview(
    id: string,
    demonstrationId: DemonstrationId,
    language: Language,
): ChapterExplorationPreview | undefined {
    const copy = copyFor(id, demonstrationId);
    const src = getPatchGuidedExamplePreviewSource(id) ?? chapterOwnedPreview(id)?.src ?? imageUrls[`/src/images/learning/examples/${id}.png`];
    if (!copy || !src) return undefined;
    return {src, alt: mathAltText(copy.alt[language]), caption: copy.caption[language]};
}

/** Stable keys that must have copy and captured media before the published inventory is complete. */
export const GUIDED_EXAMPLE_PREVIEW_IDS: readonly string[] = retainedExampleHomes.map(home => home[0]);
