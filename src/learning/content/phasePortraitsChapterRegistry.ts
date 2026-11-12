import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {bifurcationLesson, logisticMapLesson} from './phasePortraitsGuidedLessons';

export const PHASE_PORTRAITS_CHAPTER_ID = 'phase-portraits';

/** Section id to the Demonstration of its activity (spec PP4, PP5: two sections on one Demonstration, in teaching order). Section ids are those of phasePortraitsChapter.ts; the phase-plane sections (PP1 to PP3) join with the phase-portrait graph. */
export const phasePortraitsGuidedExampleDemonstrations = {
    'logistic-map': 'logistic-map',
    'bifurcation': 'logistic-map',
} as const satisfies Record<string, DemonstrationId>;

export type PhasePortraitsSectionId = keyof typeof phasePortraitsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'logistic-map': {id: 'phase-portraits-logistic-map', content: () => logisticMapLesson},
    'bifurcation': {id: 'phase-portraits-bifurcation', content: () => bifurcationLesson},
} as const;

const adapted = new Map<PhasePortraitsSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function phasePortraitsGuidedExampleLesson(sectionId: PhasePortraitsSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function phasePortraitsGuidedExamplePath(sectionId: PhasePortraitsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === phasePortraitsGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${PHASE_PORTRAITS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
