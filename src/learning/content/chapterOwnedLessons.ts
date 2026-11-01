import type {DemonstrationId} from '../../demonstrations';
import type {LessonDefinition} from '../model';
import {linearMapsGuidedExamplePath, linearMapsGuidedExampleRegistry, LINEAR_MAPS_CHAPTER_ID} from './linearMapsChapterRegistry';
import {patchGuidedExamplePath, patchGuidedExampleRegistry} from './patchGuidedExampleRegistry';

export interface ChapterOwnedLessons {
    /** The lesson owned by a section, or undefined when the section owns none. */
    lesson(sectionId: string): LessonDefinition | undefined;
    /** The launch path of the section's lesson, or undefined when the section owns none. */
    path(sectionId: string): string | undefined;
    /** Every owned lesson with its section id. */
    entries(): readonly (readonly [sectionId: string, lesson: LessonDefinition])[];
}

function ownedLessons<Id extends string>(registry: Readonly<Record<Id, LessonDefinition>>, pathOf: (sectionId: Id) => string): ChapterOwnedLessons {
    const isSection = (sectionId: string): sectionId is Id => Object.prototype.hasOwnProperty.call(registry, sectionId);
    return {
        lesson: sectionId => isSection(sectionId) ? registry[sectionId] : undefined,
        path: sectionId => isSection(sectionId) ? pathOf(sectionId) : undefined,
        entries: () => Object.entries<LessonDefinition>(registry),
    };
}

/** Chapters whose activities are authored in the chapter itself. A later family adds one entry here. */
export const chapterOwnedLessons: Readonly<Record<string, ChapterOwnedLessons>> = {
    'bezier-patches': ownedLessons(patchGuidedExampleRegistry, patchGuidedExamplePath),
    [LINEAR_MAPS_CHAPTER_ID]: ownedLessons(linearMapsGuidedExampleRegistry, linearMapsGuidedExamplePath),
};

export function getChapterOwnedLessons(chapterId: string): ChapterOwnedLessons | undefined {
    return Object.prototype.hasOwnProperty.call(chapterOwnedLessons, chapterId) ? chapterOwnedLessons[chapterId] : undefined;
}

/**
 * The first chapter-owned lesson on Demonstration `id`, in table order and then in the key order of the chapter's registry.
 * When a chapter has several lessons on one Demonstration (`linear-map` has L1 and L2), this is the lesson of the first
 * registry key, so registries list sections in teaching order.
 */
export function findChapterOwnedLessonByDemonstration(id: DemonstrationId): LessonDefinition | undefined {
    for (const chapter of Object.values(chapterOwnedLessons)) {
        const found = chapter.entries().find(([, lesson]) => lesson.demonstrationId === id);
        if (found) return found[1];
    }
    return undefined;
}
