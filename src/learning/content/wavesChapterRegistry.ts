import {getDemonstrationCatalog} from '../../demonstrations';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {adaptGuidedLessonContent} from './catalogLessonAdapter';
import {wavesSuperpositionLesson, wavesBeatsLesson} from './wavesGuidedLessons';

export const WAVES_CHAPTER_ID = 'waves';

/** Section id to the Demonstration of its activity (spec WV1, WV2: two sections on one Demonstration, in teaching order). Section ids are those of wavesChapter.ts. */
export const wavesGuidedExampleDemonstrations = {
    'superposition-and-phase': 'waves',
    'beats': 'waves',
} as const satisfies Record<string, DemonstrationId>;

export type WavesSectionId = keyof typeof wavesGuidedExampleDemonstrations;

/** The catalog-format content of each section's activity; adapted to a LessonDefinition only when that section is requested. */
const sectionContent = {
    'superposition-and-phase': {id: 'waves-superposition', content: () => wavesSuperpositionLesson},
    'beats': {id: 'waves-beats', content: () => wavesBeatsLesson},
} as const;

const adapted = new Map<WavesSectionId, LessonDefinition>();

/** The lesson of a section, adapted once. Reading the rows above adapts nothing. */
export function wavesGuidedExampleLesson(sectionId: WavesSectionId): LessonDefinition {
    let lesson = adapted.get(sectionId);
    if (!lesson) {
        lesson = adaptGuidedLessonContent(sectionContent[sectionId].content(), sectionContent[sectionId].id);
        adapted.set(sectionId, lesson);
    }
    return lesson;
}

export function wavesGuidedExamplePath(sectionId: WavesSectionId): string {
    const demo = getDemonstrationCatalog().demonstrations.find(item => item.id === wavesGuidedExampleDemonstrations[sectionId])!;
    return `${demo.path}?example=lesson.${WAVES_CHAPTER_ID}.${sectionId}.${demo.id}`;
}
