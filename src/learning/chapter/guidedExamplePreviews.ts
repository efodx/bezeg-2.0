import type {Language} from '../../localization';
import type {DemonstrationId} from '../../demonstrations';
import type {ChapterExplorationPreview} from '../ChapterExploration';
import {
    guidedActivityPreviewCopyById,
    guidedLessonPreviewCopyByDemonstration,
    workedParabolaJoinPreviewCopy,
    type GuidedExamplePreviewCopy,
} from '../content/guidedExamplePreviewCopy';
import {getRetainedExampleHome, retainedExampleHomes} from './retainedExamples';

const imageUrls = import.meta.glob<string>('/src/images/learning/examples/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
});

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
    if (id === 'splines.worked-join.spline-c1.parabola-derivatives') return workedParabolaJoinPreviewCopy;
    if (id === 'foundations.worked-weight.bernstein.degree-comparison') return workedWeightPreviewCopy;
    const home = getRetainedExampleHome(id);
    if (!home) return undefined;
    const sourceId = home[4];
    if (home[5] === 'activity') {
        return guidedActivityPreviewCopyById[sourceId as keyof typeof guidedActivityPreviewCopyById];
    }
    return guidedLessonPreviewCopyByDemonstration[demonstrationId];
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
    const src = imageUrls[`/src/images/learning/examples/${id}.png`];
    if (!copy || !src) return undefined;
    return {src, alt: copy.alt[language], caption: copy.caption[language]};
}

/** Stable keys that must have copy and captured media before the published inventory is complete. */
export const GUIDED_EXAMPLE_PREVIEW_IDS: readonly string[] = retainedExampleHomes.map(home => home[0]);
