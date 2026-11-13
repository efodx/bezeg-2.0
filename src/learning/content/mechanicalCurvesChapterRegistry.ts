import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {mechanicalCurvesRaceLesson, mechanicalCurvesTrackLesson, mechanicalTautochroneLesson} from './mechanicalCurvesGuidedLessons';

export const MECHANICAL_CURVES_CHAPTER_ID = 'mechanical-curves';

/** Section id to the Demonstration of its activity (spec MC1 to MC3: three sections on one Demonstration, in teaching order). Section ids are those of mechanicalCurvesChapter.ts. */
export const mechanicalCurvesGuidedExampleDemonstrations = {
    'race-the-tracks': 'mechanics-descent',
    'drag-the-track': 'mechanics-descent',
    'tautochrone': 'mechanics-descent',
} as const satisfies Record<string, DemonstrationId>;

export type MechanicalCurvesSectionId = keyof typeof mechanicalCurvesGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'race-the-tracks': {id: 'mechanics-descent-race', content: () => mechanicalCurvesRaceLesson},
    'drag-the-track': {id: 'mechanics-descent-track', content: () => mechanicalCurvesTrackLesson},
    'tautochrone': {id: 'mechanics-descent-tautochrone', content: () => mechanicalTautochroneLesson},
} as const;

const adapted = new Map<MechanicalCurvesSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function mechanicalCurvesGuidedExampleLesson(sectionId: MechanicalCurvesSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function mechanicalCurvesGuidedExamplePath(sectionId: MechanicalCurvesSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === mechanicalCurvesGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${MECHANICAL_CURVES_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
