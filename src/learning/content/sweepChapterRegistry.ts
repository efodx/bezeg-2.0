import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {SWEEP_CHAPTER_ID} from './sweepChapterId';

export {SWEEP_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (compgeoGuidedLessons.ts) the section owns. The opening section owns none. */
const sectionDemonstrations = {
    'interval-sweep': 'interval-sweep',
    'segment-intersections': 'segment-intersections',
    'monotone-partition': 'monotone-partition',
    'monotone-triangulation': 'monotone-triangulation',
    'fortune': 'fortune',
} as const satisfies Record<string, DemonstrationId>;

export type SweepSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activities (spec C1 to C5). The lesson text stays in compgeoGuidedLessons.ts; a section's lesson is adapted only when requested. */
export const sweepGuidedExampleLessons = catalogSectionLessons<SweepSectionId>('the sweep chapter', sectionDemonstrations);

export function sweepGuidedExampleDemonstration(sectionId: SweepSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function sweepGuidedExamplePath(sectionId: SweepSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${SWEEP_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
