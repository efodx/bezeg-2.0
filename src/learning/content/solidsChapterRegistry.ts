import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {cubeSectionsLesson, prismPyramidSectionsLesson} from './solidsGuidedLessons';
import {solidsCavalieriLesson, solidsPyramidConeLesson} from './solidsVolumesGuidedLessons';
import {solidsRevolutionLesson} from './solidsRevolutionGuidedLessons';

export const SOLIDS_CHAPTER_ID = 'solids';

/** Section id to the Demonstration of its activity (spec SV1 to SV5: five sections on one Demonstration, in teaching order). Section ids are those of solidsChapter.ts; Batch C joined, so the chapter is complete. */
export const solidsGuidedExampleDemonstrations = {
    'cube-sections': 'solids',
    'pyramid-sections': 'solids',
    'cavalieri': 'solids',
    'pyramid-cone': 'solids',
    'revolution': 'solids',
} as const satisfies Record<string, DemonstrationId>;

export type SolidsSectionId = keyof typeof solidsGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'cube-sections': {id: 'solids-cube-sections', content: () => cubeSectionsLesson},
    'pyramid-sections': {id: 'solids-pyramid-sections', content: () => prismPyramidSectionsLesson},
    'cavalieri': {id: 'solids-cavalieri', content: () => solidsCavalieriLesson},
    'pyramid-cone': {id: 'solids-pyramid-cone', content: () => solidsPyramidConeLesson},
    'revolution': {id: 'solids-revolution', content: () => solidsRevolutionLesson},
} as const;

const adapted = new Map<SolidsSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function solidsGuidedExampleLesson(sectionId: SolidsSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function solidsGuidedExamplePath(sectionId: SolidsSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === solidsGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${SOLIDS_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
