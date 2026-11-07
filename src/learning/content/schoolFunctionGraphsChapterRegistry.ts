import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import {catalogSectionLessons} from './catalogSectionLessons';

import {SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID} from './schoolFunctionGraphsChapterId';

export {SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID};

/** Section id to the Demonstration whose reviewed lesson (schoolFunctionGraphsGuidedLessons.ts) the section owns. Each section owns one lesson. */
const sectionDemonstrations = {
    'function-transformation': 'function-transformation',
    'function-inverse': 'function-inverse',
    'polynomial-zeros': 'polynomial-zeros',
    'rational-function': 'rational-function',
    'geometric-series': 'geometric-series',
    'conic-focal': 'conic-focal',
} as const satisfies Record<string, DemonstrationId>;

export type SchoolFunctionGraphsSectionId = keyof typeof sectionDemonstrations;

/** Section-owned activity (spec S1 and S2). The lesson text stays in schoolFunctionGraphsGuidedLessons.ts; a section's lesson is adapted only when requested. */
export const schoolFunctionGraphsGuidedExampleLessons = catalogSectionLessons<SchoolFunctionGraphsSectionId>('the school function graphs chapter', sectionDemonstrations);

export function schoolFunctionGraphsGuidedExampleDemonstration(sectionId: SchoolFunctionGraphsSectionId): DemonstrationId {
    return sectionDemonstrations[sectionId];
}

export function schoolFunctionGraphsGuidedExamplePath(sectionId: SchoolFunctionGraphsSectionId): string {
    const id = sectionDemonstrations[sectionId];
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === id)!;
    return `${demo.path}?example=lesson.${SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
