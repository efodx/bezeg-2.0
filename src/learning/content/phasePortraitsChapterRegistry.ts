import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {bifurcationLesson, linearizationLesson, linearSystemLesson, logisticMapLesson, pendulumLesson} from './phasePortraitsGuidedLessons';

export const PHASE_PORTRAITS_CHAPTER_ID = 'phase-portraits';

/** Section id to the Demonstration of its activity (spec PP1 to PP5, in teaching order: three sections on the phase-portrait Demonstration, then two on the logistic-map Demonstration). Section ids are those of phasePortraitsChapter.ts. */
export const phasePortraitsGuidedExampleDemonstrations = {
    'linear-system': 'phase-portrait',
    'pendulum': 'phase-portrait',
    'linearization': 'phase-portrait',
    'logistic-map': 'logistic-map',
    'bifurcation': 'logistic-map',
} as const satisfies Record<string, DemonstrationId>;

export type PhasePortraitsSectionId = keyof typeof phasePortraitsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'linear-system': {id: 'phase-portraits-linear-system', content: () => linearSystemLesson},
    'pendulum': {id: 'phase-portraits-pendulum', content: () => pendulumLesson},
    'linearization': {id: 'phase-portraits-linearization', content: () => linearizationLesson},
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
