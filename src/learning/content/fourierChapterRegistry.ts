import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {FOURIER_CHAPTER_ID} from './fourierChapterId';

export {FOURIER_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (fourierSeriesGuidedLessons.ts) the section owns. The opening section owns none. One Demonstration has one lesson, so the fourier-series section owns F1 and F3 together, the fourier-coefficients section owns F2 and F4 (fourierCoefficientsGuidedLessons.ts) and the epicycles section owns F5 (epicyclesGuidedLessons.ts). */
const sectionDemonstrations = {
    'fourier-series': 'fourier-series',
    'fourier-coefficients': 'fourier-coefficients',
    epicycles: 'epicycles',
} as const satisfies Record<string, DemonstrationId>;

export type FourierSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec F1 to F5). The lesson text stays in the per-lesson files named above; a section's lesson is adapted only when requested. */
export const fourierGuidedExampleLessons = catalogSectionLessons<FourierSectionId>('the Fourier series chapter', sectionDemonstrations);

export function fourierGuidedExampleDemonstration(sectionId: FourierSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function fourierGuidedExamplePath(sectionId: FourierSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${FOURIER_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
